import { initLayout } from '../lib/layout';
import { requireUser } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { formatDate, statusChip, paginate } from '../lib/format';

interface ReviewRecord {
  id: number;
  product_name: string;
  artisan_name: string;
  decision: string;
  reviewed_at: string;
  cultural_notes?: string;
  feedback?: string;
}

let currentPage = 1;
const LIMIT = 15;

async function init() {
  await initLayout();
  await requireUser('CONSULTANT');
  await loadHistory();
}

async function loadHistory() {
  const container = document.getElementById('history-content')!;
  container.innerHTML = '<div class="skeleton" style="height:300px"></div>';

  const res = await apiFetch<{ reviews: ReviewRecord[]; total: number }>(`/api/consultant/history?page=${currentPage}&limit=${LIMIT}`);
  if (!res.success || !res.data) {
    container.innerHTML = `<div class="alert alert-error">${res.error || 'Failed to load history'}</div>`;
    return;
  }

  const { reviews, total } = res.data;
  if (!reviews.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <h3>No reviews yet</h3>
        <p>Your completed reviews will appear here.</p>
        <a href="/consultant/queue.html" class="btn btn-primary" style="margin-top:1rem">Go to Review Queue</a>
      </div>`;
    document.getElementById('pagination')!.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div style="margin-bottom:1rem;font-size:0.85rem;color:var(--mud)">${total} review${total !== 1 ? 's' : ''}</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Artisan</th>
            <th>Decision</th>
            <th>Date</th>
            <th>Notes / Feedback</th>
          </tr>
        </thead>
        <tbody>
          ${reviews.map(r => `
            <tr>
              <td style="font-weight:600">${r.product_name}</td>
              <td>${r.artisan_name}</td>
              <td>${statusChip(r.decision)}</td>
              <td>${formatDate(r.reviewed_at)}</td>
              <td style="max-width:300px">
                ${r.cultural_notes ? `<p style="font-size:0.8rem;color:var(--leaf)">${r.cultural_notes.slice(0, 100)}${r.cultural_notes.length > 100 ? '…' : ''}</p>` : ''}
                ${r.feedback ? `<p style="font-size:0.8rem;color:#c0392b">${r.feedback.slice(0, 100)}${r.feedback.length > 100 ? '…' : ''}</p>` : ''}
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  document.getElementById('pagination')!.innerHTML = paginate(total, currentPage, LIMIT, (p) => {
    currentPage = p;
    loadHistory();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = parseInt((btn as HTMLElement).dataset.page!);
      loadHistory();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

init();
