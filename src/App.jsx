import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://iwnpfraobzvigbhtgxjx.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3bnBmcmFvYnp2aWdiaHRneGp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MTExMzYsImV4cCI6MjA4NzA4NzEzNn0.Ecemy_PipgWNUJXv3T0CvIA0umwug_4B1wams-Ig34k";
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN = "admin";
const INITIAL_COINS = 1000;
const DAILY_BONUS = 50;
const CIVS = ["Franks","Britons","Byzantines","Celts","Chinese","Goths","Japanese","Mongols","Persians","Saracens","Spanish","Teutons","Turks","Vikings","Aztecs","Mayans","Huns","Koreans","Slavs","Berbers","Incas","Italians","Magyars","Malians","Portuguese","Cumans","Lithuanians"];
const ACHIEVEMENTS_DEF = {
  first_bet:  { label:"🎯 Prvi Bet",      desc:"Postavio si prvi bet" },
  first_win:  { label:"🏆 Prva Pobjeda",  desc:"Pobijedio si u prvom klađenju" },
  bet_10:     { label:"🎲 Kockar",         desc:"10 klađenja ukupno" },
  bet_50:     { label:"🎰 Profesionalac",  desc:"50 klađenja ukupno" },
  millionaire:{ label:"💰 Millionaire",   desc:"Dostigao 10.000 Gold" },
  streak_3:   { label:"🔥 Hot Streak",     desc:"3 pobjede zaredom" },
  streak_5:   { label:"⚡ Unstoppable",    desc:"5 pobjeda zaredom" },
  all_in_win: { label:"🃏 All-In Heroj",  desc:"Pobijedio all-in bet" },
  social:     { label:"💬 Društvenjak",   desc:"Poslao 10 komentara" },
  rich:       { label:"💎 Bogataš",       desc:"Dostigao 50.000 Gold" },
};

function getTitle(coins) {
  if(coins>=50000)return"👑 Kralj";
  if(coins>=20000)return"🏰 Baron";
  if(coins>=10000)return"⚔ Templar";
  if(coins>=5000) return"🛡 Vitez";
  if(coins>=2000) return"⚔ Vojnik";
  return"🧑‍🌾 Serf";
}

function calcOddsBase(teamA,teamB){
  const score=(u)=>(u.experience||0)*0.6+((u.ranked_points||0)/100)*0.4;
  const avgA=Math.max(0.5,teamA.reduce((s,u)=>s+score(u),0)/teamA.length);
  const avgB=Math.max(0.5,teamB.reduce((s,u)=>s+score(u),0)/teamB.length);
  const total=avgA+avgB;
  return{oddsA:Math.max(1.05,+(1/(avgA/total)).toFixed(2)),oddsB:Math.max(1.05,+(1/(avgB/total)).toFixed(2))};
}

function calcLiveOdds(teamA,teamB,bets,matchId){
  const base=calcOddsBase(teamA,teamB);
  const mb=bets.filter(b=>b.match_id===matchId);
  const totA=mb.filter(b=>b.side==="A").reduce((s,b)=>s+b.amount,0);
  const totB=mb.filter(b=>b.side==="B").reduce((s,b)=>s+b.amount,0);
  if(!totA&&!totB)return base;
  const total=totA+totB;
  const liveA=total>0?Math.max(1.05,+((total/Math.max(totA,1))*0.9).toFixed(2)):base.oddsA;
  const liveB=total>0?Math.max(1.05,+((total/Math.max(totB,1))*0.9).toFixed(2)):base.oddsB;
  return{oddsA:liveA,oddsB:liveB};
}

function timeAgo(ts){
  const s=Math.floor((Date.now()-ts)/1000);
  if(s<60)return"upravo"; if(s<3600)return`${Math.floor(s/60)}min`;
  if(s<86400)return`${Math.floor(s/3600)}h`; return`${Math.floor(s/86400)}d`;
}

function isOnline(lastSeen){return lastSeen&&Date.now()-lastSeen<300000;}

function playSound(type,on){
  if(!on)return;
  try{
    const ctx=new(window.AudioContext||window.webkitAudioContext)();
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.connect(g);g.connect(ctx.destination);
    if(type==="click"){o.frequency.value=800;g.gain.setValueAtTime(0.08,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.08);o.start();o.stop(ctx.currentTime+0.08);}
    else if(type==="win"){[523,659,784,1047].forEach((f,i)=>{const o2=ctx.createOscillator(),g2=ctx.createGain();o2.connect(g2);g2.connect(ctx.destination);o2.frequency.value=f;g2.gain.setValueAtTime(0.12,ctx.currentTime+i*0.12);g2.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+i*0.12+0.2);o2.start(ctx.currentTime+i*0.12);o2.stop(ctx.currentTime+i*0.12+0.2);});}
    else if(type==="lose"){o.frequency.setValueAtTime(300,ctx.currentTime);o.frequency.exponentialRampToValueAtTime(150,ctx.currentTime+0.3);g.gain.setValueAtTime(0.12,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.3);o.start();o.stop(ctx.currentTime+0.3);}
    else if(type==="bet"){o.frequency.setValueAtTime(500,ctx.currentTime);o.frequency.setValueAtTime(800,ctx.currentTime+0.06);g.gain.setValueAtTime(0.1,ctx.currentTime);g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.15);o.start();o.stop(ctx.currentTime+0.15);}
  }catch{}
}

function Confetti({active}){
  const ref=useRef();
  useEffect(()=>{
    if(!active)return;
    const canvas=ref.current;if(!canvas)return;
    const ctx=canvas.getContext("2d");
    canvas.width=window.innerWidth;canvas.height=window.innerHeight;
    const pieces=Array.from({length:120},()=>({x:Math.random()*canvas.width,y:-10,w:Math.random()*10+5,h:Math.random()*6+3,color:["#e8b84b","#52b352","#6bb8ff","#ff6b6b","#ffd875"][Math.floor(Math.random()*5)],vx:(Math.random()-0.5)*4,vy:Math.random()*4+2,rot:Math.random()*360,rv:(Math.random()-0.5)*8}));
    let frame;
    const draw=()=>{ctx.clearRect(0,0,canvas.width,canvas.height);pieces.forEach(p=>{ctx.save();ctx.translate(p.x+p.w/2,p.y+p.h/2);ctx.rotate(p.rot*Math.PI/180);ctx.fillStyle=p.color;ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore();p.x+=p.vx;p.y+=p.vy;p.rot+=p.rv;p.vy+=0.05;});if(pieces.some(p=>p.y<canvas.height))frame=requestAnimationFrame(draw);};
    draw();return()=>cancelAnimationFrame(frame);
  },[active]);
  if(!active)return null;
  return<canvas ref={ref} style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:9999}}/>;
}

function CoinChart({history}){
  if(!history||history.length<2)return<div style={{color:"var(--text3)",fontStyle:"italic",fontSize:"0.85rem",padding:"20px 0"}}>Nema dovoljno podataka za graf.</div>;
  const W=500,H=120,pad=10;
  const vals=history.map(h=>h.coins);
  const min=Math.min(...vals),max=Math.max(...vals);
  const range=max-min||1;
  const pts=history.map((h,i)=>{
    const x=pad+(i/(history.length-1))*(W-pad*2);
    const y=H-pad-(((h.coins-min)/range)*(H-pad*2));
    return`${x},${y}`;
  }).join(" ");
  return(
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height:120}}>
      <defs><linearGradient id="cg" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--gold)" stopOpacity="0.3"/><stop offset="100%" stopColor="var(--gold)" stopOpacity="0"/></linearGradient></defs>
      <polyline points={pts} fill="none" stroke="var(--gold2)" strokeWidth="2" strokeLinejoin="round"/>
      <polygon points={`${pad},${H-pad} ${pts} ${W-pad},${H-pad}`} fill="url(#cg)"/>
      <text x={pad} y={H-2} fontSize="9" fill="var(--text3)">{min.toLocaleString()} G</text>
      <text x={W-pad} y={H-2} fontSize="9" fill="var(--text3)" textAnchor="end">{max.toLocaleString()} G</text>
    </svg>
  );
}

