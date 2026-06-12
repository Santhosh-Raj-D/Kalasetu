import { initLayout } from '../lib/layout';
import { requireUser } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { formatDate, statusChip } from '../lib/format';
import { showToast } from '../lib/toast';

interface Ticket {
  id: number;
  ticket_number: string;
  subject: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  resolution_note?: string;
}

async function init() {
  await initLayout();
  await requireUser('CUSTOMER', 'ARTISAN');
  await loadTickets();
  setupModal();
}

async function loadTickets() {
  const container = document.getElementById('tickets-content')!;
  const countEl = document.getElementById('tickets-count')!;

  const res = await apiFetch<{ tickets: Ticket[] }>('/api/tickets');
  if (!res.success || !res.data) {
    container.innerHTML = `<div class="alert alert-error">${res.error || 'Failed to load tickets'}</div>`;
    return;
  }

  const { tickets } = res.data;
  countEl.textContent = `${tickets.length} ticket${tickets.length !== 1 ? 's' : ''}`;

  if (!tickets.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎫</div>
        <h3>No tickets yet</h3>
        <p>Create a support ticket if you need help with an order or product.</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Ticket #</th>
            <th>Subject</th>
            <th>Status</th>
            <th>Created</th>
            <th>Last Update</th>
          </tr>
        </thead>
        <tbody>
          ${tickets.map(t => `
            <tr style="cursor:pointer" data-ticket-id="${t.id}">
              <td><span class="mono">${t.ticket_number}</span></td>
              <td>
                <p style="font-weight:600">${t.subject}</p>
                <p style="font-size:0.78rem;color:var(--mud);margin-top:0.15rem">${t.description.slice(0,80)}${t.description.length > 80 ? '…' : ''}</p>
                ${t.resolution_note ? `<p style="font-size:0.78rem;color:var(--leaf);margin-top:0.25rem">Resolution: ${t.resolution_note.slice(0,80)}${t.resolution_note.length > 80 ? '…' : ''}</p>` : ''}
              </td>
              <td>${statusChip(t.status)}</td>
              <td>${formatDate(t.created_at)}</td>
              <td>${formatDate(t.updated_at)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function setupModal() {
  const modal = document.getElementById('ticket-modal')!;
  const openBtn = document.getElementById('new-ticket-btn')!;
  const closeBtn = document.getElementById('modal-close-btn')!;
  const cancelBtn = document.getElementById('cancel-modal-btn')!;
  const submitBtn = document.getElementById('submit-ticket-btn')!;

  function openModal() { modal.classList.remove('hidden'); }
  function closeModal() {
    modal.classList.add('hidden');
    (document.getElementById('ticket-form') as HTMLFormElement).reset();
    document.getElementById('ticket-form-error')!.style.display = 'none';
    document.querySelectorAll('.form-error').forEach(el => (el.textContent = ''));
  }

  openBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  submitBtn.addEventListener('click', async () => {
    const form = document.getElementById('ticket-form') as HTMLFormElement;
    document.querySelectorAll('.form-error').forEach(el => (el.textContent = ''));
    document.getElementById('ticket-form-error')!.style.display = 'none';

    const subject = (form.querySelector<HTMLInputElement>('[name="subject"]'))?.value.trim() || '';
    const description = (form.querySelector<HTMLTextAreaElement>('[name="description"]'))?.value.trim() || '';
    let valid = true;

    if (!subject) { document.getElementById('err-subject')!.textContent = 'Subject is required'; valid = false; }
    if (!description) { document.getElementById('err-description')!.textContent = 'Description is required'; valid = false; }
    if (!valid) return;

    submitBtn.setAttribute('disabled', 'true');
    const res = await apiFetch('/api/tickets', {
      method: 'POST',
      body: JSON.stringify({ subject, description }),
    });
    submitBtn.removeAttribute('disabled');

    if (res.success) {
      showToast('Ticket submitted successfully', 'success');
      closeModal();
      await loadTickets();
    } else {
      const errEl = document.getElementById('ticket-form-error')!;
      errEl.textContent = res.error || 'Failed to submit ticket';
      errEl.style.display = 'block';
    }
  });
}

init();
