import { initLayout } from '../lib/layout';
import { requireUser } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { formatCurrency } from '../lib/format';
import { showToast } from '../lib/toast';

interface CartItem {
  id: number;
  product_name: string;
  price: number;
  quantity: number;
  primary_image?: string;
  artisan_name: string;
}

interface Cart {
  items: CartItem[];
  subtotal: number;
}

let appliedCoupon: { code: string; discount: number; type: string } | null = null;

async function init() {
  await initLayout();
  await requireUser('CUSTOMER');

  const res = await apiFetch<Cart>('/api/cart');
  if (!res.success || !res.data || !res.data.items.length) {
    window.location.href = '/cart.html';
    return;
  }

  renderCheckout(res.data);
}

function renderCheckout(cart: Cart) {
  const container = document.getElementById('checkout-content')!;
  container.innerHTML = `
    <form id="checkout-form">
      <div class="checkout-layout">
        <div>
          <div class="checkout-card">
            <h2>Shipping Address</h2>
            <div class="form-group">
              <label class="form-label">Full Name <span class="req">*</span></label>
              <input class="form-control" name="ship_name" required placeholder="As on ID">
              <p class="form-error" id="err-ship_name"></p>
            </div>
            <div class="form-group">
              <label class="form-label">Phone <span class="req">*</span></label>
              <input class="form-control" name="ship_phone" required placeholder="10-digit mobile number" maxlength="10">
              <p class="form-error" id="err-ship_phone"></p>
            </div>
            <div class="form-group">
              <label class="form-label">Address <span class="req">*</span></label>
              <textarea class="form-control" name="ship_address" required placeholder="House / Street / Locality" style="min-height:80px"></textarea>
              <p class="form-error" id="err-ship_address"></p>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">City <span class="req">*</span></label>
                <input class="form-control" name="ship_city" required>
                <p class="form-error" id="err-ship_city"></p>
              </div>
              <div class="form-group">
                <label class="form-label">State <span class="req">*</span></label>
                <input class="form-control" name="ship_state" required>
                <p class="form-error" id="err-ship_state"></p>
              </div>
            </div>
            <div class="form-group" style="max-width:180px">
              <label class="form-label">PIN Code <span class="req">*</span></label>
              <input class="form-control" name="ship_pincode" required placeholder="6 digits" maxlength="6">
              <p class="form-error" id="err-ship_pincode"></p>
            </div>
          </div>

          <div class="checkout-card">
            <h2>Coupon / Discount Code</h2>
            <div class="coupon-row">
              <input class="form-control" id="coupon-input" placeholder="Enter coupon code">
              <button type="button" class="btn btn-secondary" id="apply-coupon-btn">Apply</button>
              <button type="button" class="btn btn-danger btn-sm" id="remove-coupon-btn" style="display:none">Remove</button>
            </div>
            <div id="coupon-result" style="margin-top:0.5rem"></div>
          </div>

          <div id="form-error-global" class="alert alert-error" style="display:none"></div>

          <button type="submit" class="btn btn-primary btn-lg" id="place-order-btn" style="width:100%;justify-content:center">
            Place Order & Proceed to Payment →
          </button>
        </div>

        <aside>
          <div class="order-summary-card">
            <h3 style="margin-bottom:1rem">Order Summary</h3>
            ${cart.items.map(item => `
              <div class="order-summary-item">
                <img class="order-item-img" src="${item.primary_image || '/uploads/seed/placeholder.jpg'}" alt="${item.product_name}" onerror="this.src='/css/placeholder.svg'">
                <div style="flex:1">
                  <p style="font-size:0.875rem;font-weight:600">${item.product_name}</p>
                  <p style="font-size:0.75rem;color:var(--mud)">${item.artisan_name} · Qty: ${item.quantity}</p>
                </div>
                <span style="font-family:'IBM Plex Mono',monospace;font-size:0.875rem">${formatCurrency(item.price * item.quantity)}</span>
              </div>`).join('')}
            <div class="summary-totals">
              <div class="total-row"><span>Subtotal</span><span class="mono">${formatCurrency(cart.subtotal)}</span></div>
              <div class="total-row" id="discount-row" style="display:none;color:var(--leaf)"><span>Discount</span><span class="mono" id="discount-amount"></span></div>
              <div class="total-row"><span>Shipping</span><span style="color:var(--leaf)">Free</span></div>
              <div class="total-row grand"><span>Total</span><span class="mono" id="grand-total">${formatCurrency(cart.subtotal)}</span></div>
            </div>
          </div>
        </aside>
      </div>
    </form>`;

  setupCoupon(cart.subtotal);
  setupSubmit(cart.subtotal);
}

