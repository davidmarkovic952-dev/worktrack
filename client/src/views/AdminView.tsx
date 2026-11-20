import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Api } from '../api';
import type { AuditRow, Finding, Summary, TimeRecord, User } from '../types';
import { FindingItem, Stat, Ticker, TopBar } from '../components/Chrome';
import { fmtDate, fmtDur, fmtTime, toCsv, toLocalInput } from '../format';

type Tab = 'records' | 'compliance' | 'audit' | 'employees' | 'add';
type ComplianceRow = { user: { id: number; name: string }; summary: Summary; findings: Finding[] };
type Edit = { id: number | null; user_id: number; start: string; end: string; reason: string };

const ACTION_LABEL: Record<string, string> = {
  'record.start': 'Začetek dela', 'record.stop': 'Konec dela', 'record.update': 'Popravek evidence',
  'record.delete': 'Izbris evidence', 'record.create': 'Ročni vnos', 'user.create': 'Nov uporabnik',
  'auth.login': 'Prijava', 'auth.login_failed': 'Neuspela prijava'
};

export function AdminView({ user, api, onLogout }: { user: User; api: Api; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>('records');
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [compliance, setCompliance] = useState<ComplianceRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [filter, setFilter] = useState('all');
  const [edit, setEdit] = useState<Edit | null>(null);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'employee', weekly_hours: 40 });

  const load = useCallback(async () => {
    try {
      const [r, u, c, a] = await Promise.all([
        api.get<TimeRecord[]>('/records'), api.get<User[]>('/users'),
        api.get<ComplianceRow[]>('/reports/compliance'), api.get<AuditRow[]>('/reports/audit')
      ]);
      setRecords(r); setUsers(u); setCompliance(c); setAudit(a);
    } catch (e) { setErr((e as Error).message); }
  }, [api]);
  useEffect(() => { load(); }, [load]);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };
  const employees = users.filter(u => u.role === 'employee');
  const filtered = records.filter(r => filter === 'all' || r.user_id === Number(filter));
  const totalH = records.reduce((a, r) => r.end_time ? a + (new Date(r.end_time).getTime() - new Date(r.start_time).getTime()) : a, 0) / 3_600_000;
  const violations = useMemo(() => compliance.flatMap(c => c.findings.filter(f => f.severity === 'violation')).length, [compliance]);
  const flagged = useMemo(() => new Set(compliance.flatMap(c => c.findings.flatMap(f => f.recordIds))), [compliance]);

  function exportCsv() {
    const blob = new Blob([toCsv(filtered)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `evidenca_dela_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    flash('✓ CSV IZVOŽEN');
  }

  async function saveEdit() {
    if (!edit) return;
    setErr('');
    const body = { start_time: new Date(edit.start).toISOString(), end_time: edit.end ? new Date(edit.end).toISOString() : null, reason: edit.reason };
    try {
      if (edit.id) await api.put(`/records/${edit.id}`, body);
      else await api.post('/records', { ...body, user_id: edit.user_id });
      setEdit(null); flash('✓ SHRANJENO V REVIZIJSKO SLED'); load();
    } catch (e) { setErr((e as Error).message); }
  }

  async function remove(id: number) {
    const reason = prompt('Razlog za izbris (obvezno, zapiše se v revizijsko sled):');
    if (!reason) return;
    try { await api.del(`/records/${id}`, { reason }); flash('✓ IZBRISANO'); load(); }
    catch (e) { setErr((e as Error).message); }
  }

  async function addUser() {
    try {
      await api.post('/users', { ...newUser, weekly_hours: Number(newUser.weekly_hours) });
      setNewUser({ name: '', email: '', password: '', role: 'employee', weekly_hours: 40 });
      flash('✓ ZAPOSLENI DODAN'); load();
    } catch (e) { setErr((e as Error).message); }
  }

  return (
    <div className="page">
      <TopBar admin name={user.name} onLogout={onLogout} />
      <Ticker />
      <main className="wrap" style={{ maxWidth: 1150 }}>
        <h1 className="h-xl su">NADZORNA<br />PLOŠČA</h1>
        <div className="stats">
          <Stat value={employees.length} label="ZAPOSLENIH" />
          <Stat value={records.length} label="ZAPISOV" accent />
          <Stat value={`${totalH.toFixed(0)}h`} label="SKUPAJ UR" />
          <Stat value={violations} label="KRŠITEV ZDR-1" />
        </div>
        {err && <div className="err">✕ {err}</div>}
        <nav className="tabs">
          {([['records', 'EVIDENCE'], ['compliance', `SKLADNOST${violations ? ` (${violations})` : ''}`], ['audit', 'REVIZIJSKA SLED'], ['employees', 'ZAPOSLENI'], ['add', '+ DODAJ']] as [Tab, string][])
            .map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
        </nav>

        {tab === 'records' && <section className="tabpanel">
          <div className="toolbar">
            <select className="input sm" style={{ width: 'auto' }} value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">VSI ZAPOSLENI</option>
              {employees.map(u => <option key={u.id} value={u.id}>{u.name.toUpperCase()}</option>)}
            </select>
            <button className="btn sm" onClick={exportCsv}>⬇ CSV</button>
            <button className="btn sm acid" onClick={() => setEdit({ id: null, user_id: employees[0]?.id ?? 0, start: '', end: '', reason: '' })}>+ ROČNI VNOS</button>
            {msg && <span className="ok">{msg}</span>}
            <span className="count">{filtered.length} ZAPISOV</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>#</th><th>ZAPOSLENI</th><th>DATUM</th><th>ZAČETEK</th><th>KONEC</th><th>TRAJANJE</th><th></th></tr></thead>
              <tbody>{filtered.map(r => (
                <tr key={r.id}>
                  <td>{r.id}{flagged.has(r.id) && <span title="Vključeno v ugotovitev skladnosti" style={{ color: 'var(--blood)' }}> ⚠</span>}</td>
                  <td className="name">{r.name}</td>
                  <td>{fmtDate(r.start_time)}</td>
                  <td className="start">{fmtTime(r.start_time)}</td>
                  <td>{r.end_time ? fmtTime(r.end_time) : <span className="live">V DELU</span>}</td>
                  <td>{r.end_time ? <span className="dur">{fmtDur(r.start_time, r.end_time)}</span> : '—'}</td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button className="btn sm" onClick={() => setEdit({ id: r.id, user_id: r.user_id, start: toLocalInput(r.start_time), end: toLocalInput(r.end_time), reason: '' })}>UREDI</button>
                    <button className="btn sm blood" onClick={() => remove(r.id)}>✕</button>
                  </td>
                </tr>))}
              </tbody>
            </table>
            {filtered.length === 0 && <div className="empty">— NI ZAPISOV —</div>}
          </div>
        </section>}

        {tab === 'compliance' && <section className="tabpanel">
          <div className="toolbar"><span className="sub" style={{ margin: 0 }}>Preverjanje po ZDR-1: max 10 h/dan · 12 h dnevnega počitka · 24 h tedenskega počitka · nadure 8 h/teden, 20 h/mesec, 170 h/leto · odmor 30 min</span></div>
          {compliance.map(c => (
            <div key={c.user.id}>
              <div className="toolbar" style={{ background: '#fff' }}>
                <b style={{ fontFamily: 'var(--display)', fontSize: 22, letterSpacing: '.05em' }}>{c.user.name.toUpperCase()}</b>
                <span className="sub" style={{ margin: 0 }}>Ta teden: {c.summary.weekHours} h · Skupaj: {c.summary.totalHours} h{c.summary.openRecords ? ` · Odprte: ${c.summary.openRecords}` : ''}</span>
                <span className="count">{c.findings.length ? `${c.findings.length} UGOTOVITEV` : '✓ SKLADNO'}</span>
              </div>
              {c.findings.map((f, i) => <FindingItem key={i} f={f} />)}
            </div>
          ))}
          {compliance.length === 0 && <div className="empty">— NI ZAPOSLENIH —</div>}
        </section>}

        {tab === 'audit' && <section className="tabpanel">
          <div className="toolbar"><span className="sub" style={{ margin: 0 }}>Vsaka sprememba je zapisana (kdo, kdaj, kaj, stanje prej/potem, razlog). Zapisov ni mogoče spreminjati.</span></div>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>ČAS</th><th>KDO</th><th>DEJANJE</th><th>OBJEKT</th><th>SPREMEMBA</th><th>RAZLOG</th></tr></thead>
              <tbody>{audit.map(a => (
                <tr key={a.id}>
                  <td>{fmtDate(a.created_at)} {fmtTime(a.created_at)}</td>
                  <td className="name">{a.actor_name ?? '—'}</td>
                  <td>{ACTION_LABEL[a.action] ?? a.action}</td>
                  <td>{a.entity_id ? `#${a.entity_id}` : '—'}</td>
                  <td className="diff">{a.action === 'record.update' && a.before && a.after
                    ? <><del>{fmtTime(String(a.before.start_time))}–{a.before.end_time ? fmtTime(String(a.before.end_time)) : '…'}</del> → <ins>{fmtTime(String(a.after.start_time))}–{a.after.end_time ? fmtTime(String(a.after.end_time)) : '…'}</ins></>
                    : ''}</td>
                  <td style={{ whiteSpace: 'normal', fontFamily: 'var(--body)' }}>{a.reason ?? ''}</td>
                </tr>))}
              </tbody>
            </table>
            {audit.length === 0 && <div className="empty">— PRAZNO —</div>}
          </div>
        </section>}

        {tab === 'employees' && <section className="tabpanel">
          {employees.map(u => {
            const c = compliance.find(x => x.user.id === u.id);
            return (
              <div key={u.id} className="toolbar" style={{ background: '#fff', padding: '18px 24px' }}>
                <div><b style={{ font: '28px var(--display)', letterSpacing: '.04em' }}>{u.name.toUpperCase()}</b><div className="sub" style={{ marginTop: 0 }}>{u.email} · {u.weekly_hours} h/teden</div></div>
                <span className="count">{c ? `${c.summary.weekHours} h ta teden · ${c.findings.length} ugotovitev` : ''}</span>
              </div>
            );
          })}
        </section>}

        {tab === 'add' && <section className="tabpanel" style={{ padding: 32 }}>
          <div className="grid2" style={{ maxWidth: 700 }}>
            {([['name', 'Ime in priimek', 'text'], ['email', 'E-naslov', 'email'], ['password', 'Geslo (min. 8 znakov)', 'password'], ['weekly_hours', 'Pogodbene ure na teden', 'number']] as const).map(([k, l, t]) => (
              <div key={k}><label className="label">{l}</label><input className="input" type={t} value={newUser[k]} onChange={e => setNewUser(p => ({ ...p, [k]: e.target.value }))} /></div>
            ))}
            <div><label className="label">Vloga</label>
              <select className="input" value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}><option value="employee">ZAPOSLENI</option><option value="admin">ADMIN</option></select></div>
          </div>
          <div style={{ marginTop: 24, display: 'flex', gap: 16, alignItems: 'center' }}>
            <button className="btn" onClick={addUser}>DODAJ →</button>{msg && <span className="ok">{msg}</span>}
          </div>
        </section>}
      </main>

      {edit && <div className="modal-bg" onClick={e => e.target === e.currentTarget && setEdit(null)}>
        <div className="box big modal" role="dialog" aria-label="Urejanje evidence">
          <h2 style={{ font: '32px var(--display)', letterSpacing: '.05em', marginBottom: 16 }}>{edit.id ? `POPRAVEK #${edit.id}` : 'ROČNI VNOS'}</h2>
          {err && <div className="err">✕ {err}</div>}
          {!edit.id && <><label className="label">Zaposleni</label>
            <select className="input" value={edit.user_id} onChange={e => setEdit({ ...edit, user_id: Number(e.target.value) })} style={{ marginBottom: 14 }}>
              {employees.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></>}
          <div className="grid2">
            <div><label className="label">Začetek</label><input className="input" type="datetime-local" value={edit.start} onChange={e => setEdit({ ...edit, start: e.target.value })} /></div>
            <div><label className="label">Konec</label><input className="input" type="datetime-local" value={edit.end} onChange={e => setEdit({ ...edit, end: e.target.value })} /></div>
          </div>
          <label className="label" style={{ marginTop: 14 }}>Razlog (obvezno — zapiše se v revizijsko sled)</label>
          <textarea className="input" rows={3} value={edit.reason} onChange={e => setEdit({ ...edit, reason: e.target.value })} placeholder="npr. Delavec je pozabil zaključiti delo, odšel ob 16:00 (potrdil vodja)" />
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button className="btn acid" onClick={saveEdit} disabled={edit.reason.trim().length < 5 || !edit.start}>SHRANI</button>
            <button className="btn" onClick={() => { setEdit(null); setErr(''); }}>PREKLIČI</button>
          </div>
        </div>
      </div>}
    </div>
  );
}
