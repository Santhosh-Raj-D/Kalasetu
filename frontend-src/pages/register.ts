import { apiFetch } from '../lib/api';

let selectedRole = 'CUSTOMER';

document.querySelectorAll('.role-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    selectedRole = (card as HTMLElement).dataset.role!;
    const note = document.getElementById('artisan-note')!;
    const biz = document.getElementById('business-toggle')!;
    note.style.display = selectedRole === 'ARTISAN' ? 'block' : 'none';
    biz.style.display = selectedRole === 'CUSTOMER' ? 'block' : 'none';
    if (selectedRole === 'ARTISAN') {
      (document.getElementById('is-business') as HTMLInputElement).checked = false;
      document.getElementById('business-fields')!.style.display = 'none';
    }
  });
});

document.getElementById('is-business')?.addEventListener('change', (e) => {
  const checked = (e.target as HTMLInputElement).checked;
  document.getElementById('business-fields')!.style.display = checked ? 'block' : 'none';
});

const form = document.getElementById('register-form') as HTMLFormElement;
const errEl = document.getElementById('error-msg')!;
const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errEl.style.display = 'none';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account…';

  const isBusiness = (document.getElementById('is-business') as HTMLInputElement).checked;
  const body = {
    name: (document.getElementById('name') as HTMLInputElement).value,
    email: (document.getElementById('email') as HTMLInputElement).value,
    phone: (document.getElementById('phone') as HTMLInputElement).value,
    password: (document.getElementById('password') as HTMLInputElement).value,
    role: selectedRole,
    is_business: isBusiness,
    business_name: isBusiness ? (document.getElementById('business-name') as HTMLInputElement).value : undefined,
  };

  const res = await apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(body) });
  submitBtn.disabled = false;
  submitBtn.textContent = 'Create Account';

  if (!res.success) {
    errEl.textContent = res.error || 'Registration failed';
    errEl.style.display = 'block';
    return;
  }

  if (selectedRole === 'ARTISAN') {
    window.location.href = '/login.html?msg=pending';
  } else {
    window.location.href = '/login.html';
  }
});
