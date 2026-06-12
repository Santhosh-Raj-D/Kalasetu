import { initLayout } from '../lib/layout';
import { apiFetch } from '../lib/api';
import { productCard, formatCurrency } from '../lib/format';
import { showToast } from '../lib/toast';

const CATEGORY_ICONS: Record<string, string> = {
  'metal-craft': '🔔',
  'paintings': '🎨',
  'textiles-embroidery': '🧵',
  'bamboo-cane': '🎋',
  'pottery-terracotta': '🏺',
  'jewellery': '💍',
};

async function init() {
  await initLayout();
  await Promise.all([loadFeatured(), loadCategories(), loadArtisans()]);
  setupCartButtons();
}

async function loadFeatured() {
  const res = await apiFetch<{ products: Record<string, unknown>[]; total: number }>('/api/products?featured=true&limit=4');
  const grid = document.getElementById('featured-grid')!;
  if (!res.success || !res.data?.products?.length) {
    grid.innerHTML = '<p class="empty-state">No featured products yet.</p>';
    return;
  }
  grid.innerHTML = res.data.products.map(p => productCard(p as Parameters<typeof productCard>[0])).join('');
}

async function loadCategories() {
  const res = await apiFetch<{ id: number; name: string; slug: string; description: string }[]>('/api/categories');
  const grid = document.getElementById('category-grid')!;
  if (!res.success || !res.data?.length) return;
  grid.innerHTML = res.data.map(c => `
    <a href="/shop.html?category=${c.slug}" class="category-card">
      <div class="cat-icon">${CATEGORY_ICONS[c.slug] || '🎁'}</div>
      <h4>${c.name}</h4>
    </a>`).join('');
}

async function loadArtisans() {
  const res = await apiFetch<{ user_id: number; tribe_name: string; region: string; craft_tradition: string; profile_image: string; cover_image: string; name: string }[]>('/api/artisans');
  const grid = document.getElementById('artisan-grid')!;
  if (!res.success || !res.data?.length) return;
  grid.innerHTML = res.data.slice(0, 4).map(a => `
    <a href="/artisan.html?id=${a.user_id}" class="artisan-card">
      <div class="artisan-cover">
        ${a.cover_image ? `<img src="${a.cover_image}" alt="${a.name}" class="artisan-cover-img" loading="lazy">` : ''}
        <div class="artisan-avatar">
          ${a.profile_image ? `<img src="${a.profile_image}" alt="${a.name}">` : ''}
        </div>
      </div>
      <div class="artisan-card-body">
        <p class="artisan-card-name">${a.name}</p>
        <p class="artisan-card-craft">${a.craft_tradition}</p>
        <p class="artisan-card-region">📍 ${a.region}</p>
      </div>
    </a>`).join('');
}

function setupCartButtons() {
  document.addEventListener('click', async (e) => {
    const btn = (e.target as Element).closest('.add-to-cart-btn') as HTMLButtonElement | null;
    if (!btn) return;
    const id = btn.dataset.id;
    const name = btn.dataset.name;
    btn.disabled = true;
    const res = await apiFetch('/api/cart', {
      method: 'POST',
      body: JSON.stringify({ product_id: parseInt(id!), quantity: 1 }),
    });
    btn.disabled = false;
    if (res.success) {
      showToast(`Added "${name}" to cart`, 'success');
    } else {
      if (res.error?.includes('Authentication')) {
        window.location.href = '/login.html';
      } else {
        showToast(res.error || 'Could not add to cart', 'error');
      }
    }
  });
}

init();
