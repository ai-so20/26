import {call} from './modules/api.mjs';
import {escape as e,money,remaining} from './modules/format.mjs';

const app=document.querySelector('#app'),header=document.querySelector('#header'),toastEl=document.querySelector('#toast');
const state={user:null,page:'events',events:[],rewards:[],processes:[],history:[],selectedProcess:null,adminPage:'members',members:[],adminEvents:[],gifts:[],adminProcesses:[],adminMember:null};
let toastTimer,busy=false;

function toast(message){toastEl.textContent=message;toastEl.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toastEl.classList.remove('visible'),3800)}
function pct(p){if(!p||!Number(p.capital))return '0.00%';return `${((Number(p.pnl)/Number(p.capital))*100).toFixed(2)}%`}
function date(v){if(!v)return '—';return new Intl.DateTimeFormat('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}
function statusLabel(s){return {running:'진행중',complete:'완료',ready:'대기',open:'진행중',closed:'종료',draft:'준비',pending:'지급대기',paid:'지급완료'}[s]||s}
function kindLabel(k){return {basic:'일반',first_come:'선착순',quiz:'퀴즈',number:'숫자선택',box:'선물상자',roulette:'룰렛',attendance:'출석'}[k]||k}

function renderHeader(){
 if(!state.user){header.innerHTML='<a class="brand portal-brand" href="/">VIP <span>EVENT</span></a><span class="header-note">VIP BENEFIT</span>';return}
 header.innerHTML=`<a class="brand portal-brand" href="/">VIP <span>EVENT</span></a><div class="header-actions"><span class="account-name">${e(state.user.name)}${state.user.role==='admin'?' · 관리자':''}</span><button class="text-btn" data-action="logout">로그아웃</button></div>`;
}

function loginView(error=''){
 return `<section class="vip-entry"><div class="vip-entry-copy"><span class="vip-chip">VIP EVENT BENEFIT</span><h1>회원님을 위한<br><strong>특별한 혜택</strong></h1><p>이벤트 참여부터 AI PROCESS, 당첨 상품 지급까지<br>한 곳에서 간편하게 확인하세요.</p><div class="benefit-points"><span>EVENT</span><span>AI PROCESS</span><span>REWARD</span></div></div><form id="login-form" class="vip-login-card"><div class="login-mark">VIP</div><h2>회원 확인</h2><p>미리 등록된 닉네임과 성함을 입력해주세요.</p><label>닉네임<input name="nickname" autocomplete="username" maxlength="40" required placeholder="닉네임"></label><label>성함<input name="name" autocomplete="name" maxlength="40" required placeholder="본인 성함"></label><p id="form-error" class="form-error">${e(error)}</p><button class="primary portal-login" type="submit">VIP 혜택 확인하기</button><small>등록된 회원만 이용할 수 있습니다.</small></form></section>`;
}
function auth(error=''){state.user=null;renderHeader();app.className='portal-shell guest';app.innerHTML=loginView(error)}

function userNav(){return `<nav class="portal-nav">${[['events','이벤트'],['process','AI PROCESS'],['rewards','상품지급']].map(([id,label])=>`<button data-page="${id}" class="${state.page===id?'active':''}">${label}</button>`).join('')}</nav>`}

function eventsView(){
 const cards=state.events.length?state.events.map(ev=>`<article class="event-card ${ev.status}"><div class="event-card-top"><span class="event-kind">${kindLabel(ev.kind)}</span><span class="status-pill ${ev.status}">${statusLabel(ev.status)}</span></div><h3>${e(ev.title)}</h3><p>${e(ev.description)||'VIP 회원을 위한 이벤트입니다.'}</p><dl><div><dt>참여 인원</dt><dd>${ev.participants}${ev.capacity?` / ${ev.capacity}`:''}명</dd></div><div><dt>기간</dt><dd>${ev.ends_at?`${date(ev.ends_at)}까지`:'별도 안내'}</dd></div></dl>${ev.kind==='quiz'&&ev.status==='open'&&!ev.joined?`<label class="quiz-input">${e(ev.question)||'정답'}<input data-entry-for="${ev.id}" placeholder="정답을 입력해주세요"></label>`:''}<button class="event-join ${ev.joined?'joined':''}" data-join="${ev.id}" ${ev.status!=='open'||ev.joined?'disabled':''}>${ev.joined?'참여 완료':ev.status==='open'?'이벤트 참여하기':'이벤트 종료'}</button></article>`).join(''):`<div class="empty-state"><b>진행 중인 이벤트가 없습니다.</b><p>새로운 VIP 이벤트가 등록되면 이곳에서 확인할 수 있습니다.</p></div>`;
 return `<section class="portal-hero"><div><p class="eyebrow">VIP EVENT</p><h1>회원 전용 이벤트</h1><p>현재 참여 가능한 이벤트와 참여 현황을 확인하세요.</p></div><div class="hero-stat"><span>참여 가능</span><strong>${state.events.filter(x=>x.status==='open'&&!x.joined).length}</strong><small>EVENT</small></div></section><section class="event-grid">${cards}</section>`;
}

function processView(){
 if(!state.processes.length)return `<section class="portal-hero"><div><p class="eyebrow">AI PROCESS</p><h1>나의 AI PROCESS</h1><p>진행 조건과 손익 흐름을 한눈에 확인하세요.</p></div></section><div class="empty-state"><b>등록된 PROCESS가 없습니다.</b><p>PROCESS가 시작되면 현재 평가금액과 반영 기록이 표시됩니다.</p></div>`;
 const p=state.processes.find(x=>x.id===state.selectedProcess)||state.processes[0];
 const value=Number(p.capital)+Number(p.pnl),positive=Number(p.pnl)>=0;
 const rows=state.history.slice(-10).reverse().map(x=>`<div class="ledger-row"><span>${date(x.created_at)}</span><b>${x.kind==='capital'?'투자금':Number(x.pnl_delta)>=0?'수익 반영':'손실 반영'}</b><em class="${Number(x.pnl_delta)>=0?'profit':'loss'}">${x.kind==='capital'?`+${money(x.capital_delta)}`:`${Number(x.pnl_delta)>=0?'+':''}${money(x.pnl_delta)}`}</em><strong>${money(x.valuation_after)}</strong></div>`).join('');
 return `<section class="portal-hero process-hero"><div><p class="eyebrow">AI PROCESS</p><h1>나의 AI PROCESS</h1><p>현재 진행 상태와 평가금액 변화를 확인하세요.</p></div><select id="process-select">${state.processes.map(x=>`<option value="${x.id}" ${x.id===p.id?'selected':''}>${e(x.display_name)} · ${statusLabel(x.status)}</option>`).join('')}</select></section><section class="process-summary"><article class="valuation-card"><span>현재 평가금액</span><strong>${money(value)}</strong><em class="${positive?'profit':'loss'}">${positive?'+':''}${money(p.pnl)} · ${pct(p)}</em></article><article><span>투자금</span><strong>${money(p.capital)}</strong></article><article><span>진행 상태</span><strong>${statusLabel(p.status)}</strong><small>${p.status==='running'?remaining(p):date(p.completed_at)}</small></article><article><span>시작 시간</span><strong class="small-value">${date(p.started_at)}</strong><small>${p.ends_at?`종료 ${date(p.ends_at)}`:'기간 미정'}</small></article></section><section class="records-panel"><div class="section-title"><div><p class="eyebrow">PROCESS RECORD</p><h2>최근 반영 기록</h2></div></div>${rows||'<div class="empty-mini">아직 반영 기록이 없습니다.</div>'}</section>`;
}

function rewardsView(){
 const pending=state.rewards.filter(x=>x.status==='pending').length;
 const cards=state.rewards.length?state.rewards.map(r=>`<article class="reward-card"><div class="reward-icon">${r.status==='paid'?'✓':'GIFT'}</div><div class="reward-body"><div><span class="reward-mode ${r.payment_mode}">${r.payment_mode==='real'?'실제지급':'가상지급'}</span><span class="status-pill ${r.status}">${statusLabel(r.status)}</span></div><h3>${e(r.reward_title)}</h3><p>${e(r.event_title)||'VIP 특별 혜택'}</p><small>당첨 ${date(r.awarded_at)}${r.paid_at?` · 지급 ${date(r.paid_at)}`:''}</small>${r.payment_mode==='real'&&r.gift_url_snapshot?`<a class="gift-link" href="${e(r.gift_url_snapshot)}" target="_blank" rel="noopener">기프티콘 확인하기</a>`:''}</div></article>`).join(''):`<div class="empty-state"><b>지급 내역이 없습니다.</b><p>이벤트 당첨 상품이 지급되면 이곳에서 확인할 수 있습니다.</p></div>`;
 return `<section class="portal-hero"><div><p class="eyebrow">VIP REWARD</p><h1>상품지급</h1><p>이벤트 당첨 및 VIP 혜택 상품의 지급 상태를 확인하세요.</p></div><div class="hero-stat"><span>지급 대기</span><strong>${pending}</strong><small>REWARD</small></div></section><section class="reward-list">${cards}</section>`;
}

function renderUser(){app.className='portal-shell';app.innerHTML=userNav()+(state.page==='events'?eventsView():state.page==='process'?processView():rewardsView())}

function adminNav(){return `<nav class="admin-portal-nav">${[['members','회원'],['events','이벤트'],['gifts','기프티콘'],['rewards','상품지급'],['process','AI PROCESS']].map(([id,label])=>`<button data-admin-page="${id}" class="${state.adminPage===id?'active':''}">${label}</button>`).join('')}</nav>`}
function memberOptions(){return state.members.map(m=>`<option value="${m.id}">${e(m.username)} · ${e(m.name)}</option>`).join('')}
function eventOptions(){return `<option value="">이벤트 없음</option>`+state.adminEvents.map(v=>`<option value="${v.id}">${e(v.title)}</option>`).join('')}
function giftOptions(){return `<option value="">선택 안함</option>`+state.gifts.filter(g=>g.status==='available').map(g=>`<option value="${g.id}">${e(g.product_name)}</option>`).join('')}
function adminMembers(){return `<div class="admin-grid"><section class="admin-card"><p class="eyebrow">MEMBER REGISTER</p><h2>회원 사전 등록</h2><form id="member-create" class="stack-form"><label>닉네임<input name="nickname" required maxlength="40"></label><label>성함<input name="name" required maxlength="40"></label><button class="primary" type="submit">회원 등록</button></form></section><section class="admin-card wide"><div class="section-title"><div><p class="eyebrow">MEMBERS</p><h2>등록 회원</h2></div><strong>${state.members.length}명</strong></div><div class="member-table">${state.members.map(m=>`<div><span><b>${e(m.username)}</b><small>${e(m.name)}</small></span><span>이벤트 ${m.event_entries||0}</span><span>지급대기 ${m.reward_pending||0}</span></div>`).join('')||'<p>등록된 회원이 없습니다.</p>'}</div></section></div>`}
function adminEvents(){return `<div class="admin-grid"><section class="admin-card"><p class="eyebrow">EVENT CREATE</p><h2>이벤트 등록</h2><form id="event-create" class="stack-form"><label>이벤트명<input name="title" required maxlength="100"></label><label>유형<select name="kind"><option value="basic">일반</option><option value="first_come">선착순</option><option value="quiz">퀴즈</option><option value="number">숫자선택</option><option value="box">선물상자</option><option value="roulette">룰렛</option><option value="attendance">출석</option></select></label><label>설명<textarea name="description" rows="3"></textarea></label><label>최대 인원<input name="capacity" type="number" min="1" placeholder="제한 없음"></label><label>퀴즈 질문<input name="question" maxlength="300"></label><input type="hidden" name="status" value="open"><button class="primary" type="submit">이벤트 등록</button></form></section><section class="admin-card wide"><div class="section-title"><div><p class="eyebrow">EVENTS</p><h2>이벤트 관리</h2></div><strong>${state.adminEvents.length}개</strong></div><div class="admin-event-list">${state.adminEvents.map(v=>`<div><span><b>${e(v.title)}</b><small>${kindLabel(v.kind)} · 참여 ${v.participants||0}명</small></span><span class="status-pill ${v.status}">${statusLabel(v.status)}</span><button class="secondary mini" data-event-status="${v.id}" data-next="${v.status==='open'?'closed':'open'}">${v.status==='open'?'종료':'열기'}</button></div>`).join('')||'<p>등록된 이벤트가 없습니다.</p>'}</div></section></div>`}
function adminGifts(){return `<div class="admin-grid"><section class="admin-card"><p class="eyebrow">GIFT REGISTER</p><h2>기프티콘 일괄 등록</h2><form id="gift-add" class="stack-form"><label>등록 형식<textarea name="lines" rows="8" required placeholder="상품명 | https://기프티콘링크\n상품명 | https://기프티콘링크"></textarea></label><label>구분<select name="gift_group"><option value="event">일반 이벤트</option><option value="attendance">출석 전용</option></select></label><button class="primary" type="submit">기프티콘 등록</button></form></section><section class="admin-card wide"><div class="section-title"><div><p class="eyebrow">GIFT INVENTORY</p><h2>기프티콘 재고</h2></div><strong>${state.gifts.filter(x=>x.status==='available').length}개 사용가능</strong></div><div class="gift-stock">${state.gifts.map(g=>`<div><span><b>${e(g.product_name)}</b><small>${e(g.gift_group)}</small></span><span class="status-pill ${g.status}">${g.status==='available'?'지급대기':g.status==='assigned'?'배정완료':g.status}</span></div>`).join('')||'<p>등록된 기프티콘이 없습니다.</p>'}</div></section></div>`}
function adminRewards(){return `<section class="admin-card reward-admin"><p class="eyebrow">REWARD ASSIGN</p><h2>당첨 상품 지급 등록</h2><p>실제지급은 등록된 기프티콘 재고를 배정하고, 가상지급은 상품 지급 기록만 생성합니다.</p><form id="reward-assign" class="reward-form"><label>회원<select name="user_id" required><option value="">회원 선택</option>${memberOptions()}</select></label><label>이벤트<select name="event_id">${eventOptions()}</select></label><label>지급 구분<select name="payment_mode"><option value="real">실제지급</option><option value="virtual">가상지급</option></select></label><label>기프티콘<select name="gift_id">${giftOptions()}</select></label><label class="span2">상품명<input name="reward_title" placeholder="미입력 시 기프티콘 상품명 사용"></label><button class="primary span2" type="submit">상품 지급 등록</button></form></section>`}
function adminProcess(){const selected=state.adminMember;return `<div class="admin-grid"><section class="admin-card"><p class="eyebrow">PROCESS MEMBER</p><h2>회원 선택</h2><select id="admin-process-member"><option value="">회원 선택</option>${state.members.map(m=>`<option value="${m.id}" ${selected===m.id?'selected':''}>${e(m.username)} · ${e(m.name)}</option>`).join('')}</select><button class="primary process-create" data-process-action="create" ${selected?'':'disabled'}>새 PROCESS 시작</button></section><section class="admin-card wide"><div class="section-title"><div><p class="eyebrow">AI PROCESS</p><h2>회원 PROCESS 관리</h2></div></div>${state.adminProcesses.length?state.adminProcesses.map(p=>`<article class="admin-process-row"><div><b>${e(p.display_name)}</b><small>${statusLabel(p.status)} · 평가 ${money(Number(p.capital)+Number(p.pnl))} · 손익 ${money(p.pnl)}</small></div><div class="process-actions">${p.status==='running'?`<button data-process-action="profit" data-process-id="${p.id}">+ 수익</button><button data-process-action="loss" data-process-id="${p.id}">- 손실</button><button data-process-action="capital" data-process-id="${p.id}">투자금 추가</button><button data-process-action="end" data-process-id="${p.id}">종료</button>`:''}</div></article>`).join(''):'<div class="empty-mini">회원을 선택하거나 PROCESS를 시작해주세요.</div>'}</section></div>`}
function renderAdmin(){app.className='portal-shell admin-portal';let body={members:adminMembers,events:adminEvents,gifts:adminGifts,rewards:adminRewards,process:adminProcess}[state.adminPage]();app.innerHTML=`<section class="admin-portal-head"><div><p class="eyebrow">VIP OPERATION</p><h1>운영 관리</h1></div><span>회원 · 이벤트 · 지급 · PROCESS</span></section>${adminNav()}${body}`}
function render(){renderHeader();if(!state.user)return auth();state.user.role==='admin'?renderAdmin():renderUser()}

async function loadUser(){
 if(state.page==='events')state.events=await call('events');
 if(state.page==='rewards')state.rewards=await call('rewards');
 if(state.page==='process'){state.processes=await call('processes');if(!state.selectedProcess||!state.processes.some(x=>x.id===state.selectedProcess))state.selectedProcess=state.processes[0]?.id||null;state.history=state.selectedProcess?await call('history',{process_id:state.selectedProcess}):[]}
}
async function loadAdmin(){
 state.members=await call('admin_portal_members');
 if(['events','rewards'].includes(state.adminPage))state.adminEvents=await call('admin_events');
 if(['gifts','rewards'].includes(state.adminPage))state.gifts=await call('admin_gifts');
 if(state.adminPage==='process'&&state.adminMember)state.adminProcesses=await call('admin_processes',{user_id:state.adminMember});
}
async function refresh(){if(!state.user)return;state.user=await call('me');if(state.user.role==='admin')await loadAdmin();else await loadUser();render()}

async function mutate(action,payload){return call(action,{...payload,request_id:crypto.randomUUID()})}
async function handleForm(form){
 const data=Object.fromEntries(new FormData(form));
 if(form.id==='login-form'){const r=await call('login',{nickname:data.nickname,name:data.name});state.user=r.user;history.replaceState(null,'',state.user.role==='admin'?'/admin':'/');await refresh();return}
 if(form.id==='member-create'){await mutate('admin_member_create',data);form.reset();toast('회원이 등록되었습니다.');await loadAdmin();render();return}
 if(form.id==='event-create'){if(!data.capacity)delete data.capacity;await mutate('admin_event_create',data);form.reset();toast('이벤트가 등록되었습니다.');await loadAdmin();render();return}
 if(form.id==='gift-add'){const lines=data.lines.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);let ok=0,fail=0;for(const line of lines){const parts=line.split('|');const product_name=(parts.shift()||'').trim(),gift_url=parts.join('|').trim();if(!product_name||!gift_url){fail++;continue}try{await mutate('admin_gift_add',{product_name,gift_url,gift_group:data.gift_group});ok++}catch{fail++}}toast(`${ok}개 등록 완료${fail?` · ${fail}개 제외`:''}`);await loadAdmin();render();return}
 if(form.id==='reward-assign'){if(data.payment_mode==='virtual')data.gift_id='';await mutate('admin_reward_assign',data);form.reset();toast('상품 지급이 등록되었습니다.');await loadAdmin();render();return}
}

document.addEventListener('submit',async ev=>{const form=ev.target;if(!['login-form','member-create','event-create','gift-add','reward-assign'].includes(form.id))return;ev.preventDefault();if(busy)return;busy=true;const btn=form.querySelector('[type=submit]');if(btn)btn.disabled=true;try{await handleForm(form)}catch(err){const out=form.querySelector('#form-error');if(out)out.textContent=err.message;else toast(err.message||'요청을 처리하지 못했습니다.')}finally{if(btn)btn.disabled=false;busy=false}});

document.addEventListener('click',async ev=>{const b=ev.target.closest('button');if(!b||b.disabled)return;try{
 if(b.dataset.page){state.page=b.dataset.page;await loadUser();render();return}
 if(b.dataset.adminPage){state.adminPage=b.dataset.adminPage;await loadAdmin();render();return}
 if(b.dataset.join){const input=document.querySelector(`[data-entry-for="${b.dataset.join}"]`);await mutate('join_event',{event_id:b.dataset.join,entry_value:input?.value||''});toast('이벤트 참여가 완료되었습니다.');state.events=await call('events');render();return}
 if(b.dataset.eventStatus){await mutate('admin_event_status',{event_id:b.dataset.eventStatus,status:b.dataset.next});toast('이벤트 상태가 변경되었습니다.');state.adminEvents=await call('admin_events');render();return}
 if(b.dataset.processAction){await processAction(b);return}
 if(b.dataset.action==='logout'){await call('logout');state.user=null;history.replaceState(null,'','/');auth();return}
 }catch(err){toast(err.message||'요청을 처리하지 못했습니다.')}});

document.addEventListener('change',async ev=>{try{if(ev.target.id==='process-select'){state.selectedProcess=ev.target.value;state.history=await call('history',{process_id:state.selectedProcess});render();return}if(ev.target.id==='admin-process-member'){state.adminMember=ev.target.value||null;state.adminProcesses=state.adminMember?await call('admin_processes',{user_id:state.adminMember}):[];render();return}}catch(err){toast(err.message)}});

async function processAction(b){
 const action=b.dataset.processAction,id=b.dataset.processId;
 if(action==='create'){
   const capital=Number(prompt('투자금을 입력해주세요.','5000000'));if(!capital)return;const hours=Number(prompt('진행 시간을 시간 단위로 입력해주세요. (1~720)','24'));if(!hours)return;
   await mutate('admin_create',{user_id:state.adminMember,display_name:'AI PROCESS',capital,duration_minutes:Math.round(hours*60)});
 }else if(['profit','loss','capital'].includes(action)){
   const amount=Number(prompt(`${action==='profit'?'수익':action==='loss'?'손실':'추가 투자금'} 금액을 입력해주세요.`,'100000'));if(!amount)return;
   await mutate('admin_adjust',{user_id:state.adminMember,process_id:id,kind:action,amount});
 }else if(action==='end'){
   if(!confirm('이 PROCESS를 종료하시겠습니까?'))return;await mutate('admin_end',{user_id:state.adminMember,process_id:id});
 }
 toast('PROCESS 변경사항이 반영되었습니다.');state.adminProcesses=await call('admin_processes',{user_id:state.adminMember});render();
}

renderHeader();
try{state.user=await call('me');if(state.user.role==='admin')await loadAdmin();else await loadUser();render()}catch(err){auth(err.code==='UNAUTHORIZED'?'':err.message||'연결을 확인해주세요.')}
