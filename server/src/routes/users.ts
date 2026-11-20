import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { tx, type Db } from '../db.js';
import { audit } from '../audit.js';

const NewUser = z.object({
  name: z.string().trim().min(2),
  email: z.string().email(),
  password: z.string().min(8, 'Geslo mora imeti vsaj 8 znakov'),
  role: z.enum(['employee', 'admin']).default('employee'),
  weekly_hours: z.number().int().min(1).max(40).default(40)
});

export function userRoutes(db: Db) {
  const r = Router();
  r.get('/', async (_req, res) => {
    const { rows } = await db.query('SELECT id, name, email, role, weekly_hours, active, created_at FROM users ORDER BY id');
    res.json(rows);
  });
  r.post('/', async (req, res) => {
    const body = NewUser.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: body.error.issues[0].message });
    const { name, email, password, role, weekly_hours } = body.data;
    const exists = await db.query('SELECT 1 FROM users WHERE lower(email) = lower($1)', [email]);
    if (exists.rows.length) return res.status(409).json({ error: 'Uporabnik s tem e-naslovom že obstaja' });
    const hash = await bcrypt.hash(password, 10);
    const user = await tx(db, async c => {
      const { rows } = await c.query(
        'INSERT INTO users (name, email, password_hash, role, weekly_hours) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, weekly_hours',
        [name, email, hash, role, weekly_hours]);
      await audit(c, { actorId: req.user!.id, action: 'user.create', entity: 'user', entityId: rows[0].id, after: rows[0] });
      return rows[0];
    });
    res.status(201).json(user);
  });
  return r;
}
