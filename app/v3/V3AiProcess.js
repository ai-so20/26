'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './v3.module.css';

const STEP_MS = 3 * 60 * 1000;
const stages = ['분석','탐색','매수','관리','매도','재분석'];
const assets = ['BTC/USD','ETH/USD','SOL/USD','XRP/USD','AAPL','NVDA','MSFT','TSLA'];

function won(v){return `${Math.round(Number(v||0)).toLocaleString('ko-KR')}원`;}
function duration(h){const n=Math.max(1,Number(h||24));return n%24===0?`${n/24}일`:n>24?`${Math.floor(n/24)}일 ${n%24}시간`:`${n}시간`;}
function hash(s){let h=2166136261;for(let i=0;i<String(s).length;i++){h^=String(s).charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){let v=seed>>>0;return()=>{v+=0x6D2B79F5;let t=v;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}

function snapshot(row,userId,now){
  const investment=Math.max(0,Number(row?.investment_amount||0));
  const min=Math.max(0,Number(row?.min_return||0)); const max=Math.max(min,Number(row?.max_return||min));
  const random=rng(hash(`${row?.user_id||userId}-${row?.started_at}-${min}-${max}`));
  const targetReturn=min+(max-min)*random(); const durationMs=Math.max(1,Number(row?.duration_hours||24))*3600000;
  const start=row?.started_at?new Date(row.started_at).getTime():now; const end=row?.completed_at?new Date(row.completed_at).getTime():now;
  const elapsed=Math.min(durationMs,Math.max(0,(row?.status==='completed'?end:now)-start));
  const timeProgress=Math.min(1,elapsed/durationMs); const curve=Math.pow(timeProgress,.94);
  const targetProfit=investment*(targetReturn/100); const adjustment=Number(row?.profit_adjustment||0);
  const earned=Math.max(0,targetProfit*curve+adjustment); const total=investment+earned; const rate=investment?earned/investment*100:0;
  const remaining=Math.max(0,durationMs-elapsed); const days=Math.floor(remaining/86400000); const hours=Math.floor((remaining%86400000)/3600000); const mins=Math.floor((remaining%3600000)/60000);
  const remain=row?.status==='completed'?'완료':days?`${days}일 ${hours}시간`:hours?`${hours}시간 ${mins}분`:`${mins}분`;
  const steps=Math.max(0,Math.floor(elapsed/STEP_MS)); const history=[];
  for(let i=Math.max(0,steps-9);i<=steps;i++){const p=steps?i/steps:0;const wobble=(random()-.45)*targetProfit*.012;const profit=Math.max(0,earned*Math.pow(p,.96)+wobble);history.push({step:i,amount:investment+profit,delta:0});}
  for(let i=1;i<history.length;i++) history[i].delta=history[i].amount-history[i-1].amount;
  return {investment,earned,total,rate,progress:row?.status==='completed'?100:timeProgress*100,remain,steps,history};
}

export default function V3AiProcess({row,userId,profile}){
  const [tick,setTick]=useState(Date.now()); const [market,setMarket]=useState([]); const [marketOpen,setMarketOpen]=useState(true); const [historyOpen,setHistoryOpen]=useState(true);
  useEffect(()=>{const t=setInterval(()=>setTick(Date.now()),1000);return()=>clearInterval(t);},[]);
  useEffect(()=>{let alive=true;async function load(){try{const r=await fetch('/api/market-sim',{cache:'no-store'});const d=await r.json();if(alive&&r.ok&&d?.success)setMarket(Array.isArray(d.quotes)?d.quotes:[]);}catch{}}load();const t=setInterval(load,60000);return()=>{alive=false;clearInterval(t);};},[]);
  if(profile?.role==='admin') return <div className={styles.content}><div className={styles.sectionTitle}><span>AI PROCESS</span><h1>AI PROCESS</h1><p>관리자 계정에서는 회원별 AI PROCESS를 관리 페이지에서 확인합니다.</p></div></div>;
  const process=row||{status:'ready',available_count:0,duration_hours:720,min_return:800,max_return:1200,investment_amount:0};
  const status=process.status||'ready'; const available=Math.max(0,Number(process.available_count||0));
  if(!['running','completed'].includes(status)) return <div className={styles.content}><div className={styles.sectionTitle}><span>AI PROCESS</span><h1>AI PROCESS</h1><p>시장 분석부터 결과 관리까지 단계별로 진행합니다.</p></div><section className={styles.aiIdle}><div><span>진행 가능</span><strong>{available}<small>회</small></strong></div><dl><div><dt>진행 시간</dt><dd>최소 1시간 ~ 최대 30일</dd></div><div><dt>예상 수익률</dt><dd>10% ~ 1000%</dd></div><div><dt>현재 상태</dt><dd>{status==='waiting'?'시작 준비':available>0?'진행 가능':'상담 가능'}</dd></div></dl></section><section className={styles.aiFlow}><h2>진행 구조</h2>{['시장 분석','기회 포착','AI 진행','실시간 확인','위험 관리','결과 관리'].map((x,i)=><div key={x}><i>{String(i+1).padStart(2,'0')}</i><strong>{x}</strong><span>{['시장 조건을 확인합니다.','진행 구간을 탐색합니다.','선정 조건을 기반으로 진행합니다.','진행 상태를 지속 확인합니다.','설정 기준에 따라 위험을 관리합니다.','결과를 확인하고 마무리합니다.'][i]}</span></div>)}</section></div>;
  const s=snapshot(process,userId,tick); const active=status==='completed'?5:Math.max(0,(s.steps-1)%6);
  return <div className={styles.content}><div className={styles.aiTitle}><div><span>AI PROCESS</span><h1>{status==='running'?'진행 중':'진행 완료'}</h1></div><b>{status==='running'?'LIVE':'DONE'}</b></div><section className={styles.aiBalance}><span>현재 평가금액</span><strong>{won(s.total)}</strong><em>+{won(s.earned)} · +{s.rate.toFixed(2)}%</em></section><section className={styles.aiFacts}><div><span>투자금</span><strong>{won(s.investment)}</strong></div><div><span>진행률</span><strong>{s.progress.toFixed(1)}%</strong></div><div><span>남은 시간</span><strong>{s.remain}</strong></div><div><span>설정 기간</span><strong>{duration(process.duration_hours)}</strong></div></section><div className={styles.aiProgress}><i style={{width:`${s.progress}%`}}/></div><section className={styles.aiStages}>{stages.map((x,i)=><div key={x} className={i===active?styles.aiStageActive:''}><i>{String(i+1).padStart(2,'0')}</i><span>{x}</span><b>{status==='completed'||i<active?'완료':i===active?'진행 중':'대기'}</b></div>)}</section><section className={styles.aiSection}><button className={styles.aiSectionHead} onClick={()=>setHistoryOpen(v=>!v)}><div><span>최근 반영 내역</span><strong>3분 단위 반영 기록</strong></div><b>{historyOpen?'접기':'펼치기'}</b></button>{historyOpen&&<div className={styles.aiHistory}>{s.history.slice(-10).reverse().map((h,i)=><div key={h.step}><i>{h.step}회</i><span>{h.delta>=0?'수익':'손실'}</span><strong className={h.delta<0?styles.loss:''}>{h.delta>=0?'+':''}{won(h.delta)}</strong><em>{won(h.amount)}</em></div>)}</div>}</section><section className={styles.aiSection}><button className={styles.aiSectionHead} onClick={()=>setMarketOpen(v=>!v)}><div><span>AI 트레이딩 현황</span><strong>주식 · 코인 시장 탐색</strong></div><b>{marketOpen?'접기':'펼치기'}</b></button>{marketOpen&&<div className={styles.marketList}>{assets.map((symbol,i)=>{const q=market.find(x=>x.symbol===symbol)||{};const phase=stages[(s.steps+i)%stages.length];return <div key={symbol}><i>{symbol}</i><span>{q.price?Number(q.price).toLocaleString('ko-KR'):'가격 연결 중'}</span><em>{phase}</em><b>›</b></div>;})}<small>시장가격 1분 갱신 · AI PROCESS 반영 3분</small></div>}</section></div>;
}
