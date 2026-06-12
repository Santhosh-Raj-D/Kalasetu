import { initLayout } from '../lib/layout';
import { requireUser } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { formatCurrency, formatDate, statusChip, paginate } from '../lib/format';
import { showToast } from '../lib/toast';

interface Product {
  id: number;
  name: string;
  artisan_name: string;
  category_name: string;
  price: number;
  status: string;
  featured: boolean;
  created_at: string;
  primary_image?: string;
}

let currentPage = 1;
const LIMIT = 20;

async function init() {
  await initLayout();
  await requireUser('ADMIN');
  await loadProducts();
  setupFilters();
}

async function loadProducts() {
  const container = document.getElementById('products-content')!;
  container.innerHTML = '<div class="skeleton" style="height:300px"></div>';

  const search = (document.getElementById('search-products') as HTMLInputElement).value;
  const status = (document.getElementById('filter-status') as HTMLSelectElement).value;
  const qs = new URLSearchParams({ page: String(currentPage), limit: String(LIMIT) });
  if (search) qs.set('search', search);
  if (status) qs.set('status', status);

  const res = await apiFetch<{ products: Product[]; total: number }>(`/api/admin/products?${qs}`);
  if (!res.success || !res.data) {
    container.innerHTML = `<div class="alert alert-error">${res.error || 'Failed to load products'}</div>`;
    return;
  }

  const { products, total } = res.data;
  document.getElementById('prod-count')!.textContent = `${total} product${total !== 1 ? 's' : ''}`;

  if (!products.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🏺</div><h3>No products found</h3></div>';
    document.getElementById('pagination')!.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Artisan</th>
            <th>Category</th>
            <th>Price</th>
            <th>Status</th>
            <th>Featured</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${products.map(p => `
            <tr data-id="${p.id}">
              <td>
                <div style="display:flex;gap:0.75rem;align-items:center">
                  <img src="${p.primary_image || '/uploads/seed/placeholder.jpg'}" alt="${p.name}" style="width:40px;height:40px;object-fit:cover;border-radius:var(--radius)" onerror="this.src='/css/placeholder.svg'">
                  <a href="/product.html?slug=${p.id}" style="font-weight:600;color:var(--ink)">${p.name}</a>
                </div>
              </td>
              <td>${p.artisan_name}</td>
              <td>${p.category_name || '—'}</td>
              <td><span class="mono">${formatCurrency(p.price)}</span></td>
              <td>${statusChip(p.status)}</td>
              <td>
                <label class="featured-toggle" title="Toggle featured">
                  <input type="checkbox" class="featured-toggle-input" data-id="${p.id}" ${p.featured ? 'checked' : ''}>
                  <span style="font-size:0.78rem;color:var(--mud)">${p.featured ? 'Featured' : 'Normal'}</span>
                </label>
              </td>
              <td>
                ${p.status !== 'DELISTED' ? `<button class="btn btn-danger btn-sm delist-btn" data-id="${p.id}">Delist</button>` : ''}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  setupProductActions();

  document.getElementById('pagination')!.innerHTML = paginate(total, currentPage, LIMIT, (p) => {
    currentPage = p;
    loadProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = parseInt((btn as HTMLElement).dataset.page!);
      loadProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

function setupProductActions() {
  document.querySelectorAll('.featured-toggle-input').forEach(toggle => {
    toggle.addEventListener('change', async () => {
      const id = (toggle as HTMLElement).dataset.id;
      const featured = (toggle as HTMLInputElement).checked;
      const res = await apiFetch(`/api/admin/products/${id}/featured`, {
        method: 'PATCH',
        body: JSON.stringify({ featured }),
      });
      if (res.success) {
        const label = toggle.nextElementSibling as HTMLElement;
        if (label) label.textContent = featured ? 'Featured' : 'Normal';
        showToast(featured ? 'Product featured' : 'Removed from featured', 'success');
      } else {
        (toggle as HTMLInputElement).checked = !featured;
        showToast(res.error || 'Failed to update', 'error');
      }
    });
  });

  document.querySelectorAll('.delist-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = (btn as HTMLElement).dataset.id;
      if (!confirm('Delist this product?')) return;
      (btn as HTMLButtonElement).disabled = true;
      const res = await apiFetch(`/api/admin/products/${id}/delist`, { method: 'POST' });
      if (res.success) { showToast('Product delisted', 'success'); await loadProducts(); }
      else { showToast(res.error || 'Failed', 'error'); (btn as HTMLButtonElement).disabled = false; }
    });
  });
}

function setupFilters() {
  let timer: ReturnType<typeof setTimeout>;
  document.getElementById('search-products')?.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { currentPage = 1; loadProducts(); }, 400);
  });
  document.getElementById('filter-status')?.addEventListener('change', () => { currentPage = 1; loadProducts(); });
}

init();
