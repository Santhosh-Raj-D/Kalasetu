import jwt from 'jsonwebtoken';
import { User } from '../types';

const secret = process.env.JWT_SECRET || 'change-me';
const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

export function signToken(payload: Pick<User, 'id' | 'role'>): string {
  return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): Pick<User, 'id' | 'role'> {
  return jwt.verify(token, secret) as Pick<User, 'id' | 'role'>;
}
