import { productRepo } from '../repositories/productRepo';
import { categoryRepo } from '../repositories/categoryRepo';
import { slugify } from '../utils/slugify';
import { createError } from '../middleware/errorHandler';
import { Product, ProductStatus } from '../types';

export const productService = {
  async create(artisanId: number, data: {
    name: string;
    category_id: number;
    description: string;
    craft_technique?: string;
    materials?: string;
    price: number;
    stock: number;
  }, images: { path: string; isPrimary: boolean }[]) {
    const category = await categoryRepo.findById(data.category_id);
    if (!category) throw createError('Category not found', 404);

    let slug = slugify(data.name);
    let attempt = 0;
    while (await productRepo.slugExists(slug)) {
      attempt++;
      slug = `${slugify(data.name)}-${attempt}`;
    }

    const id = await productRepo.create({
      artisan_id: artisanId,
      category_id: data.category_id,
      name: data.name,
      slug,
      description: data.description,
      craft_technique: data.craft_technique,
      materials: data.materials,
      price: data.price,
      stock: data.stock,
      status: 'DRAFT',
      is_featured: false,
    });

    for (const img of images) {
      await productRepo.addImage(id, img.path, img.isPrimary);
    }

    return productRepo.findById(id);
  },

  async update(id: number, artisanId: number, data: Partial<Product>, images?: { path: string; isPrimary: boolean }[]) {
    const product = await productRepo.findById(id);
    if (!product) throw createError('Product not found', 404);
    if (product.artisan_id !== artisanId) throw createError('Forbidden', 403);

    const isMinorEdit = data.price !== undefined || data.stock !== undefined;
    const hasContentEdit = data.name || data.description || data.craft_technique || data.materials || data.category_id;

    // Re-verification rule: content edits on APPROVED products reset to PENDING_REVIEW
    if (product.status === 'APPROVED' && hasContentEdit && !isMinorEdit) {
      data.status = 'PENDING_REVIEW';
    } else if (product.status === 'APPROVED' && isMinorEdit && !hasContentEdit) {
      // price/stock-only keeps approval — don't change status
    }

    if (data.name && data.name !== product.name) {
      let slug = slugify(data.name);
      let attempt = 0;
      while (await productRepo.slugExists(slug, id)) {
        attempt++;
        slug = `${slugify(data.name)}-${attempt}`;
      }
      data.slug = slug;
    }

    await productRepo.update(id, data);

    if (images && images.length > 0) {
      await productRepo.deleteImages(id);
      for (const img of images) {
        await productRepo.addImage(id, img.path, img.isPrimary);
      }
    }

    return productRepo.findById(id);
  },

  async submit(id: number, artisanId: number) {
    const product = await productRepo.findById(id);
    if (!product) throw createError('Product not found', 404);
    if (product.artisan_id !== artisanId) throw createError('Forbidden', 403);
    if (product.status !== 'DRAFT' && product.status !== 'REJECTED') {
      throw createError('Only DRAFT or REJECTED products can be submitted for review', 400);
    }
    await productRepo.updateStatus(id, 'PENDING_REVIEW');
  },

  async delist(id: number, artisanId?: number) {
    const product = await productRepo.findById(id);
    if (!product) throw createError('Product not found', 404);
    if (artisanId && product.artisan_id !== artisanId) throw createError('Forbidden', 403);
    await productRepo.updateStatus(id, 'DELISTED');
  },
};
