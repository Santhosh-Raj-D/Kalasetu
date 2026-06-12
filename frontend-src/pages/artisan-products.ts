import { initLayout } from '../lib/layout';
import { requireUser } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { formatCurrency, formatDate, statusChip, paginate } from '../lib/format';
import { showToast } from '../lib/toast';

interface Product {
  id: number;
  name: string;
  slug: string;
  category_name: string;
  price: number;
  stock: number;
  status: string;
  primary_image?: string;
  created_at: string;
  review_feedback?: string;
}

let currentPage = 1;
const LIMIT = 15;

async function init() {
  await initLayout();
  await requireUser('ARTISAN');
  await loadProducts();
  document.getElementById('status-filter')?.addEventListener('change', () => {
    currentPage = 1;
    loadProducts();
  });
}

async function loadProducts() {
  const container = document.getElementById('products-content')!;
  container.innerHTML = '<div class="skeleton" style="height:300px"></div>';

  const status = (document.getElementById('status-filter') as HTMLSelectElement).value;
  const qs = new URLSearchParams({ page: String(currentPage), limit: String(LIMIT) });
  if (status) qs.set('status', status);

  const res = await apiFetch<{ products: Product[]; total: number }>(`/api/artisan/products?${qs}`);
  if (!res.success || !res.data) {
    container.innerHTML = `<div class="alert alert-error">${res.error || 'Failed to load products'}</div>`;
    return;
  }

  const { products, total } = res.data;
  document.getElementById('count-label')!.textContent = `${total} product${total !== 1 ? 's' : ''}`;

  if (!products.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏺</div>
        <h3>No products yet</h3>
        <p>Add your first product listing to start selling.</p>
        <a href="/artisan/product-form.html" class="btn btn-primary" style="margin-top:1rem">Add First Product</a>
      </div>`;
    document.getElementById('pagination')!.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Status</th>
            <th>Added</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${products.map(p => `
            <tr data-id="${p.id}">
              <td>
                <div style="display:flex;gap:0.75rem;align-items:center">
                  <img class="product-thumb" src="${p.primary_image || '/uploads/seed/placeholder.jpg'}" alt="${p.name}" onerror="this.src='/css/placeholder.svg'">
                  <div>
                    <p style="font-weight:600">${p.name}</p>
                    ${p.review_feedback && p.status === 'REJECTED' ? `<p style="font-size:0.75rem;color:#c0392b">${p.review_feedback.slice(0,60)}…</p>` : ''}
                  </div>
                </div>
              </td>
              <td>${p.category_name || '—'}</td>
              <td><span class="mono">${formatCurrency(p.price)}</span></td>
              <td>${p.stock}</td>
              <td>${statusChip(p.status)}</td>
              <td>${formatDate(p.created_at)}</td>
              <td>
                <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
                  <a href="/artisan/product-form.html?id=${p.id}" class="btn btn-secondary btn-sm">Edit</a>
                  ${p.status === 'DRAFT' || p.status === 'REJECTED' ? `<button class="btn btn-primary btn-sm submit-review-btn" data-id="${p.id}">Submit for Review</button>` : ''}
                  ${p.status === 'APPROVED' ? `<button class="btn btn-danger btn-sm delist-btn" data-id="${p.id}">Delist</button>` : ''}
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  setupActions();

  document.getElementById('pagination')!.innerHTML = paginate(total, currentPage, LIMIT, (p) => {
    currentPage = p;
    loadProducts();
  });
  document.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = parseInt((btn as HTMLElement).dataset.page!);
      loadProducts();
    });
  });
}

function setupActions() {
  document.querySelectorAll('.submit-review-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = (btn as HTMLElement).dataset.id;
      (btn as HTMLButtonElement).disabled = true;
      const res = await apiFetch(`/api/artisan/products/${id}/submit`, { method: 'POST' });
      if (res.success) {
        showToast('Submitted for review', 'success');
        await loadProducts();
      } else {
        showToast(res.error || 'Failed to submit', 'error');
        (btn as HTMLButtonElement).disabled = false;
      }
    });
  });

  document.querySelectorAll('.delist-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delist this product? It will no longer appear in the shop.')) return;
      const id = (btn as HTMLElement).dataset.id;
      (btn as HTMLButtonElement).disabled = true;
      const res = await apiFetch(`/api/artisan/products/${id}/delist`, { method: 'POST' });
      if (res.success) {
        showToast('Product delisted', 'success');
        await loadProducts();
      } else {
        showToast(res.error || 'Failed to delist', 'error');
        (btn as HTMLButtonElement).disabled = false;
      }
    });
  });
}

init();
