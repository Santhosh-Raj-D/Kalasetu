import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { validate } from '../middleware/validate';
import { couponRepo } from '../repositories/couponRepo';
import { createError } from '../middleware/errorHandler';

const router = Router();

// Artisan-own coupons
router.get('/artisan/coupons', requireAuth, requireRole('ARTISAN'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await couponRepo.findAll({ artisanId: req.user!.id, page, limit });
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.post('/artisan/coupons',
  requireAuth,
  requireRole('ARTISAN'),
  body('code').trim().notEmpty(),
  body('discount_type').isIn(['PERCENT', 'FLAT']),
  body('discount_value').isFloat({ min: 0 }),
  body('min_order_amount').optional().isFloat({ min: 0 }),
  body('max_uses').optional().isInt({ min: 1 }),
  body('valid_from').isISO8601(),
  body('valid_to').isISO8601(),
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = await couponRepo.create({
        ...req.body,
        code: req.body.code.toUpperCase(),
        created_by: req.user!.id,
        artisan_id: req.user!.id,
        is_active: true,
        min_order_amount: req.body.min_order_amount || 0,
        max_uses: req.body.max_uses || 100,
      });
      res.status(201).json({ success: true, data: { id } });
    } catch (err) { next(err); }
  }
);

export default router;
