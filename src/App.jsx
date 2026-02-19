import { useState, useEffect } from "react";

const STORAGE_KEYS = {
  users: "aoe2_users",
  currentUser: "aoe2_current_user",
  matches: "aoe2_matches",
  bets: "aoe2_bets",
};

const INITIAL_COINS = 1000;

// ── Storage helpers ──────────────────────────────────────────────────────────
async function sget(key) {
  try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; }
  catch { return null; }
}
async function sset(key, val) {
  try { await window.storage.set(key, JSON.stringify(val)); } catch {}
}

// ── Odds calculation ─────────────────────────────────────────────────────────
function calcOdds(teamA, teamB) {
  const expA = teamA.reduce((s, u) => s + (u.experience || 0), 0) / teamA.length || 1;
  const expB = teamB.reduce((s, u) => s + (u.experience || 0), 0) / teamB.length || 1;
  const total = expA + expB;
  const probA = expA / total;
  const probB = expB / total;
  return {
    oddsA: Math.max(1.05, +(1 / probA).toFixed(2)),
    oddsB: Math.max(1.05, +(1 / probB).toFixed(2)),
  };
}

// ── Admin username (promijeni u svoje) ───────────────────────────────────────
const ADMIN_USERNAME = "admin";

// ── Icons (SVG inline) ───────────────────────────────────────────────────────
const SwordIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6.92 5H5L3 7l1.41 1.42L6 6.83l4.06 4.06-1.26 1.26.36.36L14.27 17l.36.36 1.27-1.27L20 21l2-2-4.93-4.93.35-.35.36.36 4.83-4.83-.36-.36 1.27-1.27-5.17-5.17L17.08 3H15L11.5 6.5z"/>
  </svg>
);
const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
  </svg>
);
const CoinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="10"/><text x="12" y="16" textAnchor="middle" fontSize="10" fill="#1a1108">G</text>
  </svg>
);

