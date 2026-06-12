import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { userRepo } from '../repositories/userRepo';
import { createError } from './errorHandler';

export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return next(createError('Authentication required', 401));
    }
    const decoded = verifyToken(token);
    const user = await userRepo.findById(decoded.id);
    if (!user) {
      return next(createError('User not found', 401));
    }
    if (user.status === 'SUSPENDED') {
      return next(createError('Your account has been suspended', 403));
    }
    if (user.status === 'PENDING') {
      return next(createError('Your account is pending activation', 403));
    }
    req.user = user;
    next();
  } catch {
    next(createError('Invalid or expired token', 401));
  }
}
