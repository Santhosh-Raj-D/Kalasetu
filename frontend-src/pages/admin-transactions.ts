import { initLayout } from '../lib/layout';
import { requireUser } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { formatCurrency, formatDateTime, statusChip, paginate } from '../lib/format';

interface Transaction {
  id: number;
  transaction_id: string;
  order_number: string;
  customer_name: string;
  amount: number;
  method: string;
  status: string;
  created_at: string;
}

let currentPage = 1;
const LIMIT = 20;

async function init() {
  await initLayout();
  await requireUser('ADMIN');
  await loadTransactions();
  setupFilters();
}

async function loadTransactions() {
  const container = document.getElementById('transactions-content')!;
  container.innerHTML = '<div class="skeleton" style="height:300px"></div>';

  const search = (document.getElementById('search-txn') as HTMLInputElement).value;
  const method = (document.getElementById('filter-method') as HTMLSelectElement).value;
  const status = (document.getElementById('filter-status') as HTMLSelectElement).value;

  const qs = new URLSearchParams({ page: String(currentPage), limit: String(LIMIT) });
  if (search) qs.set('search', search);
  if (method) qs.set('method', method);
  if (status) qs.set('status', status);

  const res = await apiFetch<{ transactions: Transaction[]; total: number }>(`/api/admin/transactions?${qs}`);
  if (!res.success || !res.data) {
    container.innerHTML = `<div class="alert alert-error">${res.error || 'Failed to load transactions'}</div>`;
    return;
  }

  const { transactions, total } = res.data;
  document.getElementById('txn-count')!.textContent = `${total} transaction${total !== 1 ? 's' : ''}`;

  if (!transactions.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">💳</div><h3>No transactions found</h3></div>';
    document.getElementById('pagination')!.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Order #</th>
            <th>Transaction ID</th>
            <th>Customer</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${transactions.map(t => `
            <tr>
              <td><a href="/order.html?id=" class="mono" style="color:var(--bronze)">${t.order_number}</a></td>
              <td><span class="mono" style="font-size:0.78rem;color:var(--mud)">${t.transaction_id}</span></td>
              <td>${t.customer_name}</td>
              <td><span class="mono">${formatCurrency(t.amount)}</span></td>
              <td><span style="font-size:0.82rem">${t.method.replace(/_/g, ' ')}</span></td>
              <td>${statusChip(t.status)}</td>
              <td><span style="font-size:0.82rem">${formatDateTime(t.created_at)}</span></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  document.getElementById('pagination')!.innerHTML = paginate(total, currentPage, LIMIT, (p) => {
    currentPage = p;
    loadTransactions();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = parseInt((btn as HTMLElement).dataset.page!);
      loadTransactions();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

function setupFilters() {
  let timer: ReturnType<typeof setTimeout>;
  document.getElementById('search-txn')?.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { currentPage = 1; loadTransactions(); }, 400);
  });
  ['filter-method', 'filter-status'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => { currentPage = 1; loadTransactions(); });
  });
}

init();