// ── Styles ───────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=MedievalSharp&family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
  
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  
  :root {
    --bg: #0d0a05;
    --bg2: #141008;
    --bg3: #1c1610;
    --panel: #1f1a0f;
    --border: #3d2f18;
    --gold: #c9a227;
    --gold2: #e8c84a;
    --red: #8b1a1a;
    --red2: #c0392b;
    --green: #1a5c1a;
    --green2: #27ae60;
    --text: #e8d5a3;
    --text2: #a89060;
    --accent: #7b3f00;
  }
  
  body { background: var(--bg); color: var(--text); font-family: 'Crimson Text', serif; min-height: 100vh; }
  
  .app { min-height: 100vh; display: flex; flex-direction: column; }
  
  /* Parchment texture overlay */
  .app::before {
    content: '';
    position: fixed; inset: 0;
    background-image: 
      repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(201,162,39,0.015) 2px, rgba(201,162,39,0.015) 4px),
      repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(201,162,39,0.015) 2px, rgba(201,162,39,0.015) 4px);
    pointer-events: none; z-index: 0;
  }
  
  /* NAV */
  nav {
    background: linear-gradient(180deg, #0a0800 0%, var(--bg2) 100%);
    border-bottom: 2px solid var(--gold);
    padding: 0 24px;
    display: flex; align-items: center; justify-content: space-between;
    position: relative; z-index: 10;
    box-shadow: 0 4px 24px rgba(201,162,39,0.2);
  }
  .nav-logo {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 0;
  }
  .nav-logo h1 {
    font-family: 'Cinzel', serif;
    font-size: 1.4rem; font-weight: 700;
    color: var(--gold2);
    text-shadow: 0 0 20px rgba(201,162,39,0.5);
    letter-spacing: 2px;
  }
  .nav-logo span { font-size: 0.75rem; color: var(--text2); letter-spacing: 3px; display: block; }
  .nav-right { display: flex; align-items: center; gap: 12px; }
  .nav-coins {
    display: flex; align-items: center; gap: 6px;
    background: rgba(201,162,39,0.1);
    border: 1px solid var(--border);
    padding: 6px 14px; border-radius: 4px;
    font-family: 'Cinzel', serif; font-weight: 600;
    color: var(--gold2); font-size: 0.9rem;
  }
  .nav-user {
    font-family: 'Cinzel', serif; font-size: 0.85rem;
    color: var(--text2);
  }
  .nav-tabs {
    display: flex; gap: 4px; margin-left: 32px;
  }
  .tab-btn {
    font-family: 'Cinzel', serif; font-size: 0.8rem;
    background: none; border: none;
    color: var(--text2); cursor: pointer;
    padding: 18px 16px;
    border-bottom: 3px solid transparent;
    transition: all 0.2s; letter-spacing: 1px;
  }
  .tab-btn:hover { color: var(--gold); }
  .tab-btn.active { color: var(--gold2); border-bottom-color: var(--gold2); }
  
  /* CONTENT */
  .content { flex: 1; padding: 32px 24px; max-width: 1100px; margin: 0 auto; width: 100%; position: relative; z-index: 1; }
  
  /* CARDS */
  .card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow: hidden;
    position: relative;
  }
  .card::before {
    content: ''; position: absolute;
    top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--gold), transparent);
  }
  .card-header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
  }
  .card-title {
    font-family: 'Cinzel', serif; font-weight: 600;
    color: var(--gold); font-size: 1rem; letter-spacing: 1px;
  }
  .card-body { padding: 20px; }
  
  /* BUTTONS */
  .btn {
    font-family: 'Cinzel', serif; font-size: 0.8rem;
    cursor: pointer; border: none; border-radius: 4px;
    padding: 10px 20px; letter-spacing: 1px;
    transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px;
  }
  .btn-gold {
    background: linear-gradient(135deg, #8b6914 0%, var(--gold) 50%, #8b6914 100%);
    color: #1a1108; font-weight: 700;
    box-shadow: 0 2px 12px rgba(201,162,39,0.3);
  }
  .btn-gold:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(201,162,39,0.4); }
  .btn-outline {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text2);
  }
  .btn-outline:hover { border-color: var(--gold); color: var(--gold); }
  .btn-red { background: var(--red); color: var(--text); }
  .btn-red:hover { background: var(--red2); }
  .btn-green { background: var(--green); color: var(--text); }
  .btn-green:hover { background: var(--green2); }
  .btn-sm { padding: 6px 14px; font-size: 0.75rem; }
  .btn-full { width: 100%; justify-content: center; }
  .btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  
  /* INPUTS */
  .form-group { margin-bottom: 16px; }
  .form-group label {
    display: block; margin-bottom: 6px;
    font-family: 'Cinzel', serif; font-size: 0.75rem;
    color: var(--text2); letter-spacing: 1px;
  }
  .form-control {
    width: 100%; padding: 10px 14px;
    background: var(--bg3); border: 1px solid var(--border);
    color: var(--text); font-family: 'Crimson Text', serif; font-size: 1rem;
    border-radius: 4px; outline: none;
    transition: border-color 0.2s;
  }
  .form-control:focus { border-color: var(--gold); }
  .form-control::placeholder { color: var(--text2); opacity: 0.5; }
  select.form-control option { background: var(--bg3); }
  
  /* MATCH CARD */
  .match-card {
    background: var(--panel);
    border: 1px solid var(--border);
    border-radius: 6px; padding: 0;
    overflow: hidden; position: relative;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  .match-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.5); }
  .match-card::before {
    content: ''; position: absolute;
    top: 0; left: 0; right: 0; height: 1px;
    background: linear-gradient(90deg, transparent, var(--gold), transparent);
  }
  .match-header {
    padding: 12px 16px; display: flex; align-items: center;
    justify-content: space-between;
    background: rgba(0,0,0,0.3);
    border-bottom: 1px solid var(--border);
  }
  .match-type {
    font-family: 'Cinzel', serif; font-size: 0.7rem;
    background: rgba(201,162,39,0.15);
    border: 1px solid rgba(201,162,39,0.3);
    color: var(--gold); padding: 3px 10px; border-radius: 20px;
    letter-spacing: 2px;
  }
  .status-badge {
    font-family: 'Cinzel', serif; font-size: 0.65rem;
    padding: 3px 10px; border-radius: 20px; letter-spacing: 1px;
  }
  .status-open { background: rgba(26,92,26,0.4); border: 1px solid #27ae60; color: #27ae60; }
  .status-finished { background: rgba(139,26,26,0.4); border: 1px solid #c0392b; color: #c0392b; }
  .match-body { padding: 16px; }
  .match-title { font-family: 'Cinzel', serif; font-size: 1rem; color: var(--text); margin-bottom: 16px; }
  .versus-row {
    display: grid; grid-template-columns: 1fr auto 1fr;
    gap: 12px; align-items: center; margin-bottom: 16px;
  }
  .team-side { text-align: center; }
  .team-label { font-size: 0.7rem; color: var(--text2); letter-spacing: 2px; font-family: 'Cinzel', serif; margin-bottom: 6px; }
  .team-players { font-size: 0.95rem; color: var(--text); }
  .team-exp { font-size: 0.75rem; color: var(--text2); margin-top: 4px; }
  .vs-divider {
    font-family: 'Cinzel', serif; font-size: 1.2rem;
    color: var(--gold); text-shadow: 0 0 12px rgba(201,162,39,0.6);
  }
  .odds-row {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 8px; margin-bottom: 14px;
  }
  .odds-box {
    background: rgba(0,0,0,0.3); border: 1px solid var(--border);
    border-radius: 4px; padding: 10px; text-align: center;
    cursor: pointer; transition: all 0.2s;
  }
  .odds-box:hover { border-color: var(--gold); background: rgba(201,162,39,0.08); }
  .odds-box.selected { border-color: var(--gold2); background: rgba(201,162,39,0.15); }
  .odds-box.winner-highlight { border-color: var(--green2); background: rgba(26,92,26,0.3); }
  .odds-label { font-size: 0.65rem; color: var(--text2); font-family: 'Cinzel', serif; letter-spacing: 1px; }
  .odds-value { font-size: 1.3rem; font-family: 'Cinzel', serif; font-weight: 700; color: var(--gold2); }
  .bet-row { display: flex; gap: 8px; align-items: center; }
  .bet-row input { flex: 1; }
  .winner-crown { color: var(--gold2); font-size: 1rem; }
  
  /* GRID */
  .grid-2 { display: grid; grid-template-columns: repeat(auto-fill, minmax(480px, 1fr)); gap: 20px; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  
  /* AUTH */
  .auth-container { max-width: 440px; margin: 60px auto; }
  .auth-logo { text-align: center; margin-bottom: 32px; }
  .auth-logo h2 { font-family: 'Cinzel', serif; font-size: 2rem; color: var(--gold2); text-shadow: 0 0 30px rgba(201,162,39,0.4); letter-spacing: 3px; }
  .auth-logo p { color: var(--text2); font-style: italic; margin-top: 6px; }
  .auth-tabs { display: flex; margin-bottom: 24px; border-bottom: 1px solid var(--border); }
  .auth-tab { flex: 1; padding: 12px; background: none; border: none;
    font-family: 'Cinzel', serif; color: var(--text2); cursor: pointer;
    border-bottom: 2px solid transparent; margin-bottom: -1px; font-size: 0.85rem; }
  .auth-tab.active { color: var(--gold2); border-bottom-color: var(--gold2); }
  
  /* PROFILE */
  .profile-header { display: flex; gap: 20px; align-items: flex-start; margin-bottom: 24px; }
  .avatar {
    width: 80px; height: 80px; border-radius: 50%;
    background: linear-gradient(135deg, var(--accent), var(--border));
    border: 2px solid var(--gold);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Cinzel', serif; font-size: 2rem; color: var(--gold2);
    flex-shrink: 0;
  }
  .profile-info h2 { font-family: 'Cinzel', serif; color: var(--gold2); font-size: 1.4rem; }
  .profile-info p { color: var(--text2); margin-top: 4px; font-size: 0.9rem; }
  .stat-box {
    background: rgba(0,0,0,0.3); border: 1px solid var(--border);
    border-radius: 6px; padding: 16px; text-align: center;
  }
  .stat-val { font-family: 'Cinzel', serif; font-size: 1.8rem; color: var(--gold2); font-weight: 700; }
  .stat-label { font-size: 0.75rem; color: var(--text2); margin-top: 4px; font-family: 'Cinzel', serif; letter-spacing: 1px; }
  
  /* MODAL */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.7);
    display: flex; align-items: center; justify-content: center; z-index: 100;
  }
  .modal { background: var(--panel); border: 1px solid var(--gold); border-radius: 8px; padding: 28px; width: 90%; max-width: 480px; position: relative; }
  .modal h3 { font-family: 'Cinzel', serif; color: var(--gold); margin-bottom: 20px; font-size: 1.1rem; letter-spacing: 2px; }
  .modal-close { position: absolute; top: 16px; right: 16px; background: none; border: none; color: var(--text2); cursor: pointer; font-size: 1.2rem; }

  /* ALERTS */
  .alert { padding: 10px 16px; border-radius: 4px; margin-bottom: 16px; font-size: 0.9rem; }
  .alert-err { background: rgba(139,26,26,0.3); border: 1px solid var(--red2); color: #f5a5a5; }
  .alert-ok { background: rgba(26,92,26,0.3); border: 1px solid var(--green2); color: #a5f5a5; }
  
  /* SECTION TITLE */
  .section-title {
    font-family: 'Cinzel', serif; font-size: 1.3rem; font-weight: 700;
    color: var(--gold2); margin-bottom: 20px;
    display: flex; align-items: center; gap: 12px;
  }
  .section-title::after { content: ''; flex: 1; height: 1px; background: linear-gradient(90deg, var(--border), transparent); }
  
  .mb-16 { margin-bottom: 16px; }
  .mb-24 { margin-bottom: 24px; }
  .text-center { text-align: center; }
  .text-gold { color: var(--gold2); }
  .text-muted { color: var(--text2); font-size: 0.85rem; }
  .flex { display: flex; } .gap-8 { gap: 8px; } .gap-16 { gap: 16px; }
  .justify-between { justify-content: space-between; }
  .align-center { align-items: center; }
  .history-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 0; border-bottom: 1px solid rgba(61,47,24,0.5); font-size: 0.9rem;
  }
  .history-row:last-child { border-bottom: none; }
  .win-text { color: var(--green2); font-weight: 600; }
  .lose-text { color: var(--red2); }
  
  @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
  .match-card { animation: fadeIn 0.3s ease both; }
`;

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [users, setUsers] = useState({});
  const [matches, setMatches] = useState([]);
  const [bets, setBets] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [tab, setTab] = useState("matches");
  const [authTab, setAuthTab] = useState("login");
  const [loading, setLoading] = useState(true);
  const [showNewMatch, setShowNewMatch] = useState(false);

  // Load from storage
  useEffect(() => {
    (async () => {
      const u = await sget(STORAGE_KEYS.users);
      const cu = await sget(STORAGE_KEYS.currentUser);
      const m = await sget(STORAGE_KEYS.matches);
      const b = await sget(STORAGE_KEYS.bets);
      setUsers(u || {});
      setCurrentUser(cu || null);
      setMatches(m || []);
      setBets(b || []);
      setLoading(false);
    })();
  }, []);

  const saveUsers = async (u) => { setUsers(u); await sset(STORAGE_KEYS.users, u); };
  const saveMatches = async (m) => { setMatches(m); await sset(STORAGE_KEYS.matches, m); };
  const saveBets = async (b) => { setBets(b); await sset(STORAGE_KEYS.bets, b); };
  const saveCurrentUser = async (u) => { setCurrentUser(u); await sset(STORAGE_KEYS.currentUser, u); };

  const updateUser = async (updated) => {
    const newUsers = { ...users, [updated.username]: updated };
    await saveUsers(newUsers);
    await saveCurrentUser(updated);
  };

  const placeBet = async (matchId, side, amount) => {
    if (!currentUser || amount <= 0 || currentUser.coins < amount) return false;
    const existing = bets.find(b => b.matchId === matchId && b.username === currentUser.username);
    if (existing) return false;
    const newBet = { id: `b${Date.now()}`, matchId, username: currentUser.username, side, amount };
    await saveBets([...bets, newBet]);
    const updated = { ...currentUser, coins: currentUser.coins - amount };
    await updateUser(updated);
    return true;
  };

  const resolveMatch = async (matchId, winner) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;
    const { oddsA, oddsB } = calcOdds(match.teamA, match.teamB);
    const matchBets = bets.filter(b => b.matchId === matchId);
    const updatedUsers = { ...users };
    for (const bet of matchBets) {
      const won = bet.side === winner;
      if (won) {
        const odds = winner === "A" ? oddsA : oddsB;
        const winnings = Math.floor(bet.amount * odds);
        if (updatedUsers[bet.username]) {
          updatedUsers[bet.username] = { ...updatedUsers[bet.username], coins: updatedUsers[bet.username].coins + winnings };
        }
      }
    }
    await saveUsers(updatedUsers);
    if (currentUser && updatedUsers[currentUser.username]) {
      await saveCurrentUser(updatedUsers[currentUser.username]);
    }
    const updatedMatches = matches.map(m => m.id === matchId ? { ...m, status: "finished", winner } : m);
    await saveMatches(updatedMatches);
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#0d0a05" }}>
      <div style={{ fontFamily: "'Cinzel', serif", color: "#c9a227", fontSize: "1.2rem", letterSpacing: "3px" }}>LOADING REALM...</div>
    </div>
  );

  if (!currentUser) return <AuthScreen authTab={authTab} setAuthTab={setAuthTab} users={users} saveUsers={saveUsers} saveCurrentUser={saveCurrentUser} />;

  return (
    <div className="app">
      <style>{css}</style>
      <nav>
        <div className="nav-logo">
          <div>
            <h1>⚔ AoE2 ARENA</h1>
            <span>VIRTUAL BETTING GROUNDS</span>
          </div>
          <div className="nav-tabs">
            {["matches", "leaderboard", "profile"].map(t => (
              <button key={t} className={`tab-btn ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="nav-right">
          <div className="nav-coins"><CoinIcon />{currentUser.coins.toLocaleString()} Gold</div>
          <div className="nav-user">{currentUser.username}</div>
          <button className="btn btn-outline btn-sm" onClick={() => { setCurrentUser(null); sset(STORAGE_KEYS.currentUser, null); }}>LOGOUT</button>
        </div>
      </nav>
      <div className="content">
        {tab === "matches" && <MatchesTab matches={matches} bets={bets} currentUser={currentUser} placeBet={placeBet} resolveMatch={resolveMatch} showNewMatch={showNewMatch} setShowNewMatch={setShowNewMatch} saveMatches={saveMatches} users={users} isAdmin={currentUser.username === ADMIN_USERNAME} />}
        {tab === "leaderboard" && <LeaderboardTab users={users} />}
        {tab === "profile" && <ProfileTab currentUser={currentUser} bets={bets} matches={matches} updateUser={updateUser} />}
      </div>
    </div>
  );
}

// ── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen({ authTab, setAuthTab, users, saveUsers, saveCurrentUser }) {
  const [form, setForm] = useState({ username: "", password: "", experience: "" });
  const [err, setErr] = useState("");

  const handle = async (e) => {
    e.preventDefault(); setErr("");
    if (authTab === "register") {
      if (!form.username || !form.password) return setErr("Popuni sva polja.");
      if (users[form.username]) return setErr("Korisničko ime već postoji.");
      const newUser = { username: form.username, password: form.password, experience: parseInt(form.experience) || 0, coins: INITIAL_COINS, joined: Date.now() };
      const updated = { ...users, [form.username]: newUser };
      await saveUsers(updated);
      await saveCurrentUser(newUser);
    } else {
      const u = users[form.username];
      if (!u || u.password !== form.password) return setErr("Pogrešni podaci.");
      await saveCurrentUser(u);
    }
  };

  return (
    <div className="app">
      <style>{css}</style>
      <div className="content">
        <div className="auth-container">
          <div className="auth-logo">
            <h2>⚔ AoE2 ARENA</h2>
            <p>Kladi se na pobjednike Doba Carstva</p>
          </div>
          <div className="card">
            <div className="card-body">
              <div className="auth-tabs">
                {["login", "register"].map(t => (
                  <button key={t} className={`auth-tab ${authTab === t ? "active" : ""}`} onClick={() => { setAuthTab(t); setErr(""); }}>
                    {t === "login" ? "PRIJAVA" : "REGISTRACIJA"}
                  </button>
                ))}
              </div>
              {err && <div className="alert alert-err">{err}</div>}
              <form onSubmit={handle}>
                <div className="form-group">
                  <label>KORISNIČKO IME</label>
                  <input className="form-control" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="Vitez..." />
                </div>
                <div className="form-group">
                  <label>LOZINKA</label>
                  <input className="form-control" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
                </div>
                {authTab === "register" && (
                  <div className="form-group">
                    <label>GODINE ISKUSTVA U AoE2</label>
                    <input className="form-control" type="number" min="0" max="30" value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))} placeholder="0" />
                  </div>
                )}
                <button className="btn btn-gold btn-full" type="submit">
                  {authTab === "login" ? "ULAZ NA ARENA" : "REGISTRIRAJ SE"}
                </button>
                {authTab === "register" && <p className="text-muted text-center" style={{ marginTop: 12 }}>Dobivate {INITIAL_COINS.toLocaleString()} Gold za početak!</p>}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Matches Tab ──────────────────────────────────────────────────────────────
