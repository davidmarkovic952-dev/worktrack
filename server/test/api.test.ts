import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { newDb } from 'pg-mem';
import fs from 'node:fs';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import type { Db } from '../src/db.js';

const schema = fs.readFileSync(new URL('../../db/schema.sql', import.meta.url), 'utf8')
  .replace(/CREATE UNIQUE INDEX[^;]+WHERE[^;]+;/g, ''); // pg-mem ne podpira delnih indeksov

let app: ReturnType<typeof createApp>;
let db: Db;

async function login(email: string, password: string) {
  const r = await request(app).post('/api/auth/login').send({ email, password });
  return r.body.token as string;
}

beforeEach(async () => {
  const mem = newDb();
  mem.public.none(schema);
  const { Pool } = mem.adapters.createPg();
  db = new Pool() as unknown as Db;
  const h = bcrypt.hashSync('geslo1234', 4);
  await db.query(`INSERT INTO users (name, email, password_hash, role) VALUES
    ('Ana', 'ana@x.si', $1, 'employee'), ('Admin', 'admin@x.si', $1, 'admin')`, [h]);
  app = createApp(db);
});

describe('avtentikacija', () => {
  it('zavrne napačno geslo in zapiše neuspel poskus v revizijsko sled', async () => {
    const r = await request(app).post('/api/auth/login').send({ email: 'ana@x.si', password: 'narobe' });
    expect(r.status).toBe(401);
    const { rows } = await db.query("SELECT action FROM audit_log");
    expect(rows.map(x => x.action)).toContain('auth.login_failed');
  });
  it('gesla v bazi so heširana', async () => {
    const { rows } = await db.query("SELECT password_hash FROM users WHERE email = 'ana@x.si'");
    expect(rows[0].password_hash).toMatch(/^\$2[ab]\$/);
  });
  it('brez žetona ni dostopa', async () => {
    expect((await request(app).get('/api/records')).status).toBe(401);
  });
});

describe('evidenca dela', () => {
  it('start → stop, drugi start med aktivnim vrne 409', async () => {
    const tok = await login('ana@x.si', 'geslo1234');
    const auth = { Authorization: `Bearer ${tok}` };
    expect((await request(app).post('/api/records/start').set(auth)).status).toBe(201);
    expect((await request(app).post('/api/records/start').set(auth)).status).toBe(409);
    expect((await request(app).post('/api/records/stop').set(auth)).status).toBe(200);
    expect((await request(app).post('/api/records/stop').set(auth)).status).toBe(409);
    const { rows } = await db.query("SELECT action FROM audit_log WHERE entity = 'time_record' ORDER BY id");
    expect(rows.map(x => x.action)).toEqual(['record.start', 'record.stop']);
  });

  it('zaposleni ne more urejati ali brisati evidenc', async () => {
    const tok = await login('ana@x.si', 'geslo1234');
    const r = await request(app).delete('/api/records/1').set({ Authorization: `Bearer ${tok}` }).send({ reason: 'poskus brisanja' });
    expect(r.status).toBe(403);
  });
});

describe('popravki administratorja z revizijsko sledjo', () => {
  it('popravek brez razloga je zavrnjen', async () => {
    const tok = await login('admin@x.si', 'geslo1234');
    const r = await request(app).put('/api/records/1').set({ Authorization: `Bearer ${tok}` })
      .send({ start_time: '2026-11-18T08:00:00Z', end_time: '2026-11-18T16:00:00Z' });
    expect(r.status).toBe(400);
  });

  it('popravek shrani stanje pred in po ter razlog', async () => {
    const admin = { Authorization: `Bearer ${await login('admin@x.si', 'geslo1234')}` };
    const created = await request(app).post('/api/records').set(admin)
      .send({ user_id: 1, start_time: '2026-11-18T08:00:00Z', end_time: '2026-11-18T19:00:00Z', reason: 'Pozabljena prijava, ročni vnos' });
    expect(created.status).toBe(201);
    const id = created.body.id;
    const upd = await request(app).put(`/api/records/${id}`).set(admin)
      .send({ start_time: '2026-11-18T08:00:00Z', end_time: '2026-11-18T16:00:00Z', reason: 'Delavec je odšel ob 16h (potrdil vodja)' });
    expect(upd.status).toBe(200);

    const trail = await request(app).get(`/api/reports/audit?entity_id=${id}`).set(admin);
    const actions = trail.body.map((a: any) => a.action);
    expect(actions).toEqual(['record.update', 'record.create']);
    const u = trail.body[0];
    expect(u.reason).toMatch(/16h/);
    expect(new Date(u.before.end_time).toISOString()).toBe('2026-11-18T19:00:00.000Z');
    expect(new Date(u.after.end_time).toISOString()).toBe('2026-11-18T16:00:00.000Z');
    expect(u.actor_name).toBe('Admin');
  });

  it('poročilo o skladnosti zazna predolg dan za zaposlenega', async () => {
    const admin = { Authorization: `Bearer ${await login('admin@x.si', 'geslo1234')}` };
    await request(app).post('/api/records').set(admin)
      .send({ user_id: 1, start_time: '2026-11-18T05:00:00Z', end_time: '2026-11-18T17:00:00Z', reason: 'Testni vnos dolgega dne' });
    const rep = await request(app).get('/api/reports/compliance').set(admin);
    expect(rep.status).toBe(200);
    const ana = rep.body.find((x: any) => x.user.name === 'Ana');
    expect(ana.findings.map((f: any) => f.rule)).toContain('DAILY_MAX');
  });
});