function setupCoupon(subtotal: number) {
  document.getElementById('apply-coupon-btn')?.addEventListener('click', async () => {
    const code = (document.getElementById('coupon-input') as HTMLInputElement).value.trim();
    if (!code) return;
    const res = await apiFetch<{ discount: number; type: string; message: string }>('/api/checkout/validate-coupon', {
      method: 'POST',
      body: JSON.stringify({ code, subtotal }),
    });
    const resultEl = document.getElementById('coupon-result')!;
    if (res.success && res.data) {
      appliedCoupon = { code, discount: res.data.discount, type: res.data.type };
      resultEl.innerHTML = `<div class="alert alert-success">${res.data.message || 'Coupon applied!'}</div>`;
      document.getElementById('remove-coupon-btn')!.style.display = 'inline-flex';
      updateTotal(subtotal);
    } else {
      appliedCoupon = null;
      resultEl.innerHTML = `<div class="alert alert-error">${res.error || 'Invalid coupon'}</div>`;
      updateTotal(subtotal);
    }
  });

  document.getElementById('remove-coupon-btn')?.addEventListener('click', () => {
    appliedCoupon = null;
    (document.getElementById('coupon-input') as HTMLInputElement).value = '';
    document.getElementById('coupon-result')!.innerHTML = '';
    document.getElementById('remove-coupon-btn')!.style.display = 'none';
    updateTotal(subtotal);
  });
}

function updateTotal(subtotal: number) {
  const discount = appliedCoupon?.discount || 0;
  const total = Math.max(0, subtotal - discount);
  const discountRow = document.getElementById('discount-row')!;
  if (discount > 0) {
    discountRow.style.display = 'flex';
    document.getElementById('discount-amount')!.textContent = `−${formatCurrency(discount)}`;
  } else {
    discountRow.style.display = 'none';
  }
  document.getElementById('grand-total')!.textContent = formatCurrency(total);
}

function setupSubmit(subtotal: number) {
  document.getElementById('checkout-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const btn = document.getElementById('place-order-btn') as HTMLButtonElement;

    // Clear errors
    document.querySelectorAll('.form-error').forEach(el => (el.textContent = ''));
    document.getElementById('form-error-global')!.style.display = 'none';

    const data: Record<string, string> = {};
    const fields = ['ship_name','ship_phone','ship_address','ship_city','ship_state','ship_pincode'];
    let valid = true;
    fields.forEach(f => {
      const el = form.querySelector<HTMLInputElement>(`[name="${f}"]`);
      const val = el?.value.trim() || '';
      data[f] = val;
      if (!val) {
        const errEl = document.getElementById(`err-${f}`);
        if (errEl) errEl.textContent = 'This field is required';
        valid = false;
      }
    });
    if (!valid) return;

    if (!/^\d{10}$/.test(data.ship_phone)) {
      document.getElementById('err-ship_phone')!.textContent = 'Enter a valid 10-digit phone number';
      return;
    }
    if (!/^\d{6}$/.test(data.ship_pincode)) {
      document.getElementById('err-ship_pincode')!.textContent = 'Enter a valid 6-digit PIN code';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Placing order…';

    const payload: Record<string, unknown> = { ...data };
    if (appliedCoupon) payload.coupon_code = appliedCoupon.code;

    const res = await apiFetch<{ order_id: number }>('/api/checkout/place-order', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    btn.disabled = false;
    btn.textContent = 'Place Order & Proceed to Payment →';

    if (res.success && res.data) {
      window.location.href = `/payment.html?orderId=${res.data.order_id}`;
    } else {
      const errEl = document.getElementById('form-error-global')!;
      errEl.textContent = res.error || 'Failed to place order. Please try again.';
      errEl.style.display = 'block';
    }
  });
}

init();
