import { initLayout } from '../lib/layout';
import { requireUser } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { formatCurrency, formatDate, statusChip } from '../lib/format';
import { showToast } from '../lib/toast';

interface OrderItem {
  id: number;
  product_name: string;
  product_slug: string;
  quantity: number;
  unit_price: number;
  primary_image?: string;
}

interface OrderDetail {
  id: number;
  order_number: string;
  status: string;
  created_at: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  ship_name: string;
  ship_phone: string;
  ship_address: string;
  ship_city: string;
  ship_state: string;
  ship_pincode: string;
  payment_method?: string;
  payment_status?: string;
  coupon_code?: string;
  items: OrderItem[];
}

const STATUS_ORDER = ['PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];

async function init() {
  await initLayout();
  await requireUser('CUSTOMER');

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) { window.location.href = '/orders.html'; return; }

  const res = await apiFetch<OrderDetail>(`/api/orders/${id}`);
  if (!res.success || !res.data) {
    document.getElementById('order-content')!.innerHTML = `<div class="alert alert-error">${res.error || 'Order not found'}</div>`;
    return;
  }

  renderOrder(res.data);
}

function buildTimeline(status: string): string {
  const isCancelled = status === 'CANCELLED';
  const activeIndex = STATUS_ORDER.indexOf(status);
  return `
    <div class="order-timeline">
      ${STATUS_ORDER.map((s, i) => {
        const done = !isCancelled && i < activeIndex;
        const active = !isCancelled && s === status;
        const icons = ['📋','✅','🚚','🏠'];
        return `
          <div class="timeline-step ${done ? 'done' : ''} ${active ? 'active' : ''}">
            <div class="timeline-dot">${icons[i]}</div>
            <p class="timeline-label">${s.charAt(0) + s.slice(1).toLowerCase()}</p>
          </div>`;
      }).join('')}
    </div>
    ${isCancelled ? `<div class="alert alert-error" style="margin-top:0.5rem">This order was cancelled.</div>` : ''}`;
}

function renderOrder(order: OrderDetail) {
  document.getElementById('page-title')!.textContent = `Order ${order.order_number}`;
  document.title = `Order ${order.order_number} — KalaSetu`;

  const canCancel = order.status === 'PLACED';
  const content = document.getElementById('order-content')!;

  content.innerHTML = `
    <div class="order-layout">
      <div>
        <div class="order-section">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem">
            <div>
              <p style="font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:1.05rem">${order.order_number}</p>
              <p style="font-size:0.8rem;color:var(--mud)">${formatDate(order.created_at)}</p>
            </div>
            ${statusChip(order.status)}
          </div>
          ${buildTimeline(order.status)}
        </div>

        <div class="order-section">
          <h3>Items Ordered</h3>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>Product</th><th>Price</th><th>Qty</th><th>Total</th></tr>
              </thead>
              <tbody>
                ${order.items.map(item => `
                  <tr>
                    <td>
                      <div style="display:flex;gap:0.75rem;align-items:center">
                        <img src="${item.primary_image || '/uploads/seed/placeholder.jpg'}" alt="${item.product_name}" style="width:48px;height:48px;object-fit:cover;border-radius:var(--radius)" onerror="this.src='/css/placeholder.svg'">
                        <a href="/product.html?slug=${item.product_slug}" style="font-weight:600;color:var(--ink)">${item.product_name}</a>
                      </div>
                    </td>
                    <td><span class="mono">${formatCurrency(item.unit_price)}</span></td>
                    <td>${item.quantity}</td>
                    <td><span class="mono">${formatCurrency(item.unit_price * item.quantity)}</span></td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="order-section">
          <h3>Shipping Address</h3>
          <p><strong>${order.ship_name}</strong></p>
          <p>${order.ship_address}</p>
          <p>${order.ship_city}, ${order.ship_state} − ${order.ship_pincode}</p>
          <p style="margin-top:0.4rem;color:var(--mud)">📞 ${order.ship_phone}</p>
        </div>

        ${canCancel ? `
        <div id="cancel-section">
          <button class="btn btn-danger" id="cancel-order-btn">Cancel Order</button>
          <p style="font-size:0.75rem;color:var(--mud);margin-top:0.4rem">Orders can only be cancelled before they are confirmed.</p>
        </div>` : ''}
      </div>

      <aside>
        <div class="order-section">
          <h3>Order Totals</h3>
          <div class="info-row"><span class="info-label">Subtotal</span><span class="mono">${formatCurrency(order.subtotal)}</span></div>
          ${order.discount_amount > 0 ? `<div class="info-row" style="color:var(--leaf)"><span class="info-label">Discount${order.coupon_code ? ` (${order.coupon_code})` : ''}</span><span class="mono">−${formatCurrency(order.discount_amount)}</span></div>` : ''}
          <div class="info-row"><span class="info-label">Shipping</span><span style="color:var(--leaf)">Free</span></div>
          <div class="info-row" style="font-weight:700;font-size:1rem;border-top:1px solid var(--bone-dark);margin-top:0.5rem;padding-top:0.5rem">
            <span>Total</span><span class="mono" style="color:var(--bronze)">${formatCurrency(order.total_amount)}</span>
          </div>
        </div>
        <div class="order-section">
          <h3>Payment</h3>
          <div class="info-row"><span class="info-label">Method</span><span>${order.payment_method?.replace(/_/g, ' ') || '—'}</span></div>
          <div class="info-row"><span class="info-label">Status</span><span>${order.payment_status ? statusChip(order.payment_status) : '—'}</span></div>
        </div>
        <a href="/orders.html" class="btn btn-secondary" style="width:100%;justify-content:center">← Back to Orders</a>
      </aside>
    </div>`;

  if (canCancel) {
    document.getElementById('cancel-order-btn')?.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to cancel this order?')) return;
      const btn = document.getElementById('cancel-order-btn') as HTMLButtonElement;
      btn.disabled = true;
      const res = await apiFetch(`/api/orders/${order.id}/cancel`, { method: 'POST' });
      if (res.success) {
        showToast('Order cancelled', 'success');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        showToast(res.error || 'Cancellation failed', 'error');
        btn.disabled = false;
      }
    });
  }
}

init();
