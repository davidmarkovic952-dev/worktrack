/**
 * Preverjanje skladnosti evidence delovnega časa z ZDR-1.
 *
 * Modul je namenoma "čista funkcija": brez baze, brez ure (trenutni čas se poda kot `now`),
 * zato je deterministična in v celoti pokrita s testi. Vsaka ugotovitev nosi pravilo,
 * zakonsko podlago, izmerjeno vrednost, mejo in ID-je evidenc, iz katerih izhaja —
 * tako je vsaka odločitev pojasnljiva in preverljiva.
 *
 * Poenostavitve (zavestne, dokumentirane):
 *  - Evidenca se šteje v dan, v katerem se je začela (lokalni čas Europe/Ljubljana).
 *  - Nadure = ure nad pogodbenim tedenskim časom (privzeto 40 h) v ISO tednu.
 *  - Odmor se prepozna kot vrzel ≥ 30 min med evidencami istega dne.
 */

export type Severity = 'violation' | 'warning' | 'unknown';

export interface WorkSession {
  id: number;
  userId: number;
  start: Date;
  end: Date | null;
}

export interface Finding {
  rule: RuleId;
  severity: Severity;
  userId: number;
  period: string;          // npr. "2026-11-18", "2026-W47", "2026-11", "2026"
  value: number | null;    // izmerjena vrednost (ure); null = ni mogoče izmeriti
  limit: number | null;
  legalBasis: string;
  message: string;
  recordIds: number[];
}

export type RuleId =
  | 'OPEN_SESSION'
  | 'DAILY_MAX'
  | 'BREAK'
  | 'DAILY_REST'
  | 'WEEKLY_REST'
  | 'WEEKLY_OVERTIME'
  | 'MONTHLY_OVERTIME'
  | 'YEARLY_OVERTIME';

export interface ComplianceConfig {
  timeZone: string;
  weeklyHours: number;          // pogodbeni tedenski čas
  maxDailyHours: number;        // 144/3 ZDR-1: delovni dan največ 10 ur
  breakAfterHours: number;      // od koliko ur dela pričakujemo odmor
  minBreakMinutes: number;      // 154 ZDR-1: 30 min pri polnem delovnem času
  minDailyRestHours: number;    // 155 ZDR-1: 12 ur
  minWeeklyRestHours: number;   // 156 ZDR-1: 24 ur v 7 dneh
  maxWeeklyOvertime: number;    // 144/3 ZDR-1: 8 h
  maxMonthlyOvertime: number;   // 20 h
  maxYearlyOvertime: number;    // 170 h (230 s pisnim soglasjem)
  staleOpenSessionHours: number;// odprta evidenca, starejša od tega, je "unknown"
}

export const DEFAULT_CONFIG: ComplianceConfig = {
  timeZone: 'Europe/Ljubljana',
  weeklyHours: 40,
  maxDailyHours: 10,
  breakAfterHours: 6,
  minBreakMinutes: 30,
  minDailyRestHours: 12,
  minWeeklyRestHours: 24,
  maxWeeklyOvertime: 8,
  maxMonthlyOvertime: 20,
  maxYearlyOvertime: 170,
  staleOpenSessionHours: 14
};

const H = 3_600_000;
const round = (n: number) => Math.round(n * 100) / 100;
const hours = (ms: number) => round(ms / H);

