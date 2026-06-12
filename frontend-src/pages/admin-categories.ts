import { initLayout } from '../lib/layout';
import { requireUser } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { showToast } from '../lib/toast';

interface Category { id: number; name: string; slug: string; description: string; }

async function init() {
  await initLayout();
  await requireUser('ADMIN');
  await loadCategories();
  setupModal();
}

async function loadCategories() {
  const res = await apiFetch<Category[]>('/api/categories');
  const tbody = document.getElementById('categories-tbody')!;
  if (!res.success || !res.data?.length) {
    tbody.innerHTML = '<tr><td colspan="4"><div class="empty-state">No categories yet.</div></td></tr>';
    return;
  }
  tbody.innerHTML = res.data.map(c => `
    <tr>
      <td><strong>${c.name}</strong></td>
      <td><span class="mono">${c.slug}</span></td>
      <td>${c.description || '—'}</td>
      <td><button class="btn btn-secondary btn-sm edit-btn" data-id="${c.id}" data-name="${c.name}" data-desc="${c.description || ''}">Edit</button></td>
    </tr>`).join('');

  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const el = btn as HTMLElement;
      openModal(parseInt(el.dataset.id!), el.dataset.name!, el.dataset.desc!);
    });
  });
}

function openModal(id?: number, name = '', desc = '') {
  (document.getElementById('edit-id') as HTMLInputElement).value = id ? String(id) : '';
  (document.getElementById('cat-name') as HTMLInputElement).value = name;
  (document.getElementById('cat-desc') as HTMLTextAreaElement).value = desc;
  document.getElementById('modal-title')!.textContent = id ? 'Edit Category' : 'Add Category';
  document.getElementById('modal-error')!.style.display = 'none';
  document.getElementById('modal')!.classList.remove('hidden');
}

function setupModal() {
  document.getElementById('add-btn')?.addEventListener('click', () => openModal());
  document.getElementById('modal-close')?.addEventListener('click', () => document.getElementById('modal')!.classList.add('hidden'));
  document.getElementById('modal-cancel')?.addEventListener('click', () => document.getElementById('modal')!.classList.add('hidden'));

  document.getElementById('modal-save')?.addEventListener('click', async () => {
    const id = (document.getElementById('edit-id') as HTMLInputElement).value;
    const name = (document.getElementById('cat-name') as HTMLInputElement).value.trim();
    const description = (document.getElementById('cat-desc') as HTMLTextAreaElement).value.trim();
    const errEl = document.getElementById('modal-error')!;

    if (!name) { errEl.textContent = 'Name is required'; errEl.style.display = 'block'; return; }

    const url = id ? `/api/admin/categories/${id}` : '/api/admin/categories';
    const method = id ? 'PATCH' : 'POST';
    const res = await apiFetch(url, { method, body: JSON.stringify({ name, description }) });

    if (!res.success) { errEl.textContent = res.error || 'Save failed'; errEl.style.display = 'block'; return; }

    showToast(`Category ${id ? 'updated' : 'created'}!`, 'success');
    document.getElementById('modal')!.classList.add('hidden');
    await loadCategories();
  });
}

init();
