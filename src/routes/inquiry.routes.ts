import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { inquiryRepo } from '../repositories/inquiryRepo';
import { productRepo } from '../repositories/productRepo';
import { createNotification } from '../utils/notify';
import { createError } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

router.post('/',
  body('product_id').isInt({ min: 1 }),
  body('quantity').isInt({ min: 1 }),
  body('target_price').optional().isFloat({ min: 0 }),
  body('message').optional().trim(),
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user!.role !== 'CUSTOMER' || !req.user!.is_business) {
        throw createError('Only business customers can submit bulk inquiries', 403);
      }
      const product = await productRepo.findById(req.body.product_id);
      if (!product || product.status !== 'APPROVED') throw createError('Product not found', 404);

      const id = await inquiryRepo.create({
        business_user_id: req.user!.id,
        product_id: req.body.product_id,
        quantity: req.body.quantity,
        target_price: req.body.target_price,
        message: req.body.message,
        status: 'OPEN',
      });

      await createNotification(product.artisan_id, 'NEW_QUOTE',
        'New bulk inquiry received',
        `${req.user!.name} is interested in bulk purchase of "${product.name}"`,
        `/artisan/inquiries.html`);

      res.status(201).json({ success: true, data: { id } });
    } catch (err) { next(err); }
  }
);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    let inquiries;
    if (req.user!.role === 'CUSTOMER') {
      inquiries = await inquiryRepo.findByBusiness(req.user!.id);
    } else if (req.user!.role === 'ARTISAN') {
      inquiries = await inquiryRepo.findByArtisan(req.user!.id);
    } else {
      throw createError('Forbidden', 403);
    }
    res.json({ success: true, data: inquiries });
  } catch (err) { next(err); }
});

router.post('/:id/quote',
  body('quoted_unit_price').isFloat({ min: 0 }),
  body('lead_time_days').isInt({ min: 1 }),
  body('notes').optional().trim(),
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user!.role !== 'ARTISAN') throw createError('Forbidden', 403);
      const inquiry = await inquiryRepo.findById(parseInt(req.params.id));
      if (!inquiry) throw createError('Inquiry not found', 404);

      const product = await productRepo.findById(inquiry.product_id);
      if (!product || product.artisan_id !== req.user!.id) throw createError('Forbidden', 403);
      if (inquiry.status !== 'OPEN') throw createError('Inquiry is not open', 400);

      await inquiryRepo.addQuote(inquiry.id, req.user!.id, req.body.quoted_unit_price, req.body.lead_time_days, req.body.notes);
      await inquiryRepo.updateStatus(inquiry.id, 'QUOTED');

      await createNotification(inquiry.business_user_id, 'NEW_QUOTE',
        'Quote received for your inquiry',
        `Artisan responded to your bulk inquiry for "${product.name}"`,
        `/inquiries.html`);

      res.json({ success: true });
    } catch (err) { next(err); }
  }
);

router.patch('/:id/status',
  body('status').isIn(['ACCEPTED', 'DECLINED', 'CLOSED']),
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const inquiry = await inquiryRepo.findById(parseInt(req.params.id));
      if (!inquiry) throw createError('Inquiry not found', 404);
      if (req.user!.role !== 'CUSTOMER' || inquiry.business_user_id !== req.user!.id) {
        throw createError('Forbidden', 403);
      }
      if (inquiry.status !== 'QUOTED') throw createError('Can only accept/decline a quoted inquiry', 400);
      await inquiryRepo.updateStatus(inquiry.id, req.body.status);
      res.json({ success: true });
    } catch (err) { next(err); }
  }
);

export default router;
