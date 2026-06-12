import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import catalogRoutes from './routes/catalog.routes';
import artisanRoutes from './routes/artisan.routes';
import consultantRoutes from './routes/consultant.routes';
import customerRoutes from './routes/customer.routes';
import adminRoutes from './routes/admin.routes';
import inquiryRoutes from './routes/inquiry.routes';
import messageRoutes from './routes/message.routes';
import ticketRoutes from './routes/ticket.routes';
import notificationRoutes from './routes/notification.routes';
import couponRoutes from './routes/coupon.routes';

const app = express();
const PORT = process.env.PORT || 3000;

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rewrite extensionless requests under /js/ to .js so browser ES module imports resolve
app.use((req, _res, next) => {
  if (req.path.startsWith('/js/') && !path.extname(req.path)) {
    req.url = req.url + '.js';
  }
  next();
});

// Static files
app.use(express.static(path.join(__dirname, '../public')));
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Rate limiting on login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Too many login attempts, please try again later' },
});
app.use('/api/auth/login', loginLimiter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: 'KalaSetu API is running' });
});


// API routes — specific-prefix routes BEFORE the broad /api customer routes
app.use('/api/auth', authRoutes);
app.use('/api/artisan', artisanRoutes);
app.use('/api/consultant', consultantRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/notifications', notificationRoutes);
// Broad /api routes (catalog + messages + coupons have no role gate at router level)
app.use('/api', catalogRoutes);
app.use('/api', messageRoutes);
app.use('/api', couponRoutes);
// Customer routes last — has router.use(requireRole('CUSTOMER')) which would block other roles
app.use('/api', customerRoutes);

// Fallback: serve index.html only for HTML navigation requests, 404 everything else
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, error: 'Route not found' });
  }
  const ext = path.extname(req.path);
  if (ext && ext !== '.html') {
    // Asset not found — don't serve HTML for JS/CSS/etc.
    return res.status(404).send('Not found');
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handler (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`KalaSetu server running on http://localhost:${PORT}`);
});

export default app;
