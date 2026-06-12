export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function uniqueSlug(base: string, suffix: string | number = ''): string {
  const slug = slugify(base);
  return suffix ? `${slug}-${suffix}` : slug;
}
