import { useState, type FormEvent } from 'react';
import { createApi } from '../api';
import type { User } from '../types';
import { Ticker } from '../components/Chrome';

export function LoginView({ onLogin }: { onLogin: (u: User, token: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const r = await createApi(null).post<{ user: User; token: string }>('/auth/login', { email, password });
      onLogin(r.user, r.token);
    } catch (x) {
      setErr((x as Error).message); setShake(true); setTimeout(() => setShake(false), 450);
    } finally { setBusy(false); }
  }

  return (
    <div className="page">
      <header className="topbar"><span className="logo">WORKTRACK</span><span className="who">EVIDENCA DELOVNEGA ČASA v2.0</span></header>
      <Ticker />
      <main style={{ flex: 1, display: 'grid', placeItems: 'center', padding: 32 }}>
        <form onSubmit={submit} style={{ width: '100%', maxWidth: 460 }}>
          <h1 className="h-xl su">PRIJAVA</h1>
          <p className="sub" style={{ marginBottom: 32 }}>// Vpišite svoje podatke za dostop</p>
          <div className="box big su" style={{ padding: 32, animation: shake ? 'shake .4s' : undefined }}>
            {err && <div className="err" role="alert">✕ {err}</div>}
            <label className="label" htmlFor="email">E-naslov</label>
            <input id="email" className="input" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} placeholder="ime@podjetje.si" required style={{ marginBottom: 20 }} />
            <label className="label" htmlFor="pw">Geslo</label>
            <input id="pw" className="input" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={{ marginBottom: 28 }} />
            <button className="btn full" disabled={busy}>{busy ? 'PRIJAVLJAM…' : 'VSTOPI →'}</button>
          </div>
          <p className="sub" style={{ marginTop: 18 }}>Demo: ana.novak@podjetje.si / test123 · admin@podjetje.si / admin123</p>
        </form>
      </main>
    </div>
  );
}
