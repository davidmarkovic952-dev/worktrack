import type { ReactNode } from 'react';
import type { Finding } from '../types';
import { RULE_LABEL } from '../format';

export function Ticker({ active, name }: { active?: boolean; name?: string }) {
  const msg = active
    ? `⚡ ${name?.toUpperCase()} JE V DELU  //  EVIDENCA AKTIVNA  //  `
    : '◼ WORKTRACK — EVIDENCA DELOVNEGA ČASA  //  SKLADNO Z ZDR-1  //  REVIZIJSKA SLED  //  ';
  return <div className="ticker" aria-hidden><div>{msg.repeat(6)}</div></div>;
}

export function TopBar({ admin, name, onLogout, center }: { admin?: boolean; name: string; onLogout: () => void; center?: ReactNode }) {
  return (
    <header className={`topbar${admin ? ' admin' : ''}`}>
      <span className="logo">WORKTRACK{admin && <em>ADMIN</em>}</span>
      {center}
      <div className="who"><span>{name.toUpperCase()}</span><button className="btn ghost" onClick={onLogout}>ODJAVA</button></div>
    </header>
  );
}

export function Stat({ value, label, accent }: { value: ReactNode; label: string; accent?: boolean }) {
  return <div className={`stat su${accent ? ' acc' : ''}`}><b>{value}</b><span>{label}</span></div>;
}

const SEV = { violation: 'KRŠITEV', warning: 'OPOZORILO', unknown: 'NEZNANO' } as const;

export function FindingItem({ f, who }: { f: Finding; who?: string }) {
  return (
    <div className={`finding ${f.severity}`}>
      <h4><span className={`sev ${f.severity}`}>{SEV[f.severity]}</span>{RULE_LABEL[f.rule] ?? f.rule}<small>{f.period}{who ? ` · ${who}` : ''}</small></h4>
      <p>{f.message}</p>
      <small>
        {f.value !== null ? `Izmerjeno: ${f.value}` : 'Izmerjeno: ni mogoče izmeriti'}
        {f.limit !== null ? ` · Meja: ${f.limit}` : ''} · Podlaga: {f.legalBasis} · Evidence: #{f.recordIds.join(', #')}
      </small>
    </div>
  );
}