const css=`
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Crimson+Pro:ital,wght@0,400;0,500;0,600;1,400&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{--bg:#1a1710;--bg2:#221f15;--bg3:#2c2818;--bg4:#35301e;--panel:#251f12;--border:#4a3f22;--border2:#6b5a30;--gold:#c8922a;--gold2:#e8b84b;--gold3:#ffd875;--red:#8b1c1c;--red2:#b52828;--green:#2d6b2d;--green2:#3d8b3d;--green3:#52b352;--blue2:#6bb8ff;--text:#f0e6c8;--text2:#c8b480;--text3:#7a6840;--radius:4px;}
html,body{height:100%;}
body{background:var(--bg);color:var(--text);font-family:'Crimson Pro',serif;min-height:100vh;line-height:1.5;}
body.light{--bg:#f5f0e8;--bg2:#ede5d5;--bg3:#e5dcc8;--bg4:#ddd3b8;--panel:#faf6ee;--border:#c8b480;--border2:#a89060;--gold:#8b5e1a;--gold2:#6b4010;--gold3:#4a2a00;--text:#2a1f0a;--text2:#5a4020;--text3:#8a7050;}
#root{min-height:100vh;display:flex;flex-direction:column;}
.app{min-height:100vh;display:flex;flex-direction:column;}
::-webkit-scrollbar{width:8px;}::-webkit-scrollbar-track{background:var(--bg2);}::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px;}
.nav{background:linear-gradient(180deg,#0d0b06 0%,var(--bg2) 100%);border-bottom:2px solid var(--border);position:sticky;top:0;z-index:100;box-shadow:0 4px 20px rgba(0,0,0,0.6);}
.nav::after{content:'';display:block;height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent);}
.nav-inner{display:flex;align-items:center;height:56px;padding:0 24px;}
.nav-brand{flex-shrink:0;font-family:'Cinzel',serif;font-size:1.1rem;font-weight:900;letter-spacing:3px;color:var(--gold2);padding-right:20px;border-right:1px solid var(--border);}
.nav-tabs{display:flex;flex:1;padding:0 12px;overflow-x:auto;}
.nav-tabs::-webkit-scrollbar{display:none;}
.nav-tab{background:none;border:none;cursor:pointer;font-family:'Cinzel',serif;font-size:0.68rem;font-weight:600;color:var(--text2);padding:8px 10px;letter-spacing:1px;border-bottom:2px solid transparent;margin-bottom:-2px;transition:all 0.2s;white-space:nowrap;text-transform:uppercase;}
.nav-tab:hover{color:var(--gold2);}.nav-tab.active{color:var(--gold2);border-bottom-color:var(--gold);}
.nav-right{display:flex;align-items:center;gap:6px;margin-left:auto;flex-shrink:0;}
.coins-badge{display:flex;align-items:center;gap:5px;background:rgba(200,146,42,0.1);border:1px solid var(--border);padding:4px 10px;border-radius:2px;font-family:'Cinzel',serif;font-size:0.78rem;font-weight:700;color:var(--gold2);}
.admin-badge{background:linear-gradient(135deg,var(--red),var(--red2));color:#fff;font-family:'Cinzel',serif;font-size:0.55rem;font-weight:700;padding:2px 6px;border-radius:2px;letter-spacing:1.5px;}
.icon-btn{background:none;border:1px solid var(--border);color:var(--text2);width:32px;height:32px;border-radius:2px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:0.9rem;transition:all 0.15s;position:relative;}
.icon-btn:hover{color:var(--gold2);border-color:var(--border2);}
.notif-dot{position:absolute;top:3px;right:3px;width:7px;height:7px;background:var(--red2);border-radius:50%;border:1px solid var(--bg2);}
.hamburger{display:none;background:none;border:1px solid var(--border);cursor:pointer;color:var(--text2);padding:6px;border-radius:2px;}
.mobile-menu{display:none;flex-direction:column;background:var(--bg2);border-bottom:1px solid var(--border);padding:8px 16px 12px;}
.mobile-menu.open{display:flex;}
.mobile-tab{background:none;border:none;cursor:pointer;font-family:'Cinzel',serif;font-size:0.85rem;font-weight:600;color:var(--text2);padding:10px 12px;text-align:left;letter-spacing:1px;border-bottom:1px solid var(--border);transition:color 0.15s;}
.mobile-tab:hover,.mobile-tab.active{color:var(--gold2);}
.page{flex:1;width:100%;padding:22px 26px;}
.btn{display:inline-flex;align-items:center;gap:5px;font-family:'Cinzel',serif;font-weight:700;letter-spacing:1px;border:none;cursor:pointer;border-radius:2px;transition:all 0.15s;white-space:nowrap;font-size:0.72rem;padding:7px 14px;text-transform:uppercase;}
.btn:disabled{opacity:0.4;cursor:not-allowed;}
.btn-primary{background:linear-gradient(180deg,var(--gold2) 0%,var(--gold) 100%);color:#1a1208;border:1px solid var(--gold3);box-shadow:0 2px 8px rgba(200,146,42,0.3);}
.btn-primary:hover:not(:disabled){filter:brightness(1.1);transform:translateY(-1px);}
.btn-ghost{background:rgba(128,128,128,0.08);color:var(--text2);border:1px solid var(--border);}
.btn-ghost:hover:not(:disabled){color:var(--text);border-color:var(--border2);}
.btn-success{background:rgba(45,107,45,0.25);color:var(--green3);border:1px solid rgba(45,107,45,0.4);}
.btn-success:hover:not(:disabled){background:rgba(45,107,45,0.4);}
.btn-danger{background:rgba(139,28,28,0.25);color:#e87070;border:1px solid rgba(139,28,28,0.4);}
.btn-danger:hover:not(:disabled){background:rgba(139,28,28,0.4);}
.btn-warn{background:rgba(200,146,42,0.15);color:var(--gold2);border:1px solid rgba(200,146,42,0.3);}
.btn-warn:hover:not(:disabled){background:rgba(200,146,42,0.25);}
.btn-sm{padding:4px 10px;font-size:0.66rem;}.btn-lg{padding:11px 26px;font-size:0.82rem;}.btn-full{width:100%;justify-content:center;}
.form-group{margin-bottom:13px;}
.form-label{display:block;font-family:'Cinzel',serif;font-size:0.68rem;font-weight:600;color:var(--text2);margin-bottom:4px;letter-spacing:1.5px;text-transform:uppercase;}
.form-input{width:100%;padding:8px 11px;background:var(--bg3);border:1px solid var(--border);color:var(--text);font-family:'Crimson Pro',serif;font-size:0.95rem;border-radius:2px;outline:none;transition:border-color 0.15s;}
.form-input:focus{border-color:var(--gold);box-shadow:0 0 0 2px rgba(200,146,42,0.1);}
.form-input::placeholder{color:var(--text3);opacity:0.7;}
select.form-input option{background:var(--bg3);}
textarea.form-input{resize:vertical;min-height:70px;}
.panel{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);position:relative;overflow:hidden;}
.panel::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--border2),transparent);}
.panel-body{padding:16px;}
.section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px;}
.section-title{font-family:'Cinzel',serif;font-size:1.2rem;font-weight:900;color:var(--gold2);letter-spacing:2px;text-transform:uppercase;}
.badge{display:inline-flex;align-items:center;font-family:'Cinzel',serif;font-size:0.58rem;font-weight:700;padding:2px 7px;border-radius:2px;letter-spacing:1.5px;text-transform:uppercase;}
.badge-open{background:rgba(45,107,45,0.25);color:var(--green3);border:1px solid rgba(45,107,45,0.4);}
.badge-finished{background:rgba(100,90,70,0.2);color:var(--text3);border:1px solid rgba(100,90,70,0.3);}
.badge-type{background:rgba(200,146,42,0.1);color:var(--gold2);border:1px solid rgba(200,146,42,0.25);}
.filter-bar{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:16px;}
.filter-btn{background:rgba(128,128,128,0.08);border:1px solid var(--border);color:var(--text2);font-family:'Cinzel',serif;font-size:0.65rem;font-weight:600;padding:4px 12px;border-radius:2px;cursor:pointer;transition:all 0.15s;letter-spacing:1px;text-transform:uppercase;}
.filter-btn:hover{color:var(--gold2);border-color:var(--border2);}
.filter-btn.active{background:rgba(200,146,42,0.12);border-color:var(--gold);color:var(--gold2);}
.match-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
@media(max-width:1200px){.match-grid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:700px){.match-grid{grid-template-columns:1fr;}}
.match-card{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;transition:all 0.2s;animation:fadeUp 0.3s ease both;display:flex;flex-direction:column;}
.match-card:hover{border-color:var(--border2);box-shadow:0 8px 32px rgba(0,0,0,0.3);transform:translateY(-2px);}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}
.match-head{padding:9px 13px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);background:rgba(0,0,0,0.1);}
.match-head-title{font-family:'Cinzel',serif;font-size:0.82rem;font-weight:700;color:var(--text);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.match-body{padding:13px;flex:1;}
.versus{display:grid;grid-template-columns:1fr 32px 1fr;gap:5px;align-items:center;margin-bottom:12px;padding:9px;background:rgba(0,0,0,0.1);border-radius:2px;border:1px solid var(--border);}
.team{text-align:center;}
.team-name{font-family:'Cinzel',serif;font-weight:700;font-size:0.78rem;color:var(--text);}
.team-exp{font-size:0.68rem;color:var(--text3);font-style:italic;}
.vs-text{text-align:center;font-family:'Cinzel',serif;font-weight:900;font-size:0.85rem;color:var(--border2);}
.odds-grid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:10px;}
.odds-btn{padding:9px 7px;border-radius:2px;text-align:center;cursor:pointer;border:1px solid var(--border);background:rgba(0,0,0,0.08);transition:all 0.15s;}
.odds-btn:hover{border-color:var(--gold);}
.odds-btn.selected{border-color:var(--gold);background:rgba(200,146,42,0.1);}
.odds-btn.winner{border-color:var(--green2);background:rgba(45,107,45,0.15);}
.odds-btn.loser{opacity:0.45;}
.odds-label{font-family:'Cinzel',serif;font-size:0.58rem;font-weight:600;color:var(--text2);letter-spacing:1px;margin-bottom:3px;text-transform:uppercase;}
.odds-value{font-family:'Cinzel',serif;font-size:1.3rem;font-weight:900;color:var(--gold2);}
.odds-pool{font-size:0.62rem;color:var(--text3);}
.odds-btn.winner .odds-value{color:var(--green3);}
.bet-row{display:flex;gap:7px;}.bet-row .form-input{flex:1;padding:7px 9px;font-size:0.88rem;}
.allin-row{display:flex;gap:6px;margin-top:5px;}
.match-footer{padding:7px 13px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.06);flex-wrap:wrap;gap:5px;margin-top:auto;}
.match-footer-stat{font-size:0.68rem;color:var(--text3);font-style:italic;}
.live-badge{display:inline-flex;align-items:center;gap:3px;font-family:'Cinzel',serif;font-size:0.58rem;font-weight:700;color:#ff6b6b;letter-spacing:1px;}
.live-badge::before{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;background:#ff6b6b;animation:blink 1s infinite;}
@keyframes blink{0%,100%{opacity:1;}50%{opacity:0.3;}}
.bet-limit-info{font-size:0.68rem;color:var(--text3);font-style:italic;margin-bottom:6px;}
.comments-section{border-top:1px solid var(--border);padding:10px 13px;background:rgba(0,0,0,0.05);}
.comments-title{font-family:'Cinzel',serif;font-size:0.68rem;color:var(--text3);letter-spacing:1px;text-transform:uppercase;}
.comment-row{display:flex;gap:7px;margin-bottom:7px;align-items:flex-start;}
.comment-avatar{width:24px;height:24px;border-radius:50%;border:1px solid var(--border);overflow:hidden;flex-shrink:0;margin-top:2px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-family:'Cinzel',serif;font-size:0.68rem;font-weight:700;color:var(--gold2);}
.comment-avatar img{width:100%;height:100%;object-fit:cover;}
.comment-body{flex:1;min-width:0;}
.comment-user{font-family:'Cinzel',serif;font-size:0.68rem;font-weight:700;color:var(--gold2);}
.comment-time{font-size:0.62rem;color:var(--text3);margin-left:5px;}
.comment-text{font-size:0.8rem;color:var(--text2);margin-top:1px;word-break:break-word;}
.comment-reactions{display:flex;gap:4px;margin-top:4px;flex-wrap:wrap;}
.reaction-btn{background:rgba(0,0,0,0.15);border:1px solid var(--border);border-radius:20px;padding:2px 7px;cursor:pointer;font-size:0.75rem;display:flex;align-items:center;gap:3px;transition:all 0.15s;}
.reaction-btn:hover,.reaction-btn.active{border-color:var(--gold);background:rgba(200,146,42,0.1);}
.reaction-count{font-family:'Cinzel',serif;font-size:0.6rem;color:var(--text3);}
.add-reaction-btn{background:none;border:1px dashed var(--border);border-radius:20px;padding:2px 6px;cursor:pointer;font-size:0.7rem;color:var(--text3);transition:all 0.15s;}
.add-reaction-btn:hover{border-color:var(--gold);color:var(--gold2);}
.emoji-picker{display:flex;gap:5px;background:var(--panel);border:1px solid var(--border2);border-radius:4px;padding:5px;position:absolute;z-index:50;box-shadow:0 8px 20px rgba(0,0,0,0.4);}
.emoji-option{background:none;border:none;cursor:pointer;font-size:1rem;padding:2px 4px;border-radius:3px;transition:background 0.1s;}
.emoji-option:hover{background:rgba(200,146,42,0.15);}
.comment-input-row{display:flex;gap:5px;margin-top:8px;}
.comment-input-row .form-input{flex:1;padding:6px 9px;font-size:0.82rem;}
.alert{padding:7px 11px;border-radius:2px;font-size:0.85rem;margin-top:7px;}
.alert-err{background:rgba(139,28,28,0.15);border:1px solid rgba(139,28,28,0.4);color:#e87070;}
.alert-ok{background:rgba(45,107,45,0.15);border:1px solid rgba(45,107,45,0.4);color:var(--green3);}
.alert-info{background:rgba(200,146,42,0.1);border:1px solid rgba(200,146,42,0.3);color:var(--gold2);}
.mb-12{margin-bottom:12px;}.mb-16{margin-bottom:16px;}
.resolve-section{display:flex;align-items:center;gap:7px;padding:9px 13px;background:rgba(200,146,42,0.04);border-top:1px solid rgba(200,146,42,0.15);flex-wrap:wrap;}
.resolve-label{font-family:'Cinzel',serif;font-size:0.62rem;color:var(--text3);letter-spacing:1px;text-transform:uppercase;flex-shrink:0;}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,0.78);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px;}
.modal{background:var(--panel);border:1px solid var(--border2);border-radius:var(--radius);width:100%;max-width:520px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.6);position:relative;}
.modal::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--gold),transparent);}
.modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px 0;margin-bottom:16px;}
.modal-title{font-family:'Cinzel',serif;font-size:1rem;font-weight:900;color:var(--gold2);letter-spacing:2px;text-transform:uppercase;}
.modal-close{background:rgba(128,128,128,0.1);border:1px solid var(--border);color:var(--text2);width:28px;height:28px;border-radius:2px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s;}
.modal-close:hover{color:var(--gold);border-color:var(--border2);}
.modal-body{padding:0 20px 20px;}
.notif-panel{position:absolute;top:58px;right:22px;width:320px;background:var(--panel);border:1px solid var(--border2);border-radius:var(--radius);box-shadow:0 16px 40px rgba(0,0,0,0.4);z-index:300;overflow:hidden;}
.notif-panel::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--gold),transparent);}
.notif-head{padding:10px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
.notif-head-title{font-family:'Cinzel',serif;font-size:0.75rem;font-weight:700;color:var(--gold2);letter-spacing:1px;text-transform:uppercase;}
.notif-list{max-height:300px;overflow-y:auto;}
.notif-item{padding:10px 14px;border-bottom:1px solid var(--border);display:flex;gap:8px;align-items:flex-start;}
.notif-item.unread{background:rgba(200,146,42,0.05);}
.notif-item:last-child{border-bottom:none;}
.notif-text{font-size:0.8rem;color:var(--text2);flex:1;}
.notif-time{font-size:0.65rem;color:var(--text3);margin-top:2px;font-style:italic;}
.notif-empty{padding:20px;text-align:center;font-size:0.82rem;color:var(--text3);font-style:italic;}
.auth-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:var(--bg);}
.auth-box{width:100%;max-width:420px;}
.auth-logo{text-align:center;margin-bottom:26px;}
.auth-logo h1{font-family:'Cinzel',serif;font-size:2.2rem;font-weight:900;letter-spacing:4px;color:var(--gold2);text-shadow:0 0 30px rgba(200,146,42,0.3);text-transform:uppercase;}
.auth-logo p{color:var(--text2);font-size:0.88rem;margin-top:5px;font-style:italic;}
.auth-ornament{font-family:'Cinzel',serif;color:var(--border2);letter-spacing:6px;font-size:0.78rem;margin:8px 0 3px;}
.auth-tabs{display:flex;border-bottom:1px solid var(--border);margin-bottom:18px;}
.auth-tab{flex:1;padding:9px;background:none;border:none;border-bottom:2px solid transparent;margin-bottom:-1px;font-family:'Cinzel',serif;font-size:0.72rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--text2);cursor:pointer;transition:all 0.15s;}
.auth-tab.active{color:var(--gold2);border-bottom-color:var(--gold);}
.admin-bar{background:rgba(139,28,28,0.08);border:1px solid rgba(139,28,28,0.35);border-radius:var(--radius);padding:10px 16px;margin-bottom:18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
.admin-bar-text{flex:1;font-size:0.85rem;color:#e87070;}
.admin-bar-text strong{display:block;font-family:'Cinzel',serif;font-size:0.82rem;letter-spacing:2px;text-transform:uppercase;margin-bottom:1px;}
.lb-row{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);}
.lb-row:last-child{border-bottom:none;}
.lb-rank{font-family:'Cinzel',serif;font-size:1rem;font-weight:900;width:32px;text-align:center;flex-shrink:0;}
.lb-avatar{width:38px;height:38px;border-radius:50%;background:var(--bg3);border:2px solid var(--border);display:flex;align-items:center;justify-content:center;font-family:'Cinzel',serif;font-size:1rem;font-weight:700;overflow:hidden;flex-shrink:0;}
.lb-avatar img{width:100%;height:100%;object-fit:cover;}
.lb-info{flex:1;min-width:0;}
.lb-name{font-family:'Cinzel',serif;font-weight:600;font-size:0.85rem;color:var(--text);display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.lb-sub{font-size:0.7rem;color:var(--text3);font-style:italic;margin-top:1px;}
.lb-right{display:flex;flex-direction:column;align-items:flex-end;gap:2px;}
.lb-coins{font-family:'Cinzel',serif;font-size:0.95rem;font-weight:700;color:var(--gold2);white-space:nowrap;}
.lb-winrate{font-size:0.68rem;color:var(--green3);font-style:italic;}
.online-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--green3);flex-shrink:0;}
.offline-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--text3);flex-shrink:0;}
.profile-hero{display:flex;align-items:flex-start;gap:14px;margin-bottom:18px;flex-wrap:wrap;}
.profile-avatar-wrap{position:relative;flex-shrink:0;}
.profile-avatar{width:76px;height:76px;border-radius:50%;background:linear-gradient(135deg,var(--bg4),var(--bg2));border:2px solid var(--border2);display:flex;align-items:center;justify-content:center;font-family:'Cinzel',serif;font-size:1.8rem;font-weight:900;color:var(--gold2);overflow:hidden;}
.profile-avatar img{width:100%;height:100%;object-fit:cover;}
.avatar-edit-btn{position:absolute;bottom:0;right:0;width:22px;height:22px;border-radius:50%;background:var(--gold);border:2px solid var(--bg);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:0.65rem;}
.profile-info{flex:1;min-width:0;}
.profile-name{font-family:'Cinzel',serif;font-size:1.4rem;font-weight:900;color:var(--gold2);letter-spacing:1px;}
.profile-title{font-family:'Cinzel',serif;font-size:0.8rem;color:var(--text3);margin-top:2px;}
.profile-bio{font-size:0.85rem;color:var(--text2);margin-top:4px;font-style:italic;}
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px;}
.stat-card{background:rgba(0,0,0,0.1);border:1px solid var(--border);border-radius:2px;padding:14px;text-align:center;}
.stat-val{font-family:'Cinzel',serif;font-size:1.4rem;font-weight:900;color:var(--gold2);}
.stat-val.green{color:var(--green3);}.stat-val.blue{color:var(--blue2);}.stat-val.red{color:#e87070;}
.stat-label{font-family:'Cinzel',serif;font-size:0.58rem;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:2px;margin-top:3px;}
.bet-hist-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);flex-wrap:wrap;}
.bet-hist-row:last-child{border-bottom:none;}
.bet-match{font-family:'Cinzel',serif;font-weight:600;font-size:0.8rem;color:var(--text);}
.bet-detail{font-size:0.75rem;color:var(--text3);margin-top:1px;font-style:italic;}
.bet-result{font-family:'Cinzel',serif;font-weight:700;font-size:0.8rem;white-space:nowrap;}
.text-green{color:var(--green3);}.text-red{color:#e87070;}.text-muted{color:var(--text2);}
.gallery-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px;}
.gallery-card{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden;transition:all 0.2s;animation:fadeUp 0.3s ease both;}
.gallery-card:hover{border-color:var(--border2);transform:translateY(-2px);}
.gallery-img{width:100%;height:190px;object-fit:cover;display:block;}
.gallery-footer{padding:9px 13px;display:flex;align-items:center;justify-content:space-between;gap:7px;}
.gallery-user{font-family:'Cinzel',serif;font-size:0.72rem;color:var(--gold2);font-weight:700;}
.gallery-caption{font-size:0.8rem;color:var(--text2);font-style:italic;padding:0 13px 9px;}
.upload-area{border:2px dashed var(--border2);border-radius:var(--radius);padding:26px;text-align:center;cursor:pointer;transition:all 0.2s;background:rgba(0,0,0,0.06);margin-bottom:14px;}
.upload-area:hover{border-color:var(--gold);background:rgba(200,146,42,0.04);}
.upload-area p{color:var(--text3);font-size:0.85rem;font-style:italic;margin-top:7px;}
.upload-preview{width:100%;max-height:180px;object-fit:cover;border-radius:2px;margin-bottom:10px;border:1px solid var(--border);}
.hof-card{background:var(--panel);border:1px solid var(--border);border-radius:var(--radius);padding:14px;display:flex;align-items:center;gap:12px;animation:fadeUp 0.3s ease both;margin-bottom:9px;}
.hof-card:first-child{border-color:var(--gold);background:rgba(200,146,42,0.04);}
.hof-medal{font-size:1.7rem;flex-shrink:0;width:40px;text-align:center;}
.hof-info{flex:1;}
.hof-name{font-family:'Cinzel',serif;font-weight:700;font-size:0.88rem;color:var(--text);}
.hof-match{font-size:0.78rem;color:var(--text3);font-style:italic;margin-top:1px;}
.hof-amount{font-family:'Cinzel',serif;font-size:1.2rem;font-weight:900;color:var(--gold2);white-space:nowrap;}
.daily-bonus-bar{background:rgba(45,107,45,0.1);border:1px solid rgba(45,107,45,0.4);border-radius:var(--radius);padding:10px 16px;margin-bottom:18px;display:flex;align-items:center;gap:10px;animation:fadeUp 0.3s ease;}
.daily-bonus-text{flex:1;font-size:0.85rem;color:var(--green3);}
.daily-bonus-text strong{display:block;font-family:'Cinzel',serif;font-size:0.82rem;letter-spacing:1px;margin-bottom:1px;}
.empty-state{text-align:center;padding:50px 20px;color:var(--text3);}
.empty-state h3{font-family:'Cinzel',serif;font-size:1rem;font-weight:700;color:var(--text2);margin-bottom:7px;letter-spacing:1px;}
.empty-state p{font-size:0.85rem;font-style:italic;}
.empty-icon{font-size:2.2rem;margin-bottom:10px;opacity:0.4;}
.loading-wrap{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--bg);gap:14px;}
.loading-text{font-family:'Cinzel',serif;color:var(--gold);letter-spacing:4px;font-size:1rem;}
.spinner{width:38px;height:38px;border:3px solid var(--border);border-top-color:var(--gold);border-radius:50%;animation:spin 0.8s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
.achievement-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-bottom:18px;}
.achievement-card{background:var(--panel);border:1px solid var(--border);border-radius:2px;padding:12px;display:flex;gap:10px;align-items:flex-start;transition:border-color 0.2s;}
.achievement-card.earned{border-color:var(--gold);}
.achievement-card.locked{opacity:0.45;}
.achievement-icon{font-size:1.5rem;flex-shrink:0;}
.achievement-label{font-family:'Cinzel',serif;font-size:0.72rem;font-weight:700;color:var(--gold2);}
.achievement-desc{font-size:0.72rem;color:var(--text3);margin-top:2px;font-style:italic;}
.friends-list .friend-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);}
.friends-list .friend-row:last-child{border-bottom:none;}
.msg-list{max-height:280px;overflow-y:auto;margin-bottom:10px;}
.msg-row{display:flex;gap:8px;margin-bottom:10px;align-items:flex-start;}
.msg-row.mine{flex-direction:row-reverse;}
.msg-bubble{background:var(--bg3);border:1px solid var(--border);border-radius:4px;padding:7px 10px;max-width:70%;font-size:0.82rem;color:var(--text);}
.msg-row.mine .msg-bubble{background:rgba(200,146,42,0.12);border-color:rgba(200,146,42,0.3);}
.msg-meta{font-size:0.62rem;color:var(--text3);margin-top:2px;}
.tourn-bracket{display:flex;gap:20px;overflow-x:auto;padding-bottom:10px;}
.tourn-round{display:flex;flex-direction:column;gap:10px;flex-shrink:0;min-width:150px;}
.tourn-round-title{font-family:'Cinzel',serif;font-size:0.68rem;font-weight:700;color:var(--text3);letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;text-align:center;}
.tourn-match{background:var(--bg3);border:1px solid var(--border);border-radius:2px;padding:8px 10px;}
.tourn-player{font-family:'Cinzel',serif;font-size:0.72rem;padding:3px 0;color:var(--text2);}
.tourn-player.winner{color:var(--gold2);font-weight:700;}
.tourn-player.loser{opacity:0.45;text-decoration:line-through;}
.tourn-vs{font-size:0.62rem;color:var(--text3);text-align:center;padding:2px 0;}
.admin-user-row{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);flex-wrap:wrap;}
.admin-user-row:last-child{border-bottom:none;}
.admin-user-info{flex:1;min-width:0;}
.admin-user-name{font-family:'Cinzel',serif;font-size:0.85rem;font-weight:700;color:var(--text);}
.admin-user-sub{font-size:0.72rem;color:var(--text3);margin-top:1px;font-style:italic;}
.admin-actions{display:flex;gap:5px;flex-wrap:wrap;}
.gold-adjust{display:flex;gap:5px;align-items:center;}
.gold-adjust .form-input{width:80px;padding:4px 7px;font-size:0.82rem;}
.divider{height:1px;background:var(--border);margin:14px 0;}
.flex{display:flex;}.gap-6{gap:6px;}.gap-8{gap:8px;}.gap-12{gap:12px;}
@media(max-width:900px){.hamburger{display:flex;}.nav-tabs{display:none;}}
@media(max-width:768px){.page{padding:14px;}.stats-grid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:480px){.stats-grid{grid-template-columns:1fr 1fr;}.section-header{flex-direction:column;align-items:flex-start;}.modal-head,.modal-body{padding-left:14px;padding-right:14px;}.notif-panel{right:6px;width:calc(100vw - 12px);}.nav-brand{font-size:0.9rem;letter-spacing:2px;}}
`;

