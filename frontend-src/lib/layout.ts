import { getUser, logout } from './auth';
import { apiFetch } from './api';
import { showToast } from './toast';

const WARLI_SVG = `<svg viewBox="0 0 1200 40" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect width="1200" height="40" fill="#8A5A33" opacity="0.15"/>
  ${Array.from({ length: 18 }, (_, i) => {
    const x = i * 68 + 20;
    return `<g transform="translate(${x},20)" stroke="#8A5A33" stroke-width="1.5" fill="none" opacity="0.7">
      <circle cx="0" cy="-12" r="4"/>
      <line x1="0" y1="-8" x2="0" y2="2"/>
      <line x1="0" y1="-4" x2="-8" y2="2"/>
      <line x1="0" y1="-4" x2="8" y2="2"/>
      <line x1="0" y1="2" x2="-5" y2="12"/>
      <line x1="0" y1="2" x2="5" y2="12"/>
    </g>`;
  }).join('')}
</svg>`;

export async function initLayout(): Promise<void> {
  const user = await getUser();

  // Inject toast container
  if (!document.getElementById('toast-container')) {
    const tc = document.createElement('div');
    tc.id = 'toast-container';
    document.body.appendChild(tc);
  }

  // Inject header
  const header = document.querySelector('header.site-header');
  if (header) {
    let roleLinks = '';
    if (!user) {
      roleLinks = `<li><a href="/login.html">Sign In</a></li><li><a href="/register.html" class="btn-nav">Register</a></li>`;
    } else if (user.role === 'ADMIN') {
      roleLinks = `<li><a href="/admin/dashboard.html">Dashboard</a></li><li><button class="nav-icon-btn" id="logout-btn" title="Logout">⏏</button></li>`;
    } else if (user.role === 'ARTISAN') {
      roleLinks = `<li><a href="/artisan/dashboard.html">My Shop</a></li><li><button class="nav-icon-btn" id="logout-btn" title="Logout">⏏</button></li>`;
    } else if (user.role === 'CONSULTANT') {
      roleLinks = `<li><a href="/consultant/queue.html">Review Queue</a></li><li><button class="nav-icon-btn" id="logout-btn" title="Logout">⏏</button></li>`;
    } else {
      roleLinks = `
        <li><a href="/wishlist.html">♡ Wishlist</a></li>
        <li><a href="/cart.html" id="cart-link">🛒 Cart <span id="cart-count"></span></a></li>
        <li><button class="nav-icon-btn" id="logout-btn" title="Logout">⏏</button></li>`;
    }

    const notifBtn = user ? `<li style="position:relative">
      <button class="nav-icon-btn" id="notif-btn" title="Notifications">🔔 <span class="badge" id="notif-badge" style="display:none">0</span></button>
      <div class="notif-dropdown" id="notif-dropdown"></div>
    </li>` : '';

    header.innerHTML = `
      <div class="nav-inner">
        <a href="/" class="nav-logo">Kala<span>Setu</span></a>
        <div class="nav-search">
          <input type="search" placeholder="Search crafts…" id="global-search" aria-label="Search">
          <button onclick="document.location='/shop.html?search='+document.getElementById('global-search').value" aria-label="Search">🔍</button>
        </div>
        <ul class="nav-links" id="nav-links">
          <li><a href="/shop.html">Shop</a></li>
          <li><a href="/artisans.html">Artisans</a></li>
          ${notifBtn}
          ${roleLinks}
        </ul>
        <button class="hamburger" id="hamburger" aria-label="Toggle menu">☰</button>
      </div>`;

    document.getElementById('hamburger')?.addEventListener('click', () => {
      document.getElementById('nav-links')?.classList.toggle('open');
    });

    document.getElementById('logout-btn')?.addEventListener('click', () => logout());
    document.getElementById('global-search')?.addEventListener('keydown', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') {
        window.location.href = '/shop.html?search=' + (e.target as HTMLInputElement).value;
      }
    });

    if (user) {
      loadNotifications();
      if (user.role === 'CUSTOMER') loadCartCount();
    }
  }

  // Warli friezes
  document.querySelectorAll('.warli-frieze').forEach(el => {
    el.innerHTML = WARLI_SVG;
  });

  // Footer
  const footer = document.querySelector('footer.site-footer');
  if (footer) {
    footer.innerHTML = `
      <div class="footer-grid">
        <div class="footer-brand">
          <h3>KalaSetu</h3>
          <p>Bridging tribal artisans and the world. Every purchase directly supports indigenous craftspeople and preserves centuries of living heritage.</p>
        </div>
        <div class="footer-col">
          <h4>Explore</h4>
          <ul>
            <li><a href="/shop.html">Shop All</a></li>
            <li><a href="/artisans.html">Artisans</a></li>
            <li><a href="/about.html">About</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Crafts</h4>
          <ul>
            <li><a href="/shop.html?category=metal-craft">Dhokra Metal</a></li>
            <li><a href="/shop.html?category=paintings">Tribal Painting</a></li>
            <li><a href="/shop.html?category=textiles-embroidery">Embroidery</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h4>Account</h4>
          <ul>
            ${user ? `<li><a href="/orders.html">My Orders</a></li><li><a href="/tickets.html">Support</a></li>` : `<li><a href="/login.html">Sign In</a></li><li><a href="/register.html">Register</a></li>`}
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 KalaSetu. Proudly supporting tribal artisans.</span>
        <span>Built with ♥ for India's craft traditions</span>
      </div>`;
  }
}

async function loadNotifications() {
  const res = await apiFetch<{ notifications: { id: number; title: string; body: string; is_read: boolean; link: string; created_at: string }[]; unread: number }>('/api/notifications');
  if (!res.success || !res.data) return;

  const badge = document.getElementById('notif-badge');
  const dropdown = document.getElementById('notif-dropdown');
  const btn = document.getElementById('notif-btn');

  if (badge) {
    if (res.data.unread > 0) {
      badge.textContent = String(res.data.unread);
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  if (dropdown) {
    if (res.data.notifications.length === 0) {
      dropdown.innerHTML = '<div style="padding:1rem;text-align:center;color:var(--mud);font-size:0.85rem">No notifications</div>';
    } else {
      dropdown.innerHTML = res.data.notifications.slice(0, 10).map(n => `
        <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="window.location.href='${n.link || '#'}'">
          <div class="notif-title">${n.title}</div>
          ${n.body ? `<div class="notif-body">${n.body}</div>` : ''}
        </div>`).join('');
    }
  }

  btn?.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown?.classList.toggle('open');
    if (dropdown?.classList.contains('open') && res.data!.unread > 0) {
      apiFetch('/api/notifications/read-all', { method: 'PATCH' });
      if (badge) badge.style.display = 'none';
    }
  });

  document.addEventListener('click', () => dropdown?.classList.remove('open'));
}

async function loadCartCount() {
  const res = await apiFetch<unknown[]>('/api/cart');
  if (res.success && res.data) {
    const el = document.getElementById('cart-count');
    if (el && (res.data as unknown[]).length > 0) {
      el.textContent = `(${(res.data as unknown[]).length})`;
    }
  }
}
