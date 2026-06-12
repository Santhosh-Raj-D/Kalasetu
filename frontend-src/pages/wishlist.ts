import { initLayout } from '../lib/layout';
import { requireUser } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { formatCurrency, stars } from '../lib/format';
import { showToast } from '../lib/toast';

interface WishlistItem {
  id: number;
  product_id: number;
  product_name: string;
  product_slug: string;
  artisan_name: string;
  price: number;
  primary_image?: string;
  avg_rating?: number;
  review_count?: number;
  stock: number;
  status: string;
}

async function init() {
  await initLayout();
  await requireUser('CUSTOMER');
  await loadWishlist();
}

async function loadWishlist() {
  const grid = document.getElementById('wishlist-grid')!;
  const countEl = document.getElementById('wishlist-count')!;

  const res = await apiFetch<{ items: WishlistItem[] }>('/api/wishlist');
  if (!res.success || !res.data) {
    grid.innerHTML = `<div class="alert alert-error" style="grid-column:1/-1">${res.error || 'Failed to load wishlist'}</div>`;
    return;
  }

  const { items } = res.data;
  countEl.textContent = `${items.length} saved item${items.length !== 1 ? 's' : ''}`;

  if (!items.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">💛</div>
        <h3>Your wishlist is empty</h3>
        <p>Save products you love by clicking the heart icon.</p>
        <a href="/shop.html" class="btn btn-primary" style="margin-top:1rem">Discover Products</a>
      </div>`;
    return;
  }

  grid.innerHTML = items.map(item => `
    <article class="wishlist-card" data-wishlist-id="${item.id}" data-product-id="${item.product_id}">
      <a href="/product.html?slug=${item.product_slug}" style="text-decoration:none;color:inherit">
        <div class="wishlist-card-img">
          <img src="${item.primary_image || '/uploads/seed/placeholder.jpg'}" alt="${item.product_name}" loading="lazy" onerror="this.src='/css/placeholder.svg'">
        </div>
        <div class="wishlist-card-body">
          <p style="font-size:0.75rem;color:var(--mud);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:0.25rem">${item.artisan_name}</p>
          <h3 style="font-family:'Fraunces',serif;font-size:1rem;margin-bottom:0.5rem">${item.product_name}</h3>
          ${item.avg_rating ? stars(item.avg_rating, item.review_count) : ''}
          <p style="font-family:'IBM Plex Mono',monospace;color:var(--bronze);font-weight:500;margin-top:0.5rem">${formatCurrency(item.price)}</p>
          ${item.stock === 0 ? '<p style="font-size:0.8rem;color:#c0392b;margin-top:0.25rem">Out of stock</p>' : ''}
        </div>
      </a>
      <div class="wishlist-card-footer">
        <button class="btn btn-primary btn-sm move-to-cart-btn" data-id="${item.id}" data-product="${item.product_id}" data-name="${item.product_name}" ${item.stock === 0 ? 'disabled' : ''}>
          Add to Cart
        </button>
        <button class="btn btn-danger btn-sm remove-btn" data-id="${item.id}">Remove</button>
      </div>
    </article>`).join('');

  // Move to cart
  document.querySelectorAll('.move-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const productId = parseInt((btn as HTMLElement).dataset.product!);
      const name = (btn as HTMLElement).dataset.name;
      (btn as HTMLButtonElement).disabled = true;
      const res = await apiFetch('/api/cart', {
        method: 'POST',
        body: JSON.stringify({ product_id: productId, quantity: 1 }),
      });
      (btn as HTMLButtonElement).disabled = false;
      if (res.success) {
        showToast(`"${name}" added to cart`, 'success');
      } else {
        showToast(res.error || 'Could not add to cart', 'error');
      }
    });
  });

  // Remove from wishlist
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = (btn as HTMLElement).dataset.id;
      const res = await apiFetch(`/api/wishlist/${id}`, { method: 'DELETE' });
      if (res.success) {
        document.querySelector(`.wishlist-card[data-wishlist-id="${id}"]`)?.remove();
        const remaining = document.querySelectorAll('.wishlist-card').length;
        countEl.textContent = `${remaining} saved item${remaining !== 1 ? 's' : ''}`;
        if (!remaining) loadWishlist();
      } else {
        showToast(res.error || 'Remove failed', 'error');
      }
    });
  });
}

init();
