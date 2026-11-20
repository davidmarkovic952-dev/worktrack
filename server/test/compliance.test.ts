import { describe, it, expect } from 'vitest';
import { checkCompliance, summarize, isoWeek, localDate, type WorkSession } from '../src/compliance.js';

// Pomožna funkcija: lokalni čas v Ljubljani (CET = UTC+1 pozimi)
const t = (s: string) => new Date(`${s}+01:00`);
let nextId = 1;
const ses = (start: string, end: string | null): WorkSession =>
  ({ id: nextId++, userId: 7, start: t(start), end: end ? t(end) : null });
const NOW = t('2026-11-20T18:00:00');
const rules = (f: ReturnType<typeof checkCompliance>) => f.map(x => x.rule).sort();

describe('pomožne funkcije', () => {
  it('ISO teden', () => {
    expect(isoWeek('2026-11-16')).toBe('2026-W47');
    expect(isoWeek('2026-01-01')).toBe('2026-W01');
    expect(isoWeek('2027-01-01')).toBe('2026-W53');
  });
  it('lokalni datum upošteva časovni pas', () => {
    expect(localDate(new Date('2026-11-19T23:30:00Z'), 'Europe/Ljubljana')).toBe('2026-11-20');
  });
});

describe('skladnost z ZDR-1', () => {
  it('normalen delovni dan z odmorom nima ugotovitev', () => {
    const f = checkCompliance([
      ses('2026-11-18T08:00:00', '2026-11-18T12:00:00'),
      ses('2026-11-18T12:30:00', '2026-11-18T16:30:00')
    ], NOW);
    expect(f).toEqual([]);
  });

  it('delovni dan nad 10 ur je kršitev s pojasnilom in ID-ji evidenc', () => {
    const a = ses('2026-11-18T06:00:00', '2026-11-18T12:00:00');
    const b = ses('2026-11-18T12:30:00', '2026-11-18T17:30:00');
    const f = checkCompliance([a, b], NOW).find(x => x.rule === 'DAILY_MAX')!;
    expect(f.severity).toBe('violation');
    expect(f.value).toBe(11);
    expect(f.limit).toBe(10);
    expect(f.recordIds).toEqual([a.id, b.id]);
    expect(f.legalBasis).toMatch(/144/);
  });

  it('točno 10 ur ni kršitev (meja je vključena)', () => {
    const f = checkCompliance([
      ses('2026-11-18T07:00:00', '2026-11-18T12:00:00'),
      ses('2026-11-18T12:30:00', '2026-11-18T17:30:00')
    ], NOW);
    expect(rules(f)).toEqual([]);
  });

  it('6+ ur brez prekinitve sproži opozorilo o odmoru (ne kršitve)', () => {
    const f = checkCompliance([ses('2026-11-18T08:00:00', '2026-11-18T15:00:00')], NOW);
    expect(f).toHaveLength(1);
    expect(f[0]).toMatchObject({ rule: 'BREAK', severity: 'warning' });
  });

  it('manj kot 12 ur dnevnega počitka je kršitev', () => {
    const f = checkCompliance([
      ses('2026-11-17T14:00:00', '2026-11-17T22:00:00'),
      ses('2026-11-18T06:00:00', '2026-11-18T10:00:00')
    ], NOW);
    const rest = f.find(x => x.rule === 'DAILY_REST')!;
    expect(rest.value).toBe(8);
    expect(rest.period).toBe('2026-11-18');
  });

  it('odprta evidenca, starejša od 14 h, je stanje "unknown" in se ne šteje v ure', () => {
    const open = ses('2026-11-19T08:00:00', null);
    const f = checkCompliance([open], NOW);
    expect(f).toEqual([expect.objectContaining({ rule: 'OPEN_SESSION', severity: 'unknown', value: null, recordIds: [open.id] })]);
    expect(summarize([open], NOW).totalHours).toBe(0);
    expect(summarize([open], NOW).openRecords).toBe(1);
  });

  it('sveža odprta evidenca (trenutno v delu) ni ugotovitev', () => {
    expect(checkCompliance([ses('2026-11-20T09:00:00', null)], NOW)).toEqual([]);
  });

  it('tedenske nadure nad 8 h so kršitev; upošteva pogodbeni tedenski čas', () => {
    // 5 dni × 10 h = 50 h → 10 nadur pri 40 h pogodbi
    const week = ['16', '17', '18', '19', '20'].flatMap(d => [
      ses(`2026-11-${d}T06:00:00`, `2026-11-${d}T11:00:00`),
      ses(`2026-11-${d}T11:30:00`, `2026-11-${d}T16:30:00`)
    ]);
    const f = checkCompliance(week, NOW);
    expect(f.find(x => x.rule === 'WEEKLY_OVERTIME')).toMatchObject({ value: 10, limit: 8, period: '2026-W47' });
    // pri 20-urni pogodbi je nadur 30
    const half = checkCompliance(week, NOW, { weeklyHours: 20 });
    expect(half.find(x => x.rule === 'WEEKLY_OVERTIME')!.value).toBe(30);
  });

  it('7 zaporednih delovnih dni brez 24 h počitka je kršitev tedenskega počitka', () => {
    const days = ['16', '17', '18', '19', '20', '21', '22'];
    const f = checkCompliance(days.map(d => ses(`2026-11-${d}T08:00:00`, `2026-11-${d}T12:00:00`)), t('2026-11-23T08:00:00'));
    expect(f.find(x => x.rule === 'WEEKLY_REST')).toMatchObject({ severity: 'violation', value: 20 });
  });

  it('mesečne nadure nad 20 h', () => {
    // trije tedni po 48 h → 3 × 8 = 24 nadur v novembru
    const mk = (days: string[]) => days.flatMap(d => [
      ses(`2026-11-${d}T07:00:00`, `2026-11-${d}T12:00:00`),
      ses(`2026-11-${d}T12:30:00`, `2026-11-${d}T17:06:00`)
    ]);
    const f = checkCompliance([...mk(['02', '03', '04', '05', '06']), ...mk(['09', '10', '11', '12', '13']), ...mk(['16', '17', '18', '19', '20'])], NOW);
    const m = f.find(x => x.rule === 'MONTHLY_OVERTIME')!;
    expect(m.period).toBe('2026-11');
    expect(m.value).toBe(24);
  });

  it('dnevna ugotovitev na dan z odprto evidenco je označena kot nepopolna', () => {
    const f = checkCompliance([
      ses('2026-11-18T06:00:00', '2026-11-18T17:30:00'),
      ses('2026-11-18T18:00:00', null)
    ], NOW);
    expect(f.find(x => x.rule === 'DAILY_MAX')!.message).toMatch(/nepopoln/);
  });

  it('rezultat je determinističen (enak vhod → enak izhod, ne glede na vrstni red)', () => {
    const list = [ses('2026-11-17T14:00:00', '2026-11-17T22:00:00'), ses('2026-11-18T06:00:00', '2026-11-18T17:00:00')];
    expect(checkCompliance(list, NOW)).toEqual(checkCompliance([...list].reverse(), NOW));
  });
});
