import { initLayout } from '../lib/layout';
import { requireUser } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/format';
import { showToast } from '../lib/toast';

interface ProductForReview {
  id: number;
  name: string;
  artisan_name: string;
  artisan_tribe?: string;
  artisan_region?: string;
  category_name: string;
  description: string;
  craft_technique?: string;
  materials?: string;
  price: number;
  stock: number;
  submitted_at: string;
  images: { url: string; sort_order: number }[];
}

async function init() {
  await initLayout();
  await requireUser('CONSULTANT');

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) { window.location.href = '/consultant/queue.html'; return; }

  await loadProduct(id);
}

async function loadProduct(id: string) {
  const res = await apiFetch<ProductForReview>(`/api/consultant/queue/${id}`);
  if (!res.success || !res.data) {
    document.getElementById('review-content')!.innerHTML = `<div class="alert alert-error">${res.error || 'Product not found'}</div>`;
    return;
  }
  const p = res.data;
  document.getElementById('review-title')!.textContent = `Reviewing: ${p.name}`;
  renderReview(p);
}

function renderReview(p: ProductForReview) {
  const container = document.getElementById('review-content')!;
  container.innerHTML = `
    <div class="review-layout">
      <div>
        <div class="product-detail-card">
          <h3>Product Information</h3>
          <div class="detail-field">
            <p class="label">Name</p>
            <p class="value" style="font-family:'Fraunces',serif;font-size:1.2rem">${p.name}</p>
          </div>
          <div class="detail-field">
            <p class="label">Artisan</p>
            <p class="value">${p.artisan_name}${p.artisan_tribe ? ` (${p.artisan_tribe})` : ''}${p.artisan_region ? `, ${p.artisan_region}` : ''}</p>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;margin-bottom:0.75rem">
            <div class="detail-field"><p class="label">Category</p><p class="value">${p.category_name}</p></div>
            <div class="detail-field"><p class="label">Price</p><p class="value" style="font-family:'IBM Plex Mono',monospace">${formatCurrency(p.price)}</p></div>
            <div class="detail-field"><p class="label">Submitted</p><p class="value">${formatDate(p.submitted_at)}</p></div>
          </div>
        </div>

        <div class="product-detail-card">
          <h3>Description</h3>
          <p style="font-size:0.9rem;color:var(--ink-light);line-height:1.8">${p.description.replace(/\n/g, '<br>')}</p>
        </div>

        ${(p.craft_technique || p.materials) ? `
        <div class="product-detail-card">
          <h3>Craft Details</h3>
          ${p.craft_technique ? `<div class="detail-field"><p class="label">Craft Technique</p><p class="value">${p.craft_technique}</p></div>` : ''}
          ${p.materials ? `<div class="detail-field"><p class="label">Materials</p><p class="value">${p.materials}</p></div>` : ''}
        </div>` : ''}

        <div class="product-detail-card">
          <h3>Product Images</h3>
          ${p.images.length ? `
          <div class="image-gallery">
            ${p.images.map(img => `<img src="${img.url}" alt="${p.name}" onclick="window.open('${img.url}','_blank')" title="Click to view full size">`).join('')}
          </div>` : '<p style="color:var(--mud);font-size:0.875rem">No images submitted</p>'}
        </div>
      </div>

      <aside>
        <div class="decision-card">
          <h3 style="font-family:'Fraunces',serif;margin-bottom:1rem">Your Decision</h3>
          <form id="review-decision-form">
            <label class="decision-option approve">
              <div style="display:flex;align-items:center;gap:0.75rem">
                <input type="radio" name="decision" value="APPROVED" style="accent-color:var(--leaf)">
                <div>
                  <p style="font-weight:700;color:var(--leaf)">✓ Approve</p>
                  <p style="font-size:0.78rem;color:var(--mud)">Product meets cultural authenticity standards</p>
                </div>
              </div>
            </label>
            <label class="decision-option reject">
              <div style="display:flex;align-items:center;gap:0.75rem">
                <input type="radio" name="decision" value="REJECTED" style="accent-color:#c0392b">
                <div>
                  <p style="font-weight:700;color:#c0392b">✗ Reject</p>
                  <p style="font-size:0.78rem;color:var(--mud)">Does not meet standards or needs revision</p>
                </div>
              </div>
            </label>

            <div id="cultural-notes-group" class="form-group" style="display:none">
              <label class="form-label">Cultural Notes <span class="req">*</span></label>
              <textarea class="form-control" id="cultural-notes" placeholder="Write notes explaining the cultural tradition, what makes this authentic, any historical context…" style="min-height:120px"></textarea>
              <p class="form-hint">These notes appear publicly on the approved product listing.</p>
              <p class="form-error" id="err-cultural-notes"></p>
            </div>

            <div id="feedback-group" class="form-group" style="display:none">
              <label class="form-label">Rejection Feedback <span class="req">*</span></label>
              <textarea class="form-control" id="rejection-feedback" placeholder="Explain why this product does not meet standards and what the artisan should change…" style="min-height:120px"></textarea>
              <p class="form-hint">This feedback is shared with the artisan to help them improve their listing.</p>
              <p class="form-error" id="err-feedback"></p>
            </div>

            <div id="review-form-error" class="alert alert-error" style="display:none"></div>

            <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;margin-top:1rem" id="submit-review-btn" disabled>
              Submit Decision
            </button>
          </form>
          <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--bone-dark)">
            <a href="/consultant/queue.html" class="btn btn-secondary btn-sm" style="width:100%;justify-content:center">← Back to Queue</a>
          </div>
        </div>
      </aside>
    </div>`;

  setupDecisionForm(p.id);
}

