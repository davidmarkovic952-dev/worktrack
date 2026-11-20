import { describe, it, expect } from 'vitest';
import { fmtClock, toCsv, fmtDur } from './format';

describe('format', () => {
  it('fmtClock', () => expect(fmtClock(3_723_000)).toBe('01:02:03'));
  it('fmtDur', () => expect(fmtDur('2026-11-18T08:00:00Z', '2026-11-18T16:30:00Z')).toBe('8U 30M'));
  it('CSV ima BOM, ločilo ; in decimalno vejico', () => {
    const csv = toCsv([{ name: 'Ana; Novak', email: 'a@x.si', start_time: '2026-11-18T08:00:00Z', end_time: '2026-11-18T16:30:00Z' }]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('"Ana; Novak"');
    expect(csv).toContain('8,50');
  });
});