const IcoX=()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcoPlus=()=><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcoMenu=()=><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
const IcoCoin=()=><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M9 9h4.5a2.5 2.5 0 0 1 0 5H9"/></svg>;
const IcoBell=()=><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>;

function AvatarEl({user,size=36}){
  const s={width:size,height:size,borderRadius:"50%",objectFit:"cover",border:"1px solid var(--border)",flexShrink:0};
  if(user?.avatar_url)return<img src={user.avatar_url} alt="" style={s}/>;
  return<div style={{...s,background:"var(--bg3)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Cinzel',serif",fontWeight:700,fontSize:size*0.38,color:"var(--gold2)"}}>{(user?.username||"?")[0].toUpperCase()}</div>;
}

export default function App(){
  const [state,setState]=useState({users:{},matches:[],bets:[],comments:[],notifications:[],gallery:[],friends:[],messages:[],reactions:[],achievements:[],tournaments:[],coinHistory:[]});
  const [cu,setCu]=useState(null);
  const [tab,setTab]=useState("matches");
  const [authMode,setAuthMode]=useState("login");
  const [loading,setLoading]=useState(true);
  const [showNewMatch,setShowNewMatch]=useState(false);
  const [showNotifs,setShowNotifs]=useState(false);
  const [mobileOpen,setMobileOpen]=useState(false);
  const [dailyMsg,setDailyMsg]=useState("");
  const [confetti,setConfetti]=useState(false);
  const [theme,setTheme]=useState(()=>localStorage.getItem("aoe2_theme")||"dark");
  const [soundOn,setSoundOn]=useState(()=>localStorage.getItem("aoe2_sound")!=="off");
  const [msgTarget,setMsgTarget]=useState(null);
  const [compareTarget,setCompareTarget]=useState(null);
  const [newAchievements,setNewAchievements]=useState([]);

  const snd=useCallback((t)=>playSound(t,soundOn),[soundOn]);

  useEffect(()=>{
    const saved=localStorage.getItem("aoe2_cu");
    if(saved)setCu(JSON.parse(saved));
    loadAll();
    const interval=setInterval(loadAll,60000);
    return()=>clearInterval(interval);
  },[]);

  useEffect(()=>{if(cu)updateLastSeen();},[cu?.username]);
  useEffect(()=>{document.body.className=theme==="light"?"light":"";},[theme]);

  const updateLastSeen=async()=>{
    if(!cu)return;
    await sb.from("users").update({last_seen:Date.now()}).eq("username",cu.username);
  };

  useEffect(()=>{if(cu)checkDailyBonus();},[cu?.username]);

  const checkDailyBonus=async()=>{
    const key=`aoe2_daily_${cu.username}`;
    const last=localStorage.getItem(key);
    if(!last||Date.now()-parseInt(last)>86400000){
      const nc=(cu.coins||0)+DAILY_BONUS;
      await sb.from("users").update({coins:nc}).eq("username",cu.username);
      await sb.from("coin_history").insert({id:`ch${Date.now()}`,username:cu.username,amount:DAILY_BONUS,reason:"Dnevni bonus",created_at:Date.now()});
      localStorage.setItem(key,Date.now().toString());
      setDailyMsg(`+${DAILY_BONUS} Gold dnevni bonus!`);
      await refreshUser(cu.username);
      setTimeout(()=>setDailyMsg(""),5000);
    }
  };

  const loadAll=async()=>{
    setLoading(true);
    const [u,m,b,c,g,fr,msg,rx,ach,tr,ch]=await Promise.all([
      sb.from("users").select("*"),
      sb.from("matches").select("*").order("created_at",{ascending:false}),
      sb.from("bets").select("*"),
      sb.from("comments").select("*").order("created_at",{ascending:true}),
      sb.from("gallery").select("*").order("created_at",{ascending:false}),
      sb.from("friends").select("*"),
      sb.from("messages").select("*").order("created_at",{ascending:true}),
      sb.from("reactions").select("*"),
      sb.from("achievements").select("*"),
      sb.from("tournaments").select("*").order("created_at",{ascending:false}),
      sb.from("coin_history").select("*").order("created_at",{ascending:true}),
    ]);
    const um={};(u.data||[]).forEach(x=>um[x.username]=x);
    setState({users:um,matches:m.data||[],bets:b.data||[],comments:c.data||[],notifications:[],gallery:g.data||[],friends:fr.data||[],messages:msg.data||[],reactions:rx.data||[],achievements:ach.data||[],tournaments:tr.data||[],coinHistory:ch.data||[]});
    setLoading(false);
  };

  const refreshUser=async(username)=>{
    const{data}=await sb.from("users").select("*").eq("username",username).single();
    if(data){setCu(data);localStorage.setItem("aoe2_cu",JSON.stringify(data));}
  };

  const loadNotifs=async()=>{
    const{data}=await sb.from("notifications").select("*").eq("username",cu.username).order("created_at",{ascending:false}).limit(25);
    setState(s=>({...s,notifications:data||[]}));
  };

  const checkAchievements=async(username,betsArr,matchesArr,commentsArr,coins)=>{
    const{data:existing}=await sb.from("achievements").select("achievement_key").eq("username",username);
    const earned=new Set((existing||[]).map(a=>a.achievement_key));
    const myBets=betsArr.filter(b=>b.username===username);
    const fb=myBets.filter(b=>{const m=matchesArr.find(m=>m.id===b.match_id);return m?.status==="finished";});
    const wonBets=fb.filter(b=>{const m=matchesArr.find(m=>m.id===b.match_id);return m?.winner===b.side;});
    const myComments=commentsArr.filter(c=>c.username===username);
    const toGrant=[];
    if(myBets.length>=1&&!earned.has("first_bet"))toGrant.push("first_bet");
    if(wonBets.length>=1&&!earned.has("first_win"))toGrant.push("first_win");
    if(myBets.length>=10&&!earned.has("bet_10"))toGrant.push("bet_10");
    if(myBets.length>=50&&!earned.has("bet_50"))toGrant.push("bet_50");
    if(coins>=10000&&!earned.has("millionaire"))toGrant.push("millionaire");
    if(coins>=50000&&!earned.has("rich"))toGrant.push("rich");
    if(myComments.length>=10&&!earned.has("social"))toGrant.push("social");
    if(toGrant.length>0){
      await sb.from("achievements").insert(toGrant.map(k=>({id:`a${Date.now()}${k}`,username,achievement_key:k,created_at:Date.now()})));
      setNewAchievements(toGrant.map(k=>ACHIEVEMENTS_DEF[k]?.label).filter(Boolean));
      setTimeout(()=>setNewAchievements([]),5000);
    }
  };

  const logout=()=>{setCu(null);localStorage.removeItem("aoe2_cu");setTab("matches");};
  const isAdmin=cu?.username===ADMIN;
  const navTo=(t)=>{snd("click");setTab(t);setMobileOpen(false);setShowNotifs(false);};

  const toggleNotifs=async()=>{
    snd("click");
    if(!showNotifs&&cu){await loadNotifs();await sb.from("notifications").update({read:true}).eq("username",cu.username).eq("read",false);}
    setShowNotifs(o=>!o);
  };

  const toggleTheme=()=>{snd("click");const t=theme==="dark"?"light":"dark";setTheme(t);localStorage.setItem("aoe2_theme",t);};
  const toggleSound=()=>{const s=!soundOn;setSoundOn(s);localStorage.setItem("aoe2_sound",s?"on":"off");};
  const unreadNotifs=state.notifications.filter(n=>!n.read).length;
  const unreadMsgs=state.messages.filter(m=>m.to_username===cu?.username&&!m.read).length;

  const placeBet=async(matchId,side,amount,isAllIn=false)=>{
    if(!cu||amount<=0||cu.coins<amount)return false;
    if(state.bets.find(b=>b.match_id===matchId&&b.username===cu.username))return false;
    const match=state.matches.find(m=>m.id===matchId);
    if(match?.min_bet&&amount<match.min_bet)return false;
    if(match?.max_bet&&amount>match.max_bet)return false;
    const{error}=await sb.from("bets").insert({id:`b${Date.now()}`,match_id:matchId,username:cu.username,side,amount,is_all_in:isAllIn});
    if(error)return false;
    await sb.from("users").update({coins:cu.coins-amount}).eq("username",cu.username);
    await sb.from("coin_history").insert({id:`ch${Date.now()}`,username:cu.username,amount:-amount,reason:`Bet na ${match?.title||matchId}`,created_at:Date.now()});
    snd("bet");
    await refreshUser(cu.username);
    await loadAll();
    return true;
  };

  const resolveMatch=async(matchId,winner)=>{
    const match=state.matches.find(m=>m.id===matchId);if(!match)return;
    const{oddsA,oddsB}=calcLiveOdds(match.team_a,match.team_b,state.bets,matchId);
    const winOdds=winner==="A"?oddsA:oddsB;
    for(const bet of state.bets.filter(b=>b.match_id===matchId&&b.side===winner)){
      const user=state.users[bet.username];if(!user)continue;
      const prize=Math.floor(bet.amount*winOdds);
      await sb.from("users").update({coins:user.coins+prize}).eq("username",bet.username);
      await sb.from("coin_history").insert({id:`ch${Date.now()}${bet.username}`,username:bet.username,amount:prize,reason:`Pobjeda: ${match.title}`,created_at:Date.now()});
      await sb.from("notifications").insert({id:`n${Date.now()}${Math.random()}`,username:bet.username,message:`🏆 Pobijedio si! +${prize} Gold na "${match.title}"`,read:false,created_at:Date.now()});
      if(bet.is_all_in){await sb.from("achievements").upsert({id:`a_allin_${bet.username}`,username:bet.username,achievement_key:"all_in_win",created_at:Date.now()},{onConflict:"id"});}
    }
    for(const bet of state.bets.filter(b=>b.match_id===matchId&&b.side!==winner)){
      await sb.from("notifications").insert({id:`n${Date.now()}${Math.random()}`,username:bet.username,message:`😞 Izgubio si ${bet.amount} Gold na "${match.title}"`,read:false,created_at:Date.now()});
    }
    await sb.from("matches").update({status:"finished",winner}).eq("id",matchId);
    const myBet=state.bets.find(b=>b.match_id===matchId&&b.username===cu.username);
    if(myBet){
      if(myBet.side===winner){snd("win");setConfetti(true);setTimeout(()=>setConfetti(false),4000);}
      else snd("lose");
    }
    if(cu)await refreshUser(cu.username);
    await loadAll();
    await checkAchievements(cu.username,state.bets,state.matches,state.comments,cu.coins);
  };

  const addComment=async(matchId,text)=>{
    if(!text.trim()||!cu)return;
    await sb.from("comments").insert({id:`c${Date.now()}`,match_id:matchId,username:cu.username,text:text.trim(),created_at:Date.now()});
    snd("click");
    await loadAll();
    await checkAchievements(cu.username,state.bets,state.matches,state.comments,cu.coins);
  };

  const toggleReaction=async(commentId,emoji)=>{
    const existing=state.reactions.find(r=>r.comment_id===commentId&&r.username===cu.username&&r.emoji===emoji);
    if(existing){await sb.from("reactions").delete().eq("id",existing.id);}
    else{await sb.from("reactions").insert({id:`r${Date.now()}`,comment_id:commentId,username:cu.username,emoji,created_at:Date.now()});}
    await loadAll();
  };

  const sendMessage=async(toUsername,text)=>{
    if(!text.trim())return;
    await sb.from("messages").insert({id:`m${Date.now()}`,from_username:cu.username,to_username:toUsername,text:text.trim(),read:false,created_at:Date.now()});
    snd("click");
    await loadAll();
  };

  const sendFriendReq=async(toUsername)=>{
    const exists=state.friends.find(f=>(f.username===cu.username&&f.friend_username===toUsername)||(f.username===toUsername&&f.friend_username===cu.username));
    if(exists)return;
    await sb.from("friends").insert({id:`f${Date.now()}`,username:cu.username,friend_username:toUsername,status:"pending",created_at:Date.now()});
    await loadAll();
  };

  const acceptFriend=async(id)=>{
    await sb.from("friends").update({status:"accepted"}).eq("id",id);
    await loadAll();
  };

  const sendNewMatchNotif=async(title)=>{
    const{data:allUsers}=await sb.from("users").select("username");
    if(!allUsers)return;
    const ins=allUsers.filter(u=>u.username!==ADMIN).map(u=>({id:`n${Date.now()}${Math.random()}`,username:u.username,message:`⚔ Novi meč: "${title}" — Kladite se!`,read:false,created_at:Date.now()}));
    if(ins.length)await sb.from("notifications").insert(ins);
  };

  if(loading)return<div className="loading-wrap"><style>{css}</style><div className="spinner"></div><div className="loading-text">UČITAVANJE...</div></div>;
  if(!cu)return<div className="auth-wrap"><style>{css}</style><AuthScreen mode={authMode} setMode={setAuthMode} users={state.users} loadAll={loadAll} setCu={(u)=>{setCu(u);localStorage.setItem("aoe2_cu",JSON.stringify(u));}}/></div>;

  const tabs=[
    {id:"matches",label:"⚔ Mečevi"},
    {id:"tournaments",label:"🏆 Turniri"},
    {id:"gallery",label:"🖼 Galerija"},
    {id:"leaderboard",label:"📊 Ljestvica"},
    {id:"halloffame",label:"👑 HOF"},
    {id:"social",label:`💬 Socijalno${unreadMsgs>0?` (${unreadMsgs})`:""}` },
    {id:"profile",label:"👤 Profil"},
    ...(isAdmin?[{id:"admin",label:"⚡ Admin"}]:[]),
  ];

  return(
    <div className="app" onClick={()=>showNotifs&&setShowNotifs(false)}>
      <style>{css}</style>
      <Confetti active={confetti}/>
      {newAchievements.length>0&&<div style={{position:"fixed",bottom:20,right:20,z:9998,display:"flex",flexDirection:"column",gap:8}}>
        {newAchievements.map((a,i)=><div key={i} style={{background:"var(--panel)",border:"1px solid var(--gold)",borderRadius:4,padding:"10px 16px",fontFamily:"'Cinzel',serif",fontSize:"0.82rem",color:"var(--gold2)",boxShadow:"0 8px 20px rgba(0,0,0,0.4)",animation:"fadeUp 0.4s ease"}}>{a} 🎉</div>)}
      </div>}
      <nav className="nav">
        <div className="nav-inner">
          <div className="nav-brand">⚔ AoE2 ARENA</div>
          <div className="nav-tabs">{tabs.map(t=><button key={t.id} className={`nav-tab ${tab===t.id?"active":""}`} onClick={()=>navTo(t.id)}>{t.label}</button>)}</div>
          <div className="nav-right">
            <div className="coins-badge"><IcoCoin/> {cu.coins?.toLocaleString()} G</div>
            {isAdmin&&<span className="admin-badge">ADMIN</span>}
            <button className="icon-btn" title={soundOn?"Isključi zvuk":"Uključi zvuk"} onClick={toggleSound}>{soundOn?"🔊":"🔇"}</button>
            <button className="icon-btn" title="Tema" onClick={toggleTheme}>{theme==="dark"?"☀️":"🌙"}</button>
            <button className="icon-btn" onClick={e=>{e.stopPropagation();toggleNotifs();}}>
              <IcoBell/>
              {unreadNotifs>0&&<span className="notif-dot"></span>}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={logout}>Odjava</button>
            <button className="hamburger" onClick={()=>setMobileOpen(o=>!o)}><IcoMenu/></button>
          </div>
        </div>
      </nav>

      {showNotifs&&(
        <div className="notif-panel" onClick={e=>e.stopPropagation()}>
          <div className="notif-head"><span className="notif-head-title">🔔 Obavijesti</span><button className="btn btn-ghost btn-sm" onClick={()=>setShowNotifs(false)}>Zatvori</button></div>
          <div className="notif-list">
            {state.notifications.length===0?<div className="notif-empty">Nema obavijesti.</div>
              :state.notifications.map(n=><div key={n.id} className={`notif-item ${!n.read?"unread":""}`}><div><div className="notif-text">{n.message}</div><div className="notif-time">{timeAgo(n.created_at)}</div></div></div>)}
          </div>
        </div>
      )}

      <div className={`mobile-menu ${mobileOpen?"open":""}`}>
        {tabs.map(t=><button key={t.id} className={`mobile-tab ${tab===t.id?"active":""}`} onClick={()=>navTo(t.id)}>{t.label}</button>)}
      </div>

      <div className="page">
        {dailyMsg&&<div className="daily-bonus-bar"><div className="daily-bonus-text"><strong>🎁 Dnevni Bonus!</strong>{dailyMsg}</div></div>}
        {tab==="matches"&&<MatchesTab {...{state,cu,placeBet,resolveMatch,addComment,toggleReaction,isAdmin,showNewMatch,setShowNewMatch,loadAll,sendNewMatchNotif,snd,setMsgTarget,setCompareTarget}}/>}
        {tab==="tournaments"&&<TournamentsTab {...{state,cu,isAdmin,loadAll}}/>}
        {tab==="gallery"&&<GalleryTab {...{state,cu,loadAll,isAdmin}}/>}
        {tab==="leaderboard"&&<LeaderboardTab {...{state,setMsgTarget,setCompareTarget,navTo}}/>}
        {tab==="halloffame"&&<HallOfFameTab {...{state}}/>}
        {tab==="social"&&<SocialTab {...{state,cu,sendMessage,sendFriendReq,acceptFriend,msgTarget,setMsgTarget,loadAll}}/>}
        {tab==="profile"&&<ProfileTab {...{state,cu,loadAll,refreshUser}}/>}
        {tab==="admin"&&isAdmin&&<AdminTab {...{state,cu,loadAll,refreshUser,snd}}/>}
      </div>
      {compareTarget&&<CompareModal a={cu} b={compareTarget} state={state} onClose={()=>setCompareTarget(null)}/>}
    </div>
  );
}

