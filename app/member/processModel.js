const STEP_MS=3*60*1000;
const stages=['분석','탐색','매수','관리','매도','재분석'];
const assets=[['BTC/USD','Bitcoin','COIN'],['ETH/USD','Ethereum','COIN'],['SOL/USD','Solana','COIN'],['XRP/USD','XRP','COIN'],['AAPL','Apple','STOCK'],['NVDA','NVIDIA','STOCK'],['MSFT','Microsoft','STOCK'],['TSLA','Tesla','STOCK']];
function won(v){return `${Math.round(Number(v||0)).toLocaleString('ko-KR')}원`;}
function duration(h){const n=Math.max(1,Math.min(2400,Number(h||24)));return n%24===0?`${n/24}일`:n>24?`${Math.floor(n/24)}일 ${n%24}시간`:`${n}시간`;}
function hash(s){let h=2166136261;for(let i=0;i<String(s).length;i++){h^=String(s).charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){let v=seed>>>0;return()=>{v+=0x6D2B79F5;let t=v;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function clock(value){if(!value)return'--:--';return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));}
function finalReturn(row,userId){const min=Math.max(0,Number(row?.min_return||0));const max=Math.max(min,Number(row?.max_return||min));const random=rng(hash(`${row?.user_id||userId||'member'}-${row?.started_at||'not-started'}-${min}-${max}`));return min+(max-min)*random();}

function buildSnapshot(row,userId,now,historyLimit=100){
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
 const anchoredProfit=hasAnchor?Number(row.profit_anchor)+Math.max(0,targetProfit-Number(row.profit_anchor))*(anchorCurveTotal>0?(cumulativeAt(steps)-cumulativeAt(anchorSteps))/anchorCurveTotal:Math.min(1,stepsAfterAnchor/remainingSteps)):legacyProfit;
 const adjustment=Number(row?.profit_adjustment||0);
 const earned=Math.max(0,anchoredProfit+adjustment);
 const total=investment+earned;
 const rate=investment>0?(earned/investment)*100:0;
 const progress=targetProfit>0?Math.min(100,(earned/targetProfit)*100):0;
 const profitForStep=step=>{const base=hasAnchor?(step<=anchorSteps?Number(row.profit_anchor)*step/Math.max(1,anchorSteps):Number(row.profit_anchor)+Math.max(0,targetProfit-Number(row.profit_anchor))*(anchorCurveTotal>0?(cumulativeAt(step)-cumulativeAt(anchorSteps))/anchorCurveTotal:(step-anchorSteps)/remainingSteps)):cumulativeAt(step);return Math.max(0,base+adjustment);};
 const history=[];const first=Math.max(1,steps-historyLimit+1);
 for(let step=first;step<=steps;step++){const profit=profitForStep(step);const previousProfit=profitForStep(step-1);history.push({step,amount:investment+profit,delta:profit-previousProfit,reflectedAt:start+step*STEP_MS,stage:stages[(step-1)%stages.length]});}
 const remainingMs=Math.max(0,durationMs-elapsed);const remainingHours=Math.floor(remainingMs/3600000);const remainingMinutes=Math.floor((remainingMs%3600000)/60000);
 const remain=row?.status==='completed'?'완료':remainingHours>=24?`${Math.floor(remainingHours/24)}일 ${remainingHours%24}시간`:remainingHours?`${remainingHours}시간 ${remainingMinutes}분`:`${remainingMinutes}분`;
 return{investment,targetReturn,targetProfit,earned,total,rate,progress:row?.status==='completed'?100:progress,remain,steps,totalSteps,history,start};
}
function chartPoints(history){if(!history.length)return'';const rows=history.slice(-48);const values=rows.map(x=>x.amount);const lo=Math.min(...values),hi=Math.max(...values),visibleGain=hi-lo,range=Math.max(1,visibleGain*1.28);return rows.map((x,i)=>`${18+(724*i/Math.max(1,rows.length-1))},${200-160*Math.max(0,Math.min(1,(x.amount-lo)/range))}`).join(' ');}


export {STEP_MS,stages,assets,won,duration,clock,buildSnapshot};
