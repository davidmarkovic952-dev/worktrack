import type { DbClient, Db } from './db.js';

export type AuditAction =
  | 'record.start' | 'record.stop' | 'record.update' | 'record.delete' | 'record.create'
  | 'user.create' | 'user.deactivate' | 'auth.login' | 'auth.login_failed';

export interface AuditEntry {
  actorId: number | null;
  action: AuditAction;
  entity: 'time_record' | 'user' | 'session';
  entityId: number | null;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
}

/** Edini način pisanja v audit_log. Samo INSERT — sled se nikoli ne spreminja. */
export async function audit(c: DbClient | Db, e: AuditEntry) {
  await c.query(
    `INSERT INTO audit_log (actor_id, action, entity, entity_id, before, after, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [e.actorId, e.action, e.entity, e.entityId,
     e.before === undefined ? null : JSON.stringify(e.before),
     e.after === undefined ? null : JSON.stringify(e.after),
     e.reason ?? null]
  );
}
