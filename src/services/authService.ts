import bcrypt from 'bcrypt';
import { userRepo } from '../repositories/userRepo';
import { artisanRepo } from '../repositories/artisanRepo';
import { signToken } from '../utils/jwt';
import { Role } from '../types';
import { createError } from '../middleware/errorHandler';

export const authService = {
  async register(data: {
    name: string;
    email: string;
    password: string;
    role: Role;
    phone?: string;
    is_business?: boolean;
    business_name?: string;
  }) {
    const existing = await userRepo.findByEmail(data.email);
    if (existing) throw createError('Email already registered', 409);

    const password_hash = await bcrypt.hash(data.password, 10);
    const status = data.role === 'ARTISAN' ? 'PENDING' : 'ACTIVE';

    const id = await userRepo.create({
      name: data.name,
      email: data.email,
      password_hash,
      role: data.role,
      phone: data.phone,
      is_business: data.is_business,
      business_name: data.business_name,
      status,
    });

    if (data.role === 'ARTISAN') {
      await artisanRepo.create(id);
    }

    return { id, status };
  },

  async login(email: string, password: string) {
    const user = await userRepo.findByEmail(email);
    if (!user) throw createError('Invalid email or password', 401);

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw createError('Invalid email or password', 401);

    if (user.status === 'SUSPENDED') throw createError('Your account has been suspended', 403);
    if (user.status === 'PENDING') throw createError('Your account is pending admin activation', 403);

    const token = signToken({ id: user.id, role: user.role });
    const { password_hash: _, ...safeUser } = user;
    return { token, user: safeUser };
  },

  async updateProfile(userId: number, data: { name?: string; phone?: string; business_name?: string; password?: string; currentPassword?: string }) {
    if (data.password) {
      if (!data.currentPassword) throw createError('Current password required', 400);
      const user = await userRepo.findByEmail((await userRepo.findById(userId))!.email);
      if (!user) throw createError('User not found', 404);
      const valid = await bcrypt.compare(data.currentPassword, user.password_hash);
      if (!valid) throw createError('Current password is incorrect', 400);
      data.password = await bcrypt.hash(data.password, 10);
      await userRepo.update(userId, {
        name: data.name,
        phone: data.phone,
        business_name: data.business_name,
        password_hash: data.password,
      });
    } else {
      await userRepo.update(userId, { name: data.name, phone: data.phone, business_name: data.business_name });
    }
  },

  async createUserByAdmin(data: {
    name: string;
    email: string;
    password: string;
    role: 'CONSULTANT' | 'ADMIN';
    phone?: string;
  }) {
    const existing = await userRepo.findByEmail(data.email);
    if (existing) throw createError('Email already registered', 409);

    const password_hash = await bcrypt.hash(data.password, 10);
    const id = await userRepo.create({
      name: data.name,
      email: data.email,
      password_hash,
      role: data.role,
      phone: data.phone,
      status: 'ACTIVE',
    });
    return id;
  },
};
