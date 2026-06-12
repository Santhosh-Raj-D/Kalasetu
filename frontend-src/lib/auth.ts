import { apiFetch } from './api';

export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'ARTISAN' | 'CUSTOMER' | 'CONSULTANT';
  phone?: string;
  is_business: boolean;
  business_name?: string;
  status: string;
}

let _user: CurrentUser | null = null;

export async function getUser(): Promise<CurrentUser | null> {
  if (_user) return _user;
  const res = await apiFetch<CurrentUser>('/api/auth/me', { noRedirect: true });
  if (res.success && res.data) {
    _user = res.data;
    return _user;
  }
  return null;
}

export async function requireUser(...roles: string[]): Promise<CurrentUser> {
  const user = await getUser();
  if (!user) {
    window.location.href = '/login.html';
    throw new Error('Not authenticated');
  }
  if (roles.length > 0 && !roles.includes(user.role)) {
    window.location.href = '/login.html';
    throw new Error('Insufficient permissions');
  }
  return user;
}

export async function logout(): Promise<void> {
  await apiFetch('/api/auth/logout', { method: 'POST' });
  _user = null;
  window.location.href = '/login.html';
}
