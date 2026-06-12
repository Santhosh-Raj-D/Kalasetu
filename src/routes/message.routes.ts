import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { messageRepo } from '../repositories/messageRepo';
import { createNotification } from '../utils/notify';
import { createError } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

router.get('/conversations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conversations = await messageRepo.findConversationsByUser(req.user!.id, req.user!.role);
    res.json({ success: true, data: conversations });
  } catch (err) { next(err); }
});

router.post('/conversations',
  body('artisanId').isInt({ min: 1 }),
  body('productId').optional().isInt({ min: 1 }),
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user!.role !== 'CUSTOMER') throw createError('Only customers can start conversations', 403);
      const id = await messageRepo.findOrCreate(req.user!.id, req.body.artisanId, req.body.productId);
      res.json({ success: true, data: { id } });
    } catch (err) { next(err); }
  }
);

router.get('/conversations/:id/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const conv = await messageRepo.findConversation(parseInt(req.params.id));
    if (!conv) throw createError('Conversation not found', 404);
    if (conv.customer_id !== req.user!.id && conv.artisan_id !== req.user!.id) {
      throw createError('Forbidden', 403);
    }
    const afterId = req.query.after ? parseInt(req.query.after as string) : undefined;
    const messages = await messageRepo.getMessages(parseInt(req.params.id), afterId);
    await messageRepo.markRead(parseInt(req.params.id), req.user!.id);
    res.json({ success: true, data: messages });
  } catch (err) { next(err); }
});

router.post('/conversations/:id/messages',
  body('body').trim().notEmpty(),
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const conv = await messageRepo.findConversation(parseInt(req.params.id));
      if (!conv) throw createError('Conversation not found', 404);
      if (conv.customer_id !== req.user!.id && conv.artisan_id !== req.user!.id) {
        throw createError('Forbidden', 403);
      }

      const msgId = await messageRepo.addMessage(parseInt(req.params.id), req.user!.id, req.body.body);
      const recipientId = conv.customer_id === req.user!.id ? conv.artisan_id : conv.customer_id;

      await createNotification(recipientId, 'NEW_MESSAGE',
        `New message from ${req.user!.name}`,
        req.body.body.substring(0, 80),
        `/messages.html`);

      res.status(201).json({ success: true, data: { id: msgId } });
    } catch (err) { next(err); }
  }
);

export default router;
