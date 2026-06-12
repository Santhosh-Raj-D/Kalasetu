import { initLayout } from '../lib/layout';
import { apiFetch } from '../lib/api';
import { productCard, paginate } from '../lib/format';
import { showToast } from '../lib/toast';

let currentPage = 1;
const LIMIT = 12;
const params = new URLSearchParams(window.location.search);

async function init() {
  await initLayout();
  await loadCategories();
  // pre-fill from URL
  const searchVal = params.get('search') || '';
  const catVal = params.get('category') || '';
  const featVal = params.get('featured') === 'true';
  if (searchVal) document.querySelector<HTMLInputElement>('#global-search')!?.setAttribute('value', searchVal);
  if (catVal) {
    const radio = document.querySelector<HTMLInputElement>(`input[name="category"][value="${catVal}"]`);
    if (radio) radio.checked = true;
  }
  if (featVal) document.querySelector<HTMLInputElement>('input[value="featured"]')?.setAttribute('checked', '');

  await loadProducts();
  setupFilters();
}

async function loadCategories() {
  const res = await apiFetch<{ id: number; name: string; slug: string }[]>('/api/categories');
  const container = document.getElementById('category-filters')!;
  if (!res.success || !res.data) return;
  container.innerHTML = `
    <label class="filter-option"><input type="radio" name="category" value=""> All categories</label>
    ${res.data.map(c => `<label class="filter-option"><input type="radio" name="category" value="${c.slug}"> ${c.name}</label>`).join('')}`;
  const catVal = params.get('category');
  if (catVal) {
    const radio = container.querySelector<HTMLInputElement>(`input[value="${catVal}"]`);
    if (radio) radio.checked = true;
  }
}

async function loadProducts() {
  const grid = document.getElementById('product-grid')!;
  grid.innerHTML = '<div class="skeleton skeleton-card"></div>'.repeat(6);

  const qs = buildQuery();
  const res = await apiFetch<{ products: Record<string, unknown>[]; total: number }>(`/api/products?${qs}`);

  if (!res.success || !res.data) {
    grid.innerHTML = '<p class="empty-state">Failed to load products.</p>';
    return;
  }

  const { products, total } = res.data;
  document.getElementById('results-count')!.textContent = `${total} result${total !== 1 ? 's' : ''}`;

  if (!products.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🏺</div><h3>No products found</h3><p>Try adjusting your filters</p></div>`;
    document.getElementById('pagination')!.innerHTML = '';
    return;
  }

  grid.innerHTML = products.map(p => productCard(p as Parameters<typeof productCard>[0])).join('');

  document.getElementById('pagination')!.innerHTML = paginate(total, currentPage, LIMIT, (p) => {
    currentPage = p;
    loadProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = parseInt((btn as HTMLElement).dataset.page!);
      currentPage = p;
      loadProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  setupCartButtons();
}

function buildQuery(): string {
  const p = new URLSearchParams();
  const search = (document.querySelector<HTMLInputElement>('#nav-search-input') || document.querySelector<HTMLInputElement>('[id=global-search]'))?.value;
  if (search) p.set('search', search);
  const cat = document.querySelector<HTMLInputElement>('input[name="category"]:checked')?.value;
  if (cat) p.set('category', cat);
  const min = (document.getElementById('min-price') as HTMLInputElement)?.value;
  const max = (document.getElementById('max-price') as HTMLInputElement)?.value;
  if (min) p.set('minPrice', min);
  if (max) p.set('maxPrice', max);
  const sort = (document.getElementById('sort-select') as HTMLSelectElement)?.value;
  if (sort) p.set('sort', sort);
  if (params.get('featured') === 'true') p.set('featured', 'true');
  p.set('page', String(currentPage));
  p.set('limit', String(LIMIT));
  return p.toString();
}

function setupFilters() {
  document.getElementById('apply-filters')?.addEventListener('click', () => {
    currentPage = 1;
    loadProducts();
    document.getElementById('filter-sidebar')?.classList.remove('open');
  });
  document.getElementById('clear-filters')?.addEventListener('click', () => {
    document.querySelectorAll<HTMLInputElement>('input[name="category"]')[0].checked = true;
    (document.getElementById('min-price') as HTMLInputElement).value = '';
    (document.getElementById('max-price') as HTMLInputElement).value = '';
    (document.getElementById('sort-select') as HTMLSelectElement).value = 'newest';
    currentPage = 1;
    loadProducts();
  });
  document.getElementById('filter-toggle')?.addEventListener('click', () => {
    document.getElementById('filter-sidebar')?.classList.add('open');
  });
  document.getElementById('filter-close')?.addEventListener('click', () => {
    document.getElementById('filter-sidebar')?.classList.remove('open');
  });
  document.getElementById('sort-select')?.addEventListener('change', () => {
    currentPage = 1;
    loadProducts();
  });
}

function setupCartButtons() {
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const id = (btn as HTMLElement).dataset.id;
      const name = (btn as HTMLElement).dataset.name;
      (btn as HTMLButtonElement).disabled = true;
      const res = await apiFetch('/api/cart', {
        method: 'POST',
        body: JSON.stringify({ product_id: parseInt(id!), quantity: 1 }),
      });
      (btn as HTMLButtonElement).disabled = false;
      if (res.success) {
        showToast(`Added "${name}" to cart`, 'success');
      } else if (res.error?.includes('Authentication') || res.error?.includes('401')) {
        window.location.href = '/login.html';
      } else {
        showToast(res.error || 'Could not add to cart', 'error');
      }
    });
  });
}

init();
