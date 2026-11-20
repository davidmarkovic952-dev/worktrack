import { Router } from 'express';
import type { Db } from '../db.js';
import { checkCompliance, summarize, type WorkSession } from '../compliance.js';
import { requireAdmin } from '../middleware/auth.js';

const tz = () => process.env.TZ_WORK || 'Europe/Ljubljana';

async function sessionsFor(db: Db, userId: number): Promise<WorkSession[]> {
  const { rows } = await db.query('SELECT id, user_id, start_time, end_time FROM time_records WHERE user_id = $1', [userId]);
  return rows.map((r: any) => ({ id: r.id, userId: r.user_id, start: new Date(r.start_time), end: r.end_time ? new Date(r.end_time) : null }));
}

export function reportRoutes(db: Db) {
  const r = Router();

  // lastni povzetek + ugotovitve
  r.get('/me', async (req, res) => {
    const sessions = await sessionsFor(db, req.user!.id);
    const { rows } = await db.query('SELECT weekly_hours FROM users WHERE id = $1', [req.user!.id]);
    const now = new Date();
    res.json({
      summary: summarize(sessions, now, tz()),
      findings: checkCompliance(sessions, now, { timeZone: tz(), weeklyHours: rows[0]?.weekly_hours ?? 40 })
    });
  });

  // skladnost za vse zaposlene
  r.get('/compliance', requireAdmin, async (_req, res) => {
    const { rows: users } = await db.query("SELECT id, name, weekly_hours FROM users WHERE role = 'employee' AND active = TRUE ORDER BY name");
    const now = new Date();
    const out = [];
    for (const u of users) {
      const sessions = await sessionsFor(db, u.id);
      out.push({
        user: { id: u.id, name: u.name },
        summary: summarize(sessions, now, tz()),
        findings: checkCompliance(sessions, now, { timeZone: tz(), weeklyHours: u.weekly_hours })
      });
    }
    res.json(out);
  });

  // revizijska sled
  r.get('/audit', requireAdmin, async (req, res) => {
    const params: unknown[] = [];
    let where = '';
    if (req.query.entity_id) { params.push(Number(req.query.entity_id)); where = `WHERE a.entity = 'time_record' AND a.entity_id = $1`; }
    const { rows } = await db.query(
      `SELECT a.*, u.name AS actor_name FROM audit_log a LEFT JOIN users u ON a.actor_id = u.id ${where} ORDER BY a.id DESC LIMIT 300`, params);
    res.json(rows);
  });

  return r;
}
