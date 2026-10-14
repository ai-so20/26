import {escape,money,date} from './format.mjs';
export function chart(rows,mode='all'){
 const cutoff=mode==='today'?new Date(new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date())+'T00:00:00+09:00').getTime():mode==='week'?Date.now()-7*86400000:0;
 const history=rows.filter(x=>new Date(x.created_at).getTime()>=cutoff);
 if(!history.length)return'<div class="empty small">선택한 기간에 기록이 없습니다.</div>';
 const vals=history.map(x=>Number(x.valuation_after)),min=Math.min(...vals),max=Math.max(...vals),pad=Math.max((max-min)*.12,max*.001,1),lo=min-pad,hi=max+pad;
 const w=620,h=180,times=history.map(x=>new Date(x.created_at).getTime()),first=times[0],span=times.at(-1)-first;
 const points=vals.map((v,i)=>[20+(span?(times[i]-first)/span:.5)*(w-40),16+(hi-v)/(hi-lo)*(h-36)]);
 const path=points.map((p,i)=>(i?'L':'M')+p.map(x=>x.toFixed(2)).join(',')).join(' ');
 return`<div class="chart-values"><span>${money(max)}</span><span>${money(min)}</span></div><svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escape('평가금액 변화. 최근 '+money(vals.at(-1)))}">${[hi,(hi+lo)/2,lo].map(v=>`<path d="M20 ${16+(hi-v)/(hi-lo)*(h-36)} H600" stroke="#e7ecf3"/>`).join('')}<path d="${path}" fill="none" stroke="#245fe5" stroke-width="3" stroke-linejoin="round"/>${points.map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]}" r="${history[i].capital_delta?'4':'2'}" fill="${history[i].capital_delta?'#7d8ca0':'#245fe5'}"><title>${escape(date(history[i].created_at)+' · '+money(vals[i]))}</title></circle>`).join('')}</svg><div class="chart-dates"><span>${date(history[0].created_at)}</span><span>${date(history.at(-1).created_at)}</span></div><p class="hint">회색 점은 투자금 반영입니다. 최근 500개 원장 기록을 표시합니다.</p>`;
}
