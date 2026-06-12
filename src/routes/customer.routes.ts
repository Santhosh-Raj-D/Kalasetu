import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { validate } from '../middleware/validate';
import { cartRepo, wishlistRepo } from '../repositories/cartRepo';
import { orderRepo } from '../repositories/orderRepo';
import { reviewRepo } from '../repositories/reviewRepo';
import { orderService } from '../services/orderService';
import { createError } from '../middleware/errorHandler';
import { productRepo } from '../repositories/productRepo';
import { createNotification } from '../utils/notify';

const router = Router();
router.use(requireAuth, requireRole('CUSTOMER'));

// Cart
router.get('/cart', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await cartRepo.findByUser(req.user!.id);
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
});

router.post('/cart',
  body('product_id').isInt({ min: 1 }),
  body('quantity').isInt({ min: 1, max: 100 }),
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const product = await productRepo.findById(req.body.product_id);
      if (!product || product.status !== 'APPROVED') throw createError('Product not available', 404);
      if (product.stock < req.body.quantity) throw createError('Insufficient stock', 400);
      await cartRepo.upsert(req.user!.id, req.body.product_id, req.body.quantity);
      res.json({ success: true });
    } catch (err) { next(err); }
  }
);

router.patch('/cart/:itemId',
  body('quantity').isInt({ min: 1, max: 100 }),
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await cartRepo.updateQuantity(req.user!.id, parseInt(req.params.itemId), req.body.quantity);
      res.json({ success: true });
    } catch (err) { next(err); }
  }
);

router.delete('/cart/:itemId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await cartRepo.remove(req.user!.id, parseInt(req.params.itemId));
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Wishlist
router.get('/wishlist', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await wishlistRepo.findByUser(req.user!.id);
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
});

router.post('/wishlist',
  body('product_id').isInt({ min: 1 }),
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await wishlistRepo.add(req.user!.id, req.body.product_id);
      res.json({ success: true });
    } catch (err) { next(err); }
  }
);

router.delete('/wishlist/:productId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await wishlistRepo.remove(req.user!.id, parseInt(req.params.productId));
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Checkout
router.post('/checkout/validate-coupon',
  body('code').trim().notEmpty(),
  body('subtotal').isFloat({ min: 0 }),
  body('artisanIds').isArray(),
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await orderService.validateCoupon(req.body.code, req.body.subtotal, req.body.artisanIds);
      res.json({ success: true, data: { coupon: result.coupon, discount: result.discount } });
    } catch (err) { next(err); }
  }
);

router.post('/checkout/place-order',
  body('ship_name').trim().notEmpty(),
  body('ship_phone').trim().notEmpty(),
  body('ship_address').trim().notEmpty(),
  body('ship_city').trim().notEmpty(),
  body('ship_state').trim().notEmpty(),
  body('ship_pincode').trim().notEmpty(),
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderId = await orderService.placeOrder(req.user!.id, req.body);
      res.status(201).json({ success: true, data: { orderId } });
    } catch (err) { next(err); }
  }
);

// Mock payment
router.post('/payments/mock',
  body('orderId').isInt({ min: 1 }),
  body('method').isIn(['MOCK_CARD', 'MOCK_UPI', 'COD']),
  body('simulateFailure').optional().isBoolean(),
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await orderService.processMockPayment(
        req.body.orderId,
        req.user!.id,
        req.body.method,
        req.body.simulateFailure === true || req.body.simulateFailure === 'true',
      );
      res.json({ success: true, data: result });
    } catch (err) { next(err); }
  }
);

// Orders
router.get('/orders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const result = await orderRepo.findByCustomer(req.user!.id, page, limit);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.get('/orders/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await orderRepo.findById(parseInt(req.params.id));
    if (!order) throw createError('Order not found', 404);
    if (order.customer_id !== req.user!.id) throw createError('Forbidden', 403);
    res.json({ success: true, data: order });
  } catch (err) { next(err); }
});

router.post('/orders/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await orderService.cancelOrder(parseInt(req.params.id), req.user!.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Reviews
router.post('/reviews',
  body('product_id').isInt({ min: 1 }),
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional().trim(),
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const hasPurchase = await reviewRepo.hasVerifiedPurchase(req.user!.id, req.body.product_id);
      if (!hasPurchase) throw createError('You can only review products from delivered orders', 403);

      const alreadyReviewed = await reviewRepo.alreadyReviewed(req.user!.id, req.body.product_id);
      if (alreadyReviewed) throw createError('You have already reviewed this product', 409);

      const id = await reviewRepo.create({
        product_id: req.body.product_id,
        customer_id: req.user!.id,
        rating: req.body.rating,
        comment: req.body.comment,
      });

      const product = await productRepo.findById(req.body.product_id);
      if (product) {
        await createNotification(product.artisan_id, 'REVIEW_DECISION',
          'New review on your product',
          `${req.user!.name} gave "${product.name}" ${req.body.rating} stars`,
          `/artisan/products.html`);
      }

      res.status(201).json({ success: true, data: { id } });
    } catch (err) { next(err); }
  }
);

export default router;
