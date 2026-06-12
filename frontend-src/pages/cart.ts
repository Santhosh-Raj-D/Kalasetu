import { initLayout } from '../lib/layout';
import { requireUser } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { formatCurrency } from '../lib/format';
import { showToast } from '../lib/toast';

interface CartItem {
  id: number;
  product_id: number;
  product_name: string;
  product_slug: string;
  artisan_name: string;
  price: number;
  quantity: number;
  primary_image?: string;
  stock: number;
}

interface Cart {
  items: CartItem[];
  subtotal: number;
}

async function init() {
  await initLayout();
  await requireUser('CUSTOMER');
  await loadCart();
}

async function loadCart() {
  const container = document.getElementById('cart-content')!;
  const res = await apiFetch<Cart>('/api/cart');

  if (!res.success || !res.data) {
    container.innerHTML = `<div class="alert alert-error">${res.error || 'Failed to load cart'}</div>`;
    return;
  }

  const { items, subtotal } = res.data;

  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🛒</div>
        <h3>Your cart is empty</h3>
        <p>Discover beautiful handcrafted products from our artisans.</p>
        <a href="/shop.html" class="btn btn-primary" style="margin-top:1rem">Explore the Shop</a>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="cart-layout">
      <div>
        <div class="table-wrap">
          <table id="cart-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="cart-tbody"></tbody>
          </table>
        </div>
        <div style="margin-top:1rem;display:flex;gap:1rem;flex-wrap:wrap">
          <a href="/shop.html" class="btn btn-secondary btn-sm">← Continue Shopping</a>
          <button class="btn btn-danger btn-sm" id="clear-cart-btn">Clear Cart</button>
        </div>
      </div>
      <aside>
        <div class="summary-card">
          <h3 style="margin-bottom:1rem">Order Summary</h3>
          <div class="summary-row"><span>Items (${items.length})</span><span class="mono" id="summary-subtotal">${formatCurrency(subtotal)}</span></div>
          <div class="summary-row"><span>Shipping</span><span style="color:var(--leaf);font-weight:600">Calculated at checkout</span></div>
          <div class="summary-row total"><span>Subtotal</span><span class="mono">${formatCurrency(subtotal)}</span></div>
          <a href="/checkout.html" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:1rem">Proceed to Checkout →</a>
          <p style="font-size:0.75rem;color:var(--mud);margin-top:0.75rem;text-align:center">Secure checkout · Artisan-verified products</p>
        </div>
      </aside>
    </div>`;

  renderCartRows(items);
  setupCartActions(items);
}

function renderCartRows(items: CartItem[]) {
  const tbody = document.getElementById('cart-tbody')!;
  tbody.innerHTML = items.map(item => `
    <tr data-id="${item.id}" data-product="${item.product_id}">
      <td>
        <div style="display:flex;gap:0.75rem;align-items:center">
          <img class="cart-item-img" src="${item.primary_image || '/uploads/seed/placeholder.jpg'}" alt="${item.product_name}" onerror="this.src='/css/placeholder.svg'">
          <div>
            <a href="/product.html?slug=${item.product_slug}" style="font-weight:600;color:var(--ink)">${item.product_name}</a>
            <p style="font-size:0.8rem;color:var(--mud)">${item.artisan_name}</p>
          </div>
        </div>
      </td>
      <td><span class="mono">${formatCurrency(item.price)}</span></td>
      <td>
        <div class="qty-controls">
          <button class="qty-btn qty-dec" data-id="${item.id}">−</button>
          <span class="qty-value" id="qty-${item.id}">${item.quantity}</span>
          <button class="qty-btn qty-inc" data-id="${item.id}" ${item.quantity >= item.stock ? 'disabled' : ''}>+</button>
        </div>
      </td>
      <td><span class="mono item-total-${item.id}">${formatCurrency(item.price * item.quantity)}</span></td>
      <td><button class="btn btn-danger btn-sm remove-btn" data-id="${item.id}">Remove</button></td>
    </tr>`).join('');
}

function setupCartActions(items: CartItem[]) {
  let cartItems = [...items];

  async function updateQty(cartItemId: number, delta: number) {
    const item = cartItems.find(i => i.id === cartItemId);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty < 1) return;
    if (newQty > item.stock) { showToast('Not enough stock', 'error'); return; }

    const res = await apiFetch(`/api/cart/${cartItemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity: newQty }),
    });
    if (!res.success) { showToast(res.error || 'Update failed', 'error'); return; }

    item.quantity = newQty;
    const qtyEl = document.getElementById(`qty-${cartItemId}`);
    if (qtyEl) qtyEl.textContent = String(newQty);
    const totalEl = document.querySelector(`.item-total-${cartItemId}`);
    if (totalEl) totalEl.textContent = formatCurrency(item.price * newQty);
    updateSubtotal(cartItems);
  }

  function updateSubtotal(items: CartItem[]) {
    const sub = items.reduce((acc, i) => acc + i.price * i.quantity, 0);
    const el = document.getElementById('summary-subtotal');
    if (el) el.textContent = formatCurrency(sub);
  }

  document.querySelectorAll('.qty-dec').forEach(btn => {
    btn.addEventListener('click', () => updateQty(parseInt((btn as HTMLElement).dataset.id!), -1));
  });
  document.querySelectorAll('.qty-inc').forEach(btn => {
    btn.addEventListener('click', () => updateQty(parseInt((btn as HTMLElement).dataset.id!), 1));
  });
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = parseInt((btn as HTMLElement).dataset.id!);
      const res = await apiFetch(`/api/cart/${id}`, { method: 'DELETE' });
      if (res.success) {
        cartItems = cartItems.filter(i => i.id !== id);
        document.querySelector(`tr[data-id="${id}"]`)?.remove();
        updateSubtotal(cartItems);
        if (!cartItems.length) loadCart();
      } else {
        showToast(res.error || 'Remove failed', 'error');
      }
    });
  });

  document.getElementById('clear-cart-btn')?.addEventListener('click', async () => {
    if (!confirm('Remove all items from cart?')) return;
    const res = await apiFetch('/api/cart', { method: 'DELETE' });
    if (res.success) loadCart();
    else showToast(res.error || 'Failed to clear cart', 'error');
  });
}

init();
