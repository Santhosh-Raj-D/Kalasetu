import { initLayout } from '../lib/layout';
import { requireUser } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { formatCurrency, formatDate, statusChip } from '../lib/format';
import { showToast } from '../lib/toast';

interface Inquiry {
  id: number;
  inquiry_number: string;
  product_id: number;
  product_name: string;
  business_name?: string;
  customer_name: string;
  quantity: number;
  target_price?: number;
  requirements?: string;
  status: string;
  created_at: string;
  quoted_unit_price?: number;
  lead_time_days?: number;
  quote_notes?: string;
}

async function init() {
  await initLayout();
  await requireUser('ARTISAN');
  await loadInquiries();
  setupQuoteModal();
}

async function loadInquiries() {
  const container = document.getElementById('inquiries-content')!;
  const res = await apiFetch<{ inquiries: Inquiry[] }>('/api/inquiries');

  if (!res.success || !res.data) {
    container.innerHTML = `<div class="alert alert-error">${res.error || 'Failed to load inquiries'}</div>`;
    return;
  }

  const { inquiries } = res.data;
  if (!inquiries.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>No inquiries yet</h3>
        <p>When business buyers inquire about your products, they'll appear here.</p>
      </div>`;
    return;
  }

  container.innerHTML = inquiries.map(inq => {
    const isOpen = inq.status === 'OPEN';
    return `
      <div class="inquiry-card ${isOpen ? 'open-inquiry' : ''}" data-id="${inq.id}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;flex-wrap:wrap">
          <div>
            <p style="font-family:'Fraunces',serif;font-size:1rem;font-weight:600">${inq.product_name}</p>
            <p style="font-size:0.8rem;color:var(--mud)">
              From: ${inq.business_name || inq.customer_name} · Inquiry #${inq.inquiry_number} · ${formatDate(inq.created_at)}
            </p>
          </div>
          ${statusChip(inq.status)}
        </div>
        ${inq.requirements ? `<p style="font-size:0.875rem;margin-top:0.5rem;color:var(--ink-light)">${inq.requirements}</p>` : ''}
        <div style="display:flex;gap:1.5rem;margin-top:0.75rem;flex-wrap:wrap">
          <div>
            <span style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--mud)">Quantity</span>
            <p style="font-weight:700;font-family:'IBM Plex Mono',monospace">${inq.quantity} units</p>
          </div>
          ${inq.target_price ? `<div>
            <span style="font-size:0.7rem;text-transform:uppercase;letter-spacing:0.06em;color:var(--mud)">Target Price</span>
            <p style="font-weight:700;font-family:'IBM Plex Mono',monospace">${formatCurrency(inq.target_price)}/unit</p>
          </div>` : ''}
        </div>
        ${inq.status === 'QUOTED' ? `
        <div style="background:#f0fdf4;border:1px solid #6ee7b7;border-radius:var(--radius);padding:0.875rem;margin-top:0.75rem">
          <p style="font-size:0.8rem;font-weight:600;color:#065f46;margin-bottom:0.35rem">Your Quote</p>
          <p style="font-size:0.875rem">₹${inq.quoted_unit_price}/unit · ${inq.lead_time_days} days lead time</p>
          ${inq.quote_notes ? `<p style="font-size:0.8rem;color:#065f46;margin-top:0.25rem">${inq.quote_notes}</p>` : ''}
        </div>` : ''}
        ${isOpen ? `<button class="btn btn-primary btn-sm open-quote-btn" data-id="${inq.id}" data-product="${inq.product_name}" data-qty="${inq.quantity}" data-target="${inq.target_price || ''}" style="margin-top:1rem">Submit Quote</button>` : ''}
      </div>`;
  }).join('');

  document.querySelectorAll('.open-quote-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.id!;
      const product = (btn as HTMLElement).dataset.product!;
      const qty = (btn as HTMLElement).dataset.qty!;
      const target = (btn as HTMLElement).dataset.target;
      openQuoteModal(id, product, qty, target);
    });
  });
}

function openQuoteModal(id: string, product: string, qty: string, target?: string) {
  (document.getElementById('quote-inquiry-id') as HTMLInputElement).value = id;
  document.getElementById('quote-inquiry-summary')!.innerHTML = `
    <strong>${product}</strong> · ${qty} units${target ? ` · Target: ${formatCurrency(parseFloat(target))}` : ''}`;
  (document.getElementById('quoted-unit-price') as HTMLInputElement).value = target || '';
  (document.getElementById('lead-time-days') as HTMLInputElement).value = '';
  (document.getElementById('quote-notes') as HTMLTextAreaElement).value = '';
  document.getElementById('quote-error')!.style.display = 'none';
  document.getElementById('quote-modal')!.classList.remove('hidden');
}

function setupQuoteModal() {
  const modal = document.getElementById('quote-modal')!;
  const close = () => modal.classList.add('hidden');
  document.getElementById('quote-modal-close')?.addEventListener('click', close);
  document.getElementById('quote-cancel-btn')?.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  document.getElementById('quote-submit-btn')?.addEventListener('click', async () => {
    const inquiryId = (document.getElementById('quote-inquiry-id') as HTMLInputElement).value;
    const unit_price = (document.getElementById('quoted-unit-price') as HTMLInputElement).value;
    const lead_time = (document.getElementById('lead-time-days') as HTMLInputElement).value;
    const notes = (document.getElementById('quote-notes') as HTMLTextAreaElement).value.trim();

    document.querySelectorAll('.form-error').forEach(el => (el.textContent = ''));
    let valid = true;
    if (!unit_price || parseFloat(unit_price) <= 0) {
      document.getElementById('err-quoted-price')!.textContent = 'Enter a valid price';
      valid = false;
    }
    if (!lead_time || parseInt(lead_time) <= 0) {
      document.getElementById('err-lead-time')!.textContent = 'Enter lead time in days';
      valid = false;
    }
    if (!valid) return;

    const btn = document.getElementById('quote-submit-btn') as HTMLButtonElement;
    btn.disabled = true;
    const res = await apiFetch(`/api/inquiries/${inquiryId}/quote`, {
      method: 'POST',
      body: JSON.stringify({
        quoted_unit_price: parseFloat(unit_price),
        lead_time_days: parseInt(lead_time),
        notes,
      }),
    });
    btn.disabled = false;

    if (res.success) {
      showToast('Quote submitted successfully', 'success');
      close();
      await loadInquiries();
    } else {
      const errEl = document.getElementById('quote-error')!;
      errEl.textContent = res.error || 'Failed to submit quote';
      errEl.style.display = 'block';
    }
  });
}

init();
