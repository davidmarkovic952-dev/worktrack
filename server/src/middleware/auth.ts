import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthUser { id: number; email: string; role: 'employee' | 'admin'; name: string }
declare module 'express-serve-static-core' { interface Request { user?: AuthUser } }

export const secret = () => {
  const s = process.env.JWT_SECRET;
  if (!s || s === 'spremeni-me') {
    if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET ni nastavljen');
    return 'dev-only-secret';
  }
  return s;
};

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Ni avtorizacije' });
  try {
    req.user = jwt.verify(token, secret()) as AuthUser;
    next();
  } catch {
    res.status(401).json({ error: 'Neveljaven ali potekel žeton' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Samo za administratorja' });
  next();
}
