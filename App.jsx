import { useState, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:3001/api";

/* ─── GLOBAL STYLES ─────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;600;700&family=Outfit:wght@300;400;600;700;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --ink: #0a0a0a; --paper: #f5f0e8; --acid: #e8ff00; --blood: #ff2d2d;
    --steel: #c8c8c8; --rust: #d4450c; --mid: #3a3a3a;
    --border: 2px solid #0a0a0a; --border-heavy: 4px solid #0a0a0a;
    --shadow: 4px 4px 0px #0a0a0a; --shadow-big: 8px 8px 0px #0a0a0a;
    --font-display: 'Bebas Neue', sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
    --font-body: 'Outfit', sans-serif;
  }
  body { background: var(--paper); color: var(--ink); font-family: var(--font-body); overflow-x: hidden; }
  ::selection { background: var(--acid); color: var(--ink); }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.2} }
  @keyframes slide-up { from{transform:translateY(30px);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes ticker { from{transform:translateX(0)} to{transform:translateX(-50%)} }
  @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
  @keyframes hatch-march {
    from{background-position:0 0} to{background-position:20px 20px}
  }
  .su1{animation:slide-up 0.4s .00s cubic-bezier(.22,.68,0,1.2) both}
  .su2{animation:slide-up 0.4s .08s cubic-bezier(.22,.68,0,1.2) both}
  .su3{animation:slide-up 0.4s .16s cubic-bezier(.22,.68,0,1.2) both}
  .su4{animation:slide-up 0.4s .24s cubic-bezier(.22,.68,0,1.2) both}
  .su5{animation:slide-up 0.4s .32s cubic-bezier(.22,.68,0,1.2) both}
  .hatch-march {
    background-image: repeating-linear-gradient(45deg,transparent,transparent 6px,rgba(232,255,0,0.3) 6px,rgba(232,255,0,0.3) 8px);
    background-size:20px 20px; animation:hatch-march 1s linear infinite;
  }
  input:focus{outline:3px solid var(--acid)!important;outline-offset:0}
  .bhover:hover{transform:translate(-2px,-2px);box-shadow:6px 6px 0 var(--ink)!important;transition:all 0.1s}
  .bhover:active{transform:translate(2px,2px);box-shadow:2px 2px 0 var(--ink)!important}
  .rowhover:hover{background:rgba(232,255,0,0.15)!important}
  .ticker-wrap{overflow:hidden;white-space:nowrap;border-top:var(--border);border-bottom:var(--border);background:var(--ink);color:var(--acid);padding:6px 0;font-family:var(--font-mono);font-size:11px;letter-spacing:.12em;font-weight:600}
  .ticker-inner{display:inline-block;animation:ticker 18s linear infinite}
`;

/* ─── HELPERS ──────────────────────────────────────────────────────────────── */
const fmt = (ms) => {
  const h = Math.floor(ms/3600000), m = Math.floor((ms%3600000)/60000), s = Math.floor((ms%60000)/1000);
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
};
const fmtDate = (iso) => new Date(iso).toLocaleDateString("sl-SI",{day:"2-digit",month:"2-digit",year:"numeric"});
const fmtTime = (iso) => new Date(iso).toLocaleTimeString("sl-SI",{hour:"2-digit",minute:"2-digit"});
const durStr = (s,e) => {
  const ms = new Date(e)-new Date(s);
  return `${Math.floor(ms/3600000)}U ${String(Math.floor((ms%3600000)/60000)).padStart(2,"0")}M`;
};
const durMs = (s,e) => new Date(e)-new Date(s);

const api = (token) => axios.create({
  baseURL: API,
  headers: token ? { Authorization: `Bearer ${token}` } : {}
});

/* ─── TICKER ─────────────────────────────────────────────────────────────────── */
function Ticker({ active, name }) {
  const msg = active
    ? `⚡ ${name?.toUpperCase()} JE V DELU  //  EVIDENCA AKTIVNA  //  DELOVNI ČAS SE BELEŽI  //  `
    : `◼ WORKTRACK — EVIDENCA DELOVNEGA ČASA  //  PREPROSTO. ZANESLJIVO. HITRO.  //  `;
  return <div className="ticker-wrap"><div className="ticker-inner">{(msg+msg+msg).repeat(2)}</div></div>;
}

/* ─── STAT BOX ───────────────────────────────────────────────────────────────── */
function StatBox({ value, label, accent, cls="" }) {
  return (
    <div className={cls} style={{border:"var(--border-heavy)",boxShadow:"var(--shadow)",background:accent?"var(--acid)":"white",padding:"20px 24px",flex:1,minWidth:120}}>
      <div style={{fontFamily:"var(--font-display)",fontSize:48,lineHeight:1,letterSpacing:"0.02em"}}>{value}</div>
      <div style={{fontFamily:"var(--font-mono)",fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",color:"var(--mid)",marginTop:6}}>{label}</div>
    </div>
  );
}

/* ─── LOGIN ──────────────────────────────────────────────────────────────────── */
function LoginView({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(false);

  const attempt = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/login`, { email, password: pass });
      onLogin(res.data.user, res.data.token);
    } catch (e) {
      setErr(e.response?.data?.error || "Napaka pri prijavi");
      setShaking(true); setTimeout(()=>setShaking(false),500);
    }
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:"var(--paper)",display:"flex",flexDirection:"column"}}>
      <div style={{background:"var(--ink)",padding:"14px 32px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontFamily:"var(--font-display)",fontSize:28,color:"var(--acid)",letterSpacing:"0.1em"}}>WORKTRACK</span>
        <span style={{fontFamily:"var(--font-mono)",fontSize:10,color:"var(--steel)",letterSpacing:"0.12em"}}>EVIDENCA DELOVNEGA ČASA v1.0</span>
      </div>
      <Ticker active={false} />
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:32}}>
        <div style={{width:"100%",maxWidth:460}}>
          <div className="su1" style={{fontFamily:"var(--font-display)",fontSize:"clamp(56px,12vw,96px)",lineHeight:0.9,letterSpacing:"0.02em",marginBottom:8}}>PRIJAVA</div>
          <div className="su2" style={{fontFamily:"var(--font-mono)",fontSize:11,letterSpacing:"0.14em",color:"var(--mid)",marginBottom:36,textTransform:"uppercase"}}>// Vpišite svoje podatke za dostop</div>
          <div className="su3" style={{border:"var(--border-heavy)",boxShadow:"var(--shadow-big)",background:"white",padding:32,animation:shaking?"shake 0.4s ease":undefined}}>
            {err && <div style={{background:"var(--blood)",color:"white",padding:"10px 16px",marginBottom:20,fontFamily:"var(--font-mono)",fontSize:11,letterSpacing:"0.1em",fontWeight:700}}>✕ {err}</div>}
            <label style={{fontFamily:"var(--font-mono)",fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",color:"var(--mid)",display:"block",marginBottom:6}}>E-NASLOV</label>
            <input style={{width:"100%",border:"var(--border-heavy)",background:"var(--paper)",padding:"12px 14px",fontFamily:"var(--font-mono)",fontSize:14,color:"var(--ink)",marginBottom:20,display:"block"}}
              type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&attempt()} placeholder="ime@podjetje.si" />
            <label style={{fontFamily:"var(--font-mono)",fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",color:"var(--mid)",display:"block",marginBottom:6}}>GESLO</label>
            <input style={{width:"100%",border:"var(--border-heavy)",background:"var(--paper)",padding:"12px 14px",fontFamily:"var(--font-mono)",fontSize:14,color:"var(--ink)",marginBottom:28,display:"block"}}
              type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&attempt()} placeholder="••••••••" />
            <button className="bhover" onClick={attempt} disabled={loading}
              style={{width:"100%",background:"var(--ink)",color:"var(--acid)",border:"var(--border-heavy)",boxShadow:"var(--shadow)",padding:"16px",fontFamily:"var(--font-display)",fontSize:22,letterSpacing:"0.14em",cursor:"pointer",transition:"all 0.1s",opacity:loading?0.7:1}}>
              {loading ? "PRIJAVLJAM..." : "VSTOPI →"}
            </button>
          </div>
          <div className="su4" style={{marginTop:20,border:"1.5px solid var(--ink)",padding:"14px 18px",background:"var(--paper)"}}>
            <div style={{fontFamily:"var(--font-mono)",fontSize:10,letterSpacing:"0.12em",fontWeight:700,marginBottom:8,textTransform:"uppercase"}}>// TESTNI RAČUNI</div>
            <div style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--mid)",lineHeight:1.8}}>
              <span style={{color:"var(--rust)",fontWeight:700}}>ZAPOSLENI:</span> ana.novak@podjetje.si / test123<br/>
              <span style={{color:"var(--rust)",fontWeight:700}}>ADMIN:</span> admin@podjetje.si / admin123
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── EMPLOYEE VIEW ──────────────────────────────────────────────────────────── */
function EmployeeView({ user, token, onLogout }) {
  const [records, setRecords] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const a = api(token);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!activeSession) return;
    const id = setInterval(()=>setElapsed(Date.now()-new Date(activeSession.start_time).getTime()),1000);
    return ()=>clearInterval(id);
  }, [activeSession]);

  const loadData = async () => {
    try {
      const [recs, active] = await Promise.all([a.get('/records'), a.get('/records/active')]);
      setRecords(recs.data);
      if (active.data) { setActiveSession(active.data); setElapsed(Date.now()-new Date(active.data.start_time).getTime()); }
      else setActiveSession(null);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const handleStart = async () => {
    try { const res = await a.post('/records/start'); setActiveSession(res.data); setElapsed(0); }
    catch(e) { alert(e.response?.data?.error || "Napaka"); }
  };

  const handleStop = async () => {
    try { await a.post('/records/stop'); setActiveSession(null); setElapsed(0); loadData(); }
    catch(e) { alert(e.response?.data?.error || "Napaka"); }
  };

  const totalMs = records.reduce((a,r)=>r.end_time?a+durMs(r.start_time,r.end_time):a,0);
  const todayRecs = records.filter(r=>fmtDate(r.start_time)===fmtDate(new Date().toISOString()));

  return (
    <div style={{minHeight:"100vh",background:"var(--paper)",display:"flex",flexDirection:"column"}}>
      <div style={{background:"var(--ink)",padding:"0 24px",display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",borderBottom:"4px solid var(--acid)",height:56}}>
        <span style={{fontFamily:"var(--font-display)",fontSize:22,color:"var(--acid)",letterSpacing:"0.1em"}}>WORKTRACK</span>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {activeSession && <span style={{fontFamily:"var(--font-mono)",fontSize:10,letterSpacing:"0.1em",background:"var(--acid)",color:"var(--ink)",padding:"3px 10px",fontWeight:700,animation:"pulse 2s ease infinite"}}>● V DELU</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:16,justifyContent:"flex-end"}}>
          <span style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--steel)",letterSpacing:"0.08em"}}>{user.name.toUpperCase()}</span>
          <button className="bhover" onClick={onLogout} style={{background:"transparent",border:"1.5px solid var(--steel)",color:"var(--steel)",padding:"5px 14px",fontFamily:"var(--font-mono)",fontSize:10,letterSpacing:"0.1em",cursor:"pointer",textTransform:"uppercase"}}>ODJAVA</button>
        </div>
      </div>
      <Ticker active={!!activeSession} name={user.name.split(" ")[0]} />
      <div style={{flex:1,maxWidth:900,width:"100%",margin:"0 auto",padding:"32px 20px"}}>
        <div className="su1" style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:28}}>
          <div>
            <div style={{fontFamily:"var(--font-display)",fontSize:"clamp(40px,8vw,72px)",lineHeight:0.9,letterSpacing:"0.02em"}}>{user.name.split(" ")[0].toUpperCase()}</div>
            <div style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--mid)",letterSpacing:"0.12em",marginTop:6,textTransform:"uppercase"}}>{new Date().toLocaleDateString("sl-SI",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
          </div>
        </div>

        <div className="su2" style={{display:"flex",gap:12,marginBottom:24,flexWrap:"wrap"}}>
          <StatBox value={`${(totalMs/3600000).toFixed(1)}h`} label="SKUPAJ UR" accent cls="su2" />
          <StatBox value={records.length} label="SKUPAJ ZAPISOV" cls="su3" />
          <StatBox value={todayRecs.length} label="DANES" cls="su4" />
        </div>

        <div className="su3" style={{border:"var(--border-heavy)",boxShadow:"var(--shadow-big)",background:"white",marginBottom:24,overflow:"hidden"}}>
          <div style={{background:activeSession?"var(--ink)":"var(--paper)",padding:"28px 32px",borderBottom:"var(--border-heavy)",position:"relative",overflow:"hidden"}}>
            {activeSession && <div className="hatch-march" style={{position:"absolute",inset:0,opacity:0.4}} />}
            <div style={{fontFamily:"var(--font-mono)",fontSize:10,letterSpacing:"0.16em",textTransform:"uppercase",color:activeSession?"var(--acid)":"var(--mid)",marginBottom:8,position:"relative"}}>
              {activeSession ? `// ZAČETEK: ${fmtTime(activeSession.start_time)}` : "// ČAKAM NA ZAČETEK"}
            </div>
            <div style={{fontFamily:"var(--font-display)",fontSize:"clamp(52px,12vw,100px)",letterSpacing:"0.04em",lineHeight:1,color:activeSession?"var(--acid)":"#ccc",position:"relative",fontVariantNumeric:"tabular-nums"}}>
              {fmt(elapsed)}
            </div>
          </div>
          <div style={{padding:24}}>
            {!activeSession
              ? <button className="bhover" onClick={handleStart} style={{width:"100%",background:"var(--acid)",border:"var(--border-heavy)",boxShadow:"var(--shadow)",padding:"18px 24px",fontFamily:"var(--font-display)",fontSize:28,letterSpacing:"0.1em",cursor:"pointer",color:"var(--ink)",transition:"all 0.1s"}}>▶ ZAČNI DELO</button>
              : <button className="bhover" onClick={handleStop} style={{width:"100%",background:"var(--blood)",border:"var(--border-heavy)",boxShadow:"var(--shadow)",padding:"18px 24px",fontFamily:"var(--font-display)",fontSize:28,letterSpacing:"0.1em",cursor:"pointer",color:"white",transition:"all 0.1s"}}>■ ZAKLJUČI DELO</button>
            }
          </div>
        </div>

        <div className="su4" style={{border:"var(--border-heavy)",boxShadow:"var(--shadow)",background:"white"}}>
          <div style={{padding:"14px 20px",borderBottom:"var(--border-heavy)",background:"var(--ink)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontFamily:"var(--font-display)",fontSize:20,color:"var(--acid)",letterSpacing:"0.08em"}}>MOJE EVIDENCE</span>
            <span style={{fontFamily:"var(--font-mono)",fontSize:10,color:"var(--acid)",border:"1.5px solid var(--acid)",padding:"2px 8px"}}>{records.length} ZAPISOV</span>
          </div>
          {loading ? <div style={{padding:40,textAlign:"center",fontFamily:"var(--font-mono)",fontSize:12,color:"var(--mid)",letterSpacing:"0.1em"}}>NALAGAM...</div>
          : records.length === 0 ? <div style={{padding:40,textAlign:"center",fontFamily:"var(--font-mono)",fontSize:12,color:"var(--mid)",letterSpacing:"0.1em"}}>— ŠE NI ZAPISOV —</div>
          : <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:"var(--paper)",borderBottom:"2px solid var(--ink)"}}>
                  {["DATUM","ZAČETEK","KONEC","TRAJANJE"].map(h=>(
                    <th key={h} style={{textAlign:"left",padding:"10px 16px",fontFamily:"var(--font-mono)",fontSize:10,letterSpacing:"0.12em",color:"var(--mid)",fontWeight:700,borderRight:"1px solid #e0e0e0"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r,i)=>(
                  <tr key={r.id} className="rowhover" style={{borderBottom:"1px solid #e8e8e8",background:i%2===0?"white":"var(--paper)"}}>
                    <td style={{padding:"10px 16px",fontFamily:"var(--font-mono)",fontSize:13,borderRight:"1px solid #e0e0e0"}}>{fmtDate(r.start_time)}</td>
                    <td style={{padding:"10px 16px",fontFamily:"var(--font-mono)",fontSize:13,color:"var(--rust)",fontWeight:600,borderRight:"1px solid #e0e0e0"}}>{fmtTime(r.start_time)}</td>
                    <td style={{padding:"10px 16px",fontFamily:"var(--font-mono)",fontSize:13,color:"var(--mid)",borderRight:"1px solid #e0e0e0"}}>{r.end_time ? fmtTime(r.end_time) : <span style={{color:"var(--acid)",background:"var(--ink)",padding:"1px 6px",fontSize:10}}>V DELU</span>}</td>
                    <td style={{padding:"10px 16px"}}>
                      {r.end_time ? <span style={{fontFamily:"var(--font-display)",fontSize:18,letterSpacing:"0.06em",background:"var(--acid)",padding:"1px 10px",border:"1.5px solid var(--ink)"}}>{durStr(r.start_time,r.end_time)}</span> : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
        </div>
      </div>
    </div>
  );
}

/* ─── ADMIN VIEW ─────────────────────────────────────────────────────────────── */
function AdminView({ user, token, onLogout }) {
  const [records, setRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [filterUser, setFilterUser] = useState("all");
  const [activeTab, setActiveTab] = useState("records");
  const [exportMsg, setExportMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({name:"",email:"",password:"",role:"employee"});
  const [addMsg, setAddMsg] = useState("");
  const a = api(token);

  useEffect(()=>{ loadData(); },[]);

  const loadData = async () => {
    try {
      const [recs, usrs] = await Promise.all([a.get('/records'), a.get('/users')]);
      setRecords(recs.data);
      setUsers(usrs.data.filter(u=>u.role==="employee"));
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const deleteRecord = async (id) => {
    try { await a.delete(`/records/${id}`); setRecords(prev=>prev.filter(r=>r.id!==id)); }
    catch(e) { alert(e.response?.data?.error||"Napaka"); }
  };

  const addUser = async () => {
    try {
      await a.post('/users', newUser);
      setAddMsg("✓ ZAPOSLENI DODAN"); setNewUser({name:"",email:"",password:"",role:"employee"});
      loadData(); setTimeout(()=>setAddMsg(""),3000);
    } catch(e) { setAddMsg("✕ "+( e.response?.data?.error||"Napaka")); }
  };

  const handleExport = () => {
    const header = "Ime in priimek;E-naslov;Datum;Začetek;Konec;Trajanje";
    const rows = filtered.map(r=>[r.name,r.email,fmtDate(r.start_time),fmtTime(r.start_time),r.end_time?fmtTime(r.end_time):"V DELU",r.end_time?durStr(r.start_time,r.end_time):"—"].join(";"));
    const csv = [header,...rows].join("\n");
    const blob = new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a2 = document.createElement("a"); a2.href=url; a2.download=`evidenca_dela_${new Date().toISOString().split("T")[0]}.csv`; a2.click();
    setExportMsg("✓ CSV IZVOŽEN"); setTimeout(()=>setExportMsg(""),3000);
  };

  const filtered = records.filter(r=>filterUser==="all"||r.user_id===Number(filterUser));
  const totalMs = records.reduce((a,r)=>r.end_time?a+durMs(r.start_time,r.end_time):a,0);
  const employees = users;

  return (
    <div style={{minHeight:"100vh",background:"var(--paper)",display:"flex",flexDirection:"column"}}>
      <div style={{background:"var(--ink)",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"4px solid var(--blood)",height:56}}>
        <span style={{fontFamily:"var(--font-display)",fontSize:22,color:"white",letterSpacing:"0.1em"}}>WORKTRACK <span style={{color:"var(--blood)",marginLeft:8}}>ADMIN</span></span>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <span style={{fontFamily:"var(--font-mono)",fontSize:10,color:"var(--steel)",letterSpacing:"0.1em"}}>NADZORNA PLOŠČA</span>
          <button className="bhover" onClick={onLogout} style={{background:"transparent",border:"1.5px solid var(--steel)",color:"var(--steel)",padding:"5px 14px",fontFamily:"var(--font-mono)",fontSize:10,letterSpacing:"0.1em",cursor:"pointer",textTransform:"uppercase"}}>ODJAVA</button>
        </div>
      </div>
      <Ticker active={false} />
      <div style={{flex:1,maxWidth:1100,width:"100%",margin:"0 auto",padding:"32px 20px"}}>
        <div className="su1" style={{marginBottom:28}}>
          <div style={{fontFamily:"var(--font-display)",fontSize:"clamp(44px,9vw,80px)",lineHeight:0.9,letterSpacing:"0.02em"}}>NADZORNA<br/>PLOŠČA</div>
          <div style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--mid)",letterSpacing:"0.12em",marginTop:8,textTransform:"uppercase"}}>{new Date().toLocaleDateString("sl-SI",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
        </div>

        <div className="su2" style={{display:"flex",gap:12,marginBottom:24,flexWrap:"wrap"}}>
          <StatBox value={employees.length} label="ZAPOSLENIH" cls="su2" />
          <StatBox value={records.length} label="SKUPAJ ZAPISOV" accent cls="su3" />
          <StatBox value={`${(totalMs/3600000).toFixed(0)}h`} label="SKUPAJ UR" cls="su4" />
        </div>

        {/* Tabs */}
        <div className="su3" style={{display:"flex",gap:0,marginBottom:0,borderBottom:"var(--border-heavy)"}}>
          {[["records","EVIDENCE"],["employees","ZAPOSLENI"],["add","+ DODAJ"]].map(([key,label])=>(
            <button key={key} onClick={()=>setActiveTab(key)} style={{padding:"12px 28px",fontFamily:"var(--font-display)",fontSize:18,letterSpacing:"0.08em",cursor:"pointer",border:"var(--border-heavy)",borderBottom:activeTab===key?"4px solid var(--paper)":"var(--border-heavy)",background:activeTab===key?"var(--paper)":"var(--ink)",color:activeTab===key?"var(--ink)":"var(--steel)",marginBottom:activeTab===key?-4:0,transition:"all 0.1s"}}>{label}</button>
          ))}
        </div>

        {/* RECORDS */}
        {activeTab==="records" && (
          <div className="su1" style={{border:"var(--border-heavy)",borderTop:"none",boxShadow:"var(--shadow)",background:"white"}}>
            <div style={{padding:"14px 20px",background:"var(--paper)",borderBottom:"var(--border)",display:"flex",flexWrap:"wrap",gap:12,alignItems:"center"}}>
              <select value={filterUser} onChange={e=>setFilterUser(e.target.value)} style={{border:"var(--border)",background:"white",padding:"8px 14px",fontFamily:"var(--font-mono)",fontSize:12,letterSpacing:"0.08em",cursor:"pointer",outline:"none",textTransform:"uppercase"}}>
                <option value="all">VSI ZAPOSLENI</option>
                {employees.map(u=><option key={u.id} value={u.id}>{u.name.toUpperCase()}</option>)}
              </select>
              <button className="bhover" onClick={handleExport} style={{background:"var(--ink)",color:"var(--acid)",border:"var(--border-heavy)",boxShadow:"var(--shadow)",padding:"8px 20px",fontFamily:"var(--font-display)",fontSize:16,letterSpacing:"0.1em",cursor:"pointer",transition:"all 0.1s"}}>⬇ IZVOZI CSV</button>
              {exportMsg && <span style={{fontFamily:"var(--font-mono)",fontSize:11,fontWeight:700,color:"white",background:"green",padding:"6px 14px",letterSpacing:"0.1em"}}>{exportMsg}</span>}
              <span style={{marginLeft:"auto",fontFamily:"var(--font-mono)",fontSize:10,color:"var(--mid)",letterSpacing:"0.1em"}}>{filtered.length} ZAPISOV</span>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr style={{background:"var(--ink)",borderBottom:"var(--border-heavy)"}}>
                    {["ZAPOSLENI","DATUM","ZAČETEK","KONEC","TRAJANJE",""].map((h,i)=>(
                      <th key={i} style={{textAlign:"left",padding:"10px 16px",fontFamily:"var(--font-mono)",fontSize:10,letterSpacing:"0.12em",color:"var(--steel)",fontWeight:700,borderRight:"1px solid #2a2a2a",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan={6} style={{padding:40,textAlign:"center",fontFamily:"var(--font-mono)",fontSize:12,color:"var(--mid)",letterSpacing:"0.1em"}}>NALAGAM...</td></tr>
                  : filtered.map((r,i)=>(
                    <tr key={r.id} className="rowhover" style={{borderBottom:"1px solid #e0e0e0",background:i%2===0?"white":"var(--paper)"}}>
                      <td style={{padding:"10px 16px",fontFamily:"var(--font-body)",fontSize:14,fontWeight:600,borderRight:"1px solid #e0e0e0",whiteSpace:"nowrap"}}>{r.name}</td>
                      <td style={{padding:"10px 16px",fontFamily:"var(--font-mono)",fontSize:12,borderRight:"1px solid #e0e0e0",whiteSpace:"nowrap"}}>{fmtDate(r.start_time)}</td>
                      <td style={{padding:"10px 16px",fontFamily:"var(--font-mono)",fontSize:13,color:"var(--rust)",fontWeight:700,borderRight:"1px solid #e0e0e0"}}>{fmtTime(r.start_time)}</td>
                      <td style={{padding:"10px 16px",fontFamily:"var(--font-mono)",fontSize:13,color:"var(--mid)",borderRight:"1px solid #e0e0e0"}}>{r.end_time?fmtTime(r.end_time):<span style={{color:"var(--acid)",background:"var(--ink)",padding:"1px 6px",fontSize:10}}>V DELU</span>}</td>
                      <td style={{padding:"10px 16px",borderRight:"1px solid #e0e0e0"}}>
                        {r.end_time?<span style={{fontFamily:"var(--font-display)",fontSize:16,letterSpacing:"0.06em",background:"var(--acid)",padding:"1px 8px",border:"1.5px solid var(--ink)"}}>{durStr(r.start_time,r.end_time)}</span>:"—"}
                      </td>
                      <td style={{padding:"6px 12px"}}>
                        <button onClick={()=>deleteRecord(r.id)} style={{background:"none",border:"1.5px solid #ddd",color:"#ccc",cursor:"pointer",fontFamily:"var(--font-mono)",fontSize:11,padding:"3px 10px",letterSpacing:"0.06em",transition:"all 0.15s"}}
                          onMouseEnter={e=>{e.target.style.borderColor="var(--blood)";e.target.style.color="var(--blood)"}}
                          onMouseLeave={e=>{e.target.style.borderColor="#ddd";e.target.style.color="#ccc"}}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && filtered.length===0 && <div style={{padding:40,textAlign:"center",fontFamily:"var(--font-mono)",fontSize:12,color:"var(--mid)",letterSpacing:"0.1em"}}>— NI ZAPISOV —</div>}
            </div>
          </div>
        )}

        {/* EMPLOYEES */}
        {activeTab==="employees" && (
          <div className="su1" style={{border:"var(--border-heavy)",borderTop:"none",boxShadow:"var(--shadow)",background:"white"}}>
            {employees.map((u,i)=>{
              const recs = records.filter(r=>r.user_id===u.id && r.end_time);
              const ms = recs.reduce((a,r)=>a+durMs(r.start_time,r.end_time),0);
              return (
                <div key={u.id} style={{borderBottom:i<employees.length-1?"var(--border)":"none",padding:"20px 24px",display:"grid",gridTemplateColumns:"1fr auto",gap:20,alignItems:"start"}}>
                  <div>
                    <div style={{fontFamily:"var(--font-display)",fontSize:28,letterSpacing:"0.04em",marginBottom:4}}>{u.name.toUpperCase()}</div>
                    <div style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--mid)",letterSpacing:"0.1em"}}>{u.email}</div>
                  </div>
                  <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"flex-end"}}>
                    <div style={{textAlign:"center",border:"var(--border)",padding:"10px 18px",background:"var(--acid)"}}>
                      <div style={{fontFamily:"var(--font-display)",fontSize:32,letterSpacing:"0.04em"}}>{recs.length}</div>
                      <div style={{fontFamily:"var(--font-mono)",fontSize:9,letterSpacing:"0.12em",color:"var(--mid)",textTransform:"uppercase"}}>ZAPISOV</div>
                    </div>
                    <div style={{textAlign:"center",border:"var(--border)",padding:"10px 18px",background:"var(--paper)"}}>
                      <div style={{fontFamily:"var(--font-display)",fontSize:32,letterSpacing:"0.04em"}}>{(ms/3600000).toFixed(1)}h</div>
                      <div style={{fontFamily:"var(--font-mono)",fontSize:9,letterSpacing:"0.12em",color:"var(--mid)",textTransform:"uppercase"}}>SKUPAJ</div>
                    </div>
                  </div>
                </div>
              );
            })}
            {employees.length===0 && <div style={{padding:40,textAlign:"center",fontFamily:"var(--font-mono)",fontSize:12,color:"var(--mid)",letterSpacing:"0.1em"}}>— NI ZAPOSLENIH —</div>}
          </div>
        )}

        {/* ADD USER */}
        {activeTab==="add" && (
          <div className="su1" style={{border:"var(--border-heavy)",borderTop:"none",boxShadow:"var(--shadow)",background:"white",padding:32}}>
            <div style={{fontFamily:"var(--font-display)",fontSize:28,letterSpacing:"0.06em",marginBottom:24}}>DODAJ ZAPOSLENEGA</div>
            {[["IME IN PRIIMEK","text","name"],["E-NASLOV","email","email"],["GESLO","password","password"]].map(([lbl,type,key])=>(
              <div key={key} style={{marginBottom:16}}>
                <label style={{fontFamily:"var(--font-mono)",fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",color:"var(--mid)",display:"block",marginBottom:6}}>{lbl}</label>
                <input style={{width:"100%",maxWidth:400,border:"var(--border-heavy)",background:"var(--paper)",padding:"12px 14px",fontFamily:"var(--font-mono)",fontSize:14,color:"var(--ink)",display:"block"}}
                  type={type} value={newUser[key]} onChange={e=>setNewUser(p=>({...p,[key]:e.target.value}))} />
              </div>
            ))}
            <div style={{marginBottom:24}}>
              <label style={{fontFamily:"var(--font-mono)",fontSize:10,letterSpacing:"0.14em",textTransform:"uppercase",color:"var(--mid)",display:"block",marginBottom:6}}>VLOGA</label>
              <select value={newUser.role} onChange={e=>setNewUser(p=>({...p,role:e.target.value}))} style={{border:"var(--border-heavy)",background:"var(--paper)",padding:"12px 14px",fontFamily:"var(--font-mono)",fontSize:13,outline:"none",cursor:"pointer"}}>
                <option value="employee">ZAPOSLENI</option>
                <option value="admin">ADMIN</option>
              </select>
            </div>
            <button className="bhover" onClick={addUser} style={{background:"var(--ink)",color:"var(--acid)",border:"var(--border-heavy)",boxShadow:"var(--shadow)",padding:"14px 32px",fontFamily:"var(--font-display)",fontSize:20,letterSpacing:"0.1em",cursor:"pointer",transition:"all 0.1s"}}>DODAJ →</button>
            {addMsg && <span style={{marginLeft:16,fontFamily:"var(--font-mono)",fontSize:12,fontWeight:700,color:addMsg.startsWith("✓")?"green":"var(--blood)"}}>{addMsg}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── ROOT ───────────────────────────────────────────────────────────────────── */
export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const el = document.createElement("style");
    el.textContent = GLOBAL_CSS;
    document.head.appendChild(el);
    return () => el.remove();
  }, []);

  const handleLogin = (user, tok) => { setCurrentUser(user); setToken(tok); };
  const handleLogout = () => { setCurrentUser(null); setToken(null); };

  if (!currentUser) return <LoginView onLogin={handleLogin} />;
  if (currentUser.role === "admin") return <AdminView user={currentUser} token={token} onLogout={handleLogout} />;
  return <EmployeeView user={currentUser} token={token} onLogout={handleLogout} />;
}
