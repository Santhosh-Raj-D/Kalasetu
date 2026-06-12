import { initLayout } from '../lib/layout';
import { requireUser } from '../lib/auth';
import { apiFetch, apiFetchForm } from '../lib/api';
import { showToast } from '../lib/toast';

interface Category { id: number; name: string; slug: string; }
interface Product {
  id: number;
  name: string;
  category_id: number;
  description: string;
  craft_technique?: string;
  materials?: string;
  price: number;
  stock: number;
  images?: { url: string; sort_order: number }[];
}

const imageFiles: (File | null)[] = [null, null, null, null, null];
const imageUrls: (string | null)[] = [null, null, null, null, null]; // existing URLs for edit mode
let activeSlot = 0;
let editId: string | null = null;

async function init() {
  await initLayout();
  await requireUser('ARTISAN');

  const params = new URLSearchParams(window.location.search);
  editId = params.get('id');

  await loadCategories();

  if (editId) {
    document.getElementById('form-mode-label')!.textContent = 'Edit Product';
    document.getElementById('form-title')!.textContent = 'Edit Product';
    document.getElementById('submit-btn')!.textContent = 'Update Product';
    await loadProduct(editId);
  }

  setupImagePicker();
  setupSubmit();
}

async function loadCategories() {
  const res = await apiFetch<Category[]>('/api/categories');
  const sel = document.getElementById('category-select') as HTMLSelectElement;
  if (!res.success || !res.data) {
    sel.innerHTML = '<option value="">Failed to load categories</option>';
    return;
  }
  sel.innerHTML = `<option value="">Select a category</option>` +
    res.data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
}

async function loadProduct(id: string) {
  const res = await apiFetch<Product>(`/api/artisan/products/${id}`);
  if (!res.success || !res.data) {
    showToast('Failed to load product', 'error');
    return;
  }
  const p = res.data;
  const form = document.getElementById('product-form') as HTMLFormElement;
  (form.querySelector<HTMLInputElement>('[name="name"]'))!.value = p.name;
  (form.querySelector<HTMLSelectElement>('[name="category_id"]'))!.value = String(p.category_id);
  (form.querySelector<HTMLTextAreaElement>('[name="description"]'))!.value = p.description;
  (form.querySelector<HTMLInputElement>('[name="craft_technique"]'))!.value = p.craft_technique || '';
  (form.querySelector<HTMLInputElement>('[name="materials"]'))!.value = p.materials || '';
  (form.querySelector<HTMLInputElement>('[name="price"]'))!.value = String(p.price);
  (form.querySelector<HTMLInputElement>('[name="stock"]'))!.value = String(p.stock);

  // Populate image previews with existing images
  if (p.images) {
    p.images.slice(0, 5).forEach((img, i) => {
      imageUrls[i] = img.url;
      updateSlotPreview(i, img.url);
    });
  }
}

function updateSlotPreview(slot: number, url: string) {
  const slotEl = document.querySelector(`.img-preview-slot[data-slot="${slot}"]`) as HTMLElement;
  if (!slotEl) return;
  slotEl.innerHTML = `
    <img src="${url}" alt="Preview ${slot + 1}">
    <button type="button" class="remove-img" data-slot="${slot}">×</button>`;
  slotEl.querySelector('.remove-img')?.addEventListener('click', (e) => {
    e.stopPropagation();
    imageFiles[slot] = null;
    imageUrls[slot] = null;
    slotEl.innerHTML = '+';
    setupSlotClick(slotEl, slot);
  });
}

function setupSlotClick(el: HTMLElement, slot: number) {
  el.addEventListener('click', () => {
    activeSlot = slot;
    document.getElementById('img-file-input')!.click();
  });
}

function setupImagePicker() {
  document.querySelectorAll('.img-preview-slot').forEach(slot => {
    const s = parseInt((slot as HTMLElement).dataset.slot!);
    setupSlotClick(slot as HTMLElement, s);
  });

  const fileInput = document.getElementById('img-file-input') as HTMLInputElement;
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    imageFiles[activeSlot] = file;
    const url = URL.createObjectURL(file);
    imageUrls[activeSlot] = url;
    updateSlotPreview(activeSlot, url);
    fileInput.value = '';
  });
}

function setupSubmit() {
  document.getElementById('product-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;

    // Clear errors
    document.querySelectorAll('.form-error').forEach(el => (el.textContent = ''));
    document.getElementById('form-global-error')!.style.display = 'none';

    const name = form.querySelector<HTMLInputElement>('[name="name"]')!.value.trim();
    const category_id = form.querySelector<HTMLSelectElement>('[name="category_id"]')!.value;
    const description = form.querySelector<HTMLTextAreaElement>('[name="description"]')!.value.trim();
    const price = form.querySelector<HTMLInputElement>('[name="price"]')!.value;
    const stock = form.querySelector<HTMLInputElement>('[name="stock"]')!.value;
    const craft_technique = form.querySelector<HTMLInputElement>('[name="craft_technique"]')!.value.trim();
    const materials = form.querySelector<HTMLInputElement>('[name="materials"]')!.value.trim();

    let valid = true;
    if (!name) { document.getElementById('err-name')!.textContent = 'Name is required'; valid = false; }
    if (!category_id) { document.getElementById('err-category_id')!.textContent = 'Category is required'; valid = false; }
    if (!description) { document.getElementById('err-description')!.textContent = 'Description is required'; valid = false; }
    if (!price || parseFloat(price) <= 0) { document.getElementById('err-price')!.textContent = 'Enter a valid price'; valid = false; }
    if (!stock || parseInt(stock) < 0) { document.getElementById('err-stock')!.textContent = 'Enter a valid stock quantity'; valid = false; }
    if (!valid) return;

    const btn = document.getElementById('submit-btn') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = editId ? 'Updating…' : 'Saving…';

    // Build FormData
    const fd = new FormData();
    fd.append('name', name);
    fd.append('category_id', category_id);
    fd.append('description', description);
    fd.append('price', price);
    fd.append('stock', stock);
    if (craft_technique) fd.append('craft_technique', craft_technique);
    if (materials) fd.append('materials', materials);

    imageFiles.forEach((file, i) => {
      if (file) fd.append(`images`, file);
    });

    let res;
    if (editId) {
      res = await apiFetchForm(`/api/artisan/products/${editId}`, fd, 'PATCH');
    } else {
      res = await apiFetchForm('/api/artisan/products', fd, 'POST');
    }

    btn.disabled = false;
    btn.textContent = editId ? 'Update Product' : 'Save Product';

    if (res.success) {
      showToast(editId ? 'Product updated' : 'Product saved as draft', 'success');
      setTimeout(() => { window.location.href = '/artisan/products.html'; }, 800);
    } else {
      const errEl = document.getElementById('form-global-error')!;
      errEl.textContent = res.error || 'Failed to save product';
      errEl.style.display = 'block';
    }
  });
}

init();
