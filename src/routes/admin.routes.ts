import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { validate } from '../middleware/validate';
import { userRepo } from '../repositories/userRepo';
import { productRepo } from '../repositories/productRepo';
import { couponRepo } from '../repositories/couponRepo';
import { paymentRepo } from '../repositories/paymentRepo';
import { categoryRepo } from '../repositories/categoryRepo';
import { analyticsRepo } from '../repositories/analyticsRepo';
import { authService } from '../services/authService';
import { slugify } from '../utils/slugify';
import { createError } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth, requireRole('ADMIN'));

// Users
router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await userRepo.findAll({
      role: req.query.role as string | undefined as never,
      status: req.query.status as string | undefined as never,
      page,
      limit,
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.post('/users',
  body('name').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['CONSULTANT', 'ADMIN']),
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = await authService.createUserByAdmin(req.body);
      res.status(201).json({ success: true, data: { id } });
    } catch (err) { next(err); }
  }
);

router.patch('/users/:id/status',
  body('status').isIn(['ACTIVE', 'SUSPENDED', 'PENDING']),
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await userRepo.updateStatus(parseInt(req.params.id), req.body.status);
      res.json({ success: true });
    } catch (err) { next(err); }
  }
);

// Products
router.get('/products', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await productRepo.findAllAdmin({
      status: req.query.status as string | undefined as never,
      page,
      limit,
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.patch('/products/:id/feature', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await productRepo.update(parseInt(req.params.id), { is_featured: req.body.is_featured });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.patch('/products/:id/delist', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await productRepo.updateStatus(parseInt(req.params.id), 'DELISTED');
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Coupons
router.get('/coupons', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await couponRepo.findAll({ page, limit });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.post('/coupons',
  body('code').trim().notEmpty().toUpperCase(),
  body('discount_type').isIn(['PERCENT', 'FLAT']),
  body('discount_value').isFloat({ min: 0 }),
  body('min_order_amount').optional().isFloat({ min: 0 }),
  body('max_uses').optional().isInt({ min: 1 }),
  body('valid_from').isISO8601(),
  body('valid_to').isISO8601(),
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = await couponRepo.create({ ...req.body, created_by: req.user!.id, used_count: 0, artisan_id: null });
      res.status(201).json({ success: true, data: { id } });
    } catch (err) { next(err); }
  }
);

router.patch('/coupons/:id',
  body('is_active').optional().isBoolean(),
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await couponRepo.update(parseInt(req.params.id), req.body);
      res.json({ success: true });
    } catch (err) { next(err); }
  }
);

// Transactions
router.get('/transactions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await paymentRepo.findAll({
      page, limit,
      status: req.query.status as string | undefined as never,
    });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// Analytics
router.get('/analytics/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await analyticsRepo.adminSummary();
    res.json({ success: true, data: summary });
  } catch (err) { next(err); }
});

router.get('/analytics/charts', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [ordersPerDay, topCategories, topArtisans, userGrowth] = await Promise.all([
      analyticsRepo.ordersPerDay(),
      analyticsRepo.topCategories(),
      analyticsRepo.topArtisans(),
      analyticsRepo.userGrowth(),
    ]);
    res.json({ success: true, data: { ordersPerDay, topCategories, topArtisans, userGrowth } });
  } catch (err) { next(err); }
});

// Categories
router.get('/categories', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await categoryRepo.findAll();
    res.json({ success: true, data: categories });
  } catch (err) { next(err); }
});

router.post('/categories',
  body('name').trim().notEmpty(),
  body('description').optional().trim(),
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = slugify(req.body.name);
      const id = await categoryRepo.create({ name: req.body.name, slug, description: req.body.description });
      res.status(201).json({ success: true, data: { id } });
    } catch (err) { next(err); }
  }
);

router.patch('/categories/:id',
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim(),
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updates: Record<string, unknown> = { description: req.body.description };
      if (req.body.name) {
        updates.name = req.body.name;
        updates.slug = slugify(req.body.name);
      }
      await categoryRepo.update(parseInt(req.params.id), updates);
      res.json({ success: true });
    } catch (err) { next(err); }
  }
);

// Artisan coupon creation
router.post('/artisan/coupons',
  requireRole('ARTISAN'),
  body('code').trim().notEmpty(),
  body('discount_type').isIn(['PERCENT', 'FLAT']),
  body('discount_value').isFloat({ min: 0 }),
  body('valid_from').isISO8601(),
  body('valid_to').isISO8601(),
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = await couponRepo.create({
        ...req.body,
        created_by: req.user!.id,
        artisan_id: req.user!.id,
        used_count: 0,
      });
      res.status(201).json({ success: true, data: { id } });
    } catch (err) { next(err); }
  }
);

export default router;
