import { initLayout } from '../lib/layout';
import { apiFetch } from '../lib/api';
import { paginate } from '../lib/format';

interface Artisan {
  id: number;
  user_id: number;
  name: string;
  tribe_name: string;
  region: string;
  craft_tradition: string;
  story: string;
  years_experience: number;
  profile_image?: string;
  cover_image?: string;
}

let currentPage = 1;
const LIMIT = 12;

async function init() {
  await initLayout();
  await loadArtisans();
  setupFilters();
}

function artisanCard(a: Artisan): string {
  const avatar = a.profile_image || '/uploads/seed/placeholder.jpg';
  const cover = a.cover_image || '';
  const storyExcerpt = a.story ? a.story.slice(0, 160) + (a.story.length > 160 ? '…' : '') : '';
  return `
    <article class="artisan-card">
      <div class="artisan-card-banner">
        ${cover ? `<img src="${cover}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
        <div class="artisan-card-avatar">
          <img src="${avatar}" alt="${a.name}" onerror="this.src='/css/placeholder.svg'">
        </div>
      </div>
      <div class="artisan-card-body">
        <h3 class="artisan-card-name">${a.name}</h3>
        <p class="artisan-card-meta">${a.tribe_name || ''}${a.region ? ' · ' + a.region : ''}${a.years_experience ? ' · ' + a.years_experience + ' yrs' : ''}</p>
        ${a.craft_tradition ? `<p class="artisan-card-tradition">${a.craft_tradition}</p>` : ''}
        ${storyExcerpt ? `<p class="artisan-card-story">${storyExcerpt}</p>` : ''}
      </div>
      <div class="artisan-card-footer">
        <a href="/artisan.html?id=${a.id}" class="btn btn-secondary btn-sm">View Heritage Page →</a>
      </div>
    </article>`;
}

async function loadArtisans() {
  const grid = document.getElementById('artisans-grid')!;
  grid.innerHTML = '<div class="skeleton" style="height:280px"></div>'.repeat(6);

  const search = (document.getElementById('search-artisans') as HTMLInputElement)?.value || '';
  const region = (document.getElementById('filter-region') as HTMLSelectElement)?.value || '';

  const qs = new URLSearchParams();
  if (search) qs.set('search', search);
  if (region) qs.set('region', region);
  qs.set('page', String(currentPage));
  qs.set('limit', String(LIMIT));

  const res = await apiFetch<{ artisans: Artisan[]; total: number; regions?: string[] }>(`/api/artisans?${qs}`);

  if (!res.success || !res.data) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div><h3>Failed to load artisans</h3><p>Please try again later.</p></div>';
    return;
  }

  const { artisans, total, regions } = res.data;

  // Populate region filter on first load
  if (regions && currentPage === 1 && (document.getElementById('filter-region') as HTMLSelectElement).children.length <= 1) {
    const sel = document.getElementById('filter-region') as HTMLSelectElement;
    regions.forEach(r => {
      if (r) sel.insertAdjacentHTML('beforeend', `<option value="${r}">${r}</option>`);
    });
  }

  document.getElementById('results-info')!.textContent = `${total} artisan${total !== 1 ? 's' : ''}`;

  if (!artisans.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">🎨</div><h3>No artisans found</h3><p>Try a different search</p></div>`;
    document.getElementById('pagination')!.innerHTML = '';
    return;
  }

  grid.innerHTML = artisans.map(artisanCard).join('');

  document.getElementById('pagination')!.innerHTML = paginate(total, currentPage, LIMIT, (p) => {
    currentPage = p;
    loadArtisans();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  document.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = parseInt((btn as HTMLElement).dataset.page!);
      currentPage = p;
      loadArtisans();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

function setupFilters() {
  let debounceTimer: ReturnType<typeof setTimeout>;
  document.getElementById('search-artisans')?.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => { currentPage = 1; loadArtisans(); }, 400);
  });
  document.getElementById('filter-region')?.addEventListener('change', () => {
    currentPage = 1;
    loadArtisans();
  });
}

init();
