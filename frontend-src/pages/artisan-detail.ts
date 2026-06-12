import { initLayout } from '../lib/layout';
import { apiFetch } from '../lib/api';
import { productCard } from '../lib/format';

interface ArtisanDetail {
  id: number;
  name: string;
  tribe_name: string;
  region: string;
  craft_tradition: string;
  story: string;
  years_experience: number;
  profile_image?: string;
  cover_image?: string;
}

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  status?: string;
  primary_image?: string;
  artisan_name?: string;
  category_name?: string;
  avg_rating?: number;
  review_count?: number;
}

async function init() {
  await initLayout();

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    window.location.href = '/artisans.html';
    return;
  }

  await loadArtisan(id);
  await loadProducts(id);
}

async function loadArtisan(id: string) {
  const res = await apiFetch<ArtisanDetail>(`/api/artisans/${id}`);
  if (!res.success || !res.data) {
    document.getElementById('artisan-cover')!.innerHTML = '<div class="artisan-cover-placeholder"></div>';
    document.getElementById('artisan-profile')!.innerHTML = '<div class="container" style="padding:2rem"><p>Artisan not found.</p></div>';
    return;
  }

  const a = res.data;
  document.title = `${a.name} — KalaSetu`;

  // Cover
  const coverEl = document.getElementById('artisan-cover')!;
  if (a.cover_image) {
    coverEl.innerHTML = `<img class="artisan-cover" src="${a.cover_image}" alt="${a.name} cover" onerror="this.parentElement.innerHTML='<div class=&quot;artisan-cover-placeholder&quot;></div>'">`;
  } else {
    coverEl.innerHTML = '<div class="artisan-cover-placeholder"></div>';
  }

  // Profile
  const avatar = a.profile_image || '/uploads/seed/placeholder.jpg';
  document.getElementById('artisan-profile')!.innerHTML = `
    <div class="artisan-avatar-wrap">
      <div class="artisan-avatar">
        <img src="${avatar}" alt="${a.name}" onerror="this.src='/css/placeholder.svg'">
      </div>
    </div>
    <div class="artisan-info">
      <h1>${a.name}</h1>
      <p class="tribe-region">${[a.tribe_name, a.region].filter(Boolean).join(' · ')}</p>
      ${a.craft_tradition ? `<span class="artisan-tradition">${a.craft_tradition}</span>` : ''}
      ${a.years_experience ? `<p class="years-badge">🏺 ${a.years_experience} years of practice</p>` : ''}
      ${a.story ? `<p class="artisan-story">${a.story.replace(/\n/g, '<br>')}</p>` : ''}
    </div>`;
}

async function loadProducts(artisanId: string) {
  const grid = document.getElementById('products-grid')!;
  const empty = document.getElementById('empty-products')!;

  const res = await apiFetch<{ products: Product[]; total: number }>(`/api/products?artisan=${artisanId}&status=APPROVED&limit=12`);

  if (!res.success || !res.data || !res.data.products.length) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  grid.innerHTML = res.data.products.map(p => productCard(p)).join('');
  setupCartButtons();
}

function setupCartButtons() {
  const { apiFetch: apiF } = { apiFetch } as { apiFetch: typeof apiFetch };
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const id = (btn as HTMLElement).dataset.id;
      const name = (btn as HTMLElement).dataset.name;
      (btn as HTMLButtonElement).disabled = true;
      const res = await apiF('/api/cart', {
        method: 'POST',
        body: JSON.stringify({ product_id: parseInt(id!), quantity: 1 }),
      });
      (btn as HTMLButtonElement).disabled = false;
      if (!res.success) {
        if (res.error?.includes('401') || res.error?.includes('Authentication')) {
          window.location.href = '/login.html';
        } else {
          const { showToast } = await import('../lib/toast');
          showToast(res.error || 'Could not add to cart', 'error');
        }
      } else {
        const { showToast } = await import('../lib/toast');
        showToast(`Added "${name}" to cart`, 'success');
      }
    });
  });
}

init();
