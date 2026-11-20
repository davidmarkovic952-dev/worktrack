export const fmtClock = (ms: number) => {
  const h = Math.floor(ms / 3_600_000), m = Math.floor((ms % 3_600_000) / 60_000), s = Math.floor((ms % 60_000) / 1000);
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
};
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('sl-SI', { day: '2-digit', month: '2-digit', year: 'numeric' });
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('sl-SI', { hour: '2-digit', minute: '2-digit' });
export const durMs = (s: string, e: string) => new Date(e).getTime() - new Date(s).getTime();
export const fmtDur = (s: string, e: string) => {
  const ms = durMs(s, e);
  return `${Math.floor(ms / 3_600_000)}U ${String(Math.floor((ms % 3_600_000) / 60_000)).padStart(2, '0')}M`;
};
/** ISO → vrednost za <input type="datetime-local"> v lokalnem času */
export const toLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export function toCsv(rows: { name?: string; email?: string; start_time: string; end_time: string | null }[]) {
  const esc = (v: string) => /[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  const head = 'Ime in priimek;E-naslov;Datum;Začetek;Konec;Trajanje (h)';
  const lines = rows.map(r => [
    r.name ?? '', r.email ?? '', fmtDate(r.start_time), fmtTime(r.start_time),
    r.end_time ? fmtTime(r.end_time) : 'V DELU',
    r.end_time ? (durMs(r.start_time, r.end_time) / 3_600_000).toFixed(2).replace('.', ',') : ''
  ].map(esc).join(';'));
  return '﻿' + [head, ...lines].join('\n');
}

export const RULE_LABEL: Record<string, string> = {
  OPEN_SESSION: 'Odprta evidenca',
  DAILY_MAX: 'Predolg delovni dan',
  BREAK: 'Odmor',
  DAILY_REST: 'Dnevni počitek',
  WEEKLY_REST: 'Tedenski počitek',
  WEEKLY_OVERTIME: 'Tedenske nadure',
  MONTHLY_OVERTIME: 'Mesečne nadure',
  YEARLY_OVERTIME: 'Letne nadure'
};
