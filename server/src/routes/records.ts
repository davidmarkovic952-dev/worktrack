import { Router } from 'express';
import { z } from 'zod';
import { tx, type Db } from '../db.js';
import { audit } from '../audit.js';
import { requireAdmin } from '../middleware/auth.js';

const Reason = z.string().trim().min(5, 'Razlog mora imeti vsaj 5 znakov');
const Update = z.object({
  start_time: z.coerce.date(),
  end_time: z.coerce.date().nullable(),
  reason: Reason
}).refine(v => !v.end_time || v.end_time > v.start_time, { message: 'Konec mora biti po začetku' });
const Create = z.object({
  user_id: z.number().int().positive(),
  start_time: z.coerce.date(),
  end_time: z.coerce.date(),
  reason: Reason
}).refine(v => v.end_time > v.start_time, { message: 'Konec mora biti po začetku' });

const SELECT = `SELECT tr.id, tr.user_id, tr.start_time, tr.end_time, tr.note, tr.updated_at, u.name, u.email
                FROM time_records tr JOIN users u ON tr.user_id = u.id`;

export function recordRoutes(db: Db) {
  const r = Router();

  r.get('/', async (req, res) => {
    const admin = req.user!.role === 'admin';
    const userId = admin && req.query.user_id ? Number(req.query.user_id) : (admin ? null : req.user!.id);
    const { rows } = userId
      ? await db.query(`${SELECT} WHERE tr.user_id = $1 ORDER BY tr.start_time DESC`, [userId])
      : await db.query(`${SELECT} ORDER BY tr.start_time DESC`);
    res.json(rows);
  });

  r.get('/active', async (req, res) => {
    const { rows } = await db.query('SELECT * FROM time_records WHERE user_id = $1 AND end_time IS NULL', [req.user!.id]);
    res.json(rows[0] ?? null);
  });

  r.post('/start', async (req, res) => {
    const out = await tx(db, async c => {
      const open = await c.query('SELECT id FROM time_records WHERE user_id = $1 AND end_time IS NULL', [req.user!.id]);
      if (open.rows.length) return null;
      const { rows } = await c.query('INSERT INTO time_records (user_id, start_time) VALUES ($1, NOW()) RETURNING *', [req.user!.id]);
      await audit(c, { actorId: req.user!.id, action: 'record.start', entity: 'time_record', entityId: rows[0].id, after: rows[0] });
      return rows[0];
    });
    if (!out) return res.status(409).json({ error: 'Že imaš aktiven začetek dela' });
    res.status(201).json(out);
  });

  r.post('/stop', async (req, res) => {
    const out = await tx(db, async c => {
      const before = await c.query('SELECT * FROM time_records WHERE user_id = $1 AND end_time IS NULL', [req.user!.id]);
      if (!before.rows.length) return null;
      const { rows } = await c.query('UPDATE time_records SET end_time = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *', [before.rows[0].id]);
      await audit(c, { actorId: req.user!.id, action: 'record.stop', entity: 'time_record', entityId: rows[0].id, before: before.rows[0], after: rows[0] });
      return rows[0];
    });
    if (!out) return res.status(409).json({ error: 'Ni aktivnega začetka dela' });
    res.json(out);
  });

  // ---- admin popravki: vedno z razlogom in zapisom v revizijsko sled ----
  r.post('/', requireAdmin, async (req, res) => {
    const body = Create.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: body.error.issues[0].message });
    const { user_id, start_time, end_time, reason } = body.data;
    const row = await tx(db, async c => {
      const { rows } = await c.query('INSERT INTO time_records (user_id, start_time, end_time) VALUES ($1, $2, $3) RETURNING *', [user_id, start_time, end_time]);
      await audit(c, { actorId: req.user!.id, action: 'record.create', entity: 'time_record', entityId: rows[0].id, after: rows[0], reason });
      return rows[0];
    });
    res.status(201).json(row);
  });

  r.put('/:id', requireAdmin, async (req, res) => {
    const body = Update.safeParse(req.body);
    if (!body.success) return res.status(400).json({ error: body.error.issues[0].message });
    const id = Number(req.params.id);
    const { start_time, end_time, reason } = body.data;
    const row = await tx(db, async c => {
      const before = await c.query('SELECT * FROM time_records WHERE id = $1', [id]);
      if (!before.rows.length) return null;
      const { rows } = await c.query(
        'UPDATE time_records SET start_time = $1, end_time = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        [start_time, end_time, id]);
      await audit(c, { actorId: req.user!.id, action: 'record.update', entity: 'time_record', entityId: id, before: before.rows[0], after: rows[0], reason });
      return rows[0];
    });
    if (!row) return res.status(404).json({ error: 'Evidenca ne obstaja' });
    res.json(row);
  });

  r.delete('/:id', requireAdmin, async (req, res) => {
    const reason = Reason.safeParse(req.body?.reason);
    if (!reason.success) return res.status(400).json({ error: 'Za brisanje je obvezen razlog (vsaj 5 znakov)' });
    const id = Number(req.params.id);
    const ok = await tx(db, async c => {
      const before = await c.query('SELECT * FROM time_records WHERE id = $1', [id]);
      if (!before.rows.length) return false;
      await c.query('DELETE FROM time_records WHERE id = $1', [id]);
      await audit(c, { actorId: req.user!.id, action: 'record.delete', entity: 'time_record', entityId: id, before: before.rows[0], reason: reason.data });
      return true;
    });
    if (!ok) return res.status(404).json({ error: 'Evidenca ne obstaja' });
    res.json({ success: true });
  });

  return r;
}
