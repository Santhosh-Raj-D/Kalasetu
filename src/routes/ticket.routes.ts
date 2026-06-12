import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { ticketRepo } from '../repositories/ticketRepo';
import { createNotification } from '../utils/notify';
import { createError } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);

router.post('/',
  body('subject').trim().notEmpty().isLength({ max: 150 }),
  body('description').trim().notEmpty(),
  body('order_id').optional().isInt({ min: 1 }),
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!['CUSTOMER', 'ARTISAN'].includes(req.user!.role)) throw createError('Forbidden', 403);
      const id = await ticketRepo.create({
        raised_by: req.user!.id,
        order_id: req.body.order_id,
        subject: req.body.subject,
        description: req.body.description,
      });
      res.status(201).json({ success: true, data: { id } });
    } catch (err) { next(err); }
  }
);

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    let result;
    if (req.user!.role === 'ADMIN') {
      result = await ticketRepo.findAll({ page, limit, status: req.query.status as string | undefined as never });
    } else {
      result = await ticketRepo.findByUser(req.user!.id, page, limit);
    }
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

router.patch('/:id',
  body('status').optional().isIn(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
  body('assigned_admin_id').optional().isInt(),
  body('resolution_note').optional().trim(),
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.user!.role !== 'ADMIN') throw createError('Forbidden', 403);
      const ticket = await ticketRepo.findById(parseInt(req.params.id));
      if (!ticket) throw createError('Ticket not found', 404);

      await ticketRepo.update(parseInt(req.params.id), req.body);

      if (req.body.status) {
        await createNotification(ticket.raised_by, 'TICKET_UPDATE',
          `Support ticket updated: ${req.body.status}`,
          ticket.subject,
          `/tickets.html`);
      }

      res.json({ success: true });
    } catch (err) { next(err); }
  }
);

export default router;
