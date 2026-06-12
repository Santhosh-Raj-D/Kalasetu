import { apiFetch } from '../lib/api';

const form = document.getElementById('login-form') as HTMLFormElement;
const errEl = document.getElementById('error-msg')!;
const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errEl.style.display = 'none';
  submitBtn.disabled = true;
  submitBtn.textContent = 'Signing in…';

  const email = (document.getElementById('email') as HTMLInputElement).value;
  const password = (document.getElementById('password') as HTMLInputElement).value;

  const res = await apiFetch<{ user: { role: string } }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  submitBtn.disabled = false;
  submitBtn.textContent = 'Sign In';

  if (!res.success) {
    errEl.textContent = res.error || 'Login failed';
    errEl.style.display = 'block';
    return;
  }

  const role = res.data?.user.role;
  const redir = new URLSearchParams(window.location.search).get('redirect');
  if (redir) {
    window.location.href = redir;
  } else if (role === 'ADMIN') {
    window.location.href = '/admin/dashboard.html';
  } else if (role === 'ARTISAN') {
    window.location.href = '/artisan/dashboard.html';
  } else if (role === 'CONSULTANT') {
    window.location.href = '/consultant/queue.html';
  } else {
    window.location.href = '/';
  }
});
