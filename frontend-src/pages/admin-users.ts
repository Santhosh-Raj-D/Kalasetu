import { initLayout } from '../lib/layout';
import { requireUser } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { formatDate, statusChip, paginate } from '../lib/format';
import { showToast } from '../lib/toast';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  is_business?: boolean;
}

let currentPage = 1;
const LIMIT = 20;

async function init() {
  await initLayout();
  await requireUser('ADMIN');
  await loadUsers();
  setupFilters();
  setupCreateModal();
}

async function loadUsers() {
  const container = document.getElementById('users-content')!;
  container.innerHTML = '<div class="skeleton" style="height:300px"></div>';

  const search = (document.getElementById('search-users') as HTMLInputElement).value;
  const role = (document.getElementById('filter-role') as HTMLSelectElement).value;
  const status = (document.getElementById('filter-status') as HTMLSelectElement).value;

  const qs = new URLSearchParams({ page: String(currentPage), limit: String(LIMIT) });
  if (search) qs.set('search', search);
  if (role) qs.set('role', role);
  if (status) qs.set('status', status);

  const res = await apiFetch<{ users: User[]; total: number }>(`/api/admin/users?${qs}`);
  if (!res.success || !res.data) {
    container.innerHTML = `<div class="alert alert-error">${res.error || 'Failed to load users'}</div>`;
    return;
  }

  const { users, total } = res.data;
  if (!users.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><h3>No users found</h3></div>';
    document.getElementById('pagination')!.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div style="margin-bottom:1rem;font-size:0.85rem;color:var(--mud)">${total} user${total !== 1 ? 's' : ''}</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${users.map(u => `
            <tr>
              <td>
                <p style="font-weight:600">${u.name}</p>
                ${u.is_business ? '<span style="font-size:0.7rem;background:var(--bone-dark);padding:0.1rem 0.4rem;border-radius:2px">Business</span>' : ''}
              </td>
              <td>${u.email}</td>
              <td><span class="chip chip-${u.role.toLowerCase()}">${u.role}</span></td>
              <td>${statusChip(u.status)}</td>
              <td>${formatDate(u.created_at)}</td>
              <td>
                <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
                  ${u.status === 'ACTIVE' ? `<button class="btn btn-danger btn-sm suspend-btn" data-id="${u.id}" data-name="${u.name}">Suspend</button>` : ''}
                  ${u.status === 'SUSPENDED' ? `<button class="btn btn-primary btn-sm activate-btn" data-id="${u.id}">Activate</button>` : ''}
                  ${u.status === 'PENDING_VERIFICATION' ? `<button class="btn btn-primary btn-sm activate-btn" data-id="${u.id}">Approve</button>` : ''}
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  setupUserActions();

  document.getElementById('pagination')!.innerHTML = paginate(total, currentPage, LIMIT, (p) => {
    currentPage = p;
    loadUsers();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = parseInt((btn as HTMLElement).dataset.page!);
      loadUsers();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

function setupUserActions() {
  document.querySelectorAll('.suspend-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = (btn as HTMLElement).dataset.id;
      const name = (btn as HTMLElement).dataset.name;
      if (!confirm(`Suspend ${name}?`)) return;
      (btn as HTMLButtonElement).disabled = true;
      const res = await apiFetch(`/api/admin/users/${id}/suspend`, { method: 'POST' });
      if (res.success) { showToast('User suspended', 'success'); await loadUsers(); }
      else { showToast(res.error || 'Failed', 'error'); (btn as HTMLButtonElement).disabled = false; }
    });
  });
  document.querySelectorAll('.activate-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = (btn as HTMLElement).dataset.id;
      (btn as HTMLButtonElement).disabled = true;
      const res = await apiFetch(`/api/admin/users/${id}/activate`, { method: 'POST' });
      if (res.success) { showToast('User activated', 'success'); await loadUsers(); }
      else { showToast(res.error || 'Failed', 'error'); (btn as HTMLButtonElement).disabled = false; }
    });
  });
}

function setupFilters() {
  let timer: ReturnType<typeof setTimeout>;
  document.getElementById('search-users')?.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => { currentPage = 1; loadUsers(); }, 400);
  });
  ['filter-role', 'filter-status'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => { currentPage = 1; loadUsers(); });
  });
}

function setupCreateModal() {
  const modal = document.getElementById('create-user-modal')!;
  const open = () => modal.classList.remove('hidden');
  const close = () => {
    modal.classList.add('hidden');
    (document.getElementById('create-user-form') as HTMLFormElement).reset();
    document.getElementById('create-user-error')!.style.display = 'none';
  };

  document.getElementById('create-user-btn')?.addEventListener('click', open);
  document.getElementById('close-create-modal')?.addEventListener('click', close);
  document.getElementById('cancel-create-btn')?.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  document.getElementById('submit-create-btn')?.addEventListener('click', async () => {
    const form = document.getElementById('create-user-form') as HTMLFormElement;
    const name = form.querySelector<HTMLInputElement>('[name="name"]')!.value.trim();
    const email = form.querySelector<HTMLInputElement>('[name="email"]')!.value.trim();
    const role = form.querySelector<HTMLSelectElement>('[name="role"]')!.value;
    const password = form.querySelector<HTMLInputElement>('[name="password"]')!.value;

    if (!name || !email || !role || !password) {
      const errEl = document.getElementById('create-user-error')!;
      errEl.textContent = 'All fields are required';
      errEl.style.display = 'block';
      return;
    }

    const btn = document.getElementById('submit-create-btn') as HTMLButtonElement;
    btn.disabled = true;
    const res = await apiFetch('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({ name, email, role, password }),
    });
    btn.disabled = false;

    if (res.success) {
      showToast('User created', 'success');
      close();
      await loadUsers();
    } else {
      const errEl = document.getElementById('create-user-error')!;
      errEl.textContent = res.error || 'Failed to create user';
      errEl.style.display = 'block';
    }
  });
}

init();
