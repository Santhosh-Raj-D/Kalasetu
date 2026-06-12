import { initLayout } from '../lib/layout';
import { requireUser } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { formatCurrency, formatDate, statusChip, paginate } from '../lib/format';

interface Order {
  id: number;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
  item_count: number;
}

let currentPage = 1;
const LIMIT = 15;

async function init() {
  await initLayout();
  await requireUser('CUSTOMER');
  await loadOrders();
}

async function loadOrders() {
  const container = document.getElementById('orders-content')!;
  container.innerHTML = '<div class="skeleton" style="height:300px"></div>';

  const res = await apiFetch<{ orders: Order[]; total: number }>(`/api/orders?page=${currentPage}&limit=${LIMIT}`);

  if (!res.success || !res.data) {
    container.innerHTML = `<div class="alert alert-error">${res.error || 'Failed to load orders'}</div>`;
    return;
  }

  const { orders, total } = res.data;

  if (!orders.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <h3>No orders yet</h3>
        <p>When you place orders, they'll appear here.</p>
        <a href="/shop.html" class="btn btn-primary" style="margin-top:1rem">Start Shopping</a>
      </div>`;
    document.getElementById('pagination')!.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Order Number</th>
            <th>Date</th>
            <th>Items</th>
            <th>Total</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${orders.map(o => `
            <tr>
              <td><span class="mono">${o.order_number}</span></td>
              <td>${formatDate(o.created_at)}</td>
              <td>${o.item_count} item${o.item_count !== 1 ? 's' : ''}</td>
              <td><span class="mono">${formatCurrency(o.total_amount)}</span></td>
              <td>${statusChip(o.status)}</td>
              <td><a href="/order.html?id=${o.id}" class="btn btn-secondary btn-sm">View →</a></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  document.getElementById('pagination')!.innerHTML = paginate(total, currentPage, LIMIT, (p) => {
    currentPage = p;
    loadOrders();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = parseInt((btn as HTMLElement).dataset.page!);
      loadOrders();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

init();
