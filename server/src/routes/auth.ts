import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import type { Db } from '../db.js';
import { audit } from '../audit.js';
import { secret } from '../middleware/auth.js';

const Login = z.object({ email: z.string().email(), password: z.string().min(1) });

export function authRoutes(db: Db) {
  const r = Router();
  r.post('/login', async (req, res) => {
    const body = Login.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: 'Vpiši veljaven e-naslov in geslo' });
    const { email, password } = body.data;
    const { rows } = await db.query('SELECT * FROM users WHERE lower(email) = lower($1) AND active = TRUE', [email]);
    const user = rows[0];
    const ok = user && await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      await audit(db, { actorId: user?.id ?? null, action: 'auth.login_failed', entity: 'session', entityId: null, after: { email } });
      return res.status(401).json({ error: 'Napačen e-naslov ali geslo' });
    }
    const payload = { id: user.id, email: user.email, role: user.role, name: user.name };
    const token = jwt.sign(payload, secret(), { expiresIn: '8h' });
    await audit(db, { actorId: user.id, action: 'auth.login', entity: 'session', entityId: null });
    res.json({ token, user: payload });
  });
  return r;
}
