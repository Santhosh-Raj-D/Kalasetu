import { initLayout } from '../lib/layout';
import { requireUser } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { formatCurrency, formatDate, statusChip } from '../lib/format';
import { showToast } from '../lib/toast';

interface Order {
  id: number;
  order_number: string;
  total_amount: number;
  subtotal: number;
  discount_amount?: number;
  status: string;
  created_at: string;
  items: { product_name: string; quantity: number; unit_price: number }[];
}

async function init() {
  await initLayout();
  await requireUser('CUSTOMER');

  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('orderId');
  if (!orderId) { window.location.href = '/orders.html'; return; }

  const res = await apiFetch<Order>(`/api/orders/${orderId}`);
  if (!res.success || !res.data) {
    document.getElementById('payment-content')!.innerHTML = `<div class="alert alert-error">${res.error || 'Order not found'}</div>`;
    return;
  }

  renderPayment(res.data);
}

function renderPayment(order: Order) {
  const container = document.getElementById('payment-content')!;
  container.innerHTML = `
    <form id="payment-form">
      <div class="payment-layout">
        <div>
          <div class="payment-card">
            <h2>Select Payment Method</h2>
            <div class="method-options">
              <label class="method-option">
                <input type="radio" name="payment_method" value="MOCK_CARD" checked>
                <div>
                  <p class="method-label">💳 Card (Mock)</p>
                  <p class="method-sub">Simulated card payment — no real charge</p>
                </div>
              </label>
              <label class="method-option">
                <input type="radio" name="payment_method" value="MOCK_UPI">
                <div>
                  <p class="method-label">📱 UPI (Mock)</p>
                  <p class="method-sub">Simulated UPI payment</p>
                </div>
              </label>
              <label class="method-option">
                <input type="radio" name="payment_method" value="COD">
                <div>
                  <p class="method-label">💵 Cash on Delivery</p>
                  <p class="method-sub">Pay when your order arrives</p>
                </div>
              </label>
            </div>
          </div>

          <div class="payment-card" id="card-fields-panel">
            <h2>Card Details (Mock)</h2>
            <div class="mock-warning">
              ⚠️ This is a mock payment environment. No real card data is processed.
            </div>
            <div class="card-fields">
              <div class="form-group">
                <label class="form-label">Card Number</label>
                <input class="form-control" id="mock_card_number" placeholder="4242 4242 4242 4242" maxlength="19">
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
                <div class="form-group">
                  <label class="form-label">Expiry</label>
                  <input class="form-control" id="mock_expiry" placeholder="MM/YY" maxlength="5">
                </div>
                <div class="form-group">
                  <label class="form-label">CVV</label>
                  <input class="form-control" id="mock_cvv" placeholder="123" maxlength="3">
                </div>
              </div>
            </div>
          </div>

          <div class="payment-card" id="upi-fields-panel" style="display:none">
            <h2>UPI Details (Mock)</h2>
            <div class="mock-warning">⚠️ Mock UPI — no real transaction occurs.</div>
            <div class="form-group" style="margin-top:1rem">
              <label class="form-label">UPI ID</label>
              <input class="form-control" id="mock_upi_id" placeholder="yourname@upi">
            </div>
          </div>

          <div class="payment-card">
            <div class="simulate-fail-row">
              <input type="checkbox" id="simulate-failure" name="simulate_failure">
              <div>
                <label for="simulate-failure" style="font-weight:600;cursor:pointer">Simulate Payment Failure</label>
                <p style="font-size:0.8rem;color:#c0392b;margin-top:0.1rem">Check this to test the failure flow — your order will remain pending.</p>
              </div>
            </div>
          </div>

          <div id="payment-error" class="alert alert-error" style="display:none"></div>

          <button type="submit" class="btn btn-primary btn-lg" id="pay-btn" style="width:100%;justify-content:center">
            Pay ${formatCurrency(order.total_amount)}
          </button>
          <p style="text-align:center;font-size:0.75rem;color:var(--mud);margin-top:0.75rem">🔒 Secure mock payment environment</p>
        </div>

        <aside>
          <div class="order-mini">
            <h3 style="margin-bottom:1rem">Order #${order.order_number}</h3>
            <p style="font-size:0.8rem;color:var(--mud);margin-bottom:1rem">${formatDate(order.created_at)}</p>
            ${order.items.map(i => `
              <div class="order-mini-row">
                <span>${i.product_name} × ${i.quantity}</span>
                <span style="font-family:'IBM Plex Mono',monospace">${formatCurrency(i.unit_price * i.quantity)}</span>
              </div>`).join('')}
            ${order.discount_amount ? `<div class="order-mini-row" style="color:var(--leaf)"><span>Discount</span><span>−${formatCurrency(order.discount_amount)}</span></div>` : ''}
            <div class="order-mini-row total">
              <span>Total</span>
              <span style="font-family:'IBM Plex Mono',monospace">${formatCurrency(order.total_amount)}</span>
            </div>
            <div style="margin-top:0.75rem">${statusChip(order.status)}</div>
          </div>
        </aside>
      </div>
    </form>`;

  setupMethodToggle();
  setupCardFormatting();
  setupSubmit(order.id, order.total_amount);
}

