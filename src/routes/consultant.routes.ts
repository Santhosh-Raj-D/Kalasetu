import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roles';
import { validate } from '../middleware/validate';
import { productRepo } from '../repositories/productRepo';
import { verificationRepo } from '../repositories/verificationRepo';
import { verificationService } from '../services/verificationService';

const router = Router();
router.use(requireAuth, requireRole('CONSULTANT'));

router.get('/queue', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await productRepo.findPendingReview();
    res.json({ success: true, data: products });
  } catch (err) { next(err); }
});

router.get('/queue/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const product = await productRepo.findById(parseInt(req.params.id));
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    const images = await productRepo.getImages(product.id);
    res.json({ success: true, data: { ...product, images } });
  } catch (err) { next(err); }
});

router.post('/reviews',
  body('productId').isInt({ min: 1 }),
  body('decision').isIn(['APPROVED', 'REJECTED']),
  body('feedback').optional().trim(),
  body('culturalNotes').optional().trim(),
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await verificationService.review(req.user!.id, {
        productId: req.body.productId,
        decision: req.body.decision,
        feedback: req.body.feedback,
        culturalNotes: req.body.culturalNotes,
      });
      res.json({ success: true });
    } catch (err) { next(err); }
  }
);

router.get('/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const history = await verificationRepo.findByConsultant(req.user!.id);
    res.json({ success: true, data: history });
  } catch (err) { next(err); }
});

export default router;
