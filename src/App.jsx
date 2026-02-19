import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://iwnpfraobzvigbhtgxjx.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3bnBmcmFvYnp2aWdiaHRneGp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MTExMzYsImV4cCI6MjA4NzA4NzEzNn0.Ecemy_PipgWNUJXv3T0CvIA0umwug_4B1wams-Ig34k";
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_USERNAME = "admin";
const INITIAL_COINS = 1000;

function calcOdds(teamA, teamB) {
  // Combined score: experience * 0.6 + ranked_points/100 * 0.4
  const score = (u) => (u.experience || 0) * 0.6 + ((u.ranked_points || 0) / 100) * 0.4;
  const avgA = Math.max(0.5, teamA.reduce((s, u) => s + score(u), 0) / teamA.length);
  const avgB = Math.max(0.5, teamB.reduce((s, u) => s + score(u), 0) / teamB.length);
  const total = avgA + avgB;
  return {
    oddsA: Math.max(1.05, +(1 / (avgA / total)).toFixed(2)),
    oddsB: Math.max(1.05, +(1 / (avgB / total)).toFixed(2)),
  };
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Crimson+Pro:ital,wght@0,400;0,500;0,600;1,400&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --stone:#1a1710;--stone2:#221f15;--stone3:#2c2818;--stone4:#35301e;
  --panel:#251f12;--border:#4a3f22;--border2:#6b5a30;
  --gold:#c8922a;--gold2:#e8b84b;--gold3:#ffd875;
  --red:#8b1c1c;--red2:#b52828;--green:#2d6b2d;--green2:#3d8b3d;--green3:#52b352;
  --text:#f0e6c8;--text2:#c8b480;--text3:#7a6840;--radius:4px;
}
html,body{height:100%;}
body{background:var(--stone);background-image:radial-gradient(ellipse at 20% 50%,rgba(200,146,42,0.04) 0%,transparent 60%),radial-gradient(ellipse at 80% 20%,rgba(139,28,28,0.04) 0%,transparent 60%),repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.08) 3px,rgba(0,0,0,0.08) 4px);color:var(--text);font-family:'Crimson Pro',serif;min-height:100vh;line-height:1.5;}
#root{min-height:100vh;display:flex;flex-direction:column;}
.app{min-height:100vh;display:flex;flex-direction:column;}
::-webkit-scrollbar{width:8px;}::-webkit-scrollbar-track{background:var(--stone2);}::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px;}
.nav{background:linear-gradient(180deg,#0d0b06 0%,var(--stone2) 100%);border-bottom:2px solid var(--border);position:sticky;top:0;z-index:100;box-shadow:0 4px 20px rgba(0,0,0,0.6);}
.nav::after{content:'';display:block;height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent);}
.nav-inner{max-width:100%;margin:0 auto;display:flex;align-items:center;height:56px;padding:0 24px;gap:0;}
.nav-brand{display:flex;align-items:center;gap:10px;flex-shrink:0;font-family:'Cinzel',serif;font-size:1.2rem;font-weight:900;letter-spacing:3px;color:var(--gold2);text-shadow:0 0 20px rgba(200,146,42,0.4);padding-right:24px;border-right:1px solid var(--border);}
.nav-tabs{display:flex;gap:0;flex:1;padding:0 16px;}
.nav-tab{background:none;border:none;cursor:pointer;font-family:'Cinzel',serif;font-size:0.75rem;font-weight:600;color:var(--text2);padding:8px 14px;letter-spacing:1px;border-bottom:2px solid transparent;margin-bottom:-2px;transition:all 0.2s;white-space:nowrap;text-transform:uppercase;}
.nav-tab:hover{color:var(--gold2);}.nav-tab.active{color:var(--gold2);border-bottom-color:var(--gold);}
.nav-right{display:flex;align-items:center;gap:8px;margin-left:auto;flex-shrink:0;}
.coins-badge{display:flex;align-items:center;gap:6px;background:rgba(200,146,42,0.1);border:1px solid var(--border);padding:5px 12px;border-radius:2px;font-family:'Cinzel',serif;font-size:0.82rem;font-weight:700;color:var(--gold2);letter-spacing:1px;}
.admin-badge{background:linear-gradient(135deg,var(--red),var(--red2));color:#fff;font-family:'Cinzel',serif;font-size:0.6rem;font-weight:700;padding:3px 8px;border-radius:2px;letter-spacing:2px;}
.hamburger{display:none;background:none;border:1px solid var(--border);cursor:pointer;color:var(--text2);padding:6px;border-radius:2px;}
.hamburger:hover{color:var(--gold);border-color:var(--border2);}
.mobile-menu{display:none;flex-direction:column;background:var(--stone2);border-bottom:1px solid var(--border);padding:8px 16px 12px;}
.mobile-menu.open{display:flex;}
.mobile-tab{background:none;border:none;cursor:pointer;font-family:'Cinzel',serif;font-size:0.85rem;font-weight:600;color:var(--text2);padding:10px 12px;text-align:left;letter-spacing:1px;border-bottom:1px solid var(--border);transition:color 0.15s;}
.mobile-tab:last-of-type{border-bottom:none;}.mobile-tab:hover,.mobile-tab.active{color:var(--gold2);}
.page{flex:1;width:100%;padding:24px 28px;}
.btn{display:inline-flex;align-items:center;gap:6px;font-family:'Cinzel',serif;font-weight:700;letter-spacing:1px;border:none;cursor:pointer;border-radius:2px;transition:all 0.15s;white-space:nowrap;font-size:0.75rem;padding:8px 16px;text-transform:uppercase;}
.btn:disabled{opacity:0.4;cursor:not-allowed;}
.btn-primary{background:linear-gradient(180deg,var(--gold2) 0%,var(--gold) 100%);color:#1a1208;border:1px solid var(--gold3);box-shadow:0 2px 8px rgba(200,146,42,0.3);}
.btn-primary:hover:not(:disabled){background:linear-gradient(180deg,var(--gold3) 0%,var(--gold2) 100%);box-shadow:0 4px 16px rgba(200,146,42,0.4);transform:translateY(-1px);}
.btn-ghost{background:rgba(255,255,255,0.04);color:var(--text2);border:1px solid var(--border);}
.btn-ghost:hover:not(:disabled){color:var(--text);border-color:var(--border2);}
.btn-success{background:rgba(45,107,45,0.25);color:var(--green3);border:1px solid rgba(45,107,45,0.4);}
.btn-success:hover:not(:disabled){background:rgba(45,107,45,0.4);}
.btn-danger{background:rgba(139,28,28,0.25);color:#e87070;border:1px solid rgba(139,28,28,0.4);}
.btn-danger:hover:not(:disabled){background:rgba(139,28,28,0.4);}
.btn-sm{padding:5px 12px;font-size:0.7rem;}.btn-lg{padding:12px 28px;font-size:0.85rem;}.btn-full{width:100%;justify-content:center;}
.form-group{margin-bottom:14px;}
.form-label{display:block;font-family:'Cinzel',serif;font-size:0.7rem;font-weight:600;color:var(--text2);margin-bottom:5px;letter-spacing:1.5px;text-transform:uppercase;}
.form-input{width:100%;padding:9px 12px;background:var(--stone3);border:1px solid var(--border);color:var(--text);font-family:'Crimson Pro',serif;font-size:1rem;border-radius:2px;outline:none;transition:border-color 0.15s;}
.form-input:focus{border-color:var(--gold);box-shadow:0 0 0 2px rgba(200,146,42,0.1);}
.form-input::placeholder{color:var(--text3);opacity:0.7;}
select.form-input option{background:var(--stone3);}
textarea.form-input{resize:vertical;min-height:80px;}
.panel{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);position:relative;overflow:hidden;}
.panel::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--border2),transparent);}
.panel-body{padding:18px;}
.section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:12px;}
.section-title{font-family:'Cinzel',serif;font-size:1.3rem;font-weight:900;color:var(--gold2);letter-spacing:2px;text-transform:uppercase;text-shadow:0 0 20px rgba(200,146,42,0.3);}
.badge{display:inline-flex;align-items:center;font-family:'Cinzel',serif;font-size:0.6rem;font-weight:700;padding:2px 8px;border-radius:2px;letter-spacing:1.5px;text-transform:uppercase;}
.badge-open{background:rgba(45,107,45,0.25);color:var(--green3);border:1px solid rgba(45,107,45,0.4);}
.badge-finished{background:rgba(100,90,70,0.2);color:var(--text3);border:1px solid rgba(100,90,70,0.3);}
.badge-type{background:rgba(200,146,42,0.1);color:var(--gold2);border:1px solid rgba(200,146,42,0.25);}
.filter-bar{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:18px;}
.filter-btn{background:rgba(0,0,0,0.3);border:1px solid var(--border);color:var(--text2);font-family:'Cinzel',serif;font-size:0.68rem;font-weight:600;padding:5px 14px;border-radius:2px;cursor:pointer;transition:all 0.15s;letter-spacing:1px;text-transform:uppercase;}
.filter-btn:hover{color:var(--gold2);border-color:var(--border2);}
.filter-btn.active{background:rgba(200,146,42,0.12);border-color:var(--gold);color:var(--gold2);}
.match-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
@media(max-width:1200px){.match-grid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:700px){.match-grid{grid-template-columns:1fr;}}
.match-card{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;transition:border-color 0.2s,box-shadow 0.2s,transform 0.2s;animation:fadeUp 0.3s ease both;display:flex;flex-direction:column;}
.match-card:hover{border-color:var(--border2);box-shadow:0 8px 32px rgba(0,0,0,0.5);transform:translateY(-2px);}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}
.match-head{padding:10px 14px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);background:linear-gradient(180deg,rgba(0,0,0,0.3),rgba(0,0,0,0.15));}
.match-head-title{font-family:'Cinzel',serif;font-size:0.85rem;font-weight:700;color:var(--text);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.match-body{padding:14px;flex:1;}
.versus{display:grid;grid-template-columns:1fr 36px 1fr;gap:6px;align-items:center;margin-bottom:14px;padding:10px;background:rgba(0,0,0,0.2);border-radius:2px;border:1px solid rgba(74,63,34,0.5);}
.team{text-align:center;}
.team-name{font-family:'Cinzel',serif;font-weight:700;font-size:0.82rem;color:var(--text);margin-bottom:2px;}
.team-exp{font-size:0.7rem;color:var(--text3);font-style:italic;}
.vs-text{text-align:center;font-family:'Cinzel',serif;font-weight:900;font-size:0.9rem;color:var(--border2);}
.odds-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;}
.odds-btn{padding:10px 8px;border-radius:2px;text-align:center;cursor:pointer;border:1px solid var(--border);background:rgba(0,0,0,0.3);transition:all 0.15s;}
.odds-btn:hover{border-color:var(--gold);}
.odds-btn.selected{border-color:var(--gold);background:rgba(200,146,42,0.1);}
.odds-btn.winner{border-color:var(--green2);background:rgba(45,107,45,0.15);}
.odds-btn.loser{opacity:0.45;}
.odds-label{font-family:'Cinzel',serif;font-size:0.6rem;font-weight:600;color:var(--text2);letter-spacing:1px;margin-bottom:4px;text-transform:uppercase;}
.odds-value{font-family:'Cinzel',serif;font-size:1.4rem;font-weight:900;color:var(--gold2);}
.odds-btn.winner .odds-value{color:var(--green3);}
.bet-row{display:flex;gap:8px;}
.bet-row .form-input{flex:1;padding:8px 10px;font-size:0.9rem;}
.match-footer{padding:8px 14px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.2);flex-wrap:wrap;gap:6px;margin-top:auto;}
.match-footer-stat{font-size:0.7rem;color:var(--text3);font-style:italic;}
.alert{padding:8px 12px;border-radius:2px;font-size:0.88rem;margin-top:8px;}
.alert-err{background:rgba(139,28,28,0.2);border:1px solid rgba(139,28,28,0.4);color:#e87070;}
.alert-ok{background:rgba(45,107,45,0.2);border:1px solid rgba(45,107,45,0.4);color:var(--green3);}
.mb-12{margin-bottom:12px;}.mb-16{margin-bottom:16px;}
.resolve-section{display:flex;align-items:center;gap:8px;padding:10px 14px;background:rgba(200,146,42,0.05);border-top:1px solid rgba(200,146,42,0.15);flex-wrap:wrap;}
.resolve-label{font-family:'Cinzel',serif;font-size:0.65rem;color:var(--text3);letter-spacing:1px;text-transform:uppercase;flex-shrink:0;}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,0.8);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px;}
.modal{background:var(--panel);border:1px solid var(--border2);border-radius:var(--radius);width:100%;max-width:500px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.8);position:relative;}
.modal::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--gold),transparent);}
.modal-head{display:flex;align-items:center;justify-content:space-between;padding:20px 22px 0;margin-bottom:18px;}
.modal-title{font-family:'Cinzel',serif;font-size:1.1rem;font-weight:900;color:var(--gold2);letter-spacing:2px;text-transform:uppercase;}
.modal-close{background:rgba(0,0,0,0.3);border:1px solid var(--border);color:var(--text2);width:30px;height:30px;border-radius:2px;cursor:pointer;font-size:1rem;display:flex;align-items:center;justify-content:center;transition:all 0.15s;}
.modal-close:hover{color:var(--gold);border-color:var(--border2);}
.modal-body{padding:0 22px 22px;}
.modal-hint{font-size:0.82rem;color:var(--text3);margin-bottom:14px;line-height:1.5;font-style:italic;}
.auth-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:var(--stone);background-image:radial-gradient(ellipse at center,rgba(200,146,42,0.06) 0%,transparent 70%);}
.auth-box{width:100%;max-width:420px;}
.auth-logo{text-align:center;margin-bottom:28px;}
.auth-logo h1{font-family:'Cinzel',serif;font-size:2.4rem;font-weight:900;letter-spacing:4px;color:var(--gold2);text-shadow:0 0 30px rgba(200,146,42,0.4);text-transform:uppercase;}
.auth-logo p{color:var(--text2);font-size:0.9rem;margin-top:6px;font-style:italic;}
.auth-ornament{font-family:'Cinzel',serif;color:var(--border2);letter-spacing:6px;font-size:0.8rem;margin:10px 0 4px;}
.auth-tabs{display:flex;border-bottom:1px solid var(--border);margin-bottom:20px;}
.auth-tab{flex:1;padding:10px;background:none;border:none;border-bottom:2px solid transparent;margin-bottom:-1px;font-family:'Cinzel',serif;font-size:0.75rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--text2);cursor:pointer;transition:all 0.15s;}
.auth-tab.active{color:var(--gold2);border-bottom-color:var(--gold);}
.auth-footer{text-align:center;margin-top:10px;font-size:0.82rem;color:var(--text3);font-style:italic;}
.admin-bar{background:linear-gradient(135deg,rgba(139,28,28,0.12),rgba(180,40,40,0.06));border:1px solid rgba(139,28,28,0.35);border-radius:var(--radius);padding:12px 18px;margin-bottom:20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;}
.admin-bar-text{flex:1;font-size:0.88rem;color:#e87070;}
.admin-bar-text strong{display:block;font-family:'Cinzel',serif;font-size:0.85rem;letter-spacing:2px;text-transform:uppercase;margin-bottom:2px;}
.lb-row{display:flex;align-items:center;gap:14px;padding:12px 0;border-bottom:1px solid rgba(74,63,34,0.5);}
.lb-row:last-child{border-bottom:none;}
.lb-rank{font-family:'Cinzel',serif;font-size:1.1rem;font-weight:900;width:36px;text-align:center;flex-shrink:0;}
.lb-avatar{width:40px;height:40px;border-radius:50%;background:var(--stone3);border:2px solid var(--border);display:flex;align-items:center;justify-content:center;font-family:'Cinzel',serif;font-size:1.1rem;font-weight:700;flex-shrink:0;}
.lb-info{flex:1;min-width:0;}
.lb-name{font-family:'Cinzel',serif;font-weight:600;font-size:0.88rem;color:var(--text);}
.lb-sub{font-size:0.75rem;color:var(--text3);font-style:italic;margin-top:1px;}
.lb-coins{font-family:'Cinzel',serif;font-size:1rem;font-weight:700;color:var(--gold2);white-space:nowrap;}
.profile-hero{display:flex;align-items:flex-start;gap:16px;margin-bottom:20px;flex-wrap:wrap;}
.profile-avatar{width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--stone4),var(--stone2));border:2px solid var(--border2);display:flex;align-items:center;justify-content:center;font-family:'Cinzel',serif;font-size:2rem;font-weight:900;color:var(--gold2);flex-shrink:0;}
.profile-info{flex:1;min-width:0;}
.profile-name{font-family:'Cinzel',serif;font-size:1.5rem;font-weight:900;color:var(--gold2);letter-spacing:1px;}
.profile-bio{font-size:0.88rem;color:var(--text2);margin-top:4px;font-style:italic;}
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;}
.stat-card{background:rgba(0,0,0,0.2);border:1px solid var(--border);border-radius:2px;padding:16px;text-align:center;}
.stat-val{font-family:'Cinzel',serif;font-size:1.6rem;font-weight:900;color:var(--gold2);}
.stat-val.green{color:var(--green3);}
.stat-val.blue{color:#6bb8ff;}
.stat-label{font-family:'Cinzel',serif;font-size:0.6rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:2px;margin-top:4px;}
.bet-hist-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid rgba(74,63,34,0.5);flex-wrap:wrap;}
.bet-hist-row:last-child{border-bottom:none;}
.bet-match{font-family:'Cinzel',serif;font-weight:600;font-size:0.82rem;color:var(--text);}
.bet-detail{font-size:0.78rem;color:var(--text3);margin-top:2px;font-style:italic;}
.bet-result{font-family:'Cinzel',serif;font-weight:700;font-size:0.82rem;white-space:nowrap;}
.text-green{color:var(--green3);}.text-red{color:#e87070;}.text-muted{color:var(--text2);}
.empty-state{text-align:center;padding:60px 20px;color:var(--text3);}
.empty-state h3{font-family:'Cinzel',serif;font-size:1.1rem;font-weight:700;color:var(--text2);margin-bottom:8px;letter-spacing:1px;}
.empty-state p{font-size:0.88rem;font-style:italic;}
.empty-icon{font-size:2.5rem;margin-bottom:12px;opacity:0.4;}
.loading-wrap{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--stone);gap:16px;}
.loading-text{font-family:'Cinzel',serif;color:var(--gold);letter-spacing:4px;font-size:1rem;}
.spinner{width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--gold);border-radius:50%;animation:spin 0.8s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}

