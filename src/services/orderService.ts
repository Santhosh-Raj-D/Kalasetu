import { pool } from '../config/db';
import { orderRepo } from '../repositories/orderRepo';
import { cartRepo } from '../repositories/cartRepo';
import { productRepo } from '../repositories/productRepo';
import { couponRepo } from '../repositories/couponRepo';
import { paymentRepo } from '../repositories/paymentRepo';
import { createNotification } from '../utils/notify';
import { generateOrderNumber, generateTxnRef } from '../utils/orderNumber';
import { createError } from '../middleware/errorHandler';
import { PaymentMethod } from '../types';

export const orderService = {
  async validateCoupon(code: string, subtotal: number, artisanIds: number[]) {
    const coupon = await couponRepo.findByCode(code);
    if (!coupon) throw createError('Coupon not found', 404);
    if (!coupon.is_active) throw createError('Coupon is not active', 400);

    const now = new Date();
    const from = new Date(coupon.valid_from);
    const to = new Date(coupon.valid_to);
    to.setHours(23, 59, 59);

    if (now < from || now > to) throw createError('Coupon has expired or is not yet valid', 400);
    if (subtotal < coupon.min_order_amount) {
      throw createError(`Minimum order amount is ₹${coupon.min_order_amount}`, 400);
    }
    if (coupon.used_count >= coupon.max_uses) throw createError('Coupon usage limit reached', 400);
    if (coupon.artisan_id && !artisanIds.includes(coupon.artisan_id)) {
      throw createError('Coupon is not valid for items in your cart', 400);
    }

    const discount =
      coupon.discount_type === 'PERCENT'
        ? Math.min((subtotal * coupon.discount_value) / 100, subtotal)
        : Math.min(coupon.discount_value, subtotal);

    return { coupon, discount: Math.round(discount * 100) / 100 };
  },

  async placeOrder(customerId: number, data: {
    couponCode?: string;
    ship_name: string;
    ship_phone: string;
    ship_address: string;
    ship_city: string;
    ship_state: string;
    ship_pincode: string;
  }) {
    const cartItems = await cartRepo.findByUser(customerId);
    if (cartItems.length === 0) throw createError('Cart is empty', 400);

    const availableItems = cartItems.filter((i) => i.status === 'APPROVED' && i.stock > 0);
    if (availableItems.length !== cartItems.length) {
      throw createError('Some items in your cart are no longer available', 400);
    }

    const subtotal = availableItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const artisanIds = [...new Set(availableItems.map((i) => i.artisan_id))];

    let discount = 0;
    let couponId: number | undefined;
    if (data.couponCode) {
      const result = await orderService.validateCoupon(data.couponCode, subtotal, artisanIds);
      discount = result.discount;
      couponId = result.coupon.id;
    }

    const total = Math.round((subtotal - discount) * 100) / 100;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Decrement stock atomically
      for (const item of availableItems) {
        const [result] = await conn.execute(
          'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
          [item.quantity, item.product_id, item.quantity],
        ) as [import('mysql2').ResultSetHeader, unknown[]];
        if (result.affectedRows === 0) {
          throw createError(`Insufficient stock for "${item.product_name}"`, 409);
        }
      }

      const orderId = await orderRepo.create({
        order_number: generateOrderNumber(),
        customer_id: customerId,
        subtotal,
        discount_amount: discount,
        total,
        coupon_id: couponId,
        status: 'PLACED',
        ship_name: data.ship_name,
        ship_phone: data.ship_phone,
        ship_address: data.ship_address,
        ship_city: data.ship_city,
        ship_state: data.ship_state,
        ship_pincode: data.ship_pincode,
      }, conn);

      for (const item of availableItems) {
        await orderRepo.addItem(orderId, {
          product_id: item.product_id,
          artisan_id: item.artisan_id,
          quantity: item.quantity,
          unit_price: item.price,
        }, conn);
      }

      if (couponId) {
        await couponRepo.incrementUsed(couponId, conn);
      }

      await cartRepo.clear(customerId, conn);
      await conn.commit();

      // Notify artisans
      for (const artisanId of artisanIds) {
        await createNotification(artisanId, 'ORDER_UPDATE', 'New order received', 'A customer placed an order for your products', `/artisan/orders.html`);
      }

      return orderId;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async processMockPayment(orderId: number, customerId: number, method: PaymentMethod, simulateFailure: boolean) {
    const order = await orderRepo.findById(orderId);
    if (!order) throw createError('Order not found', 404);
    if (order.customer_id !== customerId) throw createError('Forbidden', 403);

    const existing = await paymentRepo.findByOrderId(orderId);
    if (existing && existing.status === 'SUCCESS') throw createError('Order already paid', 400);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (simulateFailure) {
        await paymentRepo.create({ order_id: orderId, amount: order.total, method, status: 'FAILED', transaction_ref: generateTxnRef() }, conn);
        // Restore stock on failed payment
        const items = await orderRepo.getItems(orderId);
        for (const item of items) {
          await conn.execute('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
        }
        await orderRepo.updateStatus(orderId, 'CANCELLED');
        await conn.commit();
        return { success: false, status: 'FAILED' };
      }

      const txnRef = generateTxnRef();
      await paymentRepo.create({ order_id: orderId, amount: order.total, method, status: 'SUCCESS', transaction_ref: txnRef, paid_at: new Date() }, conn);
      await orderRepo.updateStatus(orderId, 'CONFIRMED');
      await conn.commit();

      await createNotification(customerId, 'ORDER_UPDATE', 'Order confirmed!', `Your order #${order.order_number} has been confirmed`, `/order.html?id=${orderId}`);

      return { success: true, status: 'SUCCESS', transaction_ref: txnRef };
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async cancelOrder(orderId: number, customerId: number) {
    const order = await orderRepo.findById(orderId);
    if (!order) throw createError('Order not found', 404);
    if (order.customer_id !== customerId) throw createError('Forbidden', 403);
    if (order.status !== 'PLACED') throw createError('Only PLACED orders can be cancelled', 400);

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const items = await orderRepo.getItems(orderId);
      for (const item of items) {
        await conn.execute('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
      }
      await orderRepo.updateStatus(orderId, 'CANCELLED');
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },
};