function setupDecisionForm(productId: number) {
  const form = document.getElementById('review-decision-form')!;

  document.querySelectorAll('input[name="decision"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const val = (radio as HTMLInputElement).value;
      document.getElementById('cultural-notes-group')!.style.display = val === 'APPROVED' ? 'block' : 'none';
      document.getElementById('feedback-group')!.style.display = val === 'REJECTED' ? 'block' : 'none';
      (document.getElementById('submit-review-btn') as HTMLButtonElement).disabled = false;
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.querySelectorAll('.form-error').forEach(el => (el.textContent = ''));
    document.getElementById('review-form-error')!.style.display = 'none';

    const decision = (document.querySelector<HTMLInputElement>('input[name="decision"]:checked'))?.value;
    if (!decision) return;

    const culturalNotes = (document.getElementById('cultural-notes') as HTMLTextAreaElement).value.trim();
    const feedback = (document.getElementById('rejection-feedback') as HTMLTextAreaElement).value.trim();

    let valid = true;
    if (decision === 'APPROVED' && !culturalNotes) {
      document.getElementById('err-cultural-notes')!.textContent = 'Cultural notes are required for approval';
      valid = false;
    }
    if (decision === 'REJECTED' && !feedback) {
      document.getElementById('err-feedback')!.textContent = 'Rejection feedback is required';
      valid = false;
    }
    if (!valid) return;

    const btn = document.getElementById('submit-review-btn') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Submitting…';

    const payload: Record<string, string | number> = {
      product_id: productId,
      decision,
    };
    if (culturalNotes) payload.cultural_notes = culturalNotes;
    if (feedback) payload.feedback = feedback;

    const res = await apiFetch('/api/consultant/reviews', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    btn.disabled = false;
    btn.textContent = 'Submit Decision';

    if (res.success) {
      showToast(`Product ${decision.toLowerCase()} successfully`, 'success');
      setTimeout(() => { window.location.href = '/consultant/queue.html'; }, 1000);
    } else {
      const errEl = document.getElementById('review-form-error')!;
      errEl.textContent = res.error || 'Failed to submit review';
      errEl.style.display = 'block';
    }
  });
}

init();
