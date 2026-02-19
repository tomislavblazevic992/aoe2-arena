import { useState, useEffect } from "react";

// ── Config ───────────────────────────────────────────────────────────────────
const ADMIN_USERNAME = "admin"; // Promijeni u svoje korisničko ime
const INITIAL_COINS = 1000;
const STORAGE_KEYS = {
  users: "aoe2_users",
  currentUser: "aoe2_current_user",
  matches: "aoe2_matches",
  bets: "aoe2_bets",
};

// ── Storage ──────────────────────────────────────────────────────────────────
function sget(key) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
}
function sset(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ── Odds ─────────────────────────────────────────────────────────────────────
function calcOdds(teamA, teamB) {
  const expA = Math.max(1, teamA.reduce((s, u) => s + (u.experience || 0), 0) / teamA.length);
  const expB = Math.max(1, teamB.reduce((s, u) => s + (u.experience || 0), 0) / teamB.length);
  const total = expA + expB;
  return {
    oddsA: Math.max(1.05, +(1 / (expA / total)).toFixed(2)),
    oddsB: Math.max(1.05, +(1 / (expB / total)).toFixed(2)),
  };
}

// ── CSS ──────────────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:       #0b0c10;
  --bg2:      #12141a;
  --bg3:      #1a1d27;
  --surface:  #1e2130;
  --border:   #2a2f42;
  --border2:  #353c55;
  --cyan:     #00d4ff;
  --cyan2:    #00aacc;
  --cyan-dim: rgba(0,212,255,0.12);
  --orange:   #ff6b35;
  --green:    #00e676;
  --red:      #ff4444;
  --text:     #e8eaf0;
  --text2:    #8890a8;
  --text3:    #555e77;
  --radius:   10px;
  --shadow:   0 8px 32px rgba(0,0,0,0.4);
}

html { scroll-behavior: smooth; }
body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; min-height: 100vh; line-height: 1.5; }

/* Scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--bg2); }
::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }

/* ── LAYOUT ── */
.app { min-height: 100vh; display: flex; flex-direction: column; }
.page { flex: 1; max-width: 1200px; margin: 0 auto; width: 100%; padding: 28px 20px; }

