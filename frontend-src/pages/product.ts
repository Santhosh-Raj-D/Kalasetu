import { initLayout } from '../lib/layout';
import { apiFetch } from '../lib/api';
import { formatCurrency, formatDate, stars } from '../lib/format';
import { showToast } from '../lib/toast';
import { getUser } from '../lib/auth';

const slug = new URLSearchParams(window.location.search).get('slug');

async function init() {
  await initLayout();
  if (!slug) { window.location.href = '/shop.html'; return; }
  await loadProduct();
}

async function loadProduct() {
  const container = document.getElementById('product-container')!;
  const res = await apiFetch<{
    id: number; name: string; description: string; price: number; stock: number;
    status: string; artisan_id: number; artisan_name: string; category_name: string;
    craft_technique: string; materials: string; cultural_notes: string;
    avg_rating: number; review_count: number; is_featured: boolean;
    images: { image_path: string; is_primary: boolean }[];
    reviews: { id: number; customer_name: string; rating: number; comment: string; created_at: string }[];
  }>(`/api/products/${slug}`);

  if (!res.success || !res.data) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🏺</div><h3>Product not found</h3><a href="/shop.html" class="btn btn-primary">Back to Shop</a></div>`;
    return;
  }

  const p = res.data;
  document.title = `${p.name} — KalaSetu`;

  const user = await getUser();
  const isCustomer = user?.role === 'CUSTOMER';
  const isBusiness = user?.is_business;

  const primaryImg = p.images.find(i => i.is_primary)?.image_path || p.images[0]?.image_path || '/css/placeholder.svg';

  container.innerHTML = `
    <p style="font-size:0.8rem;color:var(--mud);margin-bottom:1.5rem">
      <a href="/">Home</a> / <a href="/shop.html">Shop</a> / ${p.category_name} / ${p.name}
    </p>
    <div class="product-layout">
      <div>
        <div class="gallery-main">
          <img src="${primaryImg}" alt="${p.name}" id="main-img" loading="eager">
        </div>
        ${p.images.length > 1 ? `
        <div class="gallery-thumbs">
          ${p.images.map((img, i) => `
            <div class="gallery-thumb ${i === 0 || img.is_primary ? 'active' : ''}" data-src="${img.image_path}">
              <img src="${img.image_path}" alt="${p.name}" loading="lazy">
            </div>`).join('')}
        </div>` : ''}
      </div>
      <div class="product-info">
        <div class="product-badges">
          ${p.status === 'APPROVED' ? '<span class="badge-authentic">Authentic</span>' : ''}
          ${p.is_featured ? '<span class="chip chip-approved">Featured</span>' : ''}
        </div>
        <h1>${p.name}</h1>
        <p class="product-meta">
          ${p.category_name} · by <a href="/artisan.html?id=${p.artisan_id}">${p.artisan_name}</a>
          ${p.avg_rating ? `· ${stars(p.avg_rating, p.review_count)}` : ''}
        </p>
        <div class="product-price">${formatCurrency(p.price)}</div>
        ${p.stock === 0 ? '<p style="color:#c0392b;font-weight:600">Out of Stock</p>' : `<p style="color:var(--leaf);font-size:0.875rem">✓ In stock (${p.stock} available)</p>`}

        ${p.stock > 0 && isCustomer ? `
        <div style="margin-top:1rem">
          <div class="qty-control">
            <button class="qty-btn" id="qty-minus">−</button>
            <input type="number" class="qty-input" id="qty" value="1" min="1" max="${p.stock}">
            <button class="qty-btn" id="qty-plus">+</button>
          </div>
          <div class="product-actions">
            <button class="btn btn-primary" id="add-to-cart-btn" data-id="${p.id}">Add to Cart</button>
            <button class="btn btn-secondary" id="wishlist-btn" data-id="${p.id}">♡ Wishlist</button>
            <a href="/messages.html?artisan=${p.artisan_id}" class="btn btn-secondary">Message Artisan</a>
          </div>
          ${isBusiness ? `<button class="btn btn-secondary" style="margin-top:0.5rem;width:100%" id="inquiry-btn">Request Bulk Quote</button>` : ''}
        </div>` : ''}
        ${!user ? `<a href="/login.html" class="btn btn-primary" style="margin-top:1rem">Sign In to Purchase</a>` : ''}

        ${p.cultural_notes ? `
        <div class="cultural-notes">
          <h4>📜 Cultural Heritage Notes</h4>
          <p>${p.cultural_notes}</p>
        </div>` : ''}
      </div>
    </div>

    <!-- Tabs -->
    <div class="product-tabs">
      <button class="tab-btn active" data-tab="description">Description</button>
      ${p.craft_technique || p.materials ? `<button class="tab-btn" data-tab="craft">Craft Details</button>` : ''}
      <button class="tab-btn" data-tab="reviews">Reviews (${p.review_count || 0})</button>
    </div>

    <div id="tab-description">
      <p style="line-height:1.8;max-width:720px">${p.description}</p>
    </div>
    <div id="tab-craft" style="display:none">
      ${p.craft_technique ? `<p><strong>Technique:</strong> ${p.craft_technique}</p>` : ''}
      ${p.materials ? `<p style="margin-top:0.75rem"><strong>Materials:</strong> ${p.materials}</p>` : ''}
    </div>
    <div id="tab-reviews" style="display:none">
      ${isCustomer ? `
      <div style="background:white;border:2px solid var(--bone-dark);border-radius:4px;padding:1.5rem;margin-bottom:2rem">
        <h3 style="margin-bottom:1rem">Write a Review</h3>
        <div id="review-form-container">
          <div class="form-group">
            <label class="form-label">Rating</label>
            <div id="star-picker" style="font-size:1.5rem;cursor:pointer;letter-spacing:4px">
              <span data-val="1">☆</span><span data-val="2">☆</span><span data-val="3">☆</span><span data-val="4">☆</span><span data-val="5">☆</span>
            </div>
            <input type="hidden" id="review-rating" value="0">
          </div>
          <div class="form-group">
            <label class="form-label" for="review-comment">Comment</label>
            <textarea id="review-comment" class="form-control"></textarea>
          </div>
          <button class="btn btn-primary" id="submit-review-btn" data-product="${p.id}">Submit Review</button>
        </div>
      </div>` : ''}
      <div id="reviews-list">
        ${p.reviews.length === 0 ? `<div class="empty-state"><p>No reviews yet. Be the first to review!</p></div>` :
          p.reviews.map(r => `
          <div class="review-item">
            <div class="review-header">
              <span class="review-name">${r.customer_name}</span>
              <span class="stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
              <span class="review-date">${formatDate(r.created_at)}</span>
              <span class="chip chip-approved" style="font-size:0.65rem">Verified Purchase</span>
            </div>
            ${r.comment ? `<p class="review-body">${r.comment}</p>` : ''}
          </div>`).join('')}
      </div>
    </div>`;

  setupTabs();
  setupGallery();
  setupActions(p.id, p.name);
  setupInquiry(p.id, p.name);
}

function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = (btn as HTMLElement).dataset.tab!;
      ['description', 'craft', 'reviews'].forEach(t => {
        const el = document.getElementById(`tab-${t}`);
        if (el) el.style.display = t === tab ? 'block' : 'none';
      });
    });
  });
}

function setupGallery() {
  const mainImg = document.getElementById('main-img') as HTMLImageElement;
  document.querySelectorAll('.gallery-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
      mainImg.src = (thumb as HTMLElement).dataset.src!;
    });
  });
}

function setupActions(productId: number, productName: string) {
  const qtyInput = document.getElementById('qty') as HTMLInputElement;
  const maxQty = parseInt(qtyInput?.max || '99');

  document.getElementById('qty-minus')?.addEventListener('click', () => {
    const v = parseInt(qtyInput.value);
    if (v > 1) qtyInput.value = String(v - 1);
  });
  document.getElementById('qty-plus')?.addEventListener('click', () => {
    const v = parseInt(qtyInput.value);
    if (v < maxQty) qtyInput.value = String(v + 1);
  });

  document.getElementById('add-to-cart-btn')?.addEventListener('click', async () => {
    const qty = parseInt(qtyInput?.value || '1');
    const res = await apiFetch('/api/cart', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, quantity: qty }),
    });
    if (res.success) showToast(`Added to cart!`, 'success');
    else showToast(res.error || 'Could not add to cart', 'error');
  });

  document.getElementById('wishlist-btn')?.addEventListener('click', async () => {
    const res = await apiFetch('/api/wishlist', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId }),
    });
    if (res.success) showToast('Added to wishlist', 'success');
    else showToast(res.error || 'Could not add to wishlist', 'error');
  });

  // Star picker
  let selectedRating = 0;
  document.querySelectorAll('#star-picker span').forEach(star => {
    star.addEventListener('mouseenter', () => {
      const val = parseInt((star as HTMLElement).dataset.val!);
      highlightStars(val);
    });
    star.addEventListener('mouseleave', () => highlightStars(selectedRating));
    star.addEventListener('click', () => {
      selectedRating = parseInt((star as HTMLElement).dataset.val!);
      (document.getElementById('review-rating') as HTMLInputElement).value = String(selectedRating);
      highlightStars(selectedRating);
    });
  });

  document.getElementById('submit-review-btn')?.addEventListener('click', async () => {
    const rating = parseInt((document.getElementById('review-rating') as HTMLInputElement).value);
    if (rating < 1) { showToast('Please select a rating', 'error'); return; }
    const comment = (document.getElementById('review-comment') as HTMLTextAreaElement).value;
    const res = await apiFetch('/api/reviews', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, rating, comment }),
    });
    if (res.success) {
      showToast('Review submitted!', 'success');
      document.getElementById('review-form-container')!.innerHTML = '<p class="alert alert-success">Thank you for your review!</p>';
    } else {
      showToast(res.error || 'Could not submit review', 'error');
    }
  });
}

function highlightStars(val: number) {
  document.querySelectorAll('#star-picker span').forEach((star, i) => {
    star.textContent = i < val ? '★' : '☆';
    (star as HTMLElement).style.color = i < val ? '#f59e0b' : 'var(--mud)';
  });
}

function setupInquiry(productId: number, productName: string) {
  document.getElementById('inquiry-btn')?.addEventListener('click', () => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header"><h3>Request Bulk Quote</h3><button class="modal-close" id="close-inq">✕</button></div>
        <div class="modal-body">
          <p style="margin-bottom:1rem;font-size:0.875rem">Product: <strong>${productName}</strong></p>
          <div class="form-group">
            <label class="form-label">Quantity Required <span class="req">*</span></label>
            <input type="number" id="inq-qty" class="form-control" min="1" placeholder="e.g. 100">
          </div>
          <div class="form-group">
            <label class="form-label">Target Price per Unit (₹)</label>
            <input type="number" id="inq-price" class="form-control" min="0" placeholder="optional">
          </div>
          <div class="form-group">
            <label class="form-label">Message</label>
            <textarea id="inq-message" class="form-control" placeholder="Describe your requirements, packaging needs, etc."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="close-inq2">Cancel</button>
          <button class="btn btn-primary" id="submit-inq">Submit Inquiry</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('close-inq')?.addEventListener('click', () => modal.remove());
    document.getElementById('close-inq2')?.addEventListener('click', () => modal.remove());
    document.getElementById('submit-inq')?.addEventListener('click', async () => {
      const qty = parseInt((document.getElementById('inq-qty') as HTMLInputElement).value);
      if (!qty || qty < 1) { showToast('Please enter a quantity', 'error'); return; }
      const res = await apiFetch('/api/inquiries', {
        method: 'POST',
        body: JSON.stringify({
          product_id: productId,
          quantity: qty,
          target_price: (document.getElementById('inq-price') as HTMLInputElement).value || undefined,
          message: (document.getElementById('inq-message') as HTMLTextAreaElement).value,
        }),
      });
      if (res.success) {
        showToast('Inquiry submitted!', 'success');
        modal.remove();
      } else {
        showToast(res.error || 'Could not submit inquiry', 'error');
      }
    });
  });
}

init();
