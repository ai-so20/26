'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './v3.module.css';

const STEP_MS=3*60*1000;
const stages=['분석','탐색','매수','관리','매도','재분석'];
const assets=[['BTC/USD','Bitcoin','COIN'],['ETH/USD','Ethereum','COIN'],['SOL/USD','Solana','COIN'],['XRP/USD','XRP','COIN'],['AAPL','Apple','STOCK'],['NVDA','NVIDIA','STOCK'],['MSFT','Microsoft','STOCK'],['TSLA','Tesla','STOCK']];
function won(v){return `${Math.round(Number(v||0)).toLocaleString('ko-KR')}원`;}
function duration(h){const n=Math.max(1,Math.min(2400,Number(h||24)));return n%24===0?`${n/24}일`:n>24?`${Math.floor(n/24)}일 ${n%24}시간`:`${n}시간`;}
function hash(s){let h=2166136261;for(let i=0;i<String(s).length;i++){h^=String(s).charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){let v=seed>>>0;return()=>{v+=0x6D2B79F5;let t=v;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function clock(value){if(!value)return'--:--';return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));}
function finalReturn(row,userId){const min=Math.max(0,Number(row?.min_return||0));const max=Math.max(min,Number(row?.max_return||min));const random=rng(hash(`${row?.user_id||userId||'member'}-${row?.started_at||'not-started'}-${min}-${max}`));return min+(max-min)*random();}

function buildSnapshot(row,userId,now){
 const investment=Math.max(0,Number(row?.investment_amount||0));
 const targetReturn=finalReturn(row,userId);
 const targetProfit=investment*(targetReturn/100);
 const durationMs=Math.max(1,Math.min(2400,Number(row?.duration_hours||24)))*3600000;
 const totalSteps=Math.max(1,Math.round(durationMs/STEP_MS));
 const start=row?.started_at?new Date(row.started_at).getTime():now;
 const completed=row?.completed_at?new Date(row.completed_at).getTime():NaN;
 const snapshotNow=row?.status==='completed'&&Number.isFinite(completed)?completed:now;
 const elapsed=Math.min(durationMs,Math.max(0,snapshotNow-start));
 const steps=Math.min(totalSteps,Math.floor(elapsed/STEP_MS));

 // Canonical V2 curve: deterministic 3-minute weights, including the same loss cadence and burst profile.
 const random=rng(hash(`${row?.user_id||userId||'member'}-${row?.started_at||'not-started'}-${investment}-${targetReturn}-${row?.duration_hours||24}`));
 const rawWeights=[];
 for(let batch=0;batch<totalSteps;batch+=10){
  const count=Math.min(10,totalSteps-batch);const lossCount=count>=5?(random()<.5?1:2):(count>=2?1:0);const lossOffsets=new Set();
  while(lossOffsets.size<lossCount)lossOffsets.add(Math.floor(random()*count));
  for(let offset=0;offset<count;offset++){const index=batch+offset;const centerWave=.72+.28*Math.sin((index/Math.max(1,totalSteps-1))*Math.PI);const burst=random()>.87?1.65+random()*1.5:1;const gain=(.28+random()*1.55)*centerWave*burst;rawWeights.push(lossOffsets.has(offset)?-gain*(.12+random()*.18):gain);}
 }
 const weightTotal=rawWeights.reduce((sum,value)=>sum+value,0)||1;
 const increments=rawWeights.map(value=>targetProfit*(value/weightTotal));
 const cumulative=[];let running=0;for(const amount of increments){running+=amount;cumulative.push(running);}
 const cumulativeAt=step=>step>0?cumulative[Math.min(totalSteps,step)-1]:0;
 const legacyProfit=cumulativeAt(steps);
 const anchorAt=row?.profit_anchor_at?new Date(row.profit_anchor_at).getTime():NaN;
 const hasAnchor=Number.isFinite(anchorAt)&&row?.profit_anchor!=null;
 const anchorSteps=hasAnchor?Math.max(0,Math.floor((anchorAt-start)/STEP_MS)):0;
 const remainingSteps=Math.max(1,totalSteps-anchorSteps);
 const stepsAfterAnchor=hasAnchor?Math.max(0,steps-anchorSteps):0;
 const anchorCurveTotal=cumulativeAt(totalSteps)-cumulativeAt(anchorSteps);
 const anchoredProfit=hasAnchor
  ?Number(row.profit_anchor)+Math.max(0,targetProfit-Number(row.profit_anchor))*(anchorCurveTotal>0?(cumulativeAt(steps)-cumulativeAt(anchorSteps))/anchorCurveTotal:Math.min(1,stepsAfterAnchor/remainingSteps))
  :legacyProfit;
 const adjustment=Number(row?.profit_adjustment||0);
 const earned=Math.max(0,anchoredProfit+adjustment);
 const total=investment+earned;
 const rate=investment>0?(earned/investment)*100:0;
 const progress=targetProfit>0?Math.min(100,(earned/targetProfit)*100):0;
 const profitForStep=step=>{const base=hasAnchor?(step<=anchorSteps?Number(row.profit_anchor)*step/Math.max(1,anchorSteps):Number(row.profit_anchor)+Math.max(0,targetProfit-Number(row.profit_anchor))*(anchorCurveTotal>0?(cumulativeAt(step)-cumulativeAt(anchorSteps))/anchorCurveTotal:(step-anchorSteps)/remainingSteps)):cumulativeAt(step);return Math.max(0,base+adjustment);};

 // Keep the product requirement of max 100 ledger rows, while every amount follows the canonical V2 curve.
 const history=[];const first=Math.max(1,steps-99);
 for(let step=first;step<=steps;step++){const profit=profitForStep(step);const previousProfit=profitForStep(step-1);history.push({step,amount:investment+profit,delta:profit-previousProfit,reflectedAt:start+step*STEP_MS,stage:stages[(step-1)%stages.length]});}
 const remainingMs=Math.max(0,durationMs-elapsed);const remainingHours=Math.floor(remainingMs/3600000);const remainingMinutes=Math.floor((remainingMs%3600000)/60000);
 const remain=row?.status==='completed'?'완료':remainingHours>=24?`${Math.floor(remainingHours/24)}일 ${remainingHours%24}시간`:remainingHours?`${remainingHours}시간 ${remainingMinutes}분`:`${remainingMinutes}분`;
 return{investment,targetReturn,targetProfit,earned,total,rate,progress:row?.status==='completed'?100:progress,remain,steps,totalSteps,history,start};
}
function chartPoints(history){if(!history.length)return'';const rows=history.slice(-48);const values=rows.map(x=>x.amount);const lo=Math.min(...values),hi=Math.max(...values),visibleGain=hi-lo,range=Math.max(1,visibleGain*1.28);return rows.map((x,i)=>`${18+(724*i/Math.max(1,rows.length-1))},${200-160*Math.max(0,Math.min(1,(x.amount-lo)/range))}`).join(' ');}

export default function V3AiProcess({row,userId,profile}){
 const[tick,setTick]=useState(Date.now()),[market,setMarket]=useState([]),[marketOpen,setMarketOpen]=useState(true),[historyOpen,setHistoryOpen]=useState(true),[page,setPage]=useState(1);
 useEffect(()=>{const t=setInterval(()=>setTick(Date.now()),1000);return()=>clearInterval(t);},[]);
 useEffect(()=>{let alive=true;async function load(){try{const r=await fetch('/api/market-sim',{cache:'no-store'});const d=await r.json();if(alive&&r.ok&&d?.success)setMarket(Array.isArray(d.quotes)?d.quotes:[]);}catch{}}load();const t=setInterval(load,60000);return()=>{alive=false;clearInterval(t);};},[]);
 if(profile?.role==='admin')return <div className={styles.content}><div className={styles.sectionTitle}><span>AI PROCESS</span><h1>AI PROCESS</h1><p>관리자 계정에서는 회원별 AI PROCESS를 관리 페이지에서 확인합니다.</p></div></div>;
 const process=row||{status:'ready',available_count:0,duration_hours:720,min_return:800,max_return:1200,investment_amount:0};const status=process.status||'ready';const available=Math.max(0,Number(process.available_count||0));
 if(!['running','completed'].includes(status))return <div className={styles.content}><div className={styles.sectionTitle}><span>AI PROCESS</span><h1>AI PROCESS</h1><p>시장 분석부터 결과 관리까지 단계별로 진행합니다.</p></div><section className={styles.aiIdle}><div><span>진행 가능</span><strong>{available}<small>회</small></strong></div><dl><div><dt>진행 시간</dt><dd>최소 1시간 ~ 최대 30일</dd></div><div><dt>예상 수익률</dt><dd>10% ~ 1000%</dd></div><div><dt>현재 상태</dt><dd>{status==='waiting'?'시작 준비':available>0?'진행 가능':'상담 가능'}</dd></div></dl></section><section className={styles.aiFlow}><h2>진행 구조</h2>{['시장 분석','기회 포착','AI 진행','실시간 확인','위험 관리','결과 관리'].map((x,i)=><div key={x}><i>{String(i+1).padStart(2,'0')}</i><strong>{x}</strong><span>{['시장 조건을 확인합니다.','진행 구간을 탐색합니다.','선정 조건을 기반으로 진행합니다.','진행 상태를 지속 확인합니다.','설정 기준에 따라 위험을 관리합니다.','결과를 확인하고 마무리합니다.'][i]}</span></div>)}</section></div>;
 const snapshotBucket=status==='completed'?process.completed_at:Math.floor(tick/STEP_MS);const s=useMemo(()=>buildSnapshot(process,userId,tick),[process,userId,snapshotBucket]);
 const active=status==='completed'?5:Math.max(0,(s.steps-1)%6);const pages=Math.max(1,Math.ceil(s.history.length/10));const safePage=Math.min(page,pages);const rows=[...s.history].reverse().slice((safePage-1)*10,safePage*10);const points=chartPoints(s.history);const quoteMap=new Map(market.map(q=>[q.symbol,q]));
 return <div className={styles.content}><div className={styles.aiTitle}><div><span>AI PROCESS</span><h1>{status==='running'?'진행 중':'진행 완료'}</h1></div><b>{status==='running'?'LIVE':'DONE'}</b></div><section className={styles.aiBalance}><span>현재 평가금액</span><strong>{won(s.total)}</strong><em>+{won(s.earned)} · +{s.rate.toFixed(2)}%</em></section><section className={styles.aiFacts}><div><span>투자금</span><strong>{won(s.investment)}</strong></div><div><span>진행률</span><strong>{s.progress.toFixed(1)}%</strong></div><div><span>남은 시간</span><strong>{s.remain}</strong></div><div><span>설정 기간</span><strong>{duration(process.duration_hours)}</strong></div></section><div className={styles.aiProgress}><i style={{width:`${s.progress}%`}}/></div><section className={styles.aiStages}>{stages.map((x,i)=><div key={x} className={i===active?styles.aiStageActive:''}><i>{String(i+1).padStart(2,'0')}</i><span>{x}</span><b>{status==='completed'||i<active?'완료':i===active?'진행 중':'대기'}</b></div>)}</section>
 <section className={styles.aiChartPanel}><div className={styles.aiChartTop}><div><span>평가 흐름</span><strong>평가금액 변화</strong></div><div><span>누적 반영</span><strong>{s.steps.toLocaleString('ko-KR')}회</strong></div></div><svg className={styles.aiChartV3} viewBox="0 0 760 220" role="img" aria-label="AI PROCESS 평가금액 변화"><line x1="18" y1="55" x2="742" y2="55"/><line x1="18" y1="110" x2="742" y2="110"/><line x1="18" y1="165" x2="742" y2="165"/>{points&&<polyline points={points}/>}</svg><div className={styles.aiChartFoot}><span>최근 최대 48개 반영 흐름</span><b>{status==='running'?'진행 중':'진행 완료'}</b></div></section>
 <section className={styles.aiSection}><button className={styles.aiSectionHead} onClick={()=>setHistoryOpen(v=>!v)}><div><span>최근 반영 내역</span><strong>최대 100개 · 10개씩 보기</strong></div><b>{historyOpen?'접기':'펼치기'}</b></button>{historyOpen&&<><div className={styles.aiHistory}>{rows.map(h=><div key={h.step}><i>{h.step}회</i><span>{h.stage}</span><span>{clock(h.reflectedAt)}</span><strong className={h.delta<0?styles.loss:''}>{h.delta>=0?'+':''}{won(h.delta)}</strong><em>{won(h.amount)}</em></div>)}</div><div className={styles.aiPager}><button disabled={safePage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>‹</button><span>{safePage} / {pages}</span><button disabled={safePage>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))}>›</button></div></>}</section>
 <section className={styles.aiSection}><button className={styles.aiSectionHead} onClick={()=>setMarketOpen(v=>!v)}><div><span>AI 트레이딩 현황</span><strong>주식 · 코인 시장 탐색</strong></div><b>{marketOpen?'접기':'펼치기'}</b></button>{marketOpen&&<div className={styles.marketList}>{assets.map(([symbol,name,kind],i)=>{const q=quoteMap.get(symbol)||{};const phase=stages[(s.steps+i)%stages.length];return <div key={symbol}><i>{kind==='COIN'?'₿':'ST'}</i><strong>{name}<small>{symbol}</small></strong><span>{q.price?Number(q.price).toLocaleString('ko-KR'):'가격 연결 중'}</span><em>{phase}</em></div>;})}<small>시장가격 1분 갱신 · AI PROCESS 반영 3분</small></div>}</section></div>;
}