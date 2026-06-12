declare const Chart: any;

import { initLayout } from '../lib/layout';
import { requireUser } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { formatCurrency } from '../lib/format';

interface AdminSummary {
  gmv: number;
  total_orders: number;
  total_users: number;
  active_products: number;
  pending_reviews: number;
  open_tickets: number;
}

interface ChartData {
  orders_per_day: { labels: string[]; data: number[] };
  revenue_by_category: { labels: string[]; data: number[] };
}

async function init() {
  await initLayout();
  await requireUser('ADMIN');
  await Promise.all([loadSummary(), loadCharts()]);
}

async function loadSummary() {
  const res = await apiFetch<AdminSummary>('/api/admin/analytics/summary');
  const container = document.getElementById('kpi-cards')!;
  if (!res.success || !res.data) {
    container.innerHTML = '<div class="alert alert-error">Failed to load analytics</div>';
    return;
  }
  const s = res.data;
  container.innerHTML = `
    <div class="stat-card">
      <p class="stat-label">Gross Merchandise Value</p>
      <p class="stat-value">${formatCurrency(s.gmv)}</p>
    </div>
    <div class="stat-card">
      <p class="stat-label">Total Orders</p>
      <p class="stat-value">${s.total_orders.toLocaleString('en-IN')}</p>
    </div>
    <div class="stat-card">
      <p class="stat-label">Total Users</p>
      <p class="stat-value">${s.total_users.toLocaleString('en-IN')}</p>
      <a href="/admin/users.html" style="font-size:0.78rem;color:var(--bronze)">Manage →</a>
    </div>
    <div class="stat-card">
      <p class="stat-label">Active Products</p>
      <p class="stat-value">${s.active_products.toLocaleString('en-IN')}</p>
    </div>
    <div class="stat-card">
      <p class="stat-label">Pending Reviews</p>
      <p class="stat-value">${s.pending_reviews}</p>
      <a href="/consultant/queue.html" style="font-size:0.78rem;color:var(--bronze)">View Queue →</a>
    </div>
    <div class="stat-card">
      <p class="stat-label">Open Tickets</p>
      <p class="stat-value">${s.open_tickets}</p>
      <a href="/admin/tickets.html" style="font-size:0.78rem;color:var(--bronze)">View →</a>
    </div>`;
}

async function loadCharts() {
  const res = await apiFetch<ChartData>('/api/admin/analytics/charts');
  if (!res.success || !res.data) return;
  const { orders_per_day, revenue_by_category } = res.data;

  const palette = ['#B0782B','#2E4057','#5C7C4C','#8A5A33','#231A15','#c4b99a','#6b9080'];

  const ordersCtx = (document.getElementById('orders-chart') as HTMLCanvasElement).getContext('2d')!;
  new Chart(ordersCtx, {
    type: 'line',
    data: {
      labels: orders_per_day.labels,
      datasets: [{
        label: 'Orders',
        data: orders_per_day.data,
        borderColor: '#B0782B',
        backgroundColor: 'rgba(176,120,43,0.1)',
        fill: true,
        tension: 0.3,
        pointBackgroundColor: '#B0782B',
        pointRadius: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });

  const catCtx = (document.getElementById('categories-chart') as HTMLCanvasElement).getContext('2d')!;
  new Chart(catCtx, {
    type: 'bar',
    data: {
      labels: revenue_by_category.labels,
      datasets: [{
        label: 'Revenue (₹)',
        data: revenue_by_category.data,
        backgroundColor: palette,
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { ticks: { callback: (v: number) => '₹' + v.toLocaleString('en-IN') } },
      },
    },
  });
}

init();
