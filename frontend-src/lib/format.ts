export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(date));
}

export function statusChip(status: string): string {
  const cls = status.toLowerCase().replace(/_/g, '_');
  return `<span class="chip chip-${cls}">${status.replace(/_/g, ' ')}</span>`;
}

export function stars(rating: number, count?: number): string {
  const full = Math.round(rating);
  const s = '★'.repeat(full) + '☆'.repeat(5 - full);
  const label = count !== undefined ? `(${count})` : '';
  return `<span class="stars">${s}</span>${label ? ` <span style="font-size:0.8rem;color:var(--mud)">${label}</span>` : ''}`;
}

export function paginate(total: number, page: number, limit: number, onClick: (p: number) => void): string {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return '';
  let html = '<div class="pagination">';
  html += `<button class="page-btn" ${page === 1 ? 'disabled' : ''} data-page="${page - 1}">‹</button>`;
  for (let i = 1; i <= pages; i++) {
    if (pages > 7 && Math.abs(i - page) > 2 && i !== 1 && i !== pages) {
      if (i === 2 || i === pages - 1) html += '<span style="padding:0 4px">…</span>';
      continue;
    }
    html += `<button class="page-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }
  html += `<button class="page-btn" ${page === pages ? 'disabled' : ''} data-page="${page + 1}">›</button>`;
  html += '</div>';
  return html;
}

export function productCard(p: {
  id: number;
  name: string;
  slug: string;
  price: number;
  status?: string;
  primary_image?: string;
  artisan_name?: string;
  category_name?: string;
  avg_rating?: number;
  review_count?: number;
}): string {
  const imgSrc = p.primary_image || '/uploads/seed/placeholder.jpg';
  const badge = p.status === 'APPROVED' ? '<span class="badge-authentic">Authentic</span>' : '';
  const rating = p.avg_rating ? stars(p.avg_rating, p.review_count) : '';
  return `
    <article class="product-card">
      <a href="/product.html?slug=${p.slug}" style="text-decoration:none;color:inherit">
        <div class="product-card-img">
          <img src="${imgSrc}" alt="${p.name}" loading="lazy" onerror="this.src='/css/placeholder.svg'">
        </div>
        <div class="product-card-body">
          <p class="product-card-meta">${p.category_name || ''} · ${p.artisan_name || ''}</p>
          <h3 class="product-card-title">${p.name}</h3>
          ${rating}
          <p class="product-card-price">${formatCurrency(p.price)}</p>
        </div>
      </a>
      <div class="product-card-footer">
        ${badge}
        <button class="btn btn-primary btn-sm add-to-cart-btn" data-id="${p.id}" data-name="${p.name}">Add to Cart</button>
      </div>
    </article>`;
}
