import { useState, useEffect, useRef } from "react";

/* ─── GLOBAL STYLES injected once ─────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;600;700&family=Outfit:wght@300;400;600;700;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --ink: #0a0a0a;
    --paper: #f5f0e8;
    --acid: #e8ff00;
    --blood: #ff2d2d;
    --steel: #c8c8c8;
    --rust: #d4450c;
    --mid: #3a3a3a;
    --border: 2px solid #0a0a0a;
    --border-heavy: 4px solid #0a0a0a;
    --shadow: 4px 4px 0px #0a0a0a;
    --shadow-big: 8px 8px 0px #0a0a0a;
    --radius: 0px;
    --font-display: 'Bebas Neue', sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
    --font-body: 'Outfit', sans-serif;
  }

  body {
    background: var(--paper);
    color: var(--ink);
    font-family: var(--font-body);
    overflow-x: hidden;
  }

  ::selection { background: var(--acid); color: var(--ink); }

  @keyframes pulse-ring {
    0% { transform: scale(1); opacity: 1; }
    100% { transform: scale(1.6); opacity: 0; }
  }
  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.2; }
  }
  @keyframes slide-up {
    from { transform: translateY(30px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes slide-in-left {
    from { transform: translateX(-40px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes hatch-march {
    from { background-position: 0 0; }
    to { background-position: 20px 20px; }
  }
  @keyframes ticker {
    from { transform: translateX(0); }
    to { transform: translateX(-50%); }
  }
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }
  @keyframes stamp-in {
    0% { transform: scale(2) rotate(-10deg); opacity: 0; }
    60% { transform: scale(0.95) rotate(1deg); opacity: 1; }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }
  @keyframes count-up {
    from { transform: translateY(8px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .slide-up { animation: slide-up 0.4s cubic-bezier(.22,.68,0,1.2) both; }
  .slide-up-2 { animation: slide-up 0.4s 0.08s cubic-bezier(.22,.68,0,1.2) both; }
  .slide-up-3 { animation: slide-up 0.4s 0.16s cubic-bezier(.22,.68,0,1.2) both; }
  .slide-up-4 { animation: slide-up 0.4s 0.24s cubic-bezier(.22,.68,0,1.2) both; }
  .slide-up-5 { animation: slide-up 0.4s 0.32s cubic-bezier(.22,.68,0,1.2) both; }

  .hatch {
    background-image: repeating-linear-gradient(
      45deg, transparent, transparent 6px, rgba(0,0,0,0.07) 6px, rgba(0,0,0,0.07) 8px
    );
  }

  .hatch-march {
    background-image: repeating-linear-gradient(
      45deg, transparent, transparent 6px, rgba(232,255,0,0.3) 6px, rgba(232,255,0,0.3) 8px
    );
    background-size: 20px 20px;
    animation: hatch-march 1s linear infinite;
  }

  input:focus { outline: 3px solid var(--acid) !important; outline-offset: 0px; }

  .btn-hover:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0 var(--ink) !important; transition: all 0.1s; }
  .btn-hover:active { transform: translate(2px, 2px); box-shadow: 2px 2px 0 var(--ink) !important; }

  .row-hover:hover { background: rgba(232,255,0,0.15) !important; }

  .ticker-wrap {
    overflow: hidden;
    white-space: nowrap;
    border-top: var(--border);
    border-bottom: var(--border);
    background: var(--ink);
    color: var(--acid);
    padding: 6px 0;
    font-family: var(--font-mono);
    font-size: 11px;
    letter-spacing: 0.12em;
    font-weight: 600;
  }
  .ticker-inner {
    display: inline-block;
    animation: ticker 18s linear infinite;
  }
`;

/* ─── HELPERS ──────────────────────────────────────────────────────────────── */
const fmt = (ms) => {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};
const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("sl-SI", { day: "2-digit", month: "2-digit", year: "numeric" });
const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString("sl-SI", { hour: "2-digit", minute: "2-digit" });
const durMs = (s, e) => new Date(e) - new Date(s);
const durStr = (s, e) => {
  const ms = durMs(s, e);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}U ${String(m).padStart(2, "0")}M`;
};
const todayIso = () => new Date().toISOString().split("T")[0];

/* ─── SEED DATA ────────────────────────────────────────────────────────────── */
const USERS = [
  { id: 1, email: "ana.novak@podjetje.si",   name: "Ana Novak",    role: "employee", password: "test123" },
  { id: 2, email: "bojan.kralj@podjetje.si", name: "Bojan Kralj",  role: "employee", password: "test123" },
  { id: 3, email: "maja.zupan@podjetje.si",  name: "Maja Zupan",   role: "employee", password: "test123" },
  { id: 4, email: "admin@podjetje.si",       name: "Admin",        role: "admin",    password: "admin123" },
];

const makeRec = (id, userId, dateStr, startH, endH) => ({
  id, userId,
  start: `${dateStr}T${String(startH).padStart(2,"0")}:${String(Math.floor(Math.random()*10)).padStart(2,"0")}:00`,
  end:   `${dateStr}T${String(endH).padStart(2,"0")}:${String(Math.floor(Math.random()*10)).padStart(2,"0")}:00`,
});

const SEED = [
  makeRec(1, 1, "2025-04-14", 8, 16),  makeRec(2, 2, "2025-04-14", 7, 15),
  makeRec(3, 3, "2025-04-14", 9, 17),  makeRec(4, 1, "2025-04-15", 8, 16),
  makeRec(5, 2, "2025-04-15", 8, 16),  makeRec(6, 1, "2025-04-16", 8, 12),
  makeRec(7, 3, "2025-04-16", 10, 18), makeRec(8, 2, "2025-04-17", 7, 15),
  makeRec(9, 1, "2025-04-21", 8, 16),  makeRec(10,2, "2025-04-21", 8, 16),
  makeRec(11,3, "2025-04-22", 8, 14),
];

/* ─── SUB-COMPONENTS ────────────────────────────────────────────────────────── */

function Ticker({ active, name }) {
  const msg = active
    ? `⚡ ${name?.toUpperCase()} JE V DELU  //  EVIDENCA AKTIVNA  //  DELOVNI ČAS SE BELEŽI  //  `
    : `◼ WORKTRACK — EVIDENCA DELOVNEGA ČASA  //  PREPROSTO. ZANESLJIVO. HITRO.  //  `;
  return (
    <div className="ticker-wrap">
      <div className="ticker-inner">
        {(msg + msg + msg + msg).repeat(2)}
      </div>
    </div>
  );
}