/* ── NAV ── */
.nav {
  background: rgba(11,12,16,0.92);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border);
  position: sticky; top: 0; z-index: 100;
  padding: 0 24px;
}
.nav-inner {
  max-width: 1200px; margin: 0 auto;
  display: flex; align-items: center; gap: 20px; height: 60px;
}
.nav-brand {
  display: flex; align-items: center; gap: 10px;
  font-family: 'Barlow Condensed', sans-serif;
  font-size: 1.4rem; font-weight: 800; letter-spacing: 1px;
  color: var(--text); text-decoration: none; flex-shrink: 0;
}
.nav-brand span { color: var(--cyan); }
.nav-tabs { display: flex; gap: 2px; flex: 1; }
.nav-tab {
  background: none; border: none; cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 500;
  color: var(--text2); padding: 8px 14px; border-radius: 6px;
  transition: all 0.15s; white-space: nowrap;
}
.nav-tab:hover { color: var(--text); background: var(--bg3); }
.nav-tab.active { color: var(--cyan); background: var(--cyan-dim); }
.nav-right { display: flex; align-items: center; gap: 10px; margin-left: auto; flex-shrink: 0; }
.coins-badge {
  display: flex; align-items: center; gap: 6px;
  background: var(--bg3); border: 1px solid var(--border);
  padding: 6px 12px; border-radius: 20px;
  font-size: 0.85rem; font-weight: 600; color: var(--cyan);
}
.coins-badge svg { flex-shrink: 0; }
.nav-username { font-size: 0.8rem; color: var(--text2); display: none; }
.admin-badge {
  background: linear-gradient(135deg, #ff6b35, #ff4444);
  color: #fff; font-size: 0.65rem; font-weight: 700;
  padding: 2px 7px; border-radius: 4px; letter-spacing: 1px;
}
.hamburger { display: none; background: none; border: none; cursor: pointer; color: var(--text); padding: 4px; }

/* Mobile nav */
.mobile-menu {
  display: none; flex-direction: column; gap: 4px;
  background: var(--bg2); border-bottom: 1px solid var(--border);
  padding: 12px 24px;
}
.mobile-menu.open { display: flex; }
.mobile-tab {
  background: none; border: none; cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 0.95rem; font-weight: 500;
  color: var(--text2); padding: 10px 14px; border-radius: 8px;
  transition: all 0.15s; text-align: left;
}
.mobile-tab:hover { color: var(--text); background: var(--bg3); }
.mobile-tab.active { color: var(--cyan); background: var(--cyan-dim); }

/* ── BUTTONS ── */
.btn {
  display: inline-flex; align-items: center; gap: 7px;
  font-family: 'DM Sans', sans-serif; font-weight: 600;
  border: none; cursor: pointer; border-radius: 8px;
  transition: all 0.15s; text-decoration: none; white-space: nowrap;
  font-size: 0.85rem; padding: 9px 18px;
}
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-primary {
  background: var(--cyan); color: #0b0c10;
}
.btn-primary:hover:not(:disabled) { background: #33ddff; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,212,255,0.3); }
.btn-ghost {
  background: var(--bg3); color: var(--text2); border: 1px solid var(--border);
}
.btn-ghost:hover:not(:disabled) { color: var(--text); border-color: var(--border2); }
.btn-danger { background: rgba(255,68,68,0.15); color: var(--red); border: 1px solid rgba(255,68,68,0.3); }
.btn-danger:hover:not(:disabled) { background: rgba(255,68,68,0.25); }
.btn-success { background: rgba(0,230,118,0.15); color: var(--green); border: 1px solid rgba(0,230,118,0.3); }
.btn-success:hover:not(:disabled) { background: rgba(0,230,118,0.25); }
.btn-sm { padding: 6px 12px; font-size: 0.78rem; border-radius: 6px; }
.btn-lg { padding: 12px 28px; font-size: 0.95rem; }
.btn-full { width: 100%; justify-content: center; }

/* ── FORM ── */
.form-group { margin-bottom: 16px; }
.form-label { display: block; font-size: 0.78rem; font-weight: 600; color: var(--text2); margin-bottom: 6px; letter-spacing: 0.5px; text-transform: uppercase; }
.form-input {
  width: 100%; padding: 10px 14px;
  background: var(--bg3); border: 1px solid var(--border);
  color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 0.9rem;
  border-radius: 8px; outline: none; transition: border-color 0.15s;
}
.form-input:focus { border-color: var(--cyan); box-shadow: 0 0 0 3px rgba(0,212,255,0.08); }
.form-input::placeholder { color: var(--text3); }
select.form-input option { background: var(--bg3); }
textarea.form-input { resize: vertical; min-height: 80px; }

/* ── CARD ── */
.card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); overflow: hidden;
}
.card-header { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
.card-body { padding: 20px; }
.card-title { font-family: 'Barlow Condensed', sans-serif; font-size: 1rem; font-weight: 700; letter-spacing: 0.5px; color: var(--text); }

/* ── SECTION HEADER ── */
.section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
.section-title { font-family: 'Barlow Condensed', sans-serif; font-size: 1.5rem; font-weight: 800; letter-spacing: 0.5px; color: var(--text); }

/* ── BADGE ── */
.badge { display: inline-flex; align-items: center; font-size: 0.7rem; font-weight: 700; padding: 3px 8px; border-radius: 4px; letter-spacing: 0.5px; text-transform: uppercase; }
.badge-open { background: rgba(0,230,118,0.12); color: var(--green); border: 1px solid rgba(0,230,118,0.25); }
.badge-finished { background: rgba(136,144,168,0.12); color: var(--text2); border: 1px solid rgba(136,144,168,0.2); }
.badge-type { background: rgba(0,212,255,0.1); color: var(--cyan); border: 1px solid rgba(0,212,255,0.2); }

/* ── MATCH CARD ── */
.match-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 16px; }
.match-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--radius); overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;
  animation: fadeUp 0.3s ease both;
}
.match-card:hover { border-color: var(--border2); box-shadow: var(--shadow); }
@keyframes fadeUp { from { opacity:0; transform: translateY(12px); } to { opacity:1; transform: none; } }