/** Lokalni datum YYYY-MM-DD v podanem časovnem pasu. */
export function localDate(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** ISO teden (npr. 2026-W47) za lokalni datum. */
export function isoWeek(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((dt.getTime() - yearStart.getTime()) / 864e5 + 1) / 7);
  return `${dt.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    const arr = m.get(k);
    if (arr) arr.push(it); else m.set(k, [it]);
  }
  return m;
}

type Closed = WorkSession & { end: Date; day: string };

/** Glavna funkcija: vrne vse ugotovitve za enega zaposlenega. */
export function checkCompliance(
  sessions: WorkSession[],
  now: Date,
  cfg: Partial<ComplianceConfig> = {}
): Finding[] {
  const c = { ...DEFAULT_CONFIG, ...cfg };
  const findings: Finding[] = [];
  const tz = c.timeZone;
  const sorted = [...sessions].sort((a, b) => a.start.getTime() - b.start.getTime());

  // 1) Odprte evidence: trajanje je neznano → ne štejemo jih v ure, ampak jih označimo.
  for (const s of sorted) {
    if (s.end) continue;
    const openFor = (now.getTime() - s.start.getTime()) / H;
    if (openFor > c.staleOpenSessionHours) {
      findings.push({
        rule: 'OPEN_SESSION', severity: 'unknown', userId: s.userId,
        period: localDate(s.start, tz), value: null, limit: c.staleOpenSessionHours,
        legalBasis: 'ZEPDSV (evidenca začetka in konca dela)',
        message: `Evidenca je odprta že ${Math.floor(openFor)} h — verjetno pozabljena odjava. Ure tega dne niso zanesljive, potreben je ročni pregled.`,
        recordIds: [s.id]
      });
    }
  }

  const closed: Closed[] = sorted
    .filter((s): s is WorkSession & { end: Date } => s.end !== null)
    .map(s => ({ ...s, day: localDate(s.start, tz) }));
  const uncertainDays = new Set(findings.filter(f => f.rule === 'OPEN_SESSION').map(f => f.period));
  const byDay = groupBy(closed, s => s.day);
  const dayHours = new Map<string, number>();

  // 2) Dnevni maksimum in odmor
  for (const [day, list] of byDay) {
    const total = list.reduce((a, s) => a + (s.end.getTime() - s.start.getTime()), 0);
    dayHours.set(day, total / H);
    const ids = list.map(s => s.id);
    if (total / H > c.maxDailyHours) {
      findings.push({
        rule: 'DAILY_MAX', severity: 'violation', userId: list[0].userId, period: day,
        value: hours(total), limit: c.maxDailyHours, legalBasis: 'ZDR-1, 144. člen (3. odst.)',
        message: `Delovni dan je trajal ${hours(total)} h, dovoljeno je največ ${c.maxDailyHours} h (vključno z nadurami).`,
        recordIds: ids
      });
    }
    if (total / H >= c.breakAfterHours) {
      let longestGapMin = 0;
      for (let i = 1; i < list.length; i++) {
        longestGapMin = Math.max(longestGapMin, (list[i].start.getTime() - list[i - 1].end.getTime()) / 60000);
      }
      if (longestGapMin < c.minBreakMinutes) {
        findings.push({
          rule: 'BREAK', severity: 'warning', userId: list[0].userId, period: day,
          value: round(longestGapMin), limit: c.minBreakMinutes, legalBasis: 'ZDR-1, 154. člen',
          message: `Pri ${hours(total)} h dela ni evidentiranega odmora (najdaljša prekinitev ${Math.round(longestGapMin)} min, pričakovano ${c.minBreakMinutes} min). Če je bil odmor izkoriščen med delom, je to v redu — preveri.`,
          recordIds: ids
        });
      }
    }
  }

  // 3) Dnevni počitek: med koncem zadnje evidence dneva in začetkom prve naslednjega dne
  const days = [...byDay.keys()].sort();
  for (let i = 1; i < days.length; i++) {
    const prev = byDay.get(days[i - 1])!;
    const next = byDay.get(days[i])!;
    const lastEnd = Math.max(...prev.map(s => s.end.getTime()));
    const firstStart = Math.min(...next.map(s => s.start.getTime()));
    const restH = (firstStart - lastEnd) / H;
    if (restH < c.minDailyRestHours) {
      findings.push({
        rule: 'DAILY_REST', severity: 'violation', userId: next[0].userId, period: days[i],
        value: hours(firstStart - lastEnd), limit: c.minDailyRestHours, legalBasis: 'ZDR-1, 155. člen',
        message: `Med ${days[i - 1]} in ${days[i]} je bilo le ${hours(firstStart - lastEnd)} h počitka (najmanj ${c.minDailyRestHours} h).`,
        recordIds: [...prev, ...next].map(s => s.id)
      });
    }
  }

  // 4) Tedenski počitek in tedenske nadure (ISO teden)
  const byWeek = groupBy(closed, s => isoWeek(s.day));
  const weekOvertime = new Map<string, number>();
  for (const [week, list] of byWeek) {
    const ids = list.map(s => s.id);
    const total = list.reduce((a, s) => a + (s.end.getTime() - s.start.getTime()), 0) / H;
    const overtime = Math.max(0, total - c.weeklyHours);
    weekOvertime.set(week, overtime);
    if (overtime > c.maxWeeklyOvertime) {
      findings.push({
        rule: 'WEEKLY_OVERTIME', severity: 'violation', userId: list[0].userId, period: week,
        value: round(overtime), limit: c.maxWeeklyOvertime, legalBasis: 'ZDR-1, 144. člen (3. odst.)',
        message: `V tednu ${week} je ${round(overtime)} nadur (${round(total)} h skupaj), dovoljeno je ${c.maxWeeklyOvertime} h.`,
        recordIds: ids
      });
    }
    // najdaljši neprekinjen počitek znotraj tedna (od prve do zadnje evidence + robova tedna ne poznamo → le notranje vrzeli)
    const ws = [...list].sort((a, b) => a.start.getTime() - b.start.getTime());
    const distinctDays = new Set(ws.map(s => s.day)).size;
    if (distinctDays >= 7) {
      let longest = 0;
      for (let i = 1; i < ws.length; i++) longest = Math.max(longest, ws[i].start.getTime() - ws[i - 1].end.getTime());
      if (longest / H < c.minWeeklyRestHours) {
        findings.push({
          rule: 'WEEKLY_REST', severity: 'violation', userId: ws[0].userId, period: week,
          value: hours(longest), limit: c.minWeeklyRestHours, legalBasis: 'ZDR-1, 156. člen',
          message: `V tednu ${week} ni bilo ${c.minWeeklyRestHours} h neprekinjenega počitka (najdaljši ${hours(longest)} h).`,
          recordIds: ids
        });
      }
    }
  }

  // 5) Mesečne in letne nadure (seštevek tedenskih nadur po mesecu/letu tedna)
  const monthOT = new Map<string, { h: number; ids: number[] }>();
  const yearOT = new Map<string, { h: number; ids: number[] }>();
  for (const [week, list] of byWeek) {
    const ot = weekOvertime.get(week) || 0;
    if (!ot) continue;
    const month = list[0].day.slice(0, 7);
    const year = list[0].day.slice(0, 4);
    for (const [map, key] of [[monthOT, month], [yearOT, year]] as const) {
      const cur = map.get(key) || { h: 0, ids: [] };
      cur.h += ot; cur.ids.push(...list.map(s => s.id));
      map.set(key, cur);
    }
  }
  for (const [month, v] of monthOT) if (v.h > c.maxMonthlyOvertime) findings.push({
    rule: 'MONTHLY_OVERTIME', severity: 'violation', userId: closed[0].userId, period: month,
    value: round(v.h), limit: c.maxMonthlyOvertime, legalBasis: 'ZDR-1, 144. člen (3. odst.)',
    message: `V mesecu ${month} je ${round(v.h)} nadur, dovoljeno je ${c.maxMonthlyOvertime} h.`, recordIds: v.ids
  });
  for (const [year, v] of yearOT) if (v.h > c.maxYearlyOvertime) findings.push({
    rule: 'YEARLY_OVERTIME', severity: v.h > 230 ? 'violation' : 'warning', userId: closed[0].userId, period: year,
    value: round(v.h), limit: c.maxYearlyOvertime, legalBasis: 'ZDR-1, 144. člen (3. odst.)',
    message: v.h > 230
      ? `V letu ${year} je ${round(v.h)} nadur — preseženo tudi zgornjo mejo 230 h.`
      : `V letu ${year} je ${round(v.h)} nadur (nad ${c.maxYearlyOvertime} h). Dovoljeno le s pisnim soglasjem delavca, največ 230 h.`,
    recordIds: v.ids
  });

  // dnevi z odprto evidenco: dnevne ugotovitve so negotove → označimo
  return findings.map(f => (f.severity !== 'unknown' && uncertainDays.has(f.period))
    ? { ...f, message: f.message + ' (Pozor: ta dan ima odprto evidenco, izračun je nepopoln.)' }
    : f);
}

/** Povzetek ur za prikaz (ne šteje odprtih evidenc). */
export function summarize(sessions: WorkSession[], now: Date, timeZone = DEFAULT_CONFIG.timeZone) {
  const today = localDate(now, timeZone);
  const week = isoWeek(today);
  let todayH = 0, weekH = 0, totalH = 0, open = 0;
  for (const s of sessions) {
    if (!s.end) { open++; continue; }
    const h = (s.end.getTime() - s.start.getTime()) / H;
    const d = localDate(s.start, timeZone);
    totalH += h;
    if (d === today) todayH += h;
    if (isoWeek(d) === week) weekH += h;
  }
  return { todayHours: round(todayH), weekHours: round(weekH), totalHours: round(totalH), openRecords: open };
}
