import { useMemo, useState } from 'react';
import { createApi } from './api';
import type { User } from './types';
import { LoginView } from './views/LoginView';
import { EmployeeView } from './views/EmployeeView';
import { AdminView } from './views/AdminView';

const KEY = 'worktrack.session';
type Session = { user: User; token: string };

function loadSession(): Session | null {
  try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { return null; }
}

export default function App() {
  const [session, setSession] = useState<Session | null>(loadSession);
  const logout = () => { sessionStorage.removeItem(KEY); setSession(null); };
  const api = useMemo(() => createApi(session?.token ?? null, logout), [session?.token]);

  if (!session) return <LoginView onLogin={(user, token) => {
    const s = { user, token };
    sessionStorage.setItem(KEY, JSON.stringify(s));
    setSession(s);
  }} />;
  return session.user.role === 'admin'
    ? <AdminView user={session.user} api={api} onLogout={logout} />
    : <EmployeeView user={session.user} api={api} onLogout={logout} />;
}