function StatBox({ value, label, accent, delay = "" }) {
  return (
    <div className={`slide-up${delay}`} style={{
      border: "var(--border-heavy)",
      boxShadow: "var(--shadow)",
      background: accent ? "var(--acid)" : "white",
      padding: "20px 24px",
      flex: 1,
      minWidth: 120,
    }}>
      <div style={{
        fontFamily: "var(--font-display)",
        fontSize: 48,
        lineHeight: 1,
        letterSpacing: "0.02em",
        color: "var(--ink)",
      }}>{value}</div>
      <div style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "var(--mid)",
        marginTop: 6,
      }}>{label}</div>
    </div>
  );
}

function Tag({ children, color = "var(--ink)", bg = "transparent" }) {
  return (
    <span style={{
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      border: "1.5px solid var(--ink)",
      padding: "2px 8px",
      background: bg,
      color: color,
    }}>{children}</span>
  );
}

/* ─── LOGIN ─────────────────────────────────────────────────────────────────── */
function LoginView({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [shaking, setShaking] = useState(false);

  const attempt = () => {
    const u = USERS.find((x) => x.email === email && x.password === pass);
    if (!u) {
      setErr("NAPAČEN E-NASLOV ALI GESLO");
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      return;
    }
    onLogin(u);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--paper)",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header stripe */}
      <div style={{ background: "var(--ink)", padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 28, color: "var(--acid)", letterSpacing: "0.1em" }}>WORKTRACK</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--steel)", letterSpacing: "0.12em" }}>EVIDENCA DELOVNEGA ČASA v1.0</span>
      </div>

      <Ticker active={false} />

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <div style={{ width: "100%", maxWidth: 460 }}>

          {/* Big heading */}
          <div className="slide-up" style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(56px, 12vw, 96px)",
            lineHeight: 0.9,
            letterSpacing: "0.02em",
            marginBottom: 8,
          }}>
            PRIJAVA
          </div>
          <div className="slide-up-2" style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.14em",
            color: "var(--mid)",
            marginBottom: 36,
            textTransform: "uppercase",
          }}>// Vpišite svoje podatke za dostop</div>

          {/* Form card */}
          <div
            className="slide-up-3"
            style={{
              border: "var(--border-heavy)",
              boxShadow: "var(--shadow-big)",
              background: "white",
              padding: 32,
              animation: shaking ? "shake 0.4s ease" : undefined,
            }}
          >
            {err && (
              <div style={{
                background: "var(--blood)",
                color: "white",
                padding: "10px 16px",
                marginBottom: 20,
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                letterSpacing: "0.1em",
                fontWeight: 700,
                border: "2px solid #8b0000",
              }}>
                ✕ {err}
              </div>
            )}

            <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--mid)", display: "block", marginBottom: 6 }}>
              E-NASLOV
            </label>
            <input
              style={{
                width: "100%",
                border: "var(--border-heavy)",
                background: "var(--paper)",
                padding: "12px 14px",
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                color: "var(--ink)",
                marginBottom: 20,
                display: "block",
              }}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && attempt()}
              placeholder="ime@podjetje.si"
            />

            <label style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--mid)", display: "block", marginBottom: 6 }}>
              GESLO
            </label>
            <input
              style={{
                width: "100%",
                border: "var(--border-heavy)",
                background: "var(--paper)",
                padding: "12px 14px",
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                color: "var(--ink)",
                marginBottom: 28,
                display: "block",
              }}
              type="password"
              value={pass}
              onChange={e => setPass(e.target.value)}
              onKeyDown={e => e.key === "Enter" && attempt()}
              placeholder="••••••••"
            />

            <button
              className="btn-hover"
              onClick={attempt}
              style={{
                width: "100%",
                background: "var(--ink)",
                color: "var(--acid)",
                border: "var(--border-heavy)",
                boxShadow: "var(--shadow)",
                padding: "16px",
                fontFamily: "var(--font-display)",
                fontSize: 22,
                letterSpacing: "0.14em",
                cursor: "pointer",
                transition: "all 0.1s",
              }}
            >
              VSTOPI →
            </button>
          </div>

          {/* Test accounts */}
          <div className="slide-up-4" style={{
            marginTop: 20,
            border: "1.5px solid var(--ink)",
            padding: "14px 18px",
            background: "var(--paper)",
          }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", fontWeight: 700, marginBottom: 8, textTransform: "uppercase" }}>
              // TESTNI RAČUNI
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--mid)", lineHeight: 1.8 }}>
              <span style={{ color: "var(--rust)", fontWeight: 700 }}>ZAPOSLENI:</span> ana.novak@podjetje.si / test123<br />
              <span style={{ color: "var(--rust)", fontWeight: 700 }}>ADMIN:</span> admin@podjetje.si / admin123
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── EMPLOYEE VIEW ──────────────────────────────────────────────────────────── */
function EmployeeView({ user, records, onStop, onStart, activeSession, elapsed, onLogout }) {
  const myRecs = records
    .filter(r => r.userId === user.id)
    .sort((a, b) => new Date(b.start) - new Date(a.start));

  const totalMs = myRecs.reduce((a, r) => a + durMs(r.start, r.end), 0);
  const totalH = (totalMs / 3600000).toFixed(1);
  const todayRecs = myRecs.filter(r => r.start.startsWith(todayIso()));
  const todayMs = todayRecs.reduce((a, r) => a + durMs(r.start, r.end), 0);
  const todayH = (todayMs / 3600000).toFixed(1);

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", flexDirection: "column" }}>
      {/* Top nav */}
      <div style={{
        background: "var(--ink)",
        padding: "0 24px",
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        borderBottom: "4px solid var(--acid)",
        height: 56,
      }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--acid)", letterSpacing: "0.1em" }}>WORKTRACK</span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {activeSession && (
            <span style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.1em",
              background: "var(--acid)",
              color: "var(--ink)",
              padding: "3px 10px",
              fontWeight: 700,
              animation: "blink 2s ease infinite",
            }}>● V DELU</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, justifyContent: "flex-end" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--steel)", letterSpacing: "0.08em" }}>
            {user.name.toUpperCase()}
          </span>
          <button
            className="btn-hover"
            onClick={onLogout}
            style={{
              background: "transparent",
              border: "1.5px solid var(--steel)",
              color: "var(--steel)",
              padding: "5px 14px",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.1em",
              cursor: "pointer",
              textTransform: "uppercase",
            }}
          >ODJAVA</button>
        </div>
      </div>

      <Ticker active={!!activeSession} name={user.name.split(" ")[0]} />

      <div style={{ flex: 1, maxWidth: 900, width: "100%", margin: "0 auto", padding: "32px 20px" }}>

        {/* Date + greeting */}
        <div className="slide-up" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "clamp(40px, 8vw, 72px)", lineHeight: 0.9, letterSpacing: "0.02em" }}>
              {user.name.split(" ")[0].toUpperCase()}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--mid)", letterSpacing: "0.12em", marginTop: 6, textTransform: "uppercase" }}>
              {new Date().toLocaleDateString("sl-SI", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </div>
          </div>
          <Tag>{user.email}</Tag>
        </div>

        {/* Stats row */}
        <div className="slide-up-2" style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <StatBox value={`${totalH}h`} label="SKUPAJ UR" accent delay="-2" />
          <StatBox value={myRecs.length} label="SKUPAJ ZAPISOV" delay="-3" />
          <StatBox value={`${todayH}h`} label="DANES" delay="-4" />
          <StatBox value={todayRecs.length} label="DANES — VNOSI" delay="-5" />
        </div>

        {/* Main action card */}
        <div className="slide-up-3" style={{
          border: "var(--border-heavy)",
          boxShadow: "var(--shadow-big)",
          background: "white",
          marginBottom: 24,
          overflow: "hidden",
        }}>
          {/* Timer display */}
          <div style={{
            background: activeSession ? "var(--ink)" : "var(--paper)",
            padding: "28px 32px",
            borderBottom: "var(--border-heavy)",
            position: "relative",
            overflow: "hidden",
          }}>
            {activeSession && <div className="hatch-march" style={{ position: "absolute", inset: 0, opacity: 0.4 }} />}
            <div style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: activeSession ? "var(--acid)" : "var(--mid)",
              marginBottom: 8,
              position: "relative",
            }}>
              {activeSession ? `// ZAČETEK: ${fmtTime(activeSession.startIso)}` : "// ČAKAM NA ZAČETEK"}
            </div>
            <div style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(52px, 12vw, 100px)",
              letterSpacing: "0.04em",
              lineHeight: 1,
              color: activeSession ? "var(--acid)" : "#ccc",
              position: "relative",
              fontVariantNumeric: "tabular-nums",
            }}>
              {fmt(elapsed)}
            </div>
          </div>

          {/* Buttons */}
          <div style={{ padding: 24, display: "flex", gap: 16, flexWrap: "wrap" }}>
            {!activeSession ? (
              <button
                className="btn-hover"
                onClick={onStart}
                style={{
                  flex: 1,
                  minWidth: 200,
                  background: "var(--acid)",
                  border: "var(--border-heavy)",
                  boxShadow: "var(--shadow)",
                  padding: "18px 24px",
                  fontFamily: "var(--font-display)",
                  fontSize: 28,
                  letterSpacing: "0.1em",
                  cursor: "pointer",
                  color: "var(--ink)",
                  transition: "all 0.1s",
                }}
              >
                ▶ ZAČNI DELO
              </button>
            ) : (
              <button
                className="btn-hover"
                onClick={onStop}
                style={{
                  flex: 1,
                  minWidth: 200,
                  background: "var(--blood)",
                  border: "var(--border-heavy)",
                  boxShadow: "var(--shadow)",
                  padding: "18px 24px",
                  fontFamily: "var(--font-display)",
                  fontSize: 28,
                  letterSpacing: "0.1em",
                  cursor: "pointer",
                  color: "white",
                  transition: "all 0.1s",
                }}
              >
                ■ ZAKLJUČI DELO
              </button>
            )}
          </div>
        </div>

        {/* Records table */}
        <div className="slide-up-4" style={{
          border: "var(--border-heavy)",
          boxShadow: "var(--shadow)",
          background: "white",
        }}>
          <div style={{
            padding: "14px 20px",
            borderBottom: "var(--border-heavy)",
            background: "var(--ink)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--acid)", letterSpacing: "0.08em" }}>
              MOJE EVIDENCE
            </span>
            <Tag color="var(--acid)" bg="var(--ink)">{myRecs.length} ZAPISOV</Tag>
          </div>

          {myRecs.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--mid)", letterSpacing: "0.1em" }}>
              — ŠE NI ZAPISOV —
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--paper)", borderBottom: "2px solid var(--ink)" }}>
                    {["DATUM", "ZAČETEK", "KONEC", "TRAJANJE"].map(h => (
                      <th key={h} style={{
                        textAlign: "left",
                        padding: "10px 16px",
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        letterSpacing: "0.12em",
                        color: "var(--mid)",
                        fontWeight: 700,
                        borderRight: "1px solid #e0e0e0",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {myRecs.map((r, i) => (
                    <tr key={r.id} className="row-hover" style={{
                      borderBottom: "1px solid #e8e8e8",
                      background: i % 2 === 0 ? "white" : "var(--paper)",
                    }}>
                      <td style={{ padding: "10px 16px", fontFamily: "var(--font-mono)", fontSize: 13, borderRight: "1px solid #e0e0e0" }}>
                        {fmtDate(r.start)}
                      </td>
                      <td style={{ padding: "10px 16px", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--rust)", fontWeight: 600, borderRight: "1px solid #e0e0e0" }}>
                        {fmtTime(r.start)}
                      </td>
                      <td style={{ padding: "10px 16px", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--mid)", borderRight: "1px solid #e0e0e0" }}>
                        {fmtTime(r.end)}
                      </td>
                      <td style={{ padding: "10px 16px" }}>
                        <span style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 18,
                          letterSpacing: "0.06em",
                          background: "var(--acid)",
                          padding: "1px 10px",
                          border: "1.5px solid var(--ink)",
                        }}>
                          {durStr(r.start, r.end)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── ADMIN VIEW ─────────────────────────────────────────────────────────────── */
function AdminView({ records, setRecords, onLogout }) {
  const employees = USERS.filter(u => u.role === "employee");
  const [filterUser, setFilterUser] = useState("all");
  const [exportMsg, setExportMsg] = useState("");
  const [activeTab, setActiveTab] = useState("records"); // records | employees

  const filtered = records
    .filter(r => filterUser === "all" || r.userId === Number(filterUser))
    .sort((a, b) => new Date(b.start) - new Date(a.start));

  const totalMs = records.reduce((a, r) => a + durMs(r.start, r.end), 0);
  const todayAll = records.filter(r => r.start.startsWith(todayIso()));

  const handleExport = () => {
    const header = "Ime in priimek;E-naslov;Datum;Začetek;Konec;Trajanje";
    const rows = filtered.map(r => {
      const u = USERS.find(x => x.id === r.userId);
      return [u?.name, u?.email, fmtDate(r.start), fmtTime(r.start), fmtTime(r.end), durStr(r.start, r.end)].join(";");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `evidenca_dela_${todayIso()}.csv`; a.click();
    setExportMsg("✓ CSV IZVOŽEN");
    setTimeout(() => setExportMsg(""), 3000);
  };

  const deleteRecord = (id) => setRecords(prev => prev.filter(r => r.id !== id));

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <div style={{
        background: "var(--ink)",
        padding: "0 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "4px solid var(--blood)",
        height: 56,
      }}>
        <span style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "white", letterSpacing: "0.1em" }}>
          WORKTRACK <span style={{ color: "var(--blood)", marginLeft: 8 }}>ADMIN</span>
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--steel)", letterSpacing: "0.1em" }}>
            NADZORNA PLOŠČA
          </span>
          <button className="btn-hover" onClick={onLogout} style={{
            background: "transparent", border: "1.5px solid var(--steel)", color: "var(--steel)",
            padding: "5px 14px", fontFamily: "var(--font-mono)", fontSize: 10,
            letterSpacing: "0.1em", cursor: "pointer", textTransform: "uppercase",
          }}>ODJAVA</button>
        </div>
      </div>

      <Ticker active={false} />

      <div style={{ flex: 1, maxWidth: 1100, width: "100%", margin: "0 auto", padding: "32px 20px" }}>

        {/* Page title */}
        <div className="slide-up" style={{ marginBottom: 28 }}>
          <div style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(44px, 9vw, 80px)",
            lineHeight: 0.9,
            letterSpacing: "0.02em",
          }}>NADZORNA<br />PLOŠČA</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--mid)", letterSpacing: "0.12em", marginTop: 8, textTransform: "uppercase" }}>
            {new Date().toLocaleDateString("sl-SI", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>

        {/* Stats */}
        <div className="slide-up-2" style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
          <StatBox value={employees.length} label="ZAPOSLENIH" delay="-2" />
          <StatBox value={records.length} label="SKUPAJ ZAPISOV" accent delay="-3" />
          <StatBox value={`${(totalMs / 3600000).toFixed(0)}h`} label="SKUPAJ UR" delay="-4" />
          <StatBox value={todayAll.length} label="DANES AKTIVNIH" delay="-5" />
        </div>

        {/* Tabs */}
        <div className="slide-up-3" style={{ display: "flex", gap: 0, marginBottom: 0, borderBottom: "var(--border-heavy)" }}>
          {[["records", "EVIDENCE"], ["employees", "ZAPOSLENI"]].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                padding: "12px 28px",
                fontFamily: "var(--font-display)",
                fontSize: 18,
                letterSpacing: "0.08em",
                cursor: "pointer",
                border: "var(--border-heavy)",
                borderBottom: activeTab === key ? "4px solid var(--paper)" : "var(--border-heavy)",
                background: activeTab === key ? "var(--paper)" : "var(--ink)",
                color: activeTab === key ? "var(--ink)" : "var(--steel)",
                marginBottom: activeTab === key ? -4 : 0,
                transition: "all 0.1s",
              }}
            >{label}</button>
          ))}
        </div>

        {/* RECORDS TAB */}
        {activeTab === "records" && (
          <div className="slide-up" style={{ border: "var(--border-heavy)", borderTop: "none", boxShadow: "var(--shadow)", background: "white" }}>
            {/* Toolbar */}
            <div style={{
              padding: "14px 20px",
              background: "var(--paper)",
              borderBottom: "var(--border)",
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
            }}>
              <select
                value={filterUser}
                onChange={e => setFilterUser(e.target.value)}
                style={{
                  border: "var(--border)",
                  background: "white",
                  padding: "8px 14px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  letterSpacing: "0.08em",
                  cursor: "pointer",
                  outline: "none",
                  textTransform: "uppercase",
                }}
              >
                <option value="all">VSI ZAPOSLENI</option>
                {employees.map(u => <option key={u.id} value={u.id}>{u.name.toUpperCase()}</option>)}
              </select>

              <button
                className="btn-hover"
                onClick={handleExport}
                style={{
                  background: "var(--ink)",
                  color: "var(--acid)",
                  border: "var(--border-heavy)",
                  boxShadow: "var(--shadow)",
                  padding: "8px 20px",
                  fontFamily: "var(--font-display)",
                  fontSize: 16,
                  letterSpacing: "0.1em",
                  cursor: "pointer",
                  transition: "all 0.1s",
                }}
              >⬇ IZVOZI CSV</button>

              {exportMsg && (
                <span style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "white",
                  background: "green",
                  padding: "6px 14px",
                  letterSpacing: "0.1em",
                  animation: "stamp-in 0.4s ease both",
                }}>{exportMsg}</span>
              )}

              <span style={{
                marginLeft: "auto",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--mid)",
                letterSpacing: "0.1em",
              }}>
                {filtered.length} ZAPISOV
              </span>
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--ink)", borderBottom: "var(--border-heavy)" }}>
                    {["ZAPOSLENI", "DATUM", "ZAČETEK", "KONEC", "TRAJANJE", ""].map((h, i) => (
                      <th key={i} style={{
                        textAlign: "left",
                        padding: "10px 16px",
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        letterSpacing: "0.12em",
                        color: "var(--steel)",
                        fontWeight: 700,
                        borderRight: "1px solid #2a2a2a",
                        whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => {
                    const u = USERS.find(x => x.id === r.userId);
                    return (
                      <tr key={r.id} className="row-hover" style={{
                        borderBottom: "1px solid #e0e0e0",
                        background: i % 2 === 0 ? "white" : "var(--paper)",
                        animation: `slide-up 0.3s ${Math.min(i * 0.03, 0.3)}s both`,
                      }}>
                        <td style={{ padding: "10px 16px", fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600, borderRight: "1px solid #e0e0e0", whiteSpace: "nowrap" }}>
                          {u?.name}
                        </td>
                        <td style={{ padding: "10px 16px", fontFamily: "var(--font-mono)", fontSize: 12, borderRight: "1px solid #e0e0e0", whiteSpace: "nowrap" }}>
                          {fmtDate(r.start)}
                        </td>
                        <td style={{ padding: "10px 16px", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--rust)", fontWeight: 700, borderRight: "1px solid #e0e0e0" }}>
                          {fmtTime(r.start)}
                        </td>
                        <td style={{ padding: "10px 16px", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--mid)", borderRight: "1px solid #e0e0e0" }}>
                          {fmtTime(r.end)}
                        </td>
                        <td style={{ padding: "10px 16px", borderRight: "1px solid #e0e0e0" }}>
                          <span style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 16,
                            letterSpacing: "0.06em",
                            background: "var(--acid)",
                            padding: "1px 8px",
                            border: "1.5px solid var(--ink)",
                          }}>
                            {durStr(r.start, r.end)}
                          </span>
                        </td>
                        <td style={{ padding: "6px 12px" }}>
                          <button
                            onClick={() => deleteRecord(r.id)}
                            style={{
                              background: "none",
                              border: "1.5px solid #ddd",
                              color: "#ccc",
                              cursor: "pointer",
                              fontFamily: "var(--font-mono)",
                              fontSize: 11,
                              padding: "3px 10px",
                              letterSpacing: "0.06em",
                              transition: "all 0.15s",
                            }}
                            onMouseEnter={e => { e.target.style.borderColor = "var(--blood)"; e.target.style.color = "var(--blood)"; }}
                            onMouseLeave={e => { e.target.style.borderColor = "#ddd"; e.target.style.color = "#ccc"; }}
                          >✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div style={{ padding: 40, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--mid)", letterSpacing: "0.1em" }}>
                  — NI ZAPISOV ZA IZBRANI FILTER —
                </div>
              )}
            </div>
          </div>
        )}

        {/* EMPLOYEES TAB */}
        {activeTab === "employees" && (
          <div className="slide-up" style={{ border: "var(--border-heavy)", borderTop: "none", boxShadow: "var(--shadow)", background: "white" }}>
            {employees.map((u, i) => {
              const recs = records.filter(r => r.userId === u.id).sort((a, b) => new Date(b.start) - new Date(a.start));
              const ms = recs.reduce((a, r) => a + durMs(r.start, r.end), 0);
              const avgH = recs.length ? (ms / recs.length / 3600000).toFixed(1) : "—";
              const lastRec = recs[0];

              return (
                <div key={u.id} style={{
                  borderBottom: i < employees.length - 1 ? "var(--border)" : "none",
                  padding: "20px 24px",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 20,
                  alignItems: "start",
                  animation: `slide-up 0.3s ${i * 0.08}s both`,
                }}>
                  <div>
                    <div style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 28,
                      letterSpacing: "0.04em",
                      marginBottom: 4,
                    }}>{u.name.toUpperCase()}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--mid)", letterSpacing: "0.1em" }}>
                      {u.email}
                    </div>
                    {lastRec && (
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--mid)", letterSpacing: "0.08em", marginTop: 6 }}>
                        ZADNJI VNOS: {fmtDate(lastRec.start)} — {fmtTime(lastRec.start)} → {fmtTime(lastRec.end)}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <div style={{ textAlign: "center", border: "var(--border)", padding: "10px 18px", background: "var(--paper)" }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: "0.04em" }}>
                        {(ms / 3600000).toFixed(1)}h
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.12em", color: "var(--mid)", textTransform: "uppercase" }}>
                        SKUPAJ
                      </div>
                    </div>
                    <div style={{ textAlign: "center", border: "var(--border)", padding: "10px 18px", background: "var(--acid)" }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: "0.04em" }}>
                        {recs.length}
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.12em", color: "var(--mid)", textTransform: "uppercase" }}>
                        ZAPISOV
                      </div>
                    </div>
                    <div style={{ textAlign: "center", border: "var(--border)", padding: "10px 18px", background: "var(--paper)" }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 32, letterSpacing: "0.04em" }}>
                        {avgH}h
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.12em", color: "var(--mid)", textTransform: "uppercase" }}>
                        POVPREČJE
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: "var(--border-heavy)",
        background: "var(--ink)",
        padding: "12px 24px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--steel)", letterSpacing: "0.1em" }}>
          WORKTRACK © 2025 — EVIDENCA DELOVNEGA ČASA
        </span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--mid)", letterSpacing: "0.1em" }}>
          ZAKON O EVIDENCAH NA PODROČJU DELA
        </span>
      </div>
    </div>
  );
}

/* ─── ROOT APP ───────────────────────────────────────────────────────────────── */
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [records, setRecords] = useState(SEED);
  const [activeSession, setActiveSession] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  // Inject global CSS
  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);

  // Timer tick
  useEffect(() => {
    if (!activeSession) return;
    const id = setInterval(() => setElapsed(Date.now() - new Date(activeSession.startIso).getTime()), 1000);
    return () => clearInterval(id);
  }, [activeSession]);

  const handleLogin = (u) => setCurrentUser(u);
  const handleLogout = () => {
    setCurrentUser(null);
    setActiveSession(null);
    setElapsed(0);
  };

  const handleStart = () => {
    setActiveSession({ startIso: new Date().toISOString() });
    setElapsed(0);
  };

  const handleStop = () => {
    if (!activeSession) return;
    const endIso = new Date().toISOString();
    setRecords(prev => [...prev, {
      id: Date.now(),
      userId: currentUser.id,
      start: activeSession.startIso,
      end: endIso,
    }]);
    setActiveSession(null);
    setElapsed(0);
  };

  if (!currentUser) return <LoginView onLogin={handleLogin} />;

  if (currentUser.role === "admin") return (
    <AdminView records={records} setRecords={setRecords} onLogout={handleLogout} />
  );

  return (
    <EmployeeView
      user={currentUser}
      records={records}
      onStart={handleStart}
      onStop={handleStop}
      onLogout={handleLogout}
      activeSession={activeSession}
      elapsed={elapsed}
    />
  );
}
