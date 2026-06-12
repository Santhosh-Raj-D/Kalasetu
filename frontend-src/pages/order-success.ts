import { initLayout } from '../lib/layout';
import { apiFetch } from '../lib/api';
import { formatCurrency, formatDate, statusChip } from '../lib/format';

interface Order {
  id: number;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
  ship_name: string;
  ship_city: string;
  ship_state: string;
  items: { product_name: string; quantity: number; unit_price: number }[];
}

async function init() {
  await initLayout();

  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('orderId');

  if (!orderId) {
    document.getElementById('order-number-display')!.textContent = '';
    document.getElementById('order-details-content')!.innerHTML = '<p style="text-align:center;color:var(--mud)">No order found.</p>';
    return;
  }

  document.getElementById('view-order-btn')!.setAttribute('href', `/order.html?id=${orderId}`);

  const res = await apiFetch<Order>(`/api/orders/${orderId}`);
  if (!res.success || !res.data) {
    document.getElementById('order-details-content')!.innerHTML = '<p style="text-align:center;color:var(--mud)">Could not load order details.</p>';
    return;
  }

  const order = res.data;
  document.getElementById('order-number-display')!.innerHTML = `<div class="order-number-box">${order.order_number}</div>`;
  document.title = `Order ${order.order_number} — KalaSetu`;

  document.getElementById('order-details-content')!.innerHTML = `
    <div class="order-details-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
        <h3 style="font-family:'Fraunces',serif">Order Summary</h3>
        ${statusChip(order.status)}
      </div>
      <div class="order-detail-row"><span>Order Number</span><span style="font-family:'IBM Plex Mono',monospace;font-weight:600">${order.order_number}</span></div>
      <div class="order-detail-row"><span>Date</span><span>${formatDate(order.created_at)}</span></div>
      <div class="order-detail-row"><span>Shipping To</span><span>${order.ship_name}, ${order.ship_city}, ${order.ship_state}</span></div>
      ${order.items.map(item => `
        <div class="order-detail-row">
          <span>${item.product_name} × ${item.quantity}</span>
          <span style="font-family:'IBM Plex Mono',monospace">${formatCurrency(item.unit_price * item.quantity)}</span>
        </div>`).join('')}
      <div class="order-detail-row" style="font-weight:700;font-size:1rem">
        <span>Total Paid</span>
        <span style="font-family:'IBM Plex Mono',monospace;color:var(--bronze)">${formatCurrency(order.total_amount)}</span>
      </div>
      <div style="margin-top:1.25rem;text-align:center">
        <a href="/order.html?id=${order.id}" class="btn btn-primary">View Full Order Details</a>
      </div>
    </div>`;
}

init();
