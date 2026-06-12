import { initLayout } from '../lib/layout';
import { requireUser } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { formatDate, formatDateTime, statusChip, paginate } from '../lib/format';
import { showToast } from '../lib/toast';

interface Ticket {
  id: number;
  ticket_number: string;
  subject: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_name: string;
  user_email: string;
  resolution_note?: string;
}

let currentPage = 1;
const LIMIT = 20;

async function init() {
  await initLayout();
  await requireUser('ADMIN');
  await loadTickets();
  document.getElementById('filter-status')?.addEventListener('change', () => { currentPage = 1; loadTickets(); });
  setupModal();
}

async function loadTickets() {
  const container = document.getElementById('tickets-content')!;
  container.innerHTML = '<div class="skeleton" style="height:300px"></div>';

  const status = (document.getElementById('filter-status') as HTMLSelectElement).value;
  const qs = new URLSearchParams({ page: String(currentPage), limit: String(LIMIT) });
  if (status) qs.set('status', status);

  const res = await apiFetch<{ tickets: Ticket[]; total: number }>(`/api/tickets?${qs}`);
  if (!res.success || !res.data) {
    container.innerHTML = `<div class="alert alert-error">${res.error || 'Failed to load tickets'}</div>`;
    return;
  }

  const { tickets, total } = res.data;
  document.getElementById('ticket-count')!.textContent = `${total} ticket${total !== 1 ? 's' : ''}`;

  if (!tickets.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">🎫</div><h3>No tickets found</h3></div>';
    document.getElementById('pagination')!.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Ticket #</th>
            <th>User</th>
            <th>Subject</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${tickets.map(t => `
            <tr>
              <td><span class="mono">${t.ticket_number}</span></td>
              <td>
                <p style="font-weight:600">${t.user_name}</p>
                <p style="font-size:0.75rem;color:var(--mud)">${t.user_email}</p>
              </td>
              <td>
                <p style="font-weight:600">${t.subject}</p>
                <p style="font-size:0.78rem;color:var(--mud)">${t.description.slice(0, 60)}${t.description.length > 60 ? '…' : ''}</p>
              </td>
              <td>${statusChip(t.status)}</td>
              <td>${formatDate(t.created_at)}</td>
              <td>
                <button class="btn btn-secondary btn-sm view-ticket-btn" data-id="${t.id}">Manage →</button>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  document.querySelectorAll('.view-ticket-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.id;
      const ticket = tickets.find(t => String(t.id) === id)!;
      openTicketModal(ticket);
    });
  });

  document.getElementById('pagination')!.innerHTML = paginate(total, currentPage, LIMIT, (p) => {
    currentPage = p;
    loadTickets();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = parseInt((btn as HTMLElement).dataset.page!);
      loadTickets();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

function openTicketModal(ticket: Ticket) {
  document.getElementById('ticket-modal-title')!.textContent = `Ticket ${ticket.ticket_number}`;
  document.getElementById('ticket-modal-body')!.innerHTML = `
    <div style="margin-bottom:1rem">
      <p><strong>From:</strong> ${ticket.user_name} (${ticket.user_email})</p>
      <p style="font-size:0.8rem;color:var(--mud)">Created: ${formatDateTime(ticket.created_at)}</p>
    </div>
    <div style="background:var(--bone);border-radius:var(--radius);padding:1rem;margin-bottom:1rem">
      <h4 style="margin-bottom:0.5rem">${ticket.subject}</h4>
      <p style="font-size:0.9rem;color:var(--ink-light);line-height:1.7">${ticket.description.replace(/\n/g, '<br>')}</p>
    </div>
    <div class="form-group">
      <label class="form-label">Update Status</label>
      <select class="form-control" id="modal-ticket-status">
        <option value="OPEN" ${ticket.status === 'OPEN' ? 'selected' : ''}>Open</option>
        <option value="IN_PROGRESS" ${ticket.status === 'IN_PROGRESS' ? 'selected' : ''}>In Progress</option>
        <option value="RESOLVED" ${ticket.status === 'RESOLVED' ? 'selected' : ''}>Resolved</option>
        <option value="CLOSED" ${ticket.status === 'CLOSED' ? 'selected' : ''}>Closed</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Resolution Note</label>
      <textarea class="form-control" id="modal-resolution-note" placeholder="Add a note or resolution for the user…">${ticket.resolution_note || ''}</textarea>
    </div>
    <input type="hidden" id="modal-ticket-id" value="${ticket.id}">
    <div id="modal-ticket-error" class="alert alert-error" style="display:none"></div>`;
  document.getElementById('ticket-detail-modal')!.classList.remove('hidden');
}

function setupModal() {
  const modal = document.getElementById('ticket-detail-modal')!;
  const close = () => modal.classList.add('hidden');
  document.getElementById('close-ticket-modal')?.addEventListener('click', close);
  document.getElementById('close-ticket-modal-btn')?.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  document.getElementById('save-ticket-btn')?.addEventListener('click', async () => {
    const id = (document.getElementById('modal-ticket-id') as HTMLInputElement).value;
    const status = (document.getElementById('modal-ticket-status') as HTMLSelectElement).value;
    const resolution_note = (document.getElementById('modal-resolution-note') as HTMLTextAreaElement).value.trim();

    const btn = document.getElementById('save-ticket-btn') as HTMLButtonElement;
    btn.disabled = true;
    const res = await apiFetch(`/api/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, resolution_note }),
    });
    btn.disabled = false;

    if (res.success) {
      showToast('Ticket updated', 'success');
      close();
      await loadTickets();
    } else {
      const errEl = document.getElementById('modal-ticket-error')!;
      errEl.textContent = res.error || 'Failed to update ticket';
      errEl.style.display = 'block';
    }
  });
}

init();
