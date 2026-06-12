import { initLayout } from '../lib/layout';
import { requireUser } from '../lib/auth';
import { apiFetch, apiFetchForm } from '../lib/api';
import { showToast } from '../lib/toast';

interface ArtisanProfile {
  id: number;
  name: string;
  tribe_name: string;
  region: string;
  craft_tradition: string;
  story: string;
  years_experience?: number;
  profile_image?: string;
  cover_image?: string;
}

async function init() {
  await initLayout();
  const user = await requireUser('ARTISAN');

  // Update preview name
  document.getElementById('preview-name')!.textContent = user.name;

  await loadProfile();
  setupLivePreviews();
  setupImageUploads();
  setupSubmit();
}

async function loadProfile() {
  const res = await apiFetch<ArtisanProfile>('/api/artisan/profile');
  if (!res.success || !res.data) return;

  const p = res.data;
  const form = document.getElementById('profile-form') as HTMLFormElement;

  const setVal = (name: string, val: string) => {
    const el = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`);
    if (el) el.value = val;
  };

  setVal('tribe_name', p.tribe_name || '');
  setVal('region', p.region || '');
  setVal('craft_tradition', p.craft_tradition || '');
  setVal('story', p.story || '');
  setVal('years_experience', String(p.years_experience || ''));

  // Update previews
  updatePreview('tribe_name', p.tribe_name || '');
  updatePreview('region', p.region || '');
  updatePreview('craft_tradition', p.craft_tradition || '');
  updatePreview('story', p.story || '');

  if (p.profile_image) {
    const box = document.getElementById('profile-upload-box')!;
    box.innerHTML = `<img src="${p.profile_image}" alt="Profile" style="width:80px;height:80px;border-radius:50%;object-fit:cover;margin:0 auto;display:block">
      <p style="font-size:0.75rem;color:var(--mud);margin-top:0.4rem">Click to change</p>
      <input type="file" id="profile-img-input" accept="image/*" style="display:none">`;
    const preview = document.getElementById('preview-avatar')!;
    preview.innerHTML = `<img src="${p.profile_image}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    setupProfileClick();
  }

  if (p.cover_image) {
    const box = document.getElementById('cover-upload-box')!;
    box.innerHTML = `<img src="${p.cover_image}" alt="Cover" style="width:100%;height:80px;object-fit:cover;border-radius:var(--radius)">
      <p style="font-size:0.75rem;color:var(--mud);margin-top:0.4rem">Click to change</p>
      <input type="file" id="cover-img-input" accept="image/*" style="display:none">`;
    const preview = document.getElementById('preview-cover')!;
    preview.innerHTML = `<img src="${p.cover_image}" style="width:100%;height:160px;object-fit:cover;display:block">`;
    setupCoverClick();
  }

  // Set preview link
  (document.getElementById('preview-link') as HTMLAnchorElement).href = `/artisan.html?id=${p.id}`;
}

function updatePreview(field: string, value: string) {
  if (field === 'tribe_name' || field === 'region') {
    const tribe = (document.querySelector<HTMLInputElement>('[name="tribe_name"]'))?.value || '';
    const region = (document.querySelector<HTMLInputElement>('[name="region"]'))?.value || '';
    document.getElementById('preview-tribe-region')!.textContent = [tribe, region].filter(Boolean).join(' · ');
  }
  if (field === 'craft_tradition') {
    document.getElementById('preview-tradition')!.textContent = value;
  }
  if (field === 'story') {
    document.getElementById('preview-story')!.textContent = value;
  }
}

function setupLivePreviews() {
  ['tribe_name', 'region', 'craft_tradition'].forEach(name => {
    document.querySelector<HTMLInputElement>(`[name="${name}"]`)?.addEventListener('input', (e) => {
      updatePreview(name, (e.target as HTMLInputElement).value);
    });
  });
  document.getElementById('story-input')?.addEventListener('input', (e) => {
    updatePreview('story', (e.target as HTMLTextAreaElement).value);
  });
}

function setupProfileClick() {
  const box = document.getElementById('profile-upload-box')!;
  box.addEventListener('click', () => document.getElementById('profile-img-input')!.click());
  const input = document.getElementById('profile-img-input') as HTMLInputElement;
  input?.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const preview = document.getElementById('preview-avatar')!;
    preview.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    (box as any)._file = file;
  });
}

function setupCoverClick() {
  const box = document.getElementById('cover-upload-box')!;
  box.addEventListener('click', () => document.getElementById('cover-img-input')!.click());
  const input = document.getElementById('cover-img-input') as HTMLInputElement;
  input?.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const preview = document.getElementById('preview-cover')!;
    preview.innerHTML = `<img src="${url}" style="width:100%;height:160px;object-fit:cover;display:block">`;
    (box as any)._file = file;
  });
}

function setupImageUploads() {
  setupProfileClick();
  setupCoverClick();
}

function setupSubmit() {
  document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;

    document.querySelectorAll('.form-error').forEach(el => (el.textContent = ''));
    document.getElementById('profile-form-error')!.style.display = 'none';

    const tribe_name = form.querySelector<HTMLInputElement>('[name="tribe_name"]')!.value.trim();
    const region = form.querySelector<HTMLInputElement>('[name="region"]')!.value.trim();
    const craft_tradition = form.querySelector<HTMLInputElement>('[name="craft_tradition"]')!.value.trim();
    const story = form.querySelector<HTMLTextAreaElement>('[name="story"]')!.value.trim();
    const years_experience = form.querySelector<HTMLInputElement>('[name="years_experience"]')!.value;

    let valid = true;
    if (!tribe_name) { document.getElementById('err-tribe_name')!.textContent = 'Required'; valid = false; }
    if (!region) { document.getElementById('err-region')!.textContent = 'Required'; valid = false; }
    if (!craft_tradition) { document.getElementById('err-craft_tradition')!.textContent = 'Required'; valid = false; }
    if (!story) { document.getElementById('err-story')!.textContent = 'Required'; valid = false; }
    if (!valid) return;

    const btn = document.getElementById('save-profile-btn') as HTMLButtonElement;
    btn.disabled = true;
    btn.textContent = 'Saving…';

    const fd = new FormData();
    fd.append('tribe_name', tribe_name);
    fd.append('region', region);
    fd.append('craft_tradition', craft_tradition);
    fd.append('story', story);
    if (years_experience) fd.append('years_experience', years_experience);

    const profileBox = document.getElementById('profile-upload-box') as any;
    if (profileBox._file) fd.append('profile_image', profileBox._file);
    const coverBox = document.getElementById('cover-upload-box') as any;
    if (coverBox._file) fd.append('cover_image', coverBox._file);

    const res = await apiFetchForm('/api/artisan/profile', fd, 'PATCH');
    btn.disabled = false;
    btn.textContent = 'Save Heritage Profile';

    if (res.success) {
      showToast('Heritage profile updated!', 'success');
    } else {
      const errEl = document.getElementById('profile-form-error')!;
      errEl.textContent = res.error || 'Failed to save profile';
      errEl.style.display = 'block';
    }
  });
}

init();
