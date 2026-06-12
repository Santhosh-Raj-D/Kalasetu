import { initLayout } from '../lib/layout';
import { requireUser } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { formatCurrency, formatDate, statusChip } from '../lib/format';
import { showToast } from '../lib/toast';

interface Coupon {
  id: number;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_value?: number;
  max_uses?: number;
  used_count: number;
  expiry_date?: string;
  active: boolean;
}

async function init() {
  await initLayout();
  await requireUser('ADMIN');
  await loadCoupons();
  setupModal();
}

async function loadCoupons() {
  const container = document.getElementById('coupons-content')!;
  const res = await apiFetch<{ coupons: Coupon[] }>('/api/admin/coupons');
  if (!res.success || !res.data) {
    container.innerHTML = `<div class="alert alert-error">${res.error || 'Failed to load coupons'}</div>`;
    return;
  }

  const { coupons } = res.data;
  document.getElementById('coupon-count')!.textContent = `${coupons.length} coupon${coupons.length !== 1 ? 's' : ''}`;

  if (!coupons.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🎫</div>
        <h3>No coupons yet</h3>
        <p>Create discount coupons for customers.</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Discount</th>
            <th>Min Order</th>
            <th>Usage</th>
            <th>Expiry</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${coupons.map(c => `
            <tr>
              <td><span class="coupon-code">${c.code}</span></td>
              <td>
                ${c.discount_type === 'PERCENTAGE' ? `${c.discount_value}% off` : formatCurrency(c.discount_value) + ' off'}
              </td>
              <td>${c.min_order_value ? formatCurrency(c.min_order_value) : 'None'}</td>
              <td>${c.used_count}${c.max_uses ? ` / ${c.max_uses}` : ' uses'}</td>
              <td>${c.expiry_date ? formatDate(c.expiry_date) : 'No expiry'}</td>
              <td>${c.active ? '<span class="chip chip-active">Active</span>' : '<span class="chip chip-delisted">Inactive</span>'}</td>
              <td>
                <div style="display:flex;gap:0.5rem">
                  ${c.active ? `<button class="btn btn-danger btn-sm deactivate-coupon-btn" data-id="${c.id}">Deactivate</button>` : `<button class="btn btn-primary btn-sm activate-coupon-btn" data-id="${c.id}">Activate</button>`}
                </div>
              </td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;

  document.querySelectorAll('.deactivate-coupon-btn, .activate-coupon-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = (btn as HTMLElement).dataset.id;
      const activate = btn.classList.contains('activate-coupon-btn');
      (btn as HTMLButtonElement).disabled = true;
      const res = await apiFetch(`/api/admin/coupons/${id}/${activate ? 'activate' : 'deactivate'}`, { method: 'POST' });
      if (res.success) { showToast(activate ? 'Coupon activated' : 'Coupon deactivated', 'success'); await loadCoupons(); }
      else { showToast(res.error || 'Failed', 'error'); (btn as HTMLButtonElement).disabled = false; }
    });
  });
}

function setupModal() {
  const modal = document.getElementById('coupon-modal')!;
  const close = () => {
    modal.classList.add('hidden');
    (document.getElementById('coupon-form') as HTMLFormElement).reset();
    document.getElementById('coupon-modal-error')!.style.display = 'none';
  };

  document.getElementById('create-coupon-btn')?.addEventListener('click', () => {
    document.getElementById('coupon-modal-title')!.textContent = 'Create Coupon';
    document.getElementById('submit-coupon-btn')!.textContent = 'Create Coupon';
    modal.classList.remove('hidden');
  });
  document.getElementById('close-coupon-modal')?.addEventListener('click', close);
  document.getElementById('cancel-coupon-btn')?.addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  document.getElementById('coupon-code')?.addEventListener('input', (e) => {
    (e.target as HTMLInputElement).value = (e.target as HTMLInputElement).value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });

  document.getElementById('submit-coupon-btn')?.addEventListener('click', async () => {
    const code = (document.getElementById('coupon-code') as HTMLInputElement).value.trim();
    const discount_type = (document.getElementById('coupon-type') as HTMLSelectElement).value;
    const discount_value = parseFloat((document.getElementById('coupon-value') as HTMLInputElement).value);
    const min_order_value = parseFloat((document.getElementById('coupon-min-order') as HTMLInputElement).value) || 0;
    const max_uses = parseInt((document.getElementById('coupon-max-uses') as HTMLInputElement).value) || null;
    const expiry_date = (document.getElementById('coupon-expiry') as HTMLInputElement).value || null;

    if (!code || !discount_type || !discount_value) {
      const err = document.getElementById('coupon-modal-error')!;
      err.textContent = 'Code, type, and value are required';
      err.style.display = 'block';
      return;
    }

    const btn = document.getElementById('submit-coupon-btn') as HTMLButtonElement;
    btn.disabled = true;
    const res = await apiFetch('/api/admin/coupons', {
      method: 'POST',
      body: JSON.stringify({ code, discount_type, discount_value, min_order_value, max_uses, expiry_date }),
    });
    btn.disabled = false;

    if (res.success) {
      showToast('Coupon created', 'success');
      close();
      await loadCoupons();
    } else {
      const err = document.getElementById('coupon-modal-error')!;
      err.textContent = res.error || 'Failed to create coupon';
      err.style.display = 'block';
    }
  });
}

init();
