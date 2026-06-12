declare const Chart: any;

import { initLayout } from '../lib/layout';
import { requireUser } from '../lib/auth';
import { apiFetch } from '../lib/api';
import { formatCurrency } from '../lib/format';

interface Summary {
  total_revenue: number;
  total_orders: number;
  active_products: number;
  pending_reviews: number;
  this_month_revenue?: number;
}

interface RevenueData {
  labels: string[];
  data: number[];
}

interface TopProduct {
  name: string;
  revenue: number;
  units_sold: number;
}

async function init() {
  await initLayout();
  const user = await requireUser('ARTISAN');
  document.getElementById('welcome-title')!.textContent = `Welcome back, ${user.name}`;
  await Promise.all([loadSummary(), loadCharts()]);
}

async function loadSummary() {
  const res = await apiFetch<Summary>('/api/artisan/analytics/summary');
  const container = document.getElementById('stat-cards')!;
  if (!res.success || !res.data) {
    container.innerHTML = '<div class="alert alert-error">Failed to load analytics</div>';
    return;
  }
  const s = res.data;
  container.innerHTML = `
    <div class="stat-card">
      <p class="stat-label">Total Revenue</p>
      <p class="stat-value">${formatCurrency(s.total_revenue)}</p>
      ${s.this_month_revenue !== undefined ? `<p class="stat-sub">${formatCurrency(s.this_month_revenue)} this month</p>` : ''}
    </div>
    <div class="stat-card">
      <p class="stat-label">Total Orders</p>
      <p class="stat-value">${s.total_orders}</p>
    </div>
    <div class="stat-card">
      <p class="stat-label">Active Products</p>
      <p class="stat-value">${s.active_products}</p>
      <a href="/artisan/products.html" style="font-size:0.78rem;color:var(--bronze)">Manage →</a>
    </div>
    <div class="stat-card">
      <p class="stat-label">Pending Review</p>
      <p class="stat-value">${s.pending_reviews}</p>
      <p class="stat-sub">Awaiting consultant approval</p>
    </div>`;
}

async function loadCharts() {
  const [revenueRes, topRes] = await Promise.all([
    apiFetch<RevenueData>('/api/artisan/analytics/revenue'),
    apiFetch<{ top_products: TopProduct[] }>('/api/artisan/analytics/top-products'),
  ]);

  if (revenueRes.success && revenueRes.data) {
    const ctx = (document.getElementById('revenue-chart') as HTMLCanvasElement).getContext('2d')!;
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: revenueRes.data.labels,
        datasets: [{
          label: 'Revenue (₹)',
          data: revenueRes.data.data,
          borderColor: '#B0782B',
          backgroundColor: 'rgba(176,120,43,0.1)',
          fill: true,
          tension: 0.3,
          pointBackgroundColor: '#B0782B',
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

  if (topRes.success && topRes.data) {
    const products = topRes.data.top_products;
    const ctx = (document.getElementById('products-chart') as HTMLCanvasElement).getContext('2d')!;
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: products.map(p => p.name.slice(0, 20)),
        datasets: [{
          label: 'Revenue (₹)',
          data: products.map(p => p.revenue),
          backgroundColor: ['#B0782B','#2E4057','#5C7C4C','#8A5A33','#231A15'],
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
}

init();