/* ── GALLERY ── */
.gallery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px;}
.gallery-card{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;transition:border-color 0.2s,transform 0.2s;animation:fadeUp 0.3s ease both;}
.gallery-card:hover{border-color:var(--border2);transform:translateY(-2px);}
.gallery-img{width:100%;height:200px;object-fit:cover;display:block;}
.gallery-footer{padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:8px;}
.gallery-user{font-family:'Cinzel',serif;font-size:0.75rem;color:var(--gold2);font-weight:700;}
.gallery-caption{font-size:0.82rem;color:var(--text2);font-style:italic;padding:0 14px 10px;}
.upload-area{border:2px dashed var(--border2);border-radius:var(--radius);padding:32px;text-align:center;cursor:pointer;transition:all 0.2s;background:rgba(0,0,0,0.2);margin-bottom:16px;}
.upload-area:hover{border-color:var(--gold);background:rgba(200,146,42,0.05);}
.upload-area p{color:var(--text3);font-size:0.88rem;font-style:italic;margin-top:8px;}
.upload-icon{font-size:2rem;opacity:0.5;}
.upload-preview{width:100%;max-height:200px;object-fit:cover;border-radius:2px;margin-bottom:12px;border:1px solid var(--border);}

.flex{display:flex;}.gap-8{gap:8px;}.gap-12{gap:12px;}.divider{height:1px;background:var(--border);margin:16px 0;}
@media(max-width:768px){.nav-tabs{display:none;}.hamburger{display:flex;}.page{padding:16px;}.stats-grid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:480px){.stats-grid{grid-template-columns:1fr 1fr;}.section-header{flex-direction:column;align-items:flex-start;}.nav-brand{font-size:1rem;}.modal-head,.modal-body{padding-left:16px;padding-right:16px;}}
`;

const IcoX = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcoPlus = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcoMenu = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
const IcoCoin = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M9 9h4.5a2.5 2.5 0 0 1 0 5H9"/></svg>;

export default function App() {
  const [users, setUsers] = useState({});
  const [matches, setMatches] = useState([]);
  const [bets, setBets] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [tab, setTab] = useState("matches");
  const [authMode, setAuthMode] = useState("login");
  const [loading, setLoading] = useState(true);
  const [showNewMatch, setShowNewMatch] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("aoe2_current_user");
    if (saved) setCurrentUser(JSON.parse(saved));
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: u }, { data: m }, { data: b }, { data: g }] = await Promise.all([
      sb.from("users").select("*"),
      sb.from("matches").select("*").order("created_at", { ascending: false }),
      sb.from("bets").select("*"),
      sb.from("gallery").select("*").order("created_at", { ascending: false }),
    ]);
    const usersMap = {};
    (u || []).forEach(usr => usersMap[usr.username] = usr);
    setUsers(usersMap);
    setMatches(m || []);
    setBets(b || []);
    setGallery(g || []);
    setLoading(false);
  };

  const refreshUser = async (username) => {
    const { data } = await sb.from("users").select("*").eq("username", username).single();
    if (data) { setCurrentUser(data); localStorage.setItem("aoe2_current_user", JSON.stringify(data)); }
  };

  const logout = () => { setCurrentUser(null); localStorage.removeItem("aoe2_current_user"); setTab("matches"); };
  const isAdmin = currentUser?.username === ADMIN_USERNAME;
  const navTo = (t) => { setTab(t); setMobileOpen(false); };

  const placeBet = async (matchId, side, amount) => {
    if (!currentUser || amount <= 0 || currentUser.coins < amount) return false;
    if (bets.find(b => b.match_id === matchId && b.username === currentUser.username)) return false;
    const { error: e1 } = await sb.from("bets").insert({ id: `b${Date.now()}`, match_id: matchId, username: currentUser.username, side, amount });
    if (e1) return false;
    await sb.from("users").update({ coins: currentUser.coins - amount }).eq("username", currentUser.username);
    await refreshUser(currentUser.username);
    await loadAll();
    return true;
  };

  const resolveMatch = async (matchId, winner) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;
    const { oddsA, oddsB } = calcOdds(match.team_a, match.team_b);
    const winOdds = winner === "A" ? oddsA : oddsB;
    for (const bet of bets.filter(b => b.match_id === matchId && b.side === winner)) {
      const user = users[bet.username];
      if (user) await sb.from("users").update({ coins: user.coins + Math.floor(bet.amount * winOdds) }).eq("username", bet.username);
    }
    await sb.from("matches").update({ status: "finished", winner }).eq("id", matchId);
    if (currentUser) await refreshUser(currentUser.username);
    await loadAll();
  };

  if (loading) return <div className="loading-wrap"><style>{css}</style><div className="spinner"></div><div className="loading-text">UČITAVANJE...</div></div>;
  if (!currentUser) return <div className="auth-wrap"><style>{css}</style><AuthScreen mode={authMode} setMode={setAuthMode} users={users} loadAll={loadAll} setCurrentUser={(u) => { setCurrentUser(u); localStorage.setItem("aoe2_current_user", JSON.stringify(u)); }} /></div>;

  const tabs = [
    { id: "matches", label: "⚔ Mečevi" },
    { id: "gallery", label: "🖼 Galerija" },
    { id: "leaderboard", label: "🏆 Ljestvica" },
    { id: "profile", label: "👤 Profil" },
  ];

  return (
    <div className="app">
      <style>{css}</style>
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-brand">⚔ AoE2 ARENA</div>
          <div className="nav-tabs">{tabs.map(t => <button key={t.id} className={`nav-tab ${tab === t.id ? "active" : ""}`} onClick={() => navTo(t.id)}>{t.label}</button>)}</div>
          <div className="nav-right">
            <div className="coins-badge"><IcoCoin /> {currentUser.coins?.toLocaleString()} G</div>
            {isAdmin && <span className="admin-badge">ADMIN</span>}
            <button className="btn btn-ghost btn-sm" onClick={logout}>Odjava</button>
            <button className="hamburger" onClick={() => setMobileOpen(o => !o)}><IcoMenu /></button>
          </div>
        </div>
      </nav>
      <div className={`mobile-menu ${mobileOpen ? "open" : ""}`}>
        {tabs.map(t => <button key={t.id} className={`mobile-tab ${tab === t.id ? "active" : ""}`} onClick={() => navTo(t.id)}>{t.label}</button>)}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid var(--border)", marginTop: 4 }}>
          <span style={{ fontSize: "0.82rem", color: "var(--text2)" }}>{currentUser.username}</span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Odjava</button>
        </div>
      </div>
      <div className="page">
        {tab === "matches" && <MatchesTab matches={matches} bets={bets} currentUser={currentUser} placeBet={placeBet} resolveMatch={resolveMatch} isAdmin={isAdmin} showNewMatch={showNewMatch} setShowNewMatch={setShowNewMatch} loadAll={loadAll} users={users} />}
        {tab === "gallery" && <GalleryTab gallery={gallery} currentUser={currentUser} loadAll={loadAll} isAdmin={isAdmin} />}
        {tab === "leaderboard" && <LeaderboardTab users={users} />}
        {tab === "profile" && <ProfileTab currentUser={currentUser} bets={bets} matches={matches} loadAll={loadAll} refreshUser={refreshUser} />}
      </div>
    </div>
  );
}

// ── Auth ──────────────────────────────────────────────────────────────────────
function AuthScreen({ mode, setMode, users, loadAll, setCurrentUser }) {
  const [form, setForm] = useState({ username: "", password: "", experience: "", ranked_points: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setErr(""); setLoading(true);
    if (mode === "register") {
      if (!form.username.trim() || !form.password) { setLoading(false); return setErr("Popuni sva polja."); }
      if (users[form.username]) { setLoading(false); return setErr("Korisničko ime već postoji."); }
      const nu = { username: form.username.trim(), password: form.password, experience: parseInt(form.experience) || 0, ranked_points: parseInt(form.ranked_points) || 0, coins: INITIAL_COINS, bio: "", joined: Date.now() };
      const { error } = await sb.from("users").insert(nu);
      if (error) { setLoading(false); return setErr("Greška pri registraciji."); }
      setCurrentUser(nu); await loadAll();
    } else {
      const { data } = await sb.from("users").select("*").eq("username", form.username.trim()).single();
      if (!data || data.password !== form.password) { setLoading(false); return setErr("Pogrešno korisničko ime ili lozinka."); }
      setCurrentUser(data);
    }
    setLoading(false);
  };

  return (
    <div className="auth-box">
      <div className="auth-logo">
        <div className="auth-ornament">✦ ✦ ✦</div>
        <h1>⚔ AoE2 ARENA</h1>
        <p>Virtualna kladionica za Age of Empires II</p>
      </div>
      <div className="panel"><div className="panel-body">
        <div className="auth-tabs">
          {[["login", "Prijava"], ["register", "Registracija"]].map(([m, l]) => (
            <button key={m} className={`auth-tab ${mode === m ? "active" : ""}`} onClick={() => { setMode(m); setErr(""); }}>{l}</button>
          ))}
        </div>
        {err && <div className="alert alert-err mb-12">{err}</div>}
        <form onSubmit={submit}>
          <div className="form-group"><label className="form-label">Korisničko ime</label><input className="form-input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="Unesi ime viteza..." /></div>
          <div className="form-group"><label className="form-label">Lozinka</label><input className="form-input" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" /></div>
          {mode === "register" && <>
            <div className="form-group"><label className="form-label">Godine iskustva u AoE2</label><input className="form-input" type="number" min="0" max="30" value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))} placeholder="0" /></div>
            <div className="form-group"><label className="form-label">Ranked Points (ELO/Rating)</label><input className="form-input" type="number" min="0" value={form.ranked_points} onChange={e => setForm(f => ({ ...f, ranked_points: e.target.value }))} placeholder="0" /></div>
          </>}
          <button className="btn btn-primary btn-lg btn-full" type="submit" disabled={loading}>{loading ? "..." : mode === "login" ? "⚔ Ulaz na Arenu" : "✦ Registriraj se"}</button>
        </form>
        {mode === "register" && <p className="auth-footer">Dobivate {INITIAL_COINS.toLocaleString()} Gold za početak!</p>}
      </div></div>
    </div>
  );
}

// ── Matches ───────────────────────────────────────────────────────────────────
function MatchesTab({ matches, bets, currentUser, placeBet, resolveMatch, isAdmin, showNewMatch, setShowNewMatch, loadAll, users }) {
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

  const myBet = (id) => bets.find(b => b.match_id === id && b.username === currentUser.username);

  const handleBet = async (matchId) => {
    const side = selectedSide[matchId], amount = parseInt(betInputs[matchId] || 0);
    if (!side) return setMsg(m => ({ ...m, [matchId]: { t: "err", v: "Odaberi tim!" } }));
    if (!amount || amount < 1) return setMsg(m => ({ ...m, [matchId]: { t: "err", v: "Unesi iznos." } }));
    if (amount > currentUser.coins) return setMsg(m => ({ ...m, [matchId]: { t: "err", v: "Nedovoljno Golda." } }));
    const ok = await placeBet(matchId, side, amount);
    setMsg(m => ({ ...m, [matchId]: ok ? { t: "ok", v: `✓ Kladio si ${amount} G na Tim ${side}!` } : { t: "err", v: "Već si kladio." } }));
    if (ok) setBetInputs(b => ({ ...b, [matchId]: "" }));
  };

  return (
    <div>
      {isAdmin && <div className="admin-bar"><div className="admin-bar-text"><strong>⚡ Admin Panel</strong>Prijavljen si kao administrator.</div><button className="btn btn-primary" onClick={() => setShowNewMatch(true)}><IcoPlus /> Novi meč</button></div>}
      <div className="section-header">
        <h2 className="section-title">⚔ Mečevi</h2>
        <span style={{ fontSize: "0.78rem", color: "var(--text3)", fontStyle: "italic" }}>{filtered.length} mečeva</span>
      </div>
      <div className="filter-bar">{filters.map(f => <button key={f} className={`filter-btn ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f.toUpperCase()}</button>)}</div>
      {filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">⚔</div><h3>Nema mečeva</h3><p>{isAdmin ? "Klikni 'Novi meč' za dodavanje." : "Admin još nije dodao mečeve."}</p></div>
      ) : (
        <div className="match-grid">
          {filtered.map((match, i) => {
            const teamA = match.team_a || [], teamB = match.team_b || [];
            const { oddsA, oddsB } = calcOdds(teamA, teamB);
            const bet = myBet(match.id);
            const matchBets = bets.filter(b => b.match_id === match.id);
            const pool = matchBets.reduce((s, b) => s + b.amount, 0);
            return (
              <div key={match.id} className="match-card" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="match-head">
                  <div className="match-head-title">{match.title}</div>
                  <div className="flex gap-8"><span className="badge badge-type">{match.type}</span><span className={`badge ${match.status === "open" ? "badge-open" : "badge-finished"}`}>{match.status === "open" ? "LIVE" : "KRAJ"}</span></div>
                </div>
                <div className="match-body">
                  <div className="versus">
                    <div className="team">
                      <div className="team-name">{teamA.map(p => p.username).join(" & ")}</div>
                      <div className="team-exp">{teamA.map(p => `${p.experience || 0}g / ${p.ranked_points || 0}rp`).join(", ")}</div>
                    </div>
                    <div className="vs-text">VS</div>
                    <div className="team">
                      <div className="team-name">{teamB.map(p => p.username).join(" & ")}</div>
                      <div className="team-exp">{teamB.map(p => `${p.experience || 0}g / ${p.ranked_points || 0}rp`).join(", ")}</div>
                    </div>
                  </div>
                  <div className="odds-grid">
                    {[["A", oddsA], ["B", oddsB]].map(([side, odds]) => {
                      const isWinner = match.winner === side, isLoser = match.status === "finished" && match.winner && match.winner !== side;
                      return <div key={side} className={`odds-btn ${selectedSide[match.id] === side ? "selected" : ""} ${isWinner ? "winner" : ""} ${isLoser ? "loser" : ""}`} onClick={() => match.status === "open" && !bet && setSelectedSide(s => ({ ...s, [match.id]: side }))}><div className="odds-label">Tim {side} {isWinner ? "👑" : ""}</div><div className="odds-value">{odds}x</div></div>;
                    })}
                  </div>
                  {match.status === "open" && (bet
                    ? <div className="alert alert-ok">✦ Kladio si {bet.amount} G na Tim {bet.side}</div>
                    : <><div className="bet-row"><input className="form-input" type="number" min="1" max={currentUser.coins} placeholder="Iznos (Gold)..." value={betInputs[match.id] || ""} onChange={e => setBetInputs(b => ({ ...b, [match.id]: e.target.value }))} /><button className="btn btn-primary" onClick={() => handleBet(match.id)}>Kladiti</button></div>{msg[match.id] && <div className={`alert ${msg[match.id].t === "ok" ? "alert-ok" : "alert-err"}`}>{msg[match.id].v}</div>}</>
                  )}
                  {match.status === "finished" && <div style={{ fontSize: "0.8rem", color: "var(--text3)", marginTop: 8, fontStyle: "italic" }}>Pobijedio: <span style={{ color: "var(--green3)", fontStyle: "normal", fontFamily: "'Cinzel',serif" }}>Tim {match.winner}</span>{bet && <span style={{ marginLeft: 8 }}>• Tim {bet.side} {bet.side === match.winner ? <span className="text-green">✓ Dobio</span> : <span className="text-red">✗ Izgubio</span>}</span>}</div>}
                </div>
                {isAdmin && match.status === "open" && <div className="resolve-section"><span className="resolve-label">Pobjednik:</span><button className="btn btn-success btn-sm" onClick={() => resolveMatch(match.id, "A")}>Tim A</button><button className="btn btn-success btn-sm" onClick={() => resolveMatch(match.id, "B")}>Tim B</button></div>}
                <div className="match-footer"><span className="match-footer-stat">{matchBets.length} klađenja</span><span className="match-footer-stat">Fond: {pool.toLocaleString()} G</span></div>
              </div>
            );
          })}
        </div>
      )}
      {showNewMatch && <NewMatchModal onClose={() => setShowNewMatch(false)} loadAll={loadAll} users={users} />}
    </div>
  );
}

