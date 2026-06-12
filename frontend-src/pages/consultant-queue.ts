import { initLayout } from '../lib/layout';
import { requireUser } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { formatDate, paginate } from '../lib/format';

interface QueueItem {
  id: number;
  name: string;
  artisan_name: string;
  category_name: string;
  submitted_at: string;
  price: number;
  primary_image?: string;
}

let currentPage = 1;
const LIMIT = 15;

async function init() {
  await initLayout();
  await requireUser('CONSULTANT');
  await loadQueue();
}

async function loadQueue() {
  const container = document.getElementById('queue-content')!;
  container.innerHTML = '<div class="skeleton" style="height:300px"></div>';

  const res = await apiFetch<{ items: QueueItem[]; total: number }>(`/api/consultant/queue?page=${currentPage}&limit=${LIMIT}`);
  if (!res.success || !res.data) {
    container.innerHTML = `<div class="alert alert-error">${res.error || 'Failed to load queue'}</div>`;
    return;
  }

  const { items, total } = res.data;
  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✅</div>
        <h3>Queue is empty</h3>
        <p>No products are pending review right now.</p>
      </div>`;
    document.getElementById('pagination')!.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div style="margin-bottom:1rem;font-size:0.85rem;color:var(--mud)">${total} product${total !== 1 ? 's' : ''} pending review</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Artisan</th>
            <th>Category</th>
            <th>Submitted</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              <td>
                <div style="display:flex;gap:0.75rem;align-items:center">
                  <img src="${item.primary_image || '/uploads/seed/placeholder.jpg'}" alt="${item.name}" style="width:48px;height:48px;object-fit:cover;border-radius:var(--radius)" onerror="this.src='/css/placeholder.svg'">
                  <span style="font-weight:600">${item.name}</span>
                </div>
              </td>
              <td>${item.artisan_name}</td>
              <td>${item.category_name || '—'}</td>
              <td>${formatDate(item.submitted_at)}</td>
              <td><a href="/consultant/review.html?id=${item.id}" class="btn btn-primary btn-sm">Review →</a></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  document.getElementById('pagination')!.innerHTML = paginate(total, currentPage, LIMIT, (p) => {
    currentPage = p;
    loadQueue();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = parseInt((btn as HTMLElement).dataset.page!);
      loadQueue();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

init();