function setupMethodToggle() {
  document.querySelectorAll('input[name="payment_method"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const val = (radio as HTMLInputElement).value;
      const cardPanel = document.getElementById('card-fields-panel')!;
      const upiPanel = document.getElementById('upi-fields-panel')!;
      cardPanel.style.display = val === 'MOCK_CARD' ? 'block' : 'none';
      upiPanel.style.display = val === 'MOCK_UPI' ? 'block' : 'none';
    });
  });
}

function setupCardFormatting() {
  const cardInput = document.getElementById('mock_card_number') as HTMLInputElement;
  cardInput?.addEventListener('input', () => {
    let v = cardInput.value.replace(/\D/g, '').slice(0, 16);
    cardInput.value = v.replace(/(.{4})/g, '$1 ').trim();
  });
  const expiryInput = document.getElementById('mock_expiry') as HTMLInputElement;
  expiryInput?.addEventListener('input', () => {
    let v = expiryInput.value.replace(/\D/g, '').slice(0, 4);
    if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
    expiryInput.value = v;
  });
}

function setupSubmit(orderId: number, amount: number) {
  document.getElementById('payment-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('pay-btn') as HTMLButtonElement;
    const errEl = document.getElementById('payment-error')!;
    errEl.style.display = 'none';

    const method = (document.querySelector<HTMLInputElement>('input[name="payment_method"]:checked'))?.value;
    const simulateFailure = (document.getElementById('simulate-failure') as HTMLInputElement).checked;

    const payload: Record<string, unknown> = {
      order_id: orderId,
      payment_method: method,
      simulate_failure: simulateFailure,
    };

    if (method === 'MOCK_CARD') {
      payload.card_number = (document.getElementById('mock_card_number') as HTMLInputElement).value.replace(/\s/g, '');
      payload.expiry = (document.getElementById('mock_expiry') as HTMLInputElement).value;
      payload.cvv = (document.getElementById('mock_cvv') as HTMLInputElement).value;
    } else if (method === 'MOCK_UPI') {
      payload.upi_id = (document.getElementById('mock_upi_id') as HTMLInputElement).value;
    }

    btn.disabled = true;
    btn.textContent = 'Processing…';

    const res = await apiFetch<{ transaction_id: string }>('/api/payments/mock', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    btn.disabled = false;
    btn.textContent = `Pay ${formatCurrency(amount)}`;

    if (res.success) {
      window.location.href = `/order-success.html?orderId=${orderId}`;
    } else {
      errEl.textContent = res.error || 'Payment failed. Please try again.';
      errEl.style.display = 'block';
      showToast('Payment failed', 'error');
    }
  });
}

init();
