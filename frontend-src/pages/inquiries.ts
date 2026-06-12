import { initLayout } from '../lib/layout';
import { requireUser, getUser } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { formatCurrency, formatDate, statusChip } from '../lib/format';

interface Inquiry {
  id: number;
  inquiry_number: string;
  product_id: number;
  product_name: string;
  artisan_name: string;
  quantity: number;
  target_price?: number;
  requirements?: string;
  status: string;
  created_at: string;
  quoted_unit_price?: number;
  lead_time_days?: number;
  quote_notes?: string;
  quoted_at?: string;
}

async function init() {
  await initLayout();
  const user = await requireUser('CUSTOMER');

  if (!user.is_business) {
    document.getElementById('inquiries-content')!.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🏢</div>
        <h3>Business Account Required</h3>
        <p>B2B inquiries are available for verified business accounts. Contact support to upgrade your account.</p>
        <a href="/tickets.html" class="btn btn-primary" style="margin-top:1rem">Contact Support</a>
      </div>`;
    return;
  }

  await loadInquiries();
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
        <p>Submit bulk order inquiries from product pages to get custom quotes from artisans.</p>
        <a href="/shop.html" class="btn btn-primary" style="margin-top:1rem">Browse Products</a>
      </div>`;
    return;
  }

  container.innerHTML = inquiries.map(inq => `
    <div class="inquiry-card">
      <div class="inquiry-header">
        <div>
          <p class="inquiry-product">${inq.product_name}</p>
          <p class="inquiry-meta">by ${inq.artisan_name} · Inquiry #${inq.inquiry_number} · ${formatDate(inq.created_at)}</p>
        </div>
        ${statusChip(inq.status)}
      </div>
      ${inq.requirements ? `<p style="font-size:0.875rem;color:var(--ink-light)">${inq.requirements}</p>` : ''}
      <div class="inquiry-details">
        <div class="detail-box">
          <p class="label">Quantity</p>
          <p class="value">${inq.quantity} units</p>
        </div>
        ${inq.target_price ? `
        <div class="detail-box">
          <p class="label">Target Price</p>
          <p class="value">${formatCurrency(inq.target_price)}/unit</p>
        </div>` : ''}
      </div>
      ${inq.status === 'QUOTED' && inq.quoted_unit_price ? `
      <div class="quote-section">
        <h4>Quote Received</h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:0.75rem">
          <div>
            <p style="font-size:0.75rem;color:var(--mud);text-transform:uppercase;letter-spacing:0.06em">Unit Price</p>
            <p style="font-family:'IBM Plex Mono',monospace;font-weight:700;color:var(--leaf)">${formatCurrency(inq.quoted_unit_price)}</p>
          </div>
          <div>
            <p style="font-size:0.75rem;color:var(--mud);text-transform:uppercase;letter-spacing:0.06em">Total</p>
            <p style="font-family:'IBM Plex Mono',monospace;font-weight:700;color:var(--leaf)">${formatCurrency(inq.quoted_unit_price * inq.quantity)}</p>
          </div>
          ${inq.lead_time_days ? `<div>
            <p style="font-size:0.75rem;color:var(--mud);text-transform:uppercase;letter-spacing:0.06em">Lead Time</p>
            <p style="font-weight:700">${inq.lead_time_days} days</p>
          </div>` : ''}
        </div>
        ${inq.quote_notes ? `<p style="font-size:0.85rem;margin-top:0.75rem;color:#065f46">${inq.quote_notes}</p>` : ''}
        ${inq.quoted_at ? `<p style="font-size:0.72rem;color:var(--mud);margin-top:0.5rem">Quoted on ${formatDate(inq.quoted_at)}</p>` : ''}
      </div>` : ''}
    </div>`).join('');
}

init();
