'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import styles from './status.module.css';

const STEP_MS = 3 * 60 * 1000;
function money(v){ return `${Math.round(Number(v||0)).toLocaleString('ko-KR')}원`; }
function fmtTime(v){ if(!v)return '-'; return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(v)).replace(/\. /g,'. ').replace('.',''); }
function hash(text){let h=2166136261;for(let i=0;i<String(text).length;i++){h^=String(text).charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function random(seed){let value=seed>>>0;return()=>{value+=0x6D2B79F5;let t=value;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function snapshot(row,id){
 const investment=Math.max(0,Number(row?.investment_amount||0));
 const min=Math.max(0,Number(row?.min_return||0)); const max=Math.max(min,Number(row?.max_return||min));
 const r=random(hash(`${row?.user_id||id}-${row?.started_at}-${min}-${max}`)); const target=min+(max-min)*r(); const targetProfit=investment*target/100;
 const duration=Math.max(1,Math.min(2400,Number(row?.duration_hours||24)))*3600000; const totalSteps=Math.max(1,Math.round(duration/STEP_MS));
 const start=new Date(row?.started_at||Date.now()).getTime(); const done=row?.completed_at?new Date(row.completed_at).getTime():NaN; const now=row?.status==='completed'&&Number.isFinite(done)?done:Date.now();
 const elapsed=Math.min(totalSteps,Math.floor(Math.max(0,now-start)/STEP_MS)); const rr=random(hash(`${row?.user_id||id}-${row?.started_at}-${investment}-${target}-${row?.duration_hours||24}`));
 const weights=[]; for(let s=0;s<totalSteps;s+=10){const count=Math.min(10,totalSteps-s),loss=count>=5?(rr()<.5?1:2):(count>=2?1:0),set=new Set();while(set.size<loss)set.add(Math.floor(rr()*count));for(let o=0;o<count;o++){const i=s+o,w=.72+.28*Math.sin((i/Math.max(1,totalSteps-1))*Math.PI),burst=rr()>.87?1.65+rr()*1.5:1,gain=(.28+rr()*1.55)*w*burst;weights.push(set.has(o)?-gain*(.12+rr()*.18):gain);}}
 const total=weights.reduce((a,b)=>a+b,0)||1; let p=0; const cumulative=weights.map(w=>(p+=targetProfit*w/total)); const at=n=>n>0?cumulative[Math.min(totalSteps,n)-1]:0;
 const anchorAt=row?.profit_anchor_at?new Date(row.profit_anchor_at).getTime():NaN,has=Number.isFinite(anchorAt)&&row?.profit_anchor!=null,anchorSteps=has?Math.max(0,Math.floor((anchorAt-start)/STEP_MS)):0,curve=at(totalSteps)-at(anchorSteps),remaining=Math.max(1,totalSteps-anchorSteps);
 const base=has?Number(row.profit_anchor)+Math.max(0,targetProfit-Number(row.profit_anchor))*(curve>0?(at(elapsed)-at(anchorSteps))/curve:Math.max(0,elapsed-anchorSteps)/remaining):at(elapsed);
 const profit=Math.max(0,base+Number(row?.profit_adjustment||0)); return {investment,profit,total:investment+profit};
}

export default function PublicProcessStatus(){
 const [rows,setRows]=useState([]); const [checked,setChecked]=useState(new Date()); const [,tick]=useState(0);
 async function load(){
   const [{data:members},{data:processes}]=await Promise.all([supabase.rpc('get_admin_member_list'),supabase.from('ai_process_members').select('*')]);
   const map=Object.fromEntries((processes||[]).map(p=>[String(p.user_id),p])); const seen=new Set();
   const next=(members||[]).map(m=>{const id=m.member_id||m.id;if(!id||seen.has(String(id)))return null;seen.add(String(id));return{id,nickname:m.nickname||'VIP 회원',process:map[String(id)]||null};}).filter(Boolean).filter(x=>x.process&&(x.process.status==='running'||x.process.status==='completed'));
   next.sort((a,b)=>a.process.status===b.process.status?new Date(b.process.started_at||0)-new Date(a.process.started_at||0):(a.process.status==='running'?-1:1)); setRows(next); setChecked(new Date());
 }
 useEffect(()=>{load();const a=setInterval(load,30000),b=setInterval(()=>tick(v=>v+1),1000);return()=>{clearInterval(a);clearInterval(b);};},[]);
 const stats=useMemo(()=>({running:rows.filter(x=>x.process.status==='running').length,done:rows.filter(x=>x.process.status==='completed').length,total:rows.length}),[rows]);
 return <main className={styles.page}><div className={styles.wrap}>
   <header className={styles.hero}><div className={styles.eyebrow}>VIP EVENT · LIVE STATUS</div><div className={styles.room}>VIP 9번방</div><h1>AI프로세스 진행현황</h1><p>기존 VIP 이벤트 홈페이지의 AI 시뮬레이션 진행 상태를 자동으로 반영합니다.</p></header>
   <div className={styles.live}>● 30초마다 상태 확인 · 수익 3분 단위 반영</div>
   <section className={styles.stats}><div><span>진행 중</span><strong>{stats.running}<small>명</small></strong></div><div><span>진행 완료</span><strong>{stats.done}<small>명</small></strong></div><div><span>전체 진행기록</span><strong>{stats.total}<small>명</small></strong></div></section>
   <section className={styles.board}><header><strong>회원별 진행 현황</strong><span>마지막 확인 {fmtTime(checked)} (한국시간)</span></header><div className={styles.list}>
   {rows.length?rows.map(({id,nickname,process})=>{const s=snapshot(process,id),running=process.status==='running';return <article className={styles.member} key={id}><div className={styles.memberHead}><strong>{nickname}</strong><b className={running?styles.running:styles.done}>{running?'● 진행 중':'✓ 진행 완료'}</b></div><div className={styles.amounts}><div><span>진행 금액</span><strong>{money(s.investment)}</strong></div><div><span>수익중인 금액</span><strong className={styles.profit}>{money(s.profit)}</strong></div><div><span>총금액</span><strong className={styles.total}>{money(s.total)}</strong></div></div><p>시작 시각 {fmtTime(process.started_at)} (한국시간)</p></article>}):<div className={styles.empty}>진행 기록이 없습니다.</div>}
   </div></section>
 </div></main>;
}
