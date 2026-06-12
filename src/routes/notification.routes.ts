import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../middleware/auth';
import { notificationRepo } from '../repositories/notificationRepo';

const router = Router();
router.use(requireAuth);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notifications = await notificationRepo.findByUser(req.user!.id);
    const unread = await notificationRepo.unreadCount(req.user!.id);
    res.json({ success: true, data: { notifications, unread } });
  } catch (err) { next(err); }
});

router.patch('/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await notificationRepo.markAllRead(req.user!.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
