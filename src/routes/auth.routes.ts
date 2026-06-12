import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { authService } from '../services/authService';
import { userRepo } from '../repositories/userRepo';

const router = Router();

router.post('/register',
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['CUSTOMER', 'ARTISAN']).withMessage('Role must be CUSTOMER or ARTISAN'),
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
  }
);

router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, user } = await authService.login(req.body.email, req.body.password);
      res.cookie('token', token, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        secure: process.env.NODE_ENV === 'production',
      });
      res.json({ success: true, data: { user } });
    } catch (err) { next(err); }
  }
);

router.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('token');
  res.json({ success: true });
});

router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({ success: true, data: req.user });
});

router.patch('/me',
  requireAuth,
  body('name').optional().trim().notEmpty(),
  body('phone').optional().trim(),
  body('password').optional().isLength({ min: 6 }),
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.updateProfile(req.user!.id, req.body);
      const updated = await userRepo.findById(req.user!.id);
      res.json({ success: true, data: updated });
    } catch (err) { next(err); }
  }
);

export default router;
