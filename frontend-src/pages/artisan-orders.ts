import { initLayout } from '../lib/layout';
import { requireUser } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { formatCurrency, formatDate, statusChip, paginate } from '../lib/format';
import { showToast } from '../lib/toast';

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface ArtisanOrder {
  id: number;
  order_number: string;
  customer_name: string;
  created_at: string;
  total_amount: number;
  status: string;
  items: OrderItem[];
}

const STATUS_TRANSITIONS: Record<string, string | null> = {
  PLACED: 'CONFIRMED',
  CONFIRMED: 'SHIPPED',
  SHIPPED: 'DELIVERED',
  DELIVERED: null,
};

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: 'Mark Confirmed',
  SHIPPED: 'Mark Shipped',
  DELIVERED: 'Mark Delivered',
};

let currentPage = 1;
const LIMIT = 15;

async function init() {
  await initLayout();
  await requireUser('ARTISAN');
  await loadOrders();
  document.getElementById('status-filter')?.addEventListener('change', () => {
    currentPage = 1;
    loadOrders();
  });
}

async function loadOrders() {
  const container = document.getElementById('orders-content')!;
  container.innerHTML = '<div class="skeleton" style="height:300px"></div>';

  const status = (document.getElementById('status-filter') as HTMLSelectElement).value;
  const qs = new URLSearchParams({ page: String(currentPage), limit: String(LIMIT) });
  if (status) qs.set('status', status);

  const res = await apiFetch<{ orders: ArtisanOrder[]; total: number }>(`/api/artisan/orders?${qs}`);
  if (!res.success || !res.data) {
    container.innerHTML = `<div class="alert alert-error">${res.error || 'Failed to load orders'}</div>`;
    return;
  }

  const { orders, total } = res.data;
  document.getElementById('order-count')!.textContent = `${total} order${total !== 1 ? 's' : ''}`;

  if (!orders.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <h3>No orders yet</h3>
        <p>Orders for your products will appear here.</p>
      </div>`;
    document.getElementById('pagination')!.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Order #</th>
            <th>Customer</th>
            <th>Date</th>
            <th>Total</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody id="orders-tbody">
          ${orders.map(o => buildRow(o)).join('')}
        </tbody>
      </table>
    </div>`;

  setupExpandAndActions(orders);

  document.getElementById('pagination')!.innerHTML = paginate(total, currentPage, LIMIT, (p) => {
    currentPage = p;
    loadOrders();
  });
  document.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = parseInt((btn as HTMLElement).dataset.page!);
      loadOrders();
    });
  });
}

function buildRow(o: ArtisanOrder): string {
  const nextStatus = STATUS_TRANSITIONS[o.status];
  const actionBtn = nextStatus
    ? `<button class="btn btn-primary btn-sm update-status-btn" data-id="${o.id}" data-next="${nextStatus}">${STATUS_LABELS[nextStatus]}</button>`
    : '';
  return `
    <tr>
      <td>
        <p class="mono">${o.order_number}</p>
        <button class="btn btn-secondary btn-sm" style="margin-top:0.25rem;font-size:0.75rem" data-toggle="${o.id}">▼ Items</button>
      </td>
      <td>${o.customer_name}</td>
      <td>${formatDate(o.created_at)}</td>
      <td><span class="mono">${formatCurrency(o.total_amount)}</span></td>
      <td>${statusChip(o.status)}</td>
      <td>${actionBtn}</td>
    </tr>
    <tr id="items-row-${o.id}" style="display:none">
      <td colspan="6" style="padding:0.5rem 1rem">
        <div class="order-items-panel open">
          ${o.items.map(i => `<p>• ${i.product_name} × ${i.quantity} — ${formatCurrency(i.unit_price * i.quantity)}</p>`).join('')}
        </div>
      </td>
    </tr>`;
}

function setupExpandAndActions(orders: ArtisanOrder[]) {
  document.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.toggle;
      const row = document.getElementById(`items-row-${id}`)!;
      const isOpen = row.style.display !== 'none';
      row.style.display = isOpen ? 'none' : 'table-row';
      (btn as HTMLButtonElement).textContent = isOpen ? '▼ Items' : '▲ Hide';
    });
  });

  document.querySelectorAll('.update-status-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = (btn as HTMLElement).dataset.id;
      const next = (btn as HTMLElement).dataset.next;
      if (!confirm(`Mark order as ${next}?`)) return;
      (btn as HTMLButtonElement).disabled = true;
      const res = await apiFetch(`/api/artisan/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      if (res.success) {
        showToast(`Order marked as ${next}`, 'success');
        await loadOrders();
      } else {
        showToast(res.error || 'Status update failed', 'error');
        (btn as HTMLButtonElement).disabled = false;
      }
    });
  });
}

init();
