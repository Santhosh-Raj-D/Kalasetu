import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { validate } from '../middleware/validate';
import { uploadMultiple, uploadFields } from '../middleware/upload';
import { productService } from '../services/productService';
import { productRepo } from '../repositories/productRepo';
import { artisanRepo } from '../repositories/artisanRepo';
import { orderRepo } from '../repositories/orderRepo';
import { analyticsRepo } from '../repositories/analyticsRepo';
import { createError } from '../middleware/errorHandler';
import { createNotification } from '../utils/notify';

const router = Router();
router.use(requireAuth, requireRole('ARTISAN'));

router.get('/products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await productRepo.findByArtisan(req.user!.id);
    res.json({ success: true, data: products });
  } catch (err) { next(err); }
});

router.post('/products', uploadMultiple, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[];
    const images = (files || []).map((f, i) => ({ path: `/uploads/${f.filename}`, isPrimary: i === 0 }));
    const product = await productService.create(req.user!.id, {
      name: req.body.name,
      category_id: parseInt(req.body.category_id),
      description: req.body.description,
      craft_technique: req.body.craft_technique,
      materials: req.body.materials,
      price: parseFloat(req.body.price),
      stock: parseInt(req.body.stock),
    }, images);
    res.status(201).json({ success: true, data: product });
  } catch (err) { next(err); }
});

router.patch('/products/:id', uploadMultiple, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[];
    const images = files && files.length > 0
      ? files.map((f, i) => ({ path: `/uploads/${f.filename}`, isPrimary: i === 0 }))
      : undefined;

    const data: Record<string, unknown> = {};
    ['name', 'description', 'craft_technique', 'materials'].forEach(k => { if (req.body[k] !== undefined) data[k] = req.body[k]; });
    if (req.body.category_id) data.category_id = parseInt(req.body.category_id);
    if (req.body.price) data.price = parseFloat(req.body.price);
    if (req.body.stock !== undefined) data.stock = parseInt(req.body.stock);

    const product = await productService.update(parseInt(req.params.id), req.user!.id, data, images);
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
});

router.delete('/products/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await productService.delist(parseInt(req.params.id), req.user!.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.post('/products/:id/submit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await productService.submit(parseInt(req.params.id), req.user!.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.get('/orders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const result = await orderRepo.findByArtisan(req.user!.id, page, limit);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.patch('/orders/:orderId/status',
  body('status').isIn(['CONFIRMED', 'SHIPPED', 'DELIVERED']),
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const canUpdate = await orderRepo.canArtisanUpdateOrder(orderId, req.user!.id);
      if (!canUpdate) throw createError('Forbidden', 403);

      const order = await orderRepo.findById(orderId);
      if (!order) throw createError('Order not found', 404);

      const validTransitions: Record<string, string[]> = {
        CONFIRMED: ['SHIPPED'],
        SHIPPED: ['DELIVERED'],
      };
      if (!validTransitions[order.status]?.includes(req.body.status)) {
        throw createError(`Cannot transition from ${order.status} to ${req.body.status}`, 400);
      }

      await orderRepo.updateStatus(orderId, req.body.status);

      await createNotification(order.customer_id, 'ORDER_UPDATE',
        `Order ${order.order_number} is now ${req.body.status}`,
        undefined, `/order.html?id=${orderId}`);

      res.json({ success: true });
    } catch (err) { next(err); }
  }
);

router.patch('/profile', uploadFields, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Record<string, Express.Multer.File[]> | undefined;
    const profileImage = files?.profile_image?.[0]?.filename ? `/uploads/${files.profile_image[0].filename}` : undefined;
    const coverImage = files?.cover_image?.[0]?.filename ? `/uploads/${files.cover_image[0].filename}` : undefined;

    await artisanRepo.upsert({
      user_id: req.user!.id,
      tribe_name: req.body.tribe_name || '',
      region: req.body.region || '',
      craft_tradition: req.body.craft_tradition || '',
      story: req.body.story,
      years_experience: parseInt(req.body.years_experience) || 0,
      profile_image: profileImage,
      cover_image: coverImage,
    });

    const profile = await artisanRepo.findByUserId(req.user!.id);
    res.json({ success: true, data: profile });
  } catch (err) { next(err); }
});

router.get('/analytics/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await analyticsRepo.artisanSummary(req.user!.id);
    res.json({ success: true, data: summary });
  } catch (err) { next(err); }
});

router.get('/analytics/revenue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const range = req.query.range === '7d' ? 7 : 30;
    const revenue = await analyticsRepo.artisanRevenue(req.user!.id, range);
    const topProducts = await analyticsRepo.artisanTopProducts(req.user!.id);
    res.json({ success: true, data: { revenue, topProducts } });
  } catch (err) { next(err); }
});

export default router;