// ── Auth ──────────────────────────────────────────────────────────────────────
function AuthScreen({mode,setMode,users,loadAll,setCu}){
  const [form,setForm]=useState({username:"",password:"",experience:"",ranked_points:"",civ:"Franks"});
  const [err,setErr]=useState(""); const [loading,setLoading]=useState(false);
  const submit=async(e)=>{
    e.preventDefault();setErr("");setLoading(true);
    if(mode==="register"){
      if(!form.username.trim()||!form.password){setLoading(false);return setErr("Popuni sva polja.");}
      if(users[form.username]){setLoading(false);return setErr("Korisničko ime već postoji.");}
      const nu={username:form.username.trim(),password:form.password,experience:parseInt(form.experience)||0,ranked_points:parseInt(form.ranked_points)||0,coins:INITIAL_COINS,bio:"",avatar_url:null,civ:form.civ,streak:0,last_seen:Date.now(),joined:Date.now()};
      const{error}=await sb.from("users").insert(nu);
      if(error){setLoading(false);return setErr("Greška: "+error.message);}
      await sb.from("coin_history").insert({id:`ch${Date.now()}`,username:nu.username,amount:INITIAL_COINS,reason:"Početni Gold",created_at:Date.now()});
      setCu(nu);await loadAll();
    }else{
      const{data}=await sb.from("users").select("*").eq("username",form.username.trim()).single();
      if(!data||data.password!==form.password){setLoading(false);return setErr("Pogrešno korisničko ime ili lozinka.");}
      await sb.from("users").update({last_seen:Date.now()}).eq("username",data.username);
      setCu(data);
    }
    setLoading(false);
  };
  return(
    <div className="auth-box">
      <div className="auth-logo"><div className="auth-ornament">✦ ✦ ✦</div><h1>⚔ AoE2 ARENA</h1><p>Virtualna kladionica za Age of Empires II</p></div>
      <div className="panel"><div className="panel-body">
        <div className="auth-tabs">{[["login","Prijava"],["register","Registracija"]].map(([m,l])=><button key={m} className={`auth-tab ${mode===m?"active":""}`} onClick={()=>{setMode(m);setErr("");}}>{l}</button>)}</div>
        {err&&<div className="alert alert-err mb-12">{err}</div>}
        <form onSubmit={submit}>
          <div className="form-group"><label className="form-label">Korisničko ime</label><input className="form-input" value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))} placeholder="Unesi ime viteza..."/></div>
          <div className="form-group"><label className="form-label">Lozinka</label><input className="form-input" type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="••••••••"/></div>
          {mode==="register"&&<>
            <div className="form-group"><label className="form-label">Godine iskustva</label><input className="form-input" type="number" min="0" max="30" value={form.experience} onChange={e=>setForm(f=>({...f,experience:e.target.value}))} placeholder="0"/></div>
            <div className="form-group"><label className="form-label">Ranked Points</label><input className="form-input" type="number" min="0" value={form.ranked_points} onChange={e=>setForm(f=>({...f,ranked_points:e.target.value}))} placeholder="0"/></div>
            <div className="form-group"><label className="form-label">Civilizacija</label><select className="form-input" value={form.civ} onChange={e=>setForm(f=>({...f,civ:e.target.value}))}>{CIVS.map(c=><option key={c}>{c}</option>)}</select></div>
          </>}
          <button className="btn btn-primary btn-lg btn-full" type="submit" disabled={loading}>{loading?"...":(mode==="login"?"⚔ Ulaz na Arenu":"✦ Registriraj se")}</button>
        </form>
        {mode==="register"&&<p style={{textAlign:"center",marginTop:8,fontSize:"0.8rem",color:"var(--text3)",fontStyle:"italic"}}>Dobivate {INITIAL_COINS.toLocaleString()} Gold + {DAILY_BONUS}G dnevnog bonusa!</p>}
      </div></div>
    </div>
  );
}

