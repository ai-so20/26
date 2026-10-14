export const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const money=value=>new Intl.NumberFormat('ko-KR').format(Number(value??0))+'원';
export const signed=value=>(Number(value)>=0?'+':'−')+money(Math.abs(Number(value??0)));
export const percent=value=>(Number(value)>=0?'+':'')+Number(value??0).toFixed(2)+'%';
export const valuation=p=>Number(p.capital)+Number(p.pnl);
export const returnPct=p=>Number(p.capital)>0?Number(p.pnl)/Number(p.capital)*100:0;
export const date=value=>value?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value)):'기간 미정';
export function remaining(p){if(p.status==='complete')return'완료';if(!p.ends_at)return'기간 미정';const min=Math.max(0,Math.ceil((new Date(p.ends_at)-Date.now())/60000));if(!min)return'종료시간 도달';const d=Math.floor(min/1440),h=Math.floor(min%1440/60),m=min%60;return[d?d+'일':'',h?h+'시간':'',m?m+'분':''].filter(Boolean).join(' ')||'1분 미만'}
export const statusText=p=>p.status==='complete'?'완료':p.status==='ready'?'대기중':'진행중';