// ── New Match Modal ───────────────────────────────────────────────────────────
function NewMatchModal({ onClose, loadAll, users }) {
  const [form, setForm] = useState({ title: "", type: "1v1", teamA: "", teamB: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const sizeA = parseInt(form.type.split("v")[0]), sizeB = parseInt(form.type.split("v")[1]);
  const parse = (str) => str.split(",").map(s => s.trim()).filter(Boolean).map(name => {
    const u = users[name];
    return u ? { username: u.username, experience: u.experience || 0, ranked_points: u.ranked_points || 0 } : { username: name, experience: 0, ranked_points: 0 };
  });
  const create = async () => {
    if (!form.title.trim()) return setErr("Unesi naziv meča.");
    const pA = parse(form.teamA), pB = parse(form.teamB);
    if (pA.length !== sizeA) return setErr(`Tim A treba ${sizeA} igrač(a) za ${form.type}.`);
    if (pB.length !== sizeB) return setErr(`Tim B treba ${sizeB} igrač(a) za ${form.type}.`);
    setLoading(true);
    const { error } = await sb.from("matches").insert({ id: `m${Date.now()}`, type: form.type, title: form.title.trim(), status: "open", team_a: pA, team_b: pB, winner: null, created_at: Date.now() });
    if (error) { setLoading(false); return setErr("Greška pri kreiranju meča."); }
    await loadAll(); setLoading(false); onClose();
  };
  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head"><span className="modal-title">⚔ Novi meč</span><button className="modal-close" onClick={onClose}><IcoX /></button></div>
        <div className="modal-body">
          {err && <div className="alert alert-err mb-12">{err}</div>}
          <div className="form-group"><label className="form-label">Naziv meča</label><input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Npr. Bitka za Antioch..." /></div>
          <div className="form-group"><label className="form-label">Format</label><select className="form-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value, teamA: "", teamB: "" }))}>{["1v1", "2v2", "1v2", "1v3", "2v3", "3v3"].map(t => <option key={t}>{t}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Tim A — {sizeA} igrač(a), odvoji zarezom</label><input className="form-input" value={form.teamA} onChange={e => setForm(f => ({ ...f, teamA: e.target.value }))} placeholder={Array.from({ length: sizeA }, (_, i) => `Igrač${i + 1}`).join(", ")} /></div>
          <div className="form-group"><label className="form-label">Tim B — {sizeB} igrač(a), odvoji zarezom</label><input className="form-input" value={form.teamB} onChange={e => setForm(f => ({ ...f, teamB: e.target.value }))} placeholder={Array.from({ length: sizeB }, (_, i) => `Igrač${i + 1}`).join(", ")} /></div>
          <p className="modal-hint">Kvote se računaju prema iskustvu (60%) i ranked points (40%). Registrirani igrači automatski prenose podatke.</p>
          <div className="flex gap-8"><button className="btn btn-primary" onClick={create} disabled={loading}>{loading ? "..." : <><IcoPlus /> Kreiraj meč</>}</button><button className="btn btn-ghost" onClick={onClose}>Odustani</button></div>
        </div>
      </div>
    </div>
  );
}

// ── Gallery ───────────────────────────────────────────────────────────────────
function GalleryTab({ gallery, currentUser, loadAll, isAdmin }) {
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [err, setErr] = useState("");
  const fileRef = useRef();

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return setErr("Slika mora biti manja od 5MB.");
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setErr("");
  };

  const upload = async () => {
    if (!file) return setErr("Odaberi sliku.");
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${currentUser.username}_${Date.now()}.${ext}`;
    const { error: upErr } = await sb.storage.from("gallery").upload(path, file);
    if (upErr) { setUploading(false); return setErr("Greška pri uploadu: " + upErr.message); }
    const { data: urlData } = sb.storage.from("gallery").getPublicUrl(path);
    await sb.from("gallery").insert({ id: `g${Date.now()}`, username: currentUser.username, url: urlData.publicUrl, caption: caption.trim(), created_at: Date.now() });
    setFile(null); setPreview(null); setCaption(""); setUploading(false);
    await loadAll();
  };

  const deletePhoto = async (item) => {
    await sb.from("gallery").delete().eq("id", item.id);
    await loadAll();
  };

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">🖼 Galerija</h2>
        <span style={{ fontSize: "0.78rem", color: "var(--text3)", fontStyle: "italic" }}>{gallery.length} slika</span>
      </div>

      <div className="panel mb-16"><div className="panel-body">
        <div style={{ fontFamily: "'Cinzel',serif", fontSize: "0.85rem", color: "var(--gold2)", marginBottom: 12, letterSpacing: 1 }}>✦ Dodaj svoju sliku</div>
        {err && <div className="alert alert-err mb-12">{err}</div>}
        {preview && <img src={preview} className="upload-preview" alt="preview" />}
        <div className="upload-area" onClick={() => fileRef.current.click()}>
          <div className="upload-icon">📁</div>
          <p>{file ? file.name : "Klikni za odabir slike (max 5MB)"}</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
        <div className="form-group"><label className="form-label">Opis slike (opcionalno)</label><input className="form-input" value={caption} onChange={e => setCaption(e.target.value)} placeholder="Npr. Moja pobjeda u finalu..." /></div>
        <button className="btn btn-primary" onClick={upload} disabled={uploading || !file}>{uploading ? "Uploading..." : "📤 Objavi sliku"}</button>
      </div></div>

      {gallery.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🖼</div><h3>Nema slika</h3><p>Budi prvi koji će objaviti sliku!</p></div>
      ) : (
        <div className="gallery-grid">
          {gallery.map((item, i) => (
            <div key={item.id} className="gallery-card" style={{ animationDelay: `${i * 0.04}s` }}>
              <img src={item.url} className="gallery-img" alt={item.caption || "gallery"} onError={e => e.target.style.display = "none"} />
              {item.caption && <div className="gallery-caption">{item.caption}</div>}
              <div className="gallery-footer">
                <span className="gallery-user">⚔ {item.username}</span>
                {(isAdmin || item.username === currentUser.username) && (
                  <button className="btn btn-danger btn-sm" onClick={() => deletePhoto(item)}>Obriši</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
function LeaderboardTab({ users }) {
  const sorted = Object.values(users).sort((a, b) => b.coins - a.coins);
  const rankColors = ["#FFD700", "#C0C0C0", "#CD7F32"];
  return (
    <div>
      <div className="section-header"><h2 className="section-title">🏆 Ljestvica</h2></div>
      <div className="panel"><div className="panel-body">
        {sorted.length === 0 ? <div className="empty-state" style={{ padding: "40px 0" }}><p>Nema registriranih igrača.</p></div> : sorted.map((u, i) => (
          <div key={u.username} className="lb-row">
            <div className="lb-rank" style={{ color: rankColors[i] || "var(--text3)" }}>#{i + 1}</div>
            <div className="lb-avatar" style={{ borderColor: rankColors[i] || "var(--border)", color: rankColors[i] || "var(--text2)" }}>{u.username[0].toUpperCase()}</div>
            <div className="lb-info">
              <div className="lb-name">{u.username} {u.username === ADMIN_USERNAME && <span className="admin-badge">ADMIN</span>}</div>
              <div className="lb-sub">{u.experience || 0} god. iskustva · {(u.ranked_points || 0).toLocaleString()} RP</div>
            </div>
            <div className="lb-coins"><IcoCoin /> {u.coins?.toLocaleString()} G</div>
          </div>
        ))}
      </div></div>
    </div>
  );
}

// ── Profile ───────────────────────────────────────────────────────────────────
function ProfileTab({ currentUser, bets, matches, loadAll, refreshUser }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ experience: currentUser.experience || 0, ranked_points: currentUser.ranked_points || 0, bio: currentUser.bio || "" });
  const [saved, setSaved] = useState(false);
  const myBets = bets.filter(b => b.username === currentUser.username);
  const wonBets = myBets.filter(b => { const m = matches.find(m => m.id === b.match_id); return m?.winner === b.side; });

  const save = async () => {
    await sb.from("users").update({ experience: parseInt(form.experience) || 0, ranked_points: parseInt(form.ranked_points) || 0, bio: form.bio }).eq("username", currentUser.username);
    await refreshUser(currentUser.username);
    setEditing(false); setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <div className="section-header"><h2 className="section-title">👤 Moj Profil</h2></div>
      <div className="panel mb-16"><div className="panel-body">
        <div className="profile-hero">
          <div className="profile-avatar">{currentUser.username[0].toUpperCase()}</div>
          <div className="profile-info">
            <div className="profile-name">{currentUser.username} {currentUser.username === ADMIN_USERNAME && <span className="admin-badge" style={{ verticalAlign: "middle" }}>ADMIN</span>}</div>
            <div className="profile-bio">{currentUser.bio || "Nema opisa."}</div>
            <div style={{ fontSize: "0.78rem", color: "var(--text3)", marginTop: 4, fontStyle: "italic" }}>{currentUser.experience || 0} god. iskustva · {(currentUser.ranked_points || 0).toLocaleString()} Ranked Points</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(e => !e)}>{editing ? "Zatvori" : "✦ Uredi"}</button>
        </div>
        {saved && <div className="alert alert-ok">✓ Profil ažuriran!</div>}
        {editing && <div>
          <div className="divider" />
          <div className="form-group"><label className="form-label">Godine iskustva u AoE2</label><input className="form-input" type="number" min="0" max="30" value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Ranked Points (ELO/Rating)</label><input className="form-input" type="number" min="0" value={form.ranked_points} onChange={e => setForm(f => ({ ...f, ranked_points: e.target.value }))} placeholder="Unesi svoje ranked points..." /></div>
          <div className="form-group"><label className="form-label">Opis profila</label><textarea className="form-input" value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="Nešto o sebi..." /></div>
          <button className="btn btn-primary" onClick={save}>Spremi promjene</button>
        </div>}
      </div></div>

      <div className="stats-grid mb-16">
        {[
          { val: currentUser.coins?.toLocaleString(), label: "Gold", cls: "" },
          { val: myBets.length, label: "Klađenja", cls: "" },
          { val: wonBets.length, label: "Pobjede", cls: "green" },
          { val: (currentUser.ranked_points || 0).toLocaleString(), label: "Ranked RP", cls: "blue" },
        ].map(({ val, label, cls }) => (
          <div key={label} className="stat-card"><div className={`stat-val ${cls}`}>{val}</div><div className="stat-label">{label}</div></div>
        ))}
      </div>

      <div className="section-header"><h2 className="section-title" style={{ fontSize: "1rem" }}>Povijest klađenja</h2></div>
      <div className="panel"><div className="panel-body">
        {myBets.length === 0 ? <div className="empty-state" style={{ padding: "32px 0" }}><p>Još nisi postavio nijedan bet.</p></div> : [...myBets].reverse().map(bet => {
          const match = matches.find(m => m.id === bet.match_id); if (!match) return null;
          const { oddsA, oddsB } = calcOdds(match.team_a || [], match.team_b || []);
          const odds = bet.side === "A" ? oddsA : oddsB, finished = match.status === "finished", won = match.winner === bet.side;
          return <div key={bet.id} className="bet-hist-row">
            <div><div className="bet-match">{match.title}</div><div className="bet-detail">Tim {bet.side} · {odds}x kvota · {bet.amount} G ulog</div></div>
            <div className="bet-result">{!finished && <span className="text-muted">U tijeku</span>}{finished && won && <span className="text-green">+{Math.floor(bet.amount * odds)} G ✓</span>}{finished && !won && <span className="text-red">-{bet.amount} G ✗</span>}</div>
          </div>;
        })}
      </div></div>
    </div>
  );
}