// ── Matches ───────────────────────────────────────────────────────────────────
function MatchesTab({state,cu,placeBet,resolveMatch,addComment,toggleReaction,isAdmin,showNewMatch,setShowNewMatch,loadAll,sendNewMatchNotif,snd,setMsgTarget,setCompareTarget}){
  const [filter,setFilter]=useState("sve");
  const [betInputs,setBetInputs]=useState({});
  const [selSide,setSelSide]=useState({});
  const [msg,setMsg]=useState({});
  const [expCmts,setExpCmts]=useState({});
  const [cmtInputs,setCmtInputs]=useState({});
  const [showEmojiFor,setShowEmojiFor]=useState(null);

  const filters=["sve","otvoreno","završeno","1v1","2v2","1v2","3v3"];
  const filtered=state.matches.filter(m=>{
    if(filter==="sve")return true;if(filter==="otvoreno")return m.status==="open";if(filter==="završeno")return m.status==="finished";return m.type===filter;
  });

  const myBet=(id)=>state.bets.find(b=>b.match_id===id&&b.username===cu.username);
  const matchCmts=(id)=>state.comments.filter(c=>c.match_id===id);
  const getReactions=(commentId)=>{
    const rx=state.reactions.filter(r=>r.comment_id===commentId);
    const grouped={};
    rx.forEach(r=>{if(!grouped[r.emoji])grouped[r.emoji]=[];grouped[r.emoji].push(r.username);});
    return grouped;
  };

  const handleBet=async(matchId,isAllIn=false)=>{
    const side=selSide[matchId];
    const match=state.matches.find(m=>m.id===matchId);
    const amount=isAllIn?cu.coins:parseInt(betInputs[matchId]||0);
    if(!side)return setMsg(m=>({...m,[matchId]:{t:"err",v:"Odaberi tim!"}}));
    if(!amount||amount<1)return setMsg(m=>({...m,[matchId]:{t:"err",v:"Unesi iznos."}}));
    if(amount>cu.coins)return setMsg(m=>({...m,[matchId]:{t:"err",v:"Nedovoljno Golda."}}));
    if(match?.min_bet&&amount<match.min_bet)return setMsg(m=>({...m,[matchId]:{t:"err",v:`Min bet: ${match.min_bet} G`}}));
    if(match?.max_bet&&amount>match.max_bet)return setMsg(m=>({...m,[matchId]:{t:"err",v:`Max bet: ${match.max_bet} G`}}));
    const ok=await placeBet(matchId,side,amount,isAllIn);
    setMsg(m=>({...m,[matchId]:ok?{t:"ok",v:`✓ Kladio si ${amount} G na Tim ${side}!`}:{t:"err",v:"Već si kladio."}}));
    if(ok)setBetInputs(b=>({...b,[matchId]:""}));
  };

  const handleCmt=async(matchId)=>{
    const text=cmtInputs[matchId]||"";if(!text.trim())return;
    await addComment(matchId,text);
    setCmtInputs(c=>({...c,[matchId]:""}));
  };

  return(
    <div>
      {isAdmin&&<div className="admin-bar"><div className="admin-bar-text"><strong>⚡ Admin Panel</strong>Prijavljen si kao administrator.</div><button className="btn btn-primary" onClick={()=>setShowNewMatch(true)}><IcoPlus/> Novi meč</button></div>}
      <div className="section-header"><h2 className="section-title">⚔ Mečevi</h2><span style={{fontSize:"0.75rem",color:"var(--text3)",fontStyle:"italic"}}>{filtered.length} mečeva · Auto-refresh ✓</span></div>
      <div className="filter-bar">{filters.map(f=><button key={f} className={`filter-btn ${filter===f?"active":""}`} onClick={()=>setFilter(f)}>{f.toUpperCase()}</button>)}</div>
      {filtered.length===0?<div className="empty-state"><div className="empty-icon">⚔</div><h3>Nema mečeva</h3><p>{isAdmin?"Klikni 'Novi meč'.":"Admin još nije dodao mečeve."}</p></div>:
      <div className="match-grid">
        {filtered.map((match,i)=>{
          const tA=match.team_a||[],tB=match.team_b||[];
          const{oddsA,oddsB}=calcLiveOdds(tA,tB,state.bets,match.id);
          const bet=myBet(match.id);
          const mb=state.bets.filter(b=>b.match_id===match.id);
          const pool=mb.reduce((s,b)=>s+b.amount,0);
          const poolA=mb.filter(b=>b.side==="A").reduce((s,b)=>s+b.amount,0);
          const poolB=mb.filter(b=>b.side==="B").reduce((s,b)=>s+b.amount,0);
          const mc=matchCmts(match.id);
          const showCmts=expCmts[match.id];
          return(
            <div key={match.id} className="match-card" style={{animationDelay:`${i*0.04}s`}}>
              <div className="match-head">
                <div className="match-head-title">{match.title}</div>
                <div className="flex gap-6">
                  {match.status==="open"&&<span className="live-badge">LIVE</span>}
                  <span className="badge badge-type">{match.type}</span>
                  <span className={`badge ${match.status==="open"?"badge-open":"badge-finished"}`}>{match.status==="open"?"OPEN":"KRAJ"}</span>
                </div>
              </div>
              <div className="match-body">
                <div className="versus">
                  <div className="team"><div className="team-name">{tA.map(p=>p.username).join(" & ")}</div><div className="team-exp">{tA.map(p=>`${p.experience||0}g/${p.ranked_points||0}rp`).join(", ")}</div></div>
                  <div className="vs-text">VS</div>
                  <div className="team"><div className="team-name">{tB.map(p=>p.username).join(" & ")}</div><div className="team-exp">{tB.map(p=>`${p.experience||0}g/${p.ranked_points||0}rp`).join(", ")}</div></div>
                </div>
                <div className="odds-grid">
                  {[["A",oddsA,poolA],["B",oddsB,poolB]].map(([side,odds,sPool])=>{
                    const isW=match.winner===side,isL=match.status==="finished"&&match.winner&&match.winner!==side;
                    return<div key={side} className={`odds-btn ${selSide[match.id]===side?"selected":""} ${isW?"winner":""} ${isL?"loser":""}`} onClick={()=>match.status==="open"&&!bet&&setSelSide(s=>({...s,[match.id]:side}))}>
                      <div className="odds-label">Tim {side} {isW?"👑":""}</div>
                      <div className="odds-value">{odds}x</div>
                      <div className="odds-pool">{sPool.toLocaleString()} G</div>
                    </div>;
                  })}
                </div>
                {(match.min_bet||match.max_bet)&&<div className="bet-limit-info">Min: {(match.min_bet||1).toLocaleString()} G · Max: {match.max_bet?match.max_bet.toLocaleString()+"G":"∞"}</div>}
                {match.status==="open"&&(bet
                  ?<div className="alert alert-ok">✦ Kladio si {bet.amount} G na Tim {bet.side}{bet.is_all_in?" (ALL-IN)":""}</div>
                  :<>
                    <div className="bet-row"><input className="form-input" type="number" min={match.min_bet||1} max={Math.min(cu.coins,match.max_bet||cu.coins)} placeholder="Iznos (Gold)..." value={betInputs[match.id]||""} onChange={e=>setBetInputs(b=>({...b,[match.id]:e.target.value}))}/><button className="btn btn-primary" onClick={()=>handleBet(match.id)}>Kladiti</button></div>
                    <div className="allin-row"><button className="btn btn-danger btn-sm btn-full" onClick={()=>handleBet(match.id,true)}>🃏 ALL-IN ({cu.coins.toLocaleString()} G)</button></div>
                    {msg[match.id]&&<div className={`alert ${msg[match.id].t==="ok"?"alert-ok":"alert-err"}`}>{msg[match.id].v}</div>}
                  </>
                )}
                {match.status==="finished"&&<div style={{fontSize:"0.78rem",color:"var(--text3)",marginTop:7,fontStyle:"italic"}}>Pobijedio: <span style={{color:"var(--green3)",fontStyle:"normal",fontFamily:"'Cinzel',serif"}}>Tim {match.winner}</span>{bet&&<span style={{marginLeft:7}}>• {bet.side===match.winner?<span className="text-green">✓ Dobio {Math.floor(bet.amount*(match.winner==="A"?calcLiveOdds(tA,tB,state.bets,match.id).oddsA:calcLiveOdds(tA,tB,state.bets,match.id).oddsB)).toLocaleString()} G</span>:<span className="text-red">✗ Izgubio {bet.amount} G</span>}</span>}</div>}
              </div>
              {isAdmin&&match.status==="open"&&<div className="resolve-section"><span className="resolve-label">Pobjednik:</span><button className="btn btn-success btn-sm" onClick={()=>resolveMatch(match.id,"A")}>Tim A</button><button className="btn btn-success btn-sm" onClick={()=>resolveMatch(match.id,"B")}>Tim B</button></div>}
              <div className="comments-section">
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div className="comments-title">💬 Komentari ({mc.length})</div>
                  <button className="btn btn-ghost btn-sm" onClick={()=>setExpCmts(e=>({...e,[match.id]:!e[match.id]}))}>{showCmts?"Sakrij":"Prikaži"}</button>
                </div>
                {showCmts&&<>
                  <div style={{marginTop:8}}>
                    {mc.map(c=>{
                      const u=state.users[c.username];
                      const rxGroups=getReactions(c.id);
                      return<div key={c.id} className="comment-row">
                        <div className="comment-avatar">{u?.avatar_url?<img src={u.avatar_url} alt=""/>:c.username[0].toUpperCase()}</div>
                        <div className="comment-body">
                          <span className="comment-user">{c.username}</span>
                          <span className="comment-time">{timeAgo(c.created_at)}</span>
                          <div className="comment-text">{c.text}</div>
                          <div className="comment-reactions" style={{position:"relative"}}>
                            {Object.entries(rxGroups).map(([emoji,users])=>(
                              <button key={emoji} className={`reaction-btn ${users.includes(cu.username)?"active":""}`} onClick={()=>toggleReaction(c.id,emoji)}>
                                {emoji}<span className="reaction-count">{users.length}</span>
                              </button>
                            ))}
                            <button className="add-reaction-btn" onClick={()=>setShowEmojiFor(showEmojiFor===c.id?null:c.id)}>+</button>
                            {showEmojiFor===c.id&&<div className="emoji-picker" style={{bottom:"100%",left:0}}>
                              {["👍","🔥","😂","😮","👑","⚔","🏆"].map(e=><button key={e} className="emoji-option" onClick={()=>{toggleReaction(c.id,e);setShowEmojiFor(null);}}>{e}</button>)}
                            </div>}
                          </div>
                        </div>
                      </div>;
                    })}
                  </div>
                  <div className="comment-input-row"><input className="form-input" placeholder="Napiši komentar..." value={cmtInputs[match.id]||""} onChange={e=>setCmtInputs(c=>({...c,[match.id]:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&handleCmt(match.id)}/><button className="btn btn-primary btn-sm" onClick={()=>handleCmt(match.id)}>Pošalji</button></div>
                </>}
              </div>
              <div className="match-footer">
                <span className="match-footer-stat">{mb.length} klađenja</span>
                <span className="match-footer-stat">Fond: {pool.toLocaleString()} G</span>
              </div>
            </div>
          );
        })}
      </div>}
      {showNewMatch&&<NewMatchModal onClose={()=>setShowNewMatch(false)} loadAll={loadAll} users={state.users} sendNewMatchNotif={sendNewMatchNotif}/>}
    </div>
  );
}

function NewMatchModal({onClose,loadAll,users,sendNewMatchNotif}){
  const [form,setForm]=useState({title:"",type:"1v1",teamA:"",teamB:"",min_bet:"",max_bet:""});
  const [err,setErr]=useState(""); const [loading,setLoading]=useState(false);
  const sA=parseInt(form.type.split("v")[0]),sB=parseInt(form.type.split("v")[1]);
  const parse=(str)=>str.split(",").map(s=>s.trim()).filter(Boolean).map(name=>{const u=users[name];return u?{username:u.username,experience:u.experience||0,ranked_points:u.ranked_points||0}:{username:name,experience:0,ranked_points:0};});
  const create=async()=>{
    if(!form.title.trim())return setErr("Unesi naziv meča.");
    const pA=parse(form.teamA),pB=parse(form.teamB);
    if(pA.length!==sA)return setErr(`Tim A treba ${sA} igrač(a).`);
    if(pB.length!==sB)return setErr(`Tim B treba ${sB} igrač(a).`);
    setLoading(true);
    const{error}=await sb.from("matches").insert({id:`m${Date.now()}`,type:form.type,title:form.title.trim(),status:"open",team_a:pA,team_b:pB,winner:null,min_bet:parseInt(form.min_bet)||1,max_bet:parseInt(form.max_bet)||null,created_at:Date.now()});
    if(error){setLoading(false);return setErr("Greška: "+error.message);}
    await sendNewMatchNotif(form.title.trim());
    await loadAll();setLoading(false);onClose();
  };
  return(
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-head"><span className="modal-title">⚔ Novi meč</span><button className="modal-close" onClick={onClose}><IcoX/></button></div>
        <div className="modal-body">
          {err&&<div className="alert alert-err mb-12">{err}</div>}
          <div className="form-group"><label className="form-label">Naziv meča</label><input className="form-input" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Npr. Bitka za Antioch..."/></div>
          <div className="form-group"><label className="form-label">Format</label><select className="form-input" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value,teamA:"",teamB:""}))}>{"1v1,2v2,1v2,1v3,2v3,3v3".split(",").map(t=><option key={t}>{t}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Tim A — {sA} igrač(a)</label><input className="form-input" value={form.teamA} onChange={e=>setForm(f=>({...f,teamA:e.target.value}))} placeholder={Array.from({length:sA},(_,i)=>`Igrač${i+1}`).join(", ")}/></div>
          <div className="form-group"><label className="form-label">Tim B — {sB} igrač(a)</label><input className="form-input" value={form.teamB} onChange={e=>setForm(f=>({...f,teamB:e.target.value}))} placeholder={Array.from({length:sB},(_,i)=>`Igrač${i+1}`).join(", ")}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div className="form-group"><label className="form-label">Min Bet (Gold)</label><input className="form-input" type="number" min="1" value={form.min_bet} onChange={e=>setForm(f=>({...f,min_bet:e.target.value}))} placeholder="1"/></div>
            <div className="form-group"><label className="form-label">Max Bet (Gold)</label><input className="form-input" type="number" min="1" value={form.max_bet} onChange={e=>setForm(f=>({...f,max_bet:e.target.value}))} placeholder="Bez limita"/></div>
          </div>
          <p style={{fontSize:"0.78rem",color:"var(--text3)",marginBottom:12,fontStyle:"italic"}}>Kvote se mijenjaju live ovisno o klađenjima.</p>
          <div className="flex gap-8"><button className="btn btn-primary" onClick={create} disabled={loading}>{loading?"...":<><IcoPlus/> Kreiraj</>}</button><button className="btn btn-ghost" onClick={onClose}>Odustani</button></div>
        </div>
      </div>
    </div>
  );
}

// ── Tournaments ───────────────────────────────────────────────────────────────
function TournamentsTab({state,cu,isAdmin,loadAll}){
  const [showNew,setShowNew]=useState(false);
  return(
    <div>
      <div className="section-header"><h2 className="section-title">🏆 Turniri</h2>{isAdmin&&<button className="btn btn-primary btn-sm" onClick={()=>setShowNew(true)}><IcoPlus/> Novi turnir</button>}</div>
      {state.tournaments.length===0?<div className="empty-state"><div className="empty-icon">🏆</div><h3>Nema turnira</h3><p>{isAdmin?"Klikni 'Novi turnir' za kreiranje.":"Admin još nije kreirao turnir."}</p></div>
        :state.tournaments.map(t=><TournamentCard key={t.id} tournament={t} state={state} isAdmin={isAdmin} loadAll={loadAll} cu={cu}/>)}
      {showNew&&<NewTournamentModal onClose={()=>setShowNew(false)} loadAll={loadAll} users={state.users}/>}
    </div>
  );
}

function TournamentCard({tournament,state,isAdmin,loadAll,cu}){
  const bracket=tournament.bracket||[];
  const resolveTourn=async(roundIdx,matchIdx,winner)=>{
    const newBracket=JSON.parse(JSON.stringify(bracket));
    newBracket[roundIdx][matchIdx].winner=winner;
    if(roundIdx+1<newBracket.length){
      const nextMatchIdx=Math.floor(matchIdx/2);
      const slot=matchIdx%2===0?"playerA":"playerB";
      newBracket[roundIdx+1][nextMatchIdx][slot]=winner;
    }
    const allDone=newBracket[newBracket.length-1][0]?.winner;
    await sb.from("tournaments").update({bracket:newBracket,status:allDone?"finished":"open"}).eq("id",tournament.id);
    await loadAll();
  };
  return(
    <div className="panel mb-16">
      <div className="panel-body">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:"1rem",fontWeight:700,color:"var(--gold2)"}}>{tournament.title}</div>
            <div style={{fontSize:"0.75rem",color:"var(--text3)",marginTop:2}}>{tournament.status==="finished"?"✅ Završen":"🟢 U tijeku"}</div>
          </div>
          {tournament.status==="finished"&&bracket.length>0&&<div style={{fontFamily:"'Cinzel',serif",fontSize:"0.82rem",color:"var(--gold2)"}}>👑 Pobjednik: {bracket[bracket.length-1][0]?.winner||"—"}</div>}
        </div>
        <div className="tourn-bracket">
          {bracket.map((round,ri)=>(
            <div key={ri} className="tourn-round">
              <div className="tourn-round-title">{ri===bracket.length-1?"Finale":ri===bracket.length-2?"Polufinale":`Runda ${ri+1}`}</div>
              {round.map((m,mi)=>(
                <div key={mi} className="tourn-match">
                  <div className={`tourn-player ${m.winner===m.playerA?"winner":m.winner&&m.winner!==m.playerA?"loser":""}`}>{m.playerA||"TBD"}</div>
                  <div className="tourn-vs">vs</div>
                  <div className={`tourn-player ${m.winner===m.playerB?"winner":m.winner&&m.winner!==m.playerB?"loser":""}`}>{m.playerB||"TBD"}</div>
                  {isAdmin&&!m.winner&&m.playerA&&m.playerB&&(
                    <div style={{display:"flex",gap:4,marginTop:5}}>
                      <button className="btn btn-success btn-sm" style={{flex:1,justifyContent:"center"}} onClick={()=>resolveTourn(ri,mi,m.playerA)}>A</button>
                      <button className="btn btn-success btn-sm" style={{flex:1,justifyContent:"center"}} onClick={()=>resolveTourn(ri,mi,m.playerB)}>B</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NewTournamentModal({onClose,loadAll,users}){
  const [title,setTitle]=useState("");
  const [playersStr,setPlayersStr]=useState("");
  const [err,setErr]=useState(""); const [loading,setLoading]=useState(false);
  const create=async()=>{
    if(!title.trim())return setErr("Unesi naziv.");
    const players=playersStr.split(",").map(s=>s.trim()).filter(Boolean);
    if(players.length<2)return setErr("Minimalno 2 igrača.");
    const n=Math.pow(2,Math.ceil(Math.log2(players.length)));
    const padded=[...players,...Array(n-players.length).fill("BYE")];
    const r1=[];
    for(let i=0;i<padded.length;i+=2)r1.push({playerA:padded[i],playerB:padded[i+1],winner:padded[i+1]==="BYE"?padded[i]:null});
    const rounds=[r1];
    let prev=r1;
    while(prev.length>1){
      const next=[];
      for(let i=0;i<prev.length;i+=2)next.push({playerA:prev[i].winner||null,playerB:prev[i+1]?.winner||null,winner:null});
      rounds.push(next);prev=next;
    }
    const auto=rounds[0].map((m,i)=>({...m}));
    setLoading(true);
    await sb.from("tournaments").insert({id:`t${Date.now()}`,title:title.trim(),status:"open",players,bracket:rounds,created_at:Date.now()});
    await loadAll();setLoading(false);onClose();
  };
  return(
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-head"><span className="modal-title">🏆 Novi turnir</span><button className="modal-close" onClick={onClose}><IcoX/></button></div>
        <div className="modal-body">
          {err&&<div className="alert alert-err mb-12">{err}</div>}
          <div className="form-group"><label className="form-label">Naziv turnira</label><input className="form-input" value={title} onChange={e=>setTitle(e.target.value)} placeholder="Npr. AoE2 Arena Championship..."/></div>
          <div className="form-group"><label className="form-label">Igrači (odvoji zarezom)</label><textarea className="form-input" value={playersStr} onChange={e=>setPlayersStr(e.target.value)} placeholder="Igrač1, Igrač2, Igrač3, Igrač4..."/></div>
          <p style={{fontSize:"0.78rem",color:"var(--text3)",marginBottom:12,fontStyle:"italic"}}>Bracket se automatski generira. Preporuča se 4 ili 8 igrača.</p>
          <div className="flex gap-8"><button className="btn btn-primary" onClick={create} disabled={loading}>{loading?"...":"Kreiraj turnir"}</button><button className="btn btn-ghost" onClick={onClose}>Odustani</button></div>
        </div>
      </div>
    </div>
  );
}

// ── Gallery ───────────────────────────────────────────────────────────────────
function GalleryTab({state,cu,loadAll,isAdmin}){
  const [uploading,setUploading]=useState(false);
  const [caption,setCaption]=useState(""); const [preview,setPreview]=useState(null);
  const [file,setFile]=useState(null); const [err,setErr]=useState("");
  const fileRef=useRef();
  const handleFile=(e)=>{const f=e.target.files[0];if(!f)return;if(f.size>5*1024*1024)return setErr("Max 5MB.");setFile(f);setPreview(URL.createObjectURL(f));setErr("");};
  const upload=async()=>{
    if(!file)return setErr("Odaberi sliku.");setUploading(true);
    const ext=file.name.split(".").pop();const path=`${cu.username}_${Date.now()}.${ext}`;
    const{error:upErr}=await sb.storage.from("gallery").upload(path,file);
    if(upErr){setUploading(false);return setErr("Greška: "+upErr.message);}
    const{data}=sb.storage.from("gallery").getPublicUrl(path);
    await sb.from("gallery").insert({id:`g${Date.now()}`,username:cu.username,url:data.publicUrl,caption:caption.trim(),created_at:Date.now()});
    setFile(null);setPreview(null);setCaption("");setUploading(false);await loadAll();
  };
  const del=async(item)=>{await sb.from("gallery").delete().eq("id",item.id);await loadAll();};
  return(
    <div>
      <div className="section-header"><h2 className="section-title">🖼 Galerija</h2><span style={{fontSize:"0.75rem",color:"var(--text3)"}}>{state.gallery.length} slika</span></div>
      <div className="panel mb-16"><div className="panel-body">
        <div style={{fontFamily:"'Cinzel',serif",fontSize:"0.82rem",color:"var(--gold2)",marginBottom:10}}>✦ Dodaj sliku</div>
        {err&&<div className="alert alert-err mb-12">{err}</div>}
        {preview&&<img src={preview} className="upload-preview" alt="preview"/>}
        <div className="upload-area" onClick={()=>fileRef.current.click()}><div style={{fontSize:"1.8rem",opacity:0.5}}>📁</div><p>{file?file.name:"Klikni za odabir (max 5MB)"}</p></div>
        <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>
        <div className="form-group"><label className="form-label">Opis (opcionalno)</label><input className="form-input" value={caption} onChange={e=>setCaption(e.target.value)} placeholder="Npr. Moja pobjeda..."/></div>
        <button className="btn btn-primary" onClick={upload} disabled={uploading||!file}>{uploading?"Uploading...":"📤 Objavi"}</button>
      </div></div>
      {state.gallery.length===0?<div className="empty-state"><div className="empty-icon">🖼</div><h3>Nema slika</h3><p>Budi prvi!</p></div>
        :<div className="gallery-grid">{state.gallery.map((item,i)=>(
          <div key={item.id} className="gallery-card" style={{animationDelay:`${i*0.04}s`}}>
            <img src={item.url} className="gallery-img" alt={item.caption||""} onError={e=>e.target.style.display="none"}/>
            {item.caption&&<div className="gallery-caption">{item.caption}</div>}
            <div className="gallery-footer"><span className="gallery-user">⚔ {item.username}</span>{(isAdmin||item.username===cu.username)&&<button className="btn btn-danger btn-sm" onClick={()=>del(item)}>Obriši</button>}</div>
          </div>
        ))}</div>
      }
    </div>
  );
}

// ── Leaderboard ───────────────────────────────────────────────────────────────
function LeaderboardTab({state,setMsgTarget,setCompareTarget,navTo}){
  const sorted=Object.values(state.users).sort((a,b)=>b.coins-a.coins);
  const rankColors=["#FFD700","#C0C0C0","#CD7F32"];
  const getStats=(u)=>{
    const mb=state.bets.filter(b=>b.username===u.username);
    const fb=mb.filter(b=>{const m=state.matches.find(m=>m.id===b.match_id);return m?.status==="finished";});
    const won=fb.filter(b=>{const m=state.matches.find(m=>m.id===b.match_id);return m?.winner===b.side;});
    return{total:mb.length,wr:fb.length>0?Math.round((won.length/fb.length)*100):null};
  };
  return(
    <div>
      <div className="section-header"><h2 className="section-title">📊 Ljestvica</h2></div>
      <div className="panel"><div className="panel-body">
        {sorted.length===0?<div className="empty-state" style={{padding:"32px 0"}}><p>Nema igrača.</p></div>
          :sorted.map((u,i)=>{
            const{total,wr}=getStats(u);
            return(
              <div key={u.username} className="lb-row">
                <div className="lb-rank" style={{color:rankColors[i]||"var(--text3)"}}>{i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}</div>
                <div className="lb-avatar" style={{borderColor:rankColors[i]||"var(--border)"}}>
                  {u.avatar_url?<img src={u.avatar_url} alt=""/>:u.username[0].toUpperCase()}
                </div>
                <div className="lb-info">
                  <div className="lb-name">
                    <span className={isOnline(u.last_seen)?"online-dot":"offline-dot"}></span>
                    {u.username}
                    {u.username===ADMIN&&<span className="admin-badge">ADMIN</span>}
                    <span style={{fontSize:"0.68rem",color:"var(--text3)",fontStyle:"italic"}}>{getTitle(u.coins)}</span>
                    {u.civ&&<span style={{fontSize:"0.65rem",color:"var(--border2)",fontFamily:"'Cinzel',serif"}}>{u.civ}</span>}
                  </div>
                  <div className="lb-sub">{u.experience||0} god. · {(u.ranked_points||0).toLocaleString()} RP · {total} klađenja{u.streak>0?` · 🔥${u.streak} streak`:""}</div>
                </div>
                <div className="lb-right">
                  <div className="lb-coins"><IcoCoin/> {u.coins?.toLocaleString()} G</div>
                  {wr!==null&&<div className="lb-winrate">Win: {wr}%</div>}
                  <div className="flex gap-6" style={{marginTop:3}}>
                    <button className="btn btn-ghost btn-sm" onClick={()=>{setMsgTarget(u);navTo("social");}}>💬</button>
                    <button className="btn btn-ghost btn-sm" onClick={()=>setCompareTarget(u)}>⚔</button>
                  </div>
                </div>
              </div>
            );
          })}
      </div></div>
    </div>
  );
}

// ── Hall of Fame ───────────────────────────────────────────────────────────────
function HallOfFameTab({state}){
  const medals=["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];
  const wins=state.bets.map(bet=>{
    const m=state.matches.find(m=>m.id===bet.match_id);
    if(!m||m.status!=="finished"||m.winner!==bet.side)return null;
    const{oddsA,oddsB}=calcLiveOdds(m.team_a||[],m.team_b||[],state.bets,m.id);
    const odds=bet.side==="A"?oddsA:oddsB;
    return{...bet,matchTitle:m.title,odds,profit:Math.floor(bet.amount*odds)-bet.amount,payout:Math.floor(bet.amount*odds)};
  }).filter(Boolean).sort((a,b)=>b.payout-a.payout).slice(0,10);
  return(
    <div>
      <div className="section-header"><h2 className="section-title">👑 Hall of Fame</h2><span style={{fontSize:"0.75rem",color:"var(--text3)"}}>Top 10 dobitaka</span></div>
      {wins.length===0?<div className="empty-state"><div className="empty-icon">👑</div><h3>Nema podataka</h3><p>Ovdje će biti top dobitci.</p></div>
        :wins.map((w,i)=>(
          <div key={`${w.id}${i}`} className="hof-card" style={{animationDelay:`${i*0.05}s`}}>
            <div className="hof-medal">{medals[i]||"⭐"}</div>
            <div className="hof-info"><div className="hof-name">⚔ {w.username}{w.is_all_in?" 🃏 ALL-IN":""}</div><div className="hof-match">{w.matchTitle} · Tim {w.side} · {w.odds}x · {w.amount.toLocaleString()} G ulog</div></div>
            <div className="hof-amount">+{w.profit.toLocaleString()} G</div>
          </div>
        ))
      }
    </div>
  );
}

// ── Social ────────────────────────────────────────────────────────────────────
function SocialTab({state,cu,sendMessage,sendFriendReq,acceptFriend,msgTarget,setMsgTarget,loadAll}){
  const [tab,setTab]=useState(msgTarget?"messages":"friends");
  const [msgInput,setMsgInput]=useState("");
  const [addFriendInput,setAddFriendInput]=useState("");
  const msgEndRef=useRef();

  useEffect(()=>{if(msgTarget)setTab("messages");},[msgTarget]);
  useEffect(()=>{msgEndRef.current?.scrollIntoView({behavior:"smooth"});},[state.messages,msgTarget]);

  const myFriends=state.friends.filter(f=>(f.username===cu.username||f.friend_username===cu.username)&&f.status==="accepted");
  const pendingIn=state.friends.filter(f=>f.friend_username===cu.username&&f.status==="pending");
  const conversation=msgTarget?state.messages.filter(m=>(m.from_username===cu.username&&m.to_username===msgTarget.username)||(m.from_username===msgTarget.username&&m.to_username===cu.username)):[];

  const send=async()=>{if(!msgTarget||!msgInput.trim())return;await sendMessage(msgTarget.username,msgInput.trim());setMsgInput("");};
  const addFriend=async()=>{if(!addFriendInput.trim())return;await sendFriendReq(addFriendInput.trim());setAddFriendInput("");};

  const qrUrl=`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(window.location.href)}`;

  return(
    <div>
      <div className="section-header"><h2 className="section-title">💬 Socijalno</h2></div>
      <div className="filter-bar">
        {[["friends","👥 Prijatelji"],["messages","💬 Poruke"],["qr","📱 QR Kod"]].map(([t,l])=><button key={t} className={`filter-btn ${tab===t?"active":""}`} onClick={()=>setTab(t)}>{l}</button>)}
      </div>

      {tab==="friends"&&<div>
        <div className="panel mb-16"><div className="panel-body">
          <div style={{fontFamily:"'Cinzel',serif",fontSize:"0.82rem",color:"var(--gold2)",marginBottom:10}}>✦ Dodaj prijatelja</div>
          <div className="flex gap-8"><input className="form-input" value={addFriendInput} onChange={e=>setAddFriendInput(e.target.value)} placeholder="Korisničko ime..." style={{flex:1}}/><button className="btn btn-primary" onClick={addFriend}>Dodaj</button></div>
        </div></div>
        {pendingIn.length>0&&<div className="panel mb-16"><div className="panel-body">
          <div style={{fontFamily:"'Cinzel',serif",fontSize:"0.78rem",color:"var(--text3)",marginBottom:10,letterSpacing:1,textTransform:"uppercase"}}>Zahtjevi</div>
          <div className="friends-list">{pendingIn.map(f=>(
            <div key={f.id} className="friend-row">
              <AvatarEl user={state.users[f.username]} size={32}/>
              <div style={{flex:1}}><div style={{fontFamily:"'Cinzel',serif",fontSize:"0.82rem",color:"var(--text)"}}>{f.username}</div></div>
              <button className="btn btn-success btn-sm" onClick={()=>acceptFriend(f.id)}>Prihvati</button>
            </div>
          ))}</div>
        </div></div>}
        <div className="panel"><div className="panel-body">
          <div style={{fontFamily:"'Cinzel',serif",fontSize:"0.78rem",color:"var(--text3)",marginBottom:10,letterSpacing:1,textTransform:"uppercase"}}>Moji prijatelji ({myFriends.length})</div>
          <div className="friends-list">
            {myFriends.length===0?<div style={{color:"var(--text3)",fontSize:"0.85rem",fontStyle:"italic"}}>Još nemaš prijatelja. Dodaj ih gore!</div>
              :myFriends.map(f=>{
                const friendName=f.username===cu.username?f.friend_username:f.username;
                const fUser=state.users[friendName];
                return<div key={f.id} className="friend-row">
                  <AvatarEl user={fUser} size={32}/>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span className={isOnline(fUser?.last_seen)?"online-dot":"offline-dot"}></span>
                      <span style={{fontFamily:"'Cinzel',serif",fontSize:"0.82rem",color:"var(--text)"}}>{friendName}</span>
                    </div>
                    <div style={{fontSize:"0.7rem",color:"var(--text3)"}}>{fUser?.civ||""} · {(fUser?.coins||0).toLocaleString()} G</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={()=>{setMsgTarget(fUser);setTab("messages");}}>💬</button>
                </div>;
              })}
          </div>
        </div></div>
      </div>}

      {tab==="messages"&&<div>
        <div className="panel mb-12"><div className="panel-body">
          <div style={{fontFamily:"'Cinzel',serif",fontSize:"0.78rem",color:"var(--text3)",marginBottom:8,letterSpacing:1,textTransform:"uppercase"}}>Chat s:</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {Object.values(state.users).filter(u=>u.username!==cu.username).map(u=>(
              <button key={u.username} className={`filter-btn ${msgTarget?.username===u.username?"active":""}`} onClick={()=>setMsgTarget(u)}>
                {isOnline(u.last_seen)?"🟢":"⚫"} {u.username}
              </button>
            ))}
          </div>
        </div></div>
        {msgTarget?<div className="panel"><div className="panel-body">
          <div style={{fontFamily:"'Cinzel',serif",fontSize:"0.85rem",color:"var(--gold2)",marginBottom:12}}>💬 {msgTarget.username}</div>
          <div className="msg-list">
            {conversation.length===0?<div style={{color:"var(--text3)",fontSize:"0.82rem",fontStyle:"italic"}}>Nema poruka. Pošalji prvu!</div>
              :conversation.map(m=>(
                <div key={m.id} className={`msg-row ${m.from_username===cu.username?"mine":""}`}>
                  <AvatarEl user={state.users[m.from_username]} size={28}/>
                  <div>
                    <div className="msg-bubble">{m.text}</div>
                    <div className="msg-meta">{timeAgo(m.created_at)}</div>
                  </div>
                </div>
              ))}
            <div ref={msgEndRef}/>
          </div>
          <div className="flex gap-8"><input className="form-input" value={msgInput} onChange={e=>setMsgInput(e.target.value)} placeholder="Napiši poruku..." onKeyDown={e=>e.key==="Enter"&&send()} style={{flex:1}}/><button className="btn btn-primary" onClick={send}>Pošalji</button></div>
        </div></div>:<div style={{color:"var(--text3)",fontStyle:"italic",fontSize:"0.85rem"}}>Odaberi korisnika za razgovor.</div>}
      </div>}

      {tab==="qr"&&<div className="panel"><div className="panel-body" style={{textAlign:"center"}}>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:"0.85rem",color:"var(--gold2)",marginBottom:14}}>📱 Pozovi prijatelje</div>
        <img src={qrUrl} alt="QR kod" style={{borderRadius:4,border:"2px solid var(--border2)",margin:"0 auto",display:"block"}}/>
        <div style={{marginTop:12,fontSize:"0.82rem",color:"var(--text3)",fontStyle:"italic"}}>Skeniraj QR kod za pristup AoE2 Areni!</div>
        <div style={{marginTop:8,fontFamily:"'Cinzel',serif",fontSize:"0.72rem",color:"var(--border2)",letterSpacing:1}}>{window.location.href}</div>
      </div></div>}
    </div>
  );
}

// ── Compare Modal ─────────────────────────────────────────────────────────────
function CompareModal({a,b,state,onClose}){
  const getS=(u)=>{
    const mb=state.bets.filter(x=>x.username===u.username);
    const fb=mb.filter(x=>{const m=state.matches.find(m=>m.id===x.match_id);return m?.status==="finished";});
    const won=fb.filter(x=>{const m=state.matches.find(m=>m.id===x.match_id);return m?.winner===x.side;});
    const achCount=state.achievements.filter(x=>x.username===u.username).length;
    return{bets:mb.length,wins:won.length,wr:fb.length>0?Math.round((won.length/fb.length)*100):0,coins:u.coins||0,rp:u.ranked_points||0,exp:u.experience||0,ach:achCount};
  };
  const sa=getS(a),sb2=getS(b);
  const Row=({label,va,vb})=>{
    const better=va>vb;const worse=va<vb;
    return<div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:10,padding:"8px 0",borderBottom:"1px solid var(--border)",alignItems:"center"}}>
      <div style={{textAlign:"right",fontFamily:"'Cinzel',serif",fontSize:"0.85rem",color:better?"var(--gold2)":worse?"var(--text3)":"var(--text)"}}>{typeof va==="number"?va.toLocaleString():va}</div>
      <div style={{fontFamily:"'Cinzel',serif",fontSize:"0.65rem",color:"var(--text3)",letterSpacing:1,textTransform:"uppercase",textAlign:"center",minWidth:80}}>{label}</div>
      <div style={{textAlign:"left",fontFamily:"'Cinzel',serif",fontSize:"0.85rem",color:vb>va?"var(--gold2)":vb<va?"var(--text3)":"var(--text)"}}>{typeof vb==="number"?vb.toLocaleString():vb}</div>
    </div>;
  };
  return(
    <div className="overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <div className="modal-head"><span className="modal-title">⚔ Usporedba</span><button className="modal-close" onClick={onClose}><IcoX/></button></div>
        <div className="modal-body">
          <div style={{display:"grid",gridTemplateColumns:"1fr auto 1fr",gap:10,marginBottom:14,alignItems:"center"}}>
            <div style={{textAlign:"center"}}><AvatarEl user={a} size={48}/><div style={{fontFamily:"'Cinzel',serif",fontSize:"0.82rem",color:"var(--gold2)",marginTop:5}}>{a.username}</div></div>
            <div style={{fontFamily:"'Cinzel',serif",fontWeight:900,color:"var(--border2)"}}>VS</div>
            <div style={{textAlign:"center"}}><AvatarEl user={b} size={48}/><div style={{fontFamily:"'Cinzel',serif",fontSize:"0.82rem",color:"var(--gold2)",marginTop:5}}>{b.username}</div></div>
          </div>
          <Row label="Gold" va={sa.coins} vb={sb2.coins}/>
          <Row label="Win Rate %" va={sa.wr} vb={sb2.wr}/>
          <Row label="Klađenja" va={sa.bets} vb={sb2.bets}/>
          <Row label="Pobjede" va={sa.wins} vb={sb2.wins}/>
          <Row label="Ranked RP" va={sa.rp} vb={sb2.rp}/>
          <Row label="Iskustvo" va={sa.exp} vb={sb2.exp}/>
          <Row label="Achievementi" va={sa.ach} vb={sb2.ach}/>
        </div>
      </div>
    </div>
  );
}

// ── Profile ───────────────────────────────────────────────────────────────────
function ProfileTab({state,cu,loadAll,refreshUser}){
  const [editing,setEditing]=useState(false);
  const [form,setForm]=useState({experience:cu.experience||0,ranked_points:cu.ranked_points||0,bio:cu.bio||"",civ:cu.civ||"Franks"});
  const [saved,setSaved]=useState(false); const [uploadingAvatar,setUploadingAvatar]=useState(false);
  const avatarRef=useRef();

  const myBets=state.bets.filter(b=>b.username===cu.username);
  const fb=myBets.filter(b=>{const m=state.matches.find(m=>m.id===b.match_id);return m?.status==="finished";});
  const won=fb.filter(b=>{const m=state.matches.find(m=>m.id===b.match_id);return m?.winner===b.side;});
  const wr=fb.length>0?Math.round((won.length/fb.length)*100):0;
  const bestWin=myBets.map(bet=>{const m=state.matches.find(m=>m.id===bet.match_id);if(!m||m.status!=="finished"||m.winner!==bet.side)return 0;const{oddsA,oddsB}=calcLiveOdds(m.team_a||[],m.team_b||[],state.bets,m.id);return Math.floor(bet.amount*(bet.side==="A"?oddsA:oddsB));}).reduce((a,b)=>Math.max(a,b),0);
  const myAch=state.achievements.filter(a=>a.username===cu.username).map(a=>a.achievement_key);
  const myCoinHistory=state.coinHistory.filter(h=>h.username===cu.username);

  const save=async()=>{
    await sb.from("users").update({experience:parseInt(form.experience)||0,ranked_points:parseInt(form.ranked_points)||0,bio:form.bio,civ:form.civ}).eq("username",cu.username);
    await refreshUser(cu.username);setEditing(false);setSaved(true);setTimeout(()=>setSaved(false),2000);
  };

  const uploadAvatar=async(e)=>{
    const file=e.target.files[0];if(!file)return;if(file.size>3*1024*1024)return alert("Max 3MB.");
    setUploadingAvatar(true);
    const ext=file.name.split(".").pop();const path=`${cu.username}_avatar.${ext}`;
    await sb.storage.from("avatars").upload(path,file,{upsert:true});
    const{data}=sb.storage.from("avatars").getPublicUrl(path);
    await sb.from("users").update({avatar_url:data.publicUrl+"?t="+Date.now()}).eq("username",cu.username);
    await refreshUser(cu.username);setUploadingAvatar(false);
  };

  return(
    <div>
      <div className="section-header"><h2 className="section-title">👤 Profil</h2></div>
      <div className="panel mb-16"><div className="panel-body">
        <div className="profile-hero">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">{cu.avatar_url?<img src={cu.avatar_url} alt=""/>:cu.username[0].toUpperCase()}</div>
            <button className="avatar-edit-btn" onClick={()=>avatarRef.current.click()}>{uploadingAvatar?"⏳":"✏️"}</button>
            <input ref={avatarRef} type="file" accept="image/*" style={{display:"none"}} onChange={uploadAvatar}/>
          </div>
          <div className="profile-info">
            <div className="profile-name">{cu.username} {cu.username===ADMIN&&<span className="admin-badge">ADMIN</span>}</div>
            <div className="profile-title">{getTitle(cu.coins)} · {cu.civ||"Franks"}</div>
            <div className="profile-bio">{cu.bio||"Nema opisa."}</div>
            <div style={{fontSize:"0.75rem",color:"var(--text3)",marginTop:4,fontStyle:"italic"}}>{cu.experience||0} god. · {(cu.ranked_points||0).toLocaleString()} RP{cu.streak>0?` · 🔥 ${cu.streak} streak`:""}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={()=>setEditing(e=>!e)}>{editing?"Zatvori":"✦ Uredi"}</button>
        </div>
        {saved&&<div className="alert alert-ok">✓ Profil ažuriran!</div>}
        {editing&&<div>
          <div className="divider"/>
          <div className="form-group"><label className="form-label">Civilizacija</label><select className="form-input" value={form.civ} onChange={e=>setForm(f=>({...f,civ:e.target.value}))}>{CIVS.map(c=><option key={c}>{c}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Godine iskustva</label><input className="form-input" type="number" min="0" max="30" value={form.experience} onChange={e=>setForm(f=>({...f,experience:e.target.value}))}/></div>
          <div className="form-group"><label className="form-label">Ranked Points</label><input className="form-input" type="number" min="0" value={form.ranked_points} onChange={e=>setForm(f=>({...f,ranked_points:e.target.value}))}/></div>
          <div className="form-group"><label className="form-label">Opis profila</label><textarea className="form-input" value={form.bio} onChange={e=>setForm(f=>({...f,bio:e.target.value}))} placeholder="Nešto o sebi..."/></div>
          <button className="btn btn-primary" onClick={save}>Spremi</button>
        </div>}
      </div></div>

      <div className="stats-grid mb-16">
        {[{val:cu.coins?.toLocaleString(),label:"Gold",cls:""},{val:`${wr}%`,label:"Win Rate",cls:"green"},{val:myBets.length,label:"Klađenja",cls:""},{val:bestWin>0?`${bestWin.toLocaleString()} G`:"-",label:"Najbolji dobitak",cls:"blue"}].map(({val,label,cls})=>(
          <div key={label} className="stat-card"><div className={`stat-val ${cls}`}>{val}</div><div className="stat-label">{label}</div></div>
        ))}
      </div>

      <div className="section-header"><h2 className="section-title" style={{fontSize:"1rem"}}>📈 Graf Gold-a</h2></div>
      <div className="panel mb-16"><div className="panel-body"><CoinChart history={myCoinHistory}/></div></div>

      <div className="section-header"><h2 className="section-title" style={{fontSize:"1rem"}}>🏅 Achievementi</h2></div>
      <div className="achievement-grid mb-16">
        {Object.entries(ACHIEVEMENTS_DEF).map(([key,def])=>(
          <div key={key} className={`achievement-card ${myAch.includes(key)?"earned":"locked"}`}>
            <div className="achievement-icon">{def.label.split(" ")[0]}</div>
            <div>
              <div className="achievement-label">{def.label.split(" ").slice(1).join(" ")}</div>
              <div className="achievement-desc">{def.desc}</div>
              {myAch.includes(key)&&<div style={{fontSize:"0.65rem",color:"var(--green3)",marginTop:3}}>✓ Ostvareno</div>}
            </div>
          </div>
        ))}
      </div>

      <div className="section-header"><h2 className="section-title" style={{fontSize:"1rem"}}>Povijest klađenja</h2></div>
      <div className="panel"><div className="panel-body">
        {myBets.length===0?<div className="empty-state" style={{padding:"24px 0"}}><p>Još nisi kladio.</p></div>
          :[...myBets].reverse().map(bet=>{
            const m=state.matches.find(m=>m.id===bet.match_id);if(!m)return null;
            const{oddsA,oddsB}=calcLiveOdds(m.team_a||[],m.team_b||[],state.bets,m.id);
            const odds=bet.side==="A"?oddsA:oddsB,finished=m.status==="finished",w=m.winner===bet.side;
            return<div key={bet.id} className="bet-hist-row">
              <div><div className="bet-match">{m.title}{bet.is_all_in?" 🃏":""}</div><div className="bet-detail">Tim {bet.side} · {odds}x · {bet.amount.toLocaleString()} G</div></div>
              <div className="bet-result">{!finished&&<span className="text-muted">U tijeku</span>}{finished&&w&&<span className="text-green">+{Math.floor(bet.amount*odds).toLocaleString()} G ✓</span>}{finished&&!w&&<span className="text-red">-{bet.amount.toLocaleString()} G ✗</span>}</div>
            </div>;
          })
        }
      </div></div>
    </div>
  );
}

// ── Admin ─────────────────────────────────────────────────────────────────────
function AdminTab({state,cu,loadAll,refreshUser,snd}){
  const [goldInputs,setGoldInputs]=useState({});
  const [msg,setMsg]=useState("");
  const flash=(m)=>{setMsg(m);setTimeout(()=>setMsg(""),3000);};
  const resetGold=async(username)=>{if(!confirm(`Reset Gold za ${username}?`))return;await sb.from("users").update({coins:INITIAL_COINS}).eq("username",username);snd("click");flash(`✓ Reset za ${username}`);await loadAll();if(username===cu.username)await refreshUser(username);};
  const adj=async(username,sign)=>{const amount=parseInt(goldInputs[username]||0);if(!amount)return flash("Unesi iznos!");const user=state.users[username];if(!user)return;const nc=Math.max(0,user.coins+(sign==="+"?amount:-amount));await sb.from("users").update({coins:nc}).eq("username",username);await sb.from("coin_history").insert({id:`ch${Date.now()}`,username,amount:sign==="+"?amount:-amount,reason:`Admin ${sign}${amount}`,created_at:Date.now()});snd("click");flash(`✓ ${sign}${amount} G za ${username}`);setGoldInputs(g=>({...g,[username]:""}));await loadAll();if(username===cu.username)await refreshUser(username);};
  const delUser=async(username)=>{if(username===ADMIN)return flash("Ne možeš obrisati admina!");if(!confirm(`Obriši ${username}?`))return;await Promise.all([sb.from("bets").delete().eq("username",username),sb.from("comments").delete().eq("username",username),sb.from("notifications").delete().eq("username",username),sb.from("gallery").delete().eq("username",username),sb.from("achievements").delete().eq("username",username),sb.from("coin_history").delete().eq("username",username),sb.from("users").delete().eq("username",username)]);snd("click");flash(`✓ Obrisan ${username}`);await loadAll();};
  const delMatch=async(id,title)=>{if(!confirm(`Obriši "${title}"?`))return;await Promise.all([sb.from("bets").delete().eq("match_id",id),sb.from("comments").delete().eq("match_id",id),sb.from("matches").delete().eq("id",id)]);snd("click");flash("✓ Meč obrisan");await loadAll();};
  const sortedU=Object.values(state.users).sort((a,b)=>a.username.localeCompare(b.username));
  return(
    <div>
      <div className="section-header"><h2 className="section-title">⚡ Admin Panel</h2></div>
      {msg&&<div className="alert alert-ok mb-16">{msg}</div>}
      <div style={{fontFamily:"'Cinzel',serif",fontSize:"0.88rem",color:"var(--gold2)",marginBottom:10,letterSpacing:1}}>👥 Korisnici ({sortedU.length})</div>
      <div className="panel mb-16"><div className="panel-body">
        {sortedU.map(u=>(
          <div key={u.username} className="admin-user-row">
            <AvatarEl user={u} size={34}/>
            <div className="admin-user-info"><div className="admin-user-name">{u.username} {u.username===ADMIN&&<span className="admin-badge">ADMIN</span>}</div><div className="admin-user-sub">{u.coins?.toLocaleString()} G · {getTitle(u.coins)} · {u.civ||"—"}</div></div>
            <div className="admin-actions">
              <div className="gold-adjust"><input className="form-input" type="number" min="1" placeholder="G..." value={goldInputs[u.username]||""} onChange={e=>setGoldInputs(g=>({...g,[u.username]:e.target.value}))}/><button className="btn btn-success btn-sm" onClick={()=>adj(u.username,"+")}>+</button><button className="btn btn-danger btn-sm" onClick={()=>adj(u.username,"-")}>−</button></div>
              <button className="btn btn-warn btn-sm" onClick={()=>resetGold(u.username)}>Reset</button>
              {u.username!==ADMIN&&<button className="btn btn-danger btn-sm" onClick={()=>delUser(u.username)}>🗑</button>}
            </div>
          </div>
        ))}
      </div></div>
      <div style={{fontFamily:"'Cinzel',serif",fontSize:"0.88rem",color:"var(--gold2)",marginBottom:10,letterSpacing:1}}>⚔ Mečevi ({state.matches.length})</div>
      <div className="panel"><div className="panel-body">
        {state.matches.length===0?<div style={{color:"var(--text3)",fontStyle:"italic",fontSize:"0.85rem"}}>Nema mečeva.</div>
          :state.matches.map(m=>(
            <div key={m.id} className="admin-user-row">
              <div style={{flex:1}}><div className="admin-user-name">{m.title}</div><div className="admin-user-sub">{m.type} · {m.status==="open"?"🟢 Live":`✅ Tim ${m.winner}`} · Min:{m.min_bet||1}G Max:{m.max_bet||"∞"}G</div></div>
              <button className="btn btn-danger btn-sm" onClick={()=>delMatch(m.id,m.title)}>🗑</button>
            </div>
          ))}
      </div></div>
    </div>
  );
}