function MatchesTab({ matches, bets, currentUser, placeBet, resolveMatch, showNewMatch, setShowNewMatch, saveMatches, users, isAdmin }) {
  const [filter, setFilter] = useState("all");
  const [betInputs, setBetInputs] = useState({});
  const [selectedSide, setSelectedSide] = useState({});
  const [msg, setMsg] = useState({});

  const filtered = matches.filter(m => filter === "all" || m.type === filter || (filter === "open" && m.status === "open") || (filter === "finished" && m.status === "finished"));

  const handleBet = async (matchId) => {
    const side = selectedSide[matchId];
    const amount = parseInt(betInputs[matchId] || 0);
    if (!side) return setMsg(m => ({ ...m, [matchId]: "Odaberi tim!" }));
    if (!amount || amount < 1) return setMsg(m => ({ ...m, [matchId]: "Unesi iznos klađenja." }));
    if (amount > currentUser.coins) return setMsg(m => ({ ...m, [matchId]: "Nedovoljan iznos Golda." }));
    const ok = await placeBet(matchId, side, amount);
    setMsg(m => ({ ...m, [matchId]: ok ? "✓ Bet uspješno postavljen!" : "Već si se kladio na ovaj meč." }));
  };

  const userBet = (matchId) => bets.find(b => b.matchId === matchId && b.username === currentUser.username);

  return (
    <div>
      <div className="flex justify-between align-center mb-24">
        <h2 className="section-title">MEČEVI</h2>
        {isAdmin && <button className="btn btn-gold" onClick={() => setShowNewMatch(true)}>+ NOVI MEČ</button>}
      </div>
      <div className="flex gap-8 mb-16">
        {["all","open","finished","1v1","2v2","1v2"].map(f => (
          <button key={f} className={`btn ${filter === f ? "btn-gold" : "btn-outline"} btn-sm`} onClick={() => setFilter(f)}>{f.toUpperCase()}</button>
        ))}
      </div>
      <div className="grid-2">
        {filtered.sort((a,b) => b.createdAt - a.createdAt).map((match, i) => {
          const { oddsA, oddsB } = calcOdds(match.teamA, match.teamB);
          const myBet = userBet(match.id);
          return (
            <div key={match.id} className="match-card" style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="match-header">
                <span className="match-type">{match.type.toUpperCase()}</span>
                <span className={`status-badge status-${match.status}`}>{match.status === "open" ? "OTVORENO" : "ZAVRŠENO"}</span>
              </div>
              <div className="match-body">
                <div className="match-title">{match.title}</div>
                <div className="versus-row">
                  <div className="team-side">
                    <div className="team-label">TIM A</div>
                    <div className="team-players">{match.teamA.map(p => p.username).join(" & ")}</div>
                    <div className="team-exp">{match.teamA.map(p => `${p.experience || 0}g`).join(" & ")} iskustvo</div>
                  </div>
                  <div className="vs-divider">VS</div>
                  <div className="team-side">
                    <div className="team-label">TIM B</div>
                    <div className="team-players">{match.teamB.map(p => p.username).join(" & ")}</div>
                    <div className="team-exp">{match.teamB.map(p => `${p.experience || 0}g`).join(" & ")} iskustvo</div>
                  </div>
                </div>
                <div className="odds-row">
                  <div className={`odds-box ${selectedSide[match.id] === "A" ? "selected" : ""} ${match.winner === "A" ? "winner-highlight" : ""}`}
                    onClick={() => match.status === "open" && !myBet && setSelectedSide(s => ({ ...s, [match.id]: "A" }))}>
                    <div className="odds-label">TIM A POBJEDI</div>
                    <div className="odds-value">{oddsA}x {match.winner === "A" && <span className="winner-crown">👑</span>}</div>
                  </div>
                  <div className={`odds-box ${selectedSide[match.id] === "B" ? "selected" : ""} ${match.winner === "B" ? "winner-highlight" : ""}`}
                    onClick={() => match.status === "open" && !myBet && setSelectedSide(s => ({ ...s, [match.id]: "B" }))}>
                    <div className="odds-label">TIM B POBJEDI</div>
                    <div className="odds-value">{oddsB}x {match.winner === "B" && <span className="winner-crown">👑</span>}</div>
                  </div>
                </div>

                {match.status === "open" && (
                  myBet ? (
                    <div className="alert alert-ok" style={{ marginBottom: 0 }}>
                      ✓ Kladio si {myBet.amount} G na Tim {myBet.side}
                    </div>
                  ) : (
                    <>
                      <div className="bet-row">
                        <input className="form-control" type="number" min="1" max={currentUser.coins}
                          placeholder="Iznos klađenja (Gold)"
                          value={betInputs[match.id] || ""}
                          onChange={e => setBetInputs(b => ({ ...b, [match.id]: e.target.value }))} />
                        <button className="btn btn-gold btn-sm" onClick={() => handleBet(match.id)}>KLADITI</button>
                      </div>
                      {msg[match.id] && <div className={`alert ${msg[match.id].startsWith("✓") ? "alert-ok" : "alert-err"}`} style={{ marginTop: 8, marginBottom: 0 }}>{msg[match.id]}</div>}
                    </>
                  )
                )}

                {isAdmin && match.status === "open" && (
                  <div className="flex gap-8" style={{ marginTop: 12 }}>
                    <span className="text-muted" style={{ fontSize: "0.75rem", alignSelf: "center" }}>Proglasi pobjednika:</span>
                    <button className="btn btn-green btn-sm" onClick={() => resolveMatch(match.id, "A")}>Tim A Pobijedio</button>
                    <button className="btn btn-green btn-sm" onClick={() => resolveMatch(match.id, "B")}>Tim B Pobijedio</button>
                  </div>
                )}

                {match.status === "finished" && (
                  <div className="text-muted" style={{ marginTop: 8, fontSize: "0.85rem" }}>
                    Pobijedio: <span className="text-gold">Tim {match.winner}</span>
                    {myBet && <span style={{ marginLeft: 8 }}>— tvoj bet: Tim {myBet.side} {myBet.side === match.winner ? <span className="win-text">✓ DOBIO</span> : <span className="lose-text">✗ IZGUBIO</span>}</span>}
                  </div>
                )}

                <div className="text-muted" style={{ marginTop: 8, fontSize: "0.75rem" }}>
                  {bets.filter(b => b.matchId === match.id).length} klađenja • Ukupni fond: {bets.filter(b => b.matchId === match.id).reduce((s, b) => s + b.amount, 0).toLocaleString()} G
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {filtered.length === 0 && <div className="text-center text-muted" style={{ padding: "48px 0" }}>Nema mečeva za ovaj filter.</div>}
      {showNewMatch && <NewMatchModal onClose={() => setShowNewMatch(false)} currentUser={currentUser} saveMatches={saveMatches} matches={matches} users={users} />}
    </div>
  );
}

// ── New Match Modal ──────────────────────────────────────────────────────────
function NewMatchModal({ onClose, currentUser, saveMatches, matches, users }) {
  const [form, setForm] = useState({ title: "", type: "1v1", teamAPlayers: "", teamBPlayers: "" });
  const [err, setErr] = useState("");

  const sizeA = parseInt(form.type.split("v")[0]);
  const sizeB = parseInt(form.type.split("v")[1]);

  const parsePlayers = (str, fallbackUser) => {
    const names = str.split(",").map(s => s.trim()).filter(Boolean);
    return names.map(name => {
      const u = users[name];
      return u ? { username: u.username, experience: u.experience || 0 } : { username: name, experience: 0 };
    });
  };

  const create = async () => {
    if (!form.title) return setErr("Unesi naziv meča.");

    const teamANames = form.teamAPlayers.split(",").map(s => s.trim()).filter(Boolean);
    const teamBNames = form.teamBPlayers.split(",").map(s => s.trim()).filter(Boolean);

    if (teamANames.length !== sizeA) return setErr(`Tim A treba točno ${sizeA} igrač(a) za format ${form.type}.`);
    if (teamBNames.length !== sizeB) return setErr(`Tim B treba točno ${sizeB} igrač(a) za format ${form.type}.`);

    const teamA = parsePlayers(form.teamAPlayers);
    const teamB = parsePlayers(form.teamBPlayers);

    const newMatch = {
      id: `m${Date.now()}`, type: form.type, title: form.title,
      status: "open", teamA, teamB,
      winner: null, createdAt: Date.now(),
    };
    await saveMatches([newMatch, ...matches]);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h3>⚔ KREIRAJ NOVI MEČ</h3>
        {err && <div className="alert alert-err">{err}</div>}
        <div className="form-group">
          <label>NAZIV MEČA</label>
          <input className="form-control" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Npr. Bitka za Antioch..." />
        </div>
        <div className="form-group">
          <label>FORMAT</label>
          <select className="form-control" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, teamAPlayers: "", teamBPlayers: "" }))}>
            {["1v1","2v2","1v2","1v3","2v3","3v3"].map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>TIM A — {sizeA} igrač(a), odvojite zarezom</label>
          <input className="form-control" value={form.teamAPlayers}
            onChange={e => setForm(f => ({ ...f, teamAPlayers: e.target.value }))}
            placeholder={sizeA === 1 ? "npr. Igrač1" : Array.from({length: sizeA}, (_,i) => `Igrač${i+1}`).join(", ")} />
        </div>
        <div className="form-group">
          <label>TIM B — {sizeB} igrač(a), odvojite zarezom</label>
          <input className="form-control" value={form.teamBPlayers}
            onChange={e => setForm(f => ({ ...f, teamBPlayers: e.target.value }))}
            placeholder={sizeB === 1 ? "npr. Igrač2" : Array.from({length: sizeB}, (_,i) => `Igrač${i+1}`).join(", ")} />
        </div>
        <p className="text-muted mb-16">Kvote se automatski računaju prema godinama iskustva igrača. Korisničko ime mora biti registrirano da bi iskustvo bio uzeto u obzir.</p>
        <div className="flex gap-8">
          <button className="btn btn-gold" onClick={create}>KREIRAJ MEČ</button>
          <button className="btn btn-outline" onClick={onClose}>ODUSTANI</button>
        </div>
      </div>
    </div>
  );
}

// ── Leaderboard ──────────────────────────────────────────────────────────────
function LeaderboardTab({ users }) {
  const sorted = Object.values(users).sort((a, b) => b.coins - a.coins);
  return (
    <div>
      <h2 className="section-title">LJESTVICA POBJEDNIKA</h2>
      <div className="card">
        <div className="card-body">
          {sorted.map((u, i) => (
            <div key={u.username} className="history-row">
              <div className="flex gap-16 align-center">
                <span style={{ fontFamily: "'Cinzel', serif", color: i < 3 ? ["#ffd700","#c0c0c0","#cd7f32"][i] : "var(--text2)", width: 28 }}>#{i + 1}</span>
                <div className="avatar" style={{ width: 36, height: 36, fontSize: "1rem" }}>{u.username[0].toUpperCase()}</div>
                <div>
                  <div style={{ fontFamily: "'Cinzel', serif", color: "var(--text)" }}>{u.username}</div>
                  <div className="text-muted">{u.experience || 0} god. iskustva</div>
                </div>
              </div>
              <div className="flex align-center gap-8">
                <CoinIcon />
                <span style={{ fontFamily: "'Cinzel', serif", color: "var(--gold2)", fontWeight: 700 }}>{u.coins?.toLocaleString()}</span>
              </div>
            </div>
          ))}
          {sorted.length === 0 && <div className="text-center text-muted">Nema igrača još.</div>}
        </div>
      </div>
    </div>
  );
}

// ── Profile Tab ──────────────────────────────────────────────────────────────
function ProfileTab({ currentUser, bets, matches, updateUser }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ experience: currentUser.experience || 0, bio: currentUser.bio || "" });
  const [ok, setOk] = useState(false);

  const myBets = bets.filter(b => b.username === currentUser.username);
  const wonBets = myBets.filter(b => { const m = matches.find(m => m.id === b.matchId); return m && m.winner === b.side; });
  const totalWon = wonBets.reduce((s, b) => { const m = matches.find(m => m.id === b.matchId); const { oddsA, oddsB } = calcOdds(m.teamA, m.teamB); return s + Math.floor(b.amount * (b.side === "A" ? oddsA : oddsB)); }, 0);

  const save = async () => {
    await updateUser({ ...currentUser, experience: parseInt(form.experience) || 0, bio: form.bio });
    setEditing(false); setOk(true); setTimeout(() => setOk(false), 2000);
  };

  return (
    <div>
      <h2 className="section-title">MOJ PROFIL</h2>
      <div className="card mb-24">
        <div className="card-body">
          <div className="profile-header">
            <div className="avatar">{currentUser.username[0].toUpperCase()}</div>
            <div className="profile-info">
              <h2>{currentUser.username}</h2>
              <p>{currentUser.bio || "Bez opisa."}</p>
              <p style={{ marginTop: 4 }}>{currentUser.experience || 0} godina iskustva u AoE2</p>
            </div>
            <button className="btn btn-outline btn-sm" style={{ marginLeft: "auto" }} onClick={() => setEditing(!editing)}>
              {editing ? "ZATVORI" : "UREDI PROFIL"}
            </button>
          </div>
          {ok && <div className="alert alert-ok">✓ Profil ažuriran!</div>}
          {editing && (
            <div>
              <div className="form-group">
                <label>GODINE ISKUSTVA</label>
                <input className="form-control" type="number" min="0" max="30" value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>BIO</label>
                <textarea className="form-control" rows={3} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Nešto o sebi..." style={{ resize: "vertical" }} />
              </div>
              <button className="btn btn-gold" onClick={save}>SPREMI PROMJENE</button>
            </div>
          )}
        </div>
      </div>

      <div className="grid-3 mb-24">
        <div className="stat-box">
          <div className="stat-val"><CoinIcon />{currentUser.coins?.toLocaleString()}</div>
          <div className="stat-label">GOLD BALANS</div>
        </div>
        <div className="stat-box">
          <div className="stat-val">{myBets.length}</div>
          <div className="stat-label">UKUPNO KLAĐENJA</div>
        </div>
        <div className="stat-box">
          <div className="stat-val win-text">{wonBets.length}</div>
          <div className="stat-label">POBJEDE</div>
        </div>
      </div>

      <h2 className="section-title">POVIJEST KLAĐENJA</h2>
      <div className="card">
        <div className="card-body">
          {myBets.length === 0 && <div className="text-muted text-center">Još nisi postavio nijedan bet.</div>}
          {myBets.map(bet => {
            const match = matches.find(m => m.id === bet.matchId);
            if (!match) return null;
            const { oddsA, oddsB } = calcOdds(match.teamA, match.teamB);
            const odds = bet.side === "A" ? oddsA : oddsB;
            const won = match.winner === bet.side;
            const finished = match.status === "finished";
            return (
              <div key={bet.id} className="history-row">
                <div>
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: "0.9rem" }}>{match.title}</div>
                  <div className="text-muted">Tim {bet.side} • {odds}x kvota • {bet.amount} G</div>
                </div>
                <div>
                  {!finished && <span className="text-muted">U tijeku</span>}
                  {finished && won && <span className="win-text">+{Math.floor(bet.amount * odds)} G ✓</span>}
                  {finished && !won && <span className="lose-text">-{bet.amount} G ✗</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
