import { useCallback, useEffect, useState } from 'react';
import type { Api } from '../api';
import type { Finding, Summary, TimeRecord, User } from '../types';
import { FindingItem, Stat, Ticker, TopBar } from '../components/Chrome';
import { fmtClock, fmtDate, fmtDur, fmtTime } from '../format';

export function EmployeeView({ user, api, onLogout }: { user: User; api: Api; onLogout: () => void }) {
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [active, setActive] = useState<TimeRecord | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const first = user.name.split(' ')[0];

  const load = useCallback(async () => {
    try {
      const [recs, act, rep] = await Promise.all([
        api.get<TimeRecord[]>('/records'),
        api.get<TimeRecord | null>('/records/active'),
        api.get<{ summary: Summary; findings: Finding[] }>('/reports/me')
      ]);
      setRecords(recs); setActive(act); setSummary(rep.summary); setFindings(rep.findings);
    } catch (e) { setErr((e as Error).message); }
    setLoading(false);
  }, [api]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!active) { setElapsed(0); return; }
    const tick = () => setElapsed(Date.now() - new Date(active.start_time).getTime());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active]);

  async function toggle() {
    setErr('');
    try { await api.post(active ? '/records/stop' : '/records/start'); await load(); }
    catch (e) { setErr((e as Error).message); }
  }

  return (
    <div className="page">
      <TopBar name={user.name} onLogout={onLogout} center={active && <span className="pill">● V DELU</span>} />
      <Ticker active={!!active} name={first} />
      <main className="wrap" style={{ maxWidth: 900 }}>
        <h1 className="h-xl su">{first.toUpperCase()}</h1>
        <p className="sub">{new Date().toLocaleDateString('sl-SI', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <div className="stats">
          <Stat value={`${summary?.todayHours ?? 0}h`} label="DANES" accent />
          <Stat value={`${summary?.weekHours ?? 0}h`} label="TA TEDEN" />
          <Stat value={`${summary?.totalHours ?? 0}h`} label="SKUPAJ" />
        </div>
        {err && <div className="err">✕ {err}</div>}
        <section className="box big su" style={{ marginBottom: 24 }}>
          <div className={`timer${active ? ' on' : ''}`}>
            {active && <div className="hatch" />}
            <div className="since">{active ? `// ZAČETEK: ${fmtTime(active.start_time)}` : '// ČAKAM NA ZAČETEK'}</div>
            <div className="clock">{fmtClock(elapsed)}</div>
          </div>
          <div style={{ padding: 24 }}>
            <button className={`btn full ${active ? 'blood' : 'acid'}`} onClick={toggle}>{active ? '■ ZAKLJUČI DELO' : '▶ ZAČNI DELO'}</button>
          </div>
        </section>

        {findings.length > 0 && (
          <section className="box su" style={{ marginBottom: 24 }}>
            <div className="toolbar" style={{ background: 'var(--ink)', color: 'var(--acid)' }}><span className="logo" style={{ fontSize: 20 }}>OPOZORILA ZA MOJE URE</span></div>
            {findings.map((f, i) => <FindingItem key={i} f={f} />)}
          </section>
        )}

        <section className="box su">
          <div className="toolbar" style={{ background: 'var(--ink)' }}>
            <span className="logo" style={{ fontSize: 20 }}>MOJE EVIDENCE</span>
            <span className="count" style={{ color: 'var(--acid)' }}>{records.length} ZAPISOV</span>
          </div>
          {loading ? <div className="empty">NALAGAM…</div> : records.length === 0 ? <div className="empty">— ŠE NI ZAPISOV —</div> : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead><tr><th>DATUM</th><th>ZAČETEK</th><th>KONEC</th><th>TRAJANJE</th></tr></thead>
                <tbody>{records.map(r => (
                  <tr key={r.id}>
                    <td>{fmtDate(r.start_time)}</td>
                    <td className="start">{fmtTime(r.start_time)}</td>
                    <td>{r.end_time ? fmtTime(r.end_time) : <span className="live">V DELU</span>}</td>
                    <td>{r.end_time ? <span className="dur">{fmtDur(r.start_time, r.end_time)}</span> : '—'}</td>
                  </tr>))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
