/**
 * Demo način: API z bazo v pomnilniku (pg-mem) in demo podatki — brez PostgreSQL-a.
 * Zagon: npm run demo   (podatki se ob ponovnem zagonu ponastavijo)
 */
import fs from 'node:fs';
import { newDb } from 'pg-mem';
import { createApp } from './app.js';
import type { Db } from './db.js';

const read = (f: string) => fs.readFileSync(new URL(`../../db/${f}`, import.meta.url), 'utf8');
const mem = newDb();
mem.public.none(read('schema.sql').replace(/CREATE UNIQUE INDEX[^;]+WHERE[^;]+;/g, ''));
const { Pool } = mem.adapters.createPg();
const db = new Pool() as unknown as Db;

// demo evidence relativno na današnji dan
const users = read('seed.sql').split('-- Ana:')[0];
mem.public.none(users);
const h = 3_600_000, day = 24 * h;
const base = new Date(); base.setHours(0, 0, 0, 0);
const at = (dAgo: number, hh: number, mm = 0) => new Date(base.getTime() - dAgo * day + hh * h + mm * 60_000).toISOString();
const rows: [number, string, string | null][] = [];
for (let d = 1; d <= 4; d++) { rows.push([1, at(d, 8), at(d, 12)], [1, at(d, 12, 30), at(d, 16, 30)]); }
rows.push([2, at(3, 6), at(3, 17, 30)]);          // 11,5 h → predolg dan, brez odmora
rows.push([2, at(2, 2), at(2, 10)]);               // 8,5 h počitka → kršitev dnevnega počitka
rows.push([3, at(1, 8), null]);                    // pozabljena odjava → "unknown"
for (const [u, s, e] of rows) await db.query('INSERT INTO time_records (user_id, start_time, end_time) VALUES ($1, $2, $3)', [u, s, e]);
await db.query(`INSERT INTO audit_log (actor_id, action, entity, entity_id, reason) VALUES (4, 'record.update', 'time_record', 9, 'Demo: primer popravka z razlogom')`);

const port = Number(process.env.PORT) || 3001;
createApp(db).listen(port, () => console.log(`WorkTrack DEMO API (pg-mem): http://localhost:${port}`));