.match-card-head {
  padding: 12px 16px; display: flex; align-items: center;
  justify-content: space-between; gap: 8px;
  border-bottom: 1px solid var(--border);
  background: var(--bg3);
}
.match-card-title { font-family: 'Barlow Condensed', sans-serif; font-size: 1.05rem; font-weight: 700; color: var(--text); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.match-card-body { padding: 16px; }

.versus { display: grid; grid-template-columns: 1fr 40px 1fr; gap: 8px; align-items: center; margin-bottom: 16px; }
.team { text-align: center; }
.team-name { font-weight: 600; font-size: 0.9rem; color: var(--text); margin-bottom: 2px; }
.team-exp { font-size: 0.72rem; color: var(--text3); }
.vs-text { text-align: center; font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 1.1rem; color: var(--border2); }

.odds-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
.odds-btn {
  padding: 10px; border-radius: 8px; text-align: center; cursor: pointer;
  border: 1px solid var(--border); background: var(--bg3);
  transition: all 0.15s;
}
.odds-btn:hover { border-color: var(--cyan); background: var(--cyan-dim); }
.odds-btn.selected { border-color: var(--cyan); background: var(--cyan-dim); }
.odds-btn.winner { border-color: var(--green); background: rgba(0,230,118,0.08); }
.odds-btn.loser { border-color: var(--border); background: var(--bg3); opacity: 0.5; }
.odds-label { font-size: 0.65rem; font-weight: 600; color: var(--text2); letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 4px; }
.odds-value { font-family: 'Barlow Condensed', sans-serif; font-size: 1.5rem; font-weight: 700; color: var(--cyan); }
.odds-btn.winner .odds-value { color: var(--green); }

.bet-input-row { display: flex; gap: 8px; }
.bet-input-row .form-input { flex: 1; }

.match-footer { padding: 10px 16px; border-top: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; background: var(--bg3); flex-wrap: wrap; gap: 8px; }
.match-footer-stat { font-size: 0.72rem; color: var(--text3); }

/* ── ALERT ── */
.alert { padding: 10px 14px; border-radius: 8px; font-size: 0.85rem; margin-top: 10px; }
.alert-err { background: rgba(255,68,68,0.1); border: 1px solid rgba(255,68,68,0.2); color: #ff8888; }
.alert-ok { background: rgba(0,230,118,0.1); border: 1px solid rgba(0,230,118,0.2); color: var(--green); }

/* ── FILTER BAR ── */
.filter-bar { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 20px; }
.filter-btn {
  background: var(--bg3); border: 1px solid var(--border); color: var(--text2);
  font-family: 'DM Sans', sans-serif; font-size: 0.8rem; font-weight: 500;
  padding: 6px 14px; border-radius: 20px; cursor: pointer; transition: all 0.15s;
}
.filter-btn:hover { color: var(--text); border-color: var(--border2); }
.filter-btn.active { background: var(--cyan-dim); border-color: var(--cyan); color: var(--cyan); }

/* ── MODAL ── */
.overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
.modal { background: var(--bg2); border: 1px solid var(--border); border-radius: 14px; width: 100%; max-width: 480px; max-height: 90vh; overflow-y: auto; }
.modal-head { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 0; margin-bottom: 20px; }
.modal-title { font-family: 'Barlow Condensed', sans-serif; font-size: 1.3rem; font-weight: 800; color: var(--text); }
.modal-close { background: var(--bg3); border: 1px solid var(--border); color: var(--text2); width: 32px; height: 32px; border-radius: 6px; cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.modal-close:hover { color: var(--text); }
.modal-body { padding: 0 24px 24px; }
.modal-hint { font-size: 0.78rem; color: var(--text3); margin-bottom: 16px; line-height: 1.5; }

/* ── AUTH ── */
.auth-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; background: var(--bg); }
.auth-box { width: 100%; max-width: 400px; }
.auth-logo { text-align: center; margin-bottom: 32px; }
.auth-logo h1 { font-family: 'Barlow Condensed', sans-serif; font-size: 2.5rem; font-weight: 800; letter-spacing: 1px; color: var(--text); }
.auth-logo h1 span { color: var(--cyan); }
.auth-logo p { color: var(--text2); font-size: 0.9rem; margin-top: 4px; }
.auth-tabs { display: flex; border-bottom: 1px solid var(--border); margin-bottom: 24px; }
.auth-tab { flex: 1; padding: 12px; background: none; border: none; border-bottom: 2px solid transparent; margin-bottom: -1px; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; font-weight: 600; color: var(--text2); cursor: pointer; transition: all 0.15s; }
.auth-tab.active { color: var(--cyan); border-bottom-color: var(--cyan); }
.auth-footer { text-align: center; margin-top: 12px; font-size: 0.8rem; color: var(--text3); }

/* ── LEADERBOARD ── */
.lb-row { display: flex; align-items: center; gap: 14px; padding: 12px 0; border-bottom: 1px solid var(--border); }
.lb-row:last-child { border-bottom: none; }
.lb-rank { font-family: 'Barlow Condensed', sans-serif; font-size: 1.2rem; font-weight: 800; width: 36px; text-align: center; flex-shrink: 0; }
.lb-avatar { width: 38px; height: 38px; border-radius: 50%; background: var(--bg3); border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; font-family: 'Barlow Condensed', sans-serif; font-size: 1.1rem; font-weight: 700; flex-shrink: 0; }
.lb-info { flex: 1; min-width: 0; }
.lb-name { font-weight: 600; font-size: 0.9rem; color: var(--text); }
.lb-sub { font-size: 0.75rem; color: var(--text3); margin-top: 1px; }
.lb-coins { font-family: 'Barlow Condensed', sans-serif; font-size: 1.1rem; font-weight: 700; color: var(--cyan); white-space: nowrap; }

/* ── PROFILE ── */
.profile-hero { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
.profile-avatar { width: 72px; height: 72px; border-radius: 50%; background: linear-gradient(135deg, var(--cyan2), var(--bg3)); border: 2px solid var(--border); display: flex; align-items: center; justify-content: center; font-family: 'Barlow Condensed', sans-serif; font-size: 2rem; font-weight: 800; color: var(--cyan); flex-shrink: 0; }
.profile-info { flex: 1; min-width: 0; }
.profile-name { font-family: 'Barlow Condensed', sans-serif; font-size: 1.6rem; font-weight: 800; color: var(--text); }
.profile-bio { font-size: 0.85rem; color: var(--text2); margin-top: 4px; }
.stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
.stat-card { background: var(--bg3); border: 1px solid var(--border); border-radius: 10px; padding: 16px; text-align: center; }
.stat-val { font-family: 'Barlow Condensed', sans-serif; font-size: 1.8rem; font-weight: 800; color: var(--cyan); }
.stat-val.green { color: var(--green); }
.stat-label { font-size: 0.7rem; font-weight: 600; color: var(--text3); text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }

/* ── BET HISTORY ── */
.bet-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border); flex-wrap: wrap; }
.bet-row:last-child { border-bottom: none; }
.bet-match { font-weight: 600; font-size: 0.85rem; color: var(--text); }
.bet-detail { font-size: 0.75rem; color: var(--text3); margin-top: 2px; }
.bet-result { font-weight: 700; font-size: 0.85rem; white-space: nowrap; }
.text-green { color: var(--green); }
.text-red { color: var(--red); }
.text-muted { color: var(--text2); }

/* ── ADMIN PANEL ── */
.admin-bar { background: linear-gradient(135deg, rgba(255,107,53,0.1), rgba(255,68,68,0.08)); border: 1px solid rgba(255,107,53,0.25); border-radius: 10px; padding: 14px 18px; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.admin-bar-text { flex: 1; font-size: 0.85rem; color: var(--orange); font-weight: 500; }
.admin-bar-text strong { display: block; font-family: 'Barlow Condensed', sans-serif; font-size: 1rem; letter-spacing: 0.5px; }

/* ── RESOLVE SECTION ── */
.resolve-section { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: var(--bg3); border-top: 1px solid var(--border); flex-wrap: wrap; }
.resolve-label { font-size: 0.75rem; color: var(--text3); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; flex-shrink: 0; }

/* ── EMPTY STATE ── */
.empty-state { text-align: center; padding: 60px 20px; color: var(--text3); }
.empty-state svg { margin-bottom: 16px; opacity: 0.4; }
.empty-state h3 { font-family: 'Barlow Condensed', sans-serif; font-size: 1.2rem; font-weight: 700; color: var(--text2); margin-bottom: 6px; }
.empty-state p { font-size: 0.85rem; }

/* ── DIVIDER ── */
.divider { height: 1px; background: var(--border); margin: 20px 0; }

/* ── RESPONSIVE ── */
@media (max-width: 768px) {
  .nav-tabs { display: none; }
  .nav-username { display: none; }
  .hamburger { display: flex; }
  .coins-badge span { display: none; }
  .match-grid { grid-template-columns: 1fr; }
  .stats-grid { grid-template-columns: repeat(3, 1fr); }
  .page { padding: 20px 16px; }
}
@media (max-width: 480px) {
  .stats-grid { grid-template-columns: 1fr 1fr; }
  .section-header { flex-direction: column; align-items: flex-start; }
  .auth-box { padding: 0 4px; }
  .modal-head, .modal-body { padding-left: 18px; padding-right: 18px; }
}

/* ── UTILS ── */
.flex { display: flex; }
.items-center { align-items: center; }
.gap-8 { gap: 8px; }
.gap-12 { gap: 12px; }
.mb-8 { margin-bottom: 8px; }
.mb-16 { margin-bottom: 16px; }
.mt-12 { margin-top: 12px; }
`;

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconCoin = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><path d="M12 6v12M9 9h4.5a2.5 2.5 0 0 1 0 5H9"/>
  </svg>
);
const IconSword = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l-2 2-3-3 2-2M15 7l3-3 3 3-9.5 9.5"/>
  </svg>
);
const IconMenu = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
);
const IconX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconTrophy = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M6 9H4a2 2 0 0 1-2-2V5h4M18 9h2a2 2 0 0 0 2-2V5h-4M6 9v6a6 6 0 0 0 12 0V9M6 9h12M9 21h6M12 21v-6"/>
  </svg>
);

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [users, setUsers] = useState({});
  const [matches, setMatches] = useState([]);
  const [bets, setBets] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [tab, setTab] = useState("matches");
  const [authMode, setAuthMode] = useState("login");
  const [loading, setLoading] = useState(true);
  const [showNewMatch, setShowNewMatch] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setUsers(sget(STORAGE_KEYS.users) || {});
    setCurrentUser(sget(STORAGE_KEYS.currentUser) || null);
    setMatches(sget(STORAGE_KEYS.matches) || []);
    setBets(sget(STORAGE_KEYS.bets) || []);
    setLoading(false);
  }, []);

  const saveUsers = (u) => { setUsers(u); sset(STORAGE_KEYS.users, u); };
  const saveMatches = (m) => { setMatches(m); sset(STORAGE_KEYS.matches, m); };
  const saveBets = (b) => { setBets(b); sset(STORAGE_KEYS.bets, b); };
  const saveCurrentUser = (u) => { setCurrentUser(u); sset(STORAGE_KEYS.currentUser, u); };

  const updateUser = (updated) => {
    const nu = { ...users, [updated.username]: updated };
    saveUsers(nu); saveCurrentUser(updated);
  };

  const placeBet = (matchId, side, amount) => {
    if (!currentUser || amount <= 0 || currentUser.coins < amount) return false;
    if (bets.find(b => b.matchId === matchId && b.username === currentUser.username)) return false;
    const nb = [...bets, { id: `b${Date.now()}`, matchId, username: currentUser.username, side, amount }];
    saveBets(nb);
    const updated = { ...currentUser, coins: currentUser.coins - amount };
    updateUser(updated);
    return true;
  };

  const resolveMatch = (matchId, winner) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;
    const { oddsA, oddsB } = calcOdds(match.teamA, match.teamB);
    const updatedUsers = { ...users };
    bets.filter(b => b.matchId === matchId && b.side === winner).forEach(bet => {
      const odds = winner === "A" ? oddsA : oddsB;
      if (updatedUsers[bet.username]) {
        updatedUsers[bet.username] = { ...updatedUsers[bet.username], coins: updatedUsers[bet.username].coins + Math.floor(bet.amount * odds) };
      }
    });
    saveUsers(updatedUsers);
    if (currentUser && updatedUsers[currentUser.username]) saveCurrentUser(updatedUsers[currentUser.username]);
    saveMatches(matches.map(m => m.id === matchId ? { ...m, status: "finished", winner } : m));
  };

  const logout = () => { setCurrentUser(null); sset(STORAGE_KEYS.currentUser, null); setTab("matches"); };

  const isAdmin = currentUser?.username === ADMIN_USERNAME;

  const navTo = (t) => { setTab(t); setMobileOpen(false); };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0b0c10" }}>
      <style>{css}</style>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", color: "var(--cyan)", fontSize: "1.2rem", letterSpacing: "3px" }}>LOADING...</div>
    </div>
  );

  if (!currentUser) return (
    <div className="auth-wrap">
      <style>{css}</style>
      <AuthScreen mode={authMode} setMode={setAuthMode} users={users} saveUsers={saveUsers} saveCurrentUser={saveCurrentUser} />
    </div>
  );

  const tabs = [
    { id: "matches", label: "Mečevi" },
    { id: "leaderboard", label: "Ljestvica" },
    { id: "profile", label: "Profil" },
  ];

  return (
    <div className="app">
      <style>{css}</style>
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-brand"><IconSword /><span>AoE2</span> ARENA</div>
          <div className="nav-tabs">
            {tabs.map(t => <button key={t.id} className={`nav-tab ${tab === t.id ? "active" : ""}`} onClick={() => navTo(t.id)}>{t.label}</button>)}
          </div>
          <div className="nav-right">
            <div className="coins-badge"><IconCoin /><span>{currentUser.coins.toLocaleString()} G</span></div>
            {isAdmin && <span className="admin-badge">ADMIN</span>}
            <div className="nav-username">{currentUser.username}</div>
            <button className="btn btn-ghost btn-sm" onClick={logout}>Odjava</button>
            <button className="hamburger" onClick={() => setMobileOpen(o => !o)}><IconMenu /></button>
          </div>
        </div>
      </nav>
      <div className={`mobile-menu ${mobileOpen ? "open" : ""}`}>
        {tabs.map(t => <button key={t.id} className={`mobile-tab ${tab === t.id ? "active" : ""}`} onClick={() => navTo(t.id)}>{t.label}</button>)}
        <div style={{ borderTop: "1px solid var(--border)", marginTop: 8, paddingTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text2)" }}>{currentUser.username}</span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Odjava</button>
        </div>
      </div>
      <div className="page">
        {tab === "matches" && <MatchesTab matches={matches} bets={bets} currentUser={currentUser} placeBet={placeBet} resolveMatch={resolveMatch} isAdmin={isAdmin} showNewMatch={showNewMatch} setShowNewMatch={setShowNewMatch} saveMatches={saveMatches} users={users} />}
        {tab === "leaderboard" && <LeaderboardTab users={users} />}
        {tab === "profile" && <ProfileTab currentUser={currentUser} bets={bets} matches={matches} updateUser={updateUser} />}
      </div>
    </div>
  );
}

// ── Auth ──────────────────────────────────────────────────────────────────────
function AuthScreen({ mode, setMode, users, saveUsers, saveCurrentUser }) {
  const [form, setForm] = useState({ username: "", password: "", experience: "" });
  const [err, setErr] = useState("");

  const submit = (e) => {
    e.preventDefault(); setErr("");
    if (mode === "register") {
      if (!form.username.trim() || !form.password) return setErr("Popuni sva polja.");
      if (users[form.username]) return setErr("Korisničko ime već postoji.");
      const nu = { username: form.username.trim(), password: form.password, experience: parseInt(form.experience) || 0, coins: INITIAL_COINS, joined: Date.now() };
      saveUsers({ ...users, [nu.username]: nu });
      saveCurrentUser(nu);
    } else {
      const u = users[form.username];
      if (!u || u.password !== form.password) return setErr("Pogrešno korisničko ime ili lozinka.");
      saveCurrentUser(u);
    }
  };

  return (
    <div className="auth-box">
      <div className="auth-logo">
        <h1><span>AoE2</span> ARENA</h1>
        <p>Virtualna kladionica za Age of Empires 2</p>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="auth-tabs">
            {[["login","Prijava"],["register","Registracija"]].map(([m, l]) => (
              <button key={m} className={`auth-tab ${mode === m ? "active" : ""}`} onClick={() => { setMode(m); setErr(""); }}>{l}</button>
            ))}
          </div>
          {err && <div className="alert alert-err mb-16">{err}</div>}
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Korisničko ime</label>
              <input className="form-input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="Unesi korisničko ime..." />
            </div>
            <div className="form-group">
              <label className="form-label">Lozinka</label>
              <input className="form-input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" />
            </div>
            {mode === "register" && (
              <div className="form-group">
                <label className="form-label">Godine iskustva u AoE2</label>
                <input className="form-input" type="number" min="0" max="30" value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))} placeholder="0" />
              </div>
            )}
            <button className="btn btn-primary btn-lg btn-full" type="submit">
              {mode === "login" ? "Prijavi se" : "Registriraj se"}
            </button>
          </form>
          {mode === "register" && <p className="auth-footer">Dobivate {INITIAL_COINS.toLocaleString()} Gold za početak! 🪙</p>}
        </div>
      </div>
    </div>
  );
}

// ── Matches ───────────────────────────────────────────────────────────────────
function MatchesTab({ matches, bets, currentUser, placeBet, resolveMatch, isAdmin, showNewMatch, setShowNewMatch, saveMatches, users }) {
  const [filter, setFilter] = useState("sve");
  const [betInputs, setBetInputs] = useState({});
  const [selectedSide, setSelectedSide] = useState({});
  const [msg, setMsg] = useState({});

  const filters = ["sve", "otvoreno", "završeno", "1v1", "2v2", "1v2", "3v3"];
  const filtered = matches.filter(m => {
    if (filter === "sve") return true;
    if (filter === "otvoreno") return m.status === "open";
    if (filter === "završeno") return m.status === "finished";
    return m.type === filter;
  });

  const myBet = (matchId) => bets.find(b => b.matchId === matchId && b.username === currentUser.username);

  const handleBet = (matchId) => {
    const side = selectedSide[matchId];
    const amount = parseInt(betInputs[matchId] || 0);
    if (!side) return setMsg(m => ({ ...m, [matchId]: { type: "err", text: "Odaberi tim prije klađenja." } }));
    if (!amount || amount < 1) return setMsg(m => ({ ...m, [matchId]: { type: "err", text: "Unesi iznos klađenja." } }));
    if (amount > currentUser.coins) return setMsg(m => ({ ...m, [matchId]: { type: "err", text: "Nedovoljno Golda." } }));
    const ok = placeBet(matchId, side, amount);
    setMsg(m => ({ ...m, [matchId]: ok ? { type: "ok", text: `✓ Kladio si ${amount} G na Tim ${side}!` } : { type: "err", text: "Već si se kladio na ovaj meč." } }));
    if (ok) setBetInputs(b => ({ ...b, [matchId]: "" }));
  };

  return (
    <div>
      <style>{css}</style>
      {isAdmin && (
        <div className="admin-bar">
          <div className="admin-bar-text"><strong>⚡ Admin Panel</strong>Prijavljen si kao administrator.</div>
          <button className="btn btn-primary" onClick={() => setShowNewMatch(true)}><IconPlus /> Novi meč</button>
        </div>
      )}
      <div className="section-header">
        <h2 className="section-title">Mečevi</h2>
        <span style={{ fontSize: "0.8rem", color: "var(--text3)" }}>{filtered.length} mečeva</span>
      </div>
      <div className="filter-bar">
        {filters.map(f => (
          <button key={f} className={`filter-btn ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f.toUpperCase()}</button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="empty-state"><IconTrophy /><h3>Nema mečeva</h3><p>Ovdje će se prikazati mečevi kada budu dodani.</p></div>
      ) : (
        <div className="match-grid">
          {[...filtered].sort((a, b) => b.createdAt - a.createdAt).map((match, i) => {
            const { oddsA, oddsB } = calcOdds(match.teamA, match.teamB);
            const bet = myBet(match.id);
            const matchBets = bets.filter(b => b.matchId === match.id);
            const pool = matchBets.reduce((s, b) => s + b.amount, 0);
            return (
              <div key={match.id} className="match-card" style={{ animationDelay: `${i * 0.04}s` }}>
                <div className="match-card-head">
                  <div className="match-card-title">{match.title}</div>
                  <div className="flex gap-8">
                    <span className="badge badge-type">{match.type}</span>
                    <span className={`badge ${match.status === "open" ? "badge-open" : "badge-finished"}`}>
                      {match.status === "open" ? "LIVE" : "ZAVRŠENO"}
                    </span>
                  </div>
                </div>
                <div className="match-card-body">
                  <div className="versus">
                    <div className="team">
                      <div className="team-name">{match.teamA.map(p => p.username).join(" & ")}</div>
                      <div className="team-exp">{match.teamA.map(p => `${p.experience || 0}g`).join(" & ")} iskustvo</div>
                    </div>
                    <div className="vs-text">VS</div>
                    <div className="team">
                      <div className="team-name">{match.teamB.map(p => p.username).join(" & ")}</div>
                      <div className="team-exp">{match.teamB.map(p => `${p.experience || 0}g`).join(" & ")} iskustvo</div>
                    </div>
                  </div>

                  <div className="odds-grid">
                    {[["A", oddsA, match.teamA], ["B", oddsB, match.teamB]].map(([side, odds, team]) => {
                      const isWinner = match.winner === side;
                      const isLoser = match.status === "finished" && match.winner && match.winner !== side;
                      return (
                        <div key={side}
                          className={`odds-btn ${selectedSide[match.id] === side ? "selected" : ""} ${isWinner ? "winner" : ""} ${isLoser ? "loser" : ""}`}
                          onClick={() => match.status === "open" && !bet && setSelectedSide(s => ({ ...s, [match.id]: side }))}>
                          <div className="odds-label">Tim {side} {isWinner ? "👑" : ""}</div>
                          <div className="odds-value">{odds}x</div>
                        </div>
                      );
                    })}
                  </div>

                  {match.status === "open" && (
                    bet ? (
                      <div className="alert alert-ok">✓ Kladio si {bet.amount} G na Tim {bet.side}</div>
                    ) : (
                      <div>
                        <div className="bet-input-row">
                          <input className="form-input" type="number" min="1" max={currentUser.coins}
                            placeholder="Iznos (Gold)..."
                            value={betInputs[match.id] || ""}
                            onChange={e => setBetInputs(b => ({ ...b, [match.id]: e.target.value }))} />
                          <button className="btn btn-primary" onClick={() => handleBet(match.id)}>Kladiti</button>
                        </div>
                        {msg[match.id] && <div className={`alert ${msg[match.id].type === "ok" ? "alert-ok" : "alert-err"}`}>{msg[match.id].text}</div>}
                      </div>
                    )
                  )}

                  {match.status === "finished" && (
                    <div style={{ fontSize: "0.82rem", color: "var(--text3)", marginTop: 8 }}>
                      Pobijedio: <span style={{ color: "var(--green)", fontWeight: 600 }}>Tim {match.winner}</span>
                      {bet && <span style={{ marginLeft: 8 }}>• Tvoj bet: Tim {bet.side} {bet.side === match.winner ? <span className="text-green">✓ Dobio</span> : <span className="text-red">✗ Izgubio</span>}</span>}
                    </div>
                  )}
                </div>

                {isAdmin && match.status === "open" && (
                  <div className="resolve-section">
                    <span className="resolve-label">Proglasi pobjednika:</span>
                    <button className="btn btn-success btn-sm" onClick={() => resolveMatch(match.id, "A")}>Tim A</button>
                    <button className="btn btn-success btn-sm" onClick={() => resolveMatch(match.id, "B")}>Tim B</button>
                  </div>
                )}

                <div className="match-footer">
                  <span className="match-footer-stat">{matchBets.length} klađenja</span>
                  <span className="match-footer-stat">Fond: {pool.toLocaleString()} G</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showNewMatch && <NewMatchModal onClose={() => setShowNewMatch(false)} saveMatches={saveMatches} matches={matches} users={users} />}
    </div>
  );
}

// ── New Match Modal ───────────────────────────────────────────────────────────
function NewMatchModal({ onClose, saveMatches, matches, users }) {
  const [form, setForm] = useState({ title: "", type: "1v1", teamA: "", teamB: "" });
  const [err, setErr] = useState("");

  const sizeA = parseInt(form.type.split("v")[0]);
  const sizeB = parseInt(form.type.split("v")[1]);

  const parsePlayers = (str) => str.split(",").map(s => s.trim()).filter(Boolean).map(name => {
    const u = users[name];
    return u ? { username: u.username, experience: u.experience || 0 } : { username: name, experience: 0 };
  });

  const create = () => {
    if (!form.title.trim()) return setErr("Unesi naziv meča.");
    const pA = parsePlayers(form.teamA);
    const pB = parsePlayers(form.teamB);
    if (pA.length !== sizeA) return setErr(`Tim A treba ${sizeA} igrač(a) za format ${form.type}.`);
    if (pB.length !== sizeB) return setErr(`Tim B treba ${sizeB} igrač(a) za format ${form.type}.`);
    saveMatches([{ id: `m${Date.now()}`, type: form.type, title: form.title.trim(), status: "open", teamA: pA, teamB: pB, winner: null, createdAt: Date.now() }, ...matches]);
    onClose();
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <span className="modal-title">Novi meč</span>
          <button className="modal-close" onClick={onClose}><IconX /></button>
        </div>
        <div className="modal-body">
          {err && <div className="alert alert-err mb-16">{err}</div>}
          <div className="form-group">
            <label className="form-label">Naziv meča</label>
            <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Npr. Bitka za Antioch..." />
          </div>
          <div className="form-group">
            <label className="form-label">Format</label>
            <select className="form-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, teamA: "", teamB: "" }))}>
              {["1v1", "2v2", "1v2", "1v3", "2v3", "3v3"].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Tim A — {sizeA} igrač(a), odvoji zarezom</label>
            <input className="form-input" value={form.teamA} onChange={e => setForm(f => ({ ...f, teamA: e.target.value }))}
              placeholder={Array.from({ length: sizeA }, (_, i) => `Igrač${i + 1}`).join(", ")} />
          </div>
          <div className="form-group">
            <label className="form-label">Tim B — {sizeB} igrač(a), odvoji zarezom</label>
            <input className="form-input" value={form.teamB} onChange={e => setForm(f => ({ ...f, teamB: e.target.value }))}
              placeholder={Array.from({ length: sizeB }, (_, i) => `Igrač${i + 1}`).join(", ")} />
          </div>
          <p className="modal-hint">Kvote se računaju automatski prema godinama iskustva. Ako je igrač registriran, iskustvo se uzima s profila.</p>
          <div className="flex gap-8">
            <button className="btn btn-primary" onClick={create}><IconPlus /> Kreiraj meč</button>
            <button className="btn btn-ghost" onClick={onClose}>Odustani</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
function LeaderboardTab({ users }) {
  const sorted = Object.values(users).sort((a, b) => b.coins - a.coins);
  const rankColors = ["#FFD700", "#C0C0C0", "#CD7F32"];

  return (
    <div>
      <div className="section-header"><h2 className="section-title">Ljestvica</h2></div>
      <div className="card">
        <div className="card-body">
          {sorted.length === 0 ? (
            <div className="empty-state" style={{ padding: "40px 0" }}><p>Nema registriranih igrača.</p></div>
          ) : sorted.map((u, i) => (
            <div key={u.username} className="lb-row">
              <div className="lb-rank" style={{ color: rankColors[i] || "var(--text3)" }}>#{i + 1}</div>
              <div className="lb-avatar" style={{ borderColor: rankColors[i] || "var(--border)", color: rankColors[i] || "var(--text2)" }}>
                {u.username[0].toUpperCase()}
              </div>
              <div className="lb-info">
                <div className="lb-name">{u.username} {u.username === ADMIN_USERNAME && <span className="admin-badge">ADMIN</span>}</div>
                <div className="lb-sub">{u.experience || 0} god. iskustva u AoE2</div>
              </div>
              <div className="lb-coins"><IconCoin /> {u.coins?.toLocaleString()} G</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Profile ───────────────────────────────────────────────────────────────────
function ProfileTab({ currentUser, bets, matches, updateUser }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ experience: currentUser.experience || 0, bio: currentUser.bio || "" });
  const [saved, setSaved] = useState(false);

  const myBets = bets.filter(b => b.username === currentUser.username);
  const wonBets = myBets.filter(b => { const m = matches.find(m => m.id === b.matchId); return m?.winner === b.side; });

  const save = () => {
    updateUser({ ...currentUser, experience: parseInt(form.experience) || 0, bio: form.bio });
    setEditing(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="section-header"><h2 className="section-title">Moj profil</h2></div>
      <div className="card mb-16">
        <div className="card-body">
          <div className="profile-hero">
            <div className="profile-avatar">{currentUser.username[0].toUpperCase()}</div>
            <div className="profile-info">
              <div className="profile-name">{currentUser.username} {currentUser.username === ADMIN_USERNAME && <span className="admin-badge" style={{ verticalAlign: "middle" }}>ADMIN</span>}</div>
              <div className="profile-bio">{currentUser.bio || "Bez opisa."}</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text3)", marginTop: 4 }}>{currentUser.experience || 0} god. iskustva · {myBets.length} klađenja</div>
            </div>
            <button className="btn btn-ghost btn-sm" style={{ flexShrink: 0 }} onClick={() => setEditing(e => !e)}>
              {editing ? "Zatvori" : "Uredi"}
            </button>
          </div>
          {saved && <div className="alert alert-ok">✓ Profil ažuriran!</div>}
          {editing && (
            <div>
              <div className="divider" />
              <div className="form-group">
                <label className="form-label">Godine iskustva u AoE2</label>
                <input className="form-input" type="number" min="0" max="30" value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Opis profila</label>
                <textarea className="form-input" value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Nešto o sebi..." />
              </div>
              <button className="btn btn-primary" onClick={save}>Spremi promjene</button>
            </div>
          )}
        </div>
      </div>

      <div className="stats-grid mb-16">
        <div className="stat-card">
          <div className="stat-val">{currentUser.coins?.toLocaleString()}</div>
          <div className="stat-label">Gold</div>
        </div>
        <div className="stat-card">
          <div className="stat-val">{myBets.length}</div>
          <div className="stat-label">Klađenja</div>
        </div>
        <div className="stat-card">
          <div className="stat-val green">{wonBets.length}</div>
          <div className="stat-label">Pobjede</div>
        </div>
      </div>

      <div className="section-header"><h2 className="section-title">Povijest klađenja</h2></div>
      <div className="card">
        <div className="card-body">
          {myBets.length === 0 ? (
            <div className="empty-state" style={{ padding: "32px 0" }}><p>Još nisi postavio nijedan bet.</p></div>
          ) : [...myBets].reverse().map(bet => {
            const match = matches.find(m => m.id === bet.matchId);
            if (!match) return null;
            const { oddsA, oddsB } = calcOdds(match.teamA, match.teamB);
            const odds = bet.side === "A" ? oddsA : oddsB;
            const finished = match.status === "finished";
            const won = match.winner === bet.side;
            return (
              <div key={bet.id} className="bet-row">
                <div>
                  <div className="bet-match">{match.title}</div>
                  <div className="bet-detail">Tim {bet.side} • {odds}x kvota • {bet.amount} G ulog</div>
                </div>
                <div className="bet-result">
                  {!finished && <span className="text-muted">U tijeku</span>}
                  {finished && won && <span className="text-green">+{Math.floor(bet.amount * odds)} G ✓</span>}
                  {finished && !won && <span className="text-red">-{bet.amount} G ✗</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
