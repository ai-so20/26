'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabase';
import { aiProcessStatusLabel, getMemberProcessSnapshot } from './aiProcessModel';
import styles from './admin.module.css';

function krw(value){return `${Math.round(Number(value||0)).toLocaleString('ko-KR')}원`;}

export default function AdminAiProcess({ onNotice, onStats }) {
  const [rows,setRows]=useState([]);
  const [selectedId,setSelectedId]=useState('');
  const [search,setSearch]=useState('');
  const [working,setWorking]=useState(false);
  const [profitAdjust,setProfitAdjust]=useState('');
  const [form,setForm]=useState({available_count:0,status:'ready',investment_amount:0,duration_days:30,min_return:800,max_return:1200});

  const filtered=useMemo(()=>{const q=search.trim().toLowerCase();return q?rows.filter(r=>`${r.nickname||''} ${r.real_name||''}`.toLowerCase().includes(q)):rows;},[rows,search]);
  const selected=rows.find(r=>String(r.id)===String(selectedId))||null;
  const snapshot=selected?.process?.status==='running'||selected?.process?.status==='completed'?getMemberProcessSnapshot(selected.process,selected.id):null;

  useEffect(()=>{void load();},[]);

  async function load(){
    const [{data:members,error:memberError},{data:processes,error:processError}]=await Promise.all([
      supabase.rpc('get_admin_member_list'),
      supabase.from('ai_process_members').select('*'),
    ]);
    if(memberError||processError){onNotice(`AI PROCESS 불러오기 실패: ${memberError?.message||processError?.message}`);return;}
    const map=Object.fromEntries((processes||[]).map(r=>[String(r.user_id),r]));
    const seen=new Set();const next=[];
    for(const item of members||[]){const id=item.member_id||item.id;if(!id||seen.has(String(id)))continue;seen.add(String(id));next.push({id,nickname:item.nickname||'VIP 회원',real_name:item.real_name||'',avatar:item.avatar||'01',process:map[String(id)]||{user_id:id,available_count:0,status:'ready',investment_amount:0,duration_hours:720,min_return:800,max_return:1200,available_granted_at:null,started_at:null,completed_at:null,profit_adjustment:0}});}
    next.sort((a,b)=>{const ar=a.process?.status==='running',br=b.process?.status==='running';if(ar!==br)return ar?-1:1;if(ar&&br)return new Date(b.process?.started_at||0)-new Date(a.process?.started_at||0);return String(a.nickname).localeCompare(String(b.nickname),'ko');});
    setRows(next);onStats?.({runningProcesses:next.filter(r=>r.process?.status==='running').length});
    const keep=next.find(r=>String(r.id)===String(selectedId)); if(keep) choose(keep); else if(next[0]) choose(next[0]);
  }

  function choose(member){
    const p=member.process||{};setSelectedId(member.id);setForm({available_count:Math.max(0,Number(p.available_count||0)),status:p.status||'ready',investment_amount:Math.max(0,Number(p.investment_amount||0)),duration_days:Math.max(1,Math.min(30,Math.round(Number(p.duration_hours??720)/24))),min_return:Math.max(0,Number(p.min_return??800)),max_return:Math.max(0,Number(p.max_return??1200))});setProfitAdjust('');
  }

  async function save(nextStatus=null){
    if(!selectedId||working)return;setWorking(true);
    try{
      const current=rows.find(r=>String(r.id)===String(selectedId))?.process;
      const targetStatus=nextStatus||form.status||'ready';
      const requestedCount=Math.max(0,Math.floor(Number(form.available_count||0)));
      const startCount=targetStatus==='running'&&current?.status!=='running'?Math.max(1,requestedCount):requestedCount;
      const anchorProfit=current?.status==='running'?Math.max(0,getMemberProcessSnapshot(current,selectedId).earnedProfit-Number(current.profit_adjustment||0)):0;
      const payload={p_user_id:selectedId,p_available_count:startCount,p_status:targetStatus,p_investment_amount:Math.max(0,Number(form.investment_amount||0)),p_duration_hours:Math.max(1,Math.min(30,Number(form.duration_days||1)))*24,p_min_return:Math.max(0,Number(form.min_return||0)),p_max_return:Math.max(0,Number(form.max_return||0)),p_anchor_profit:anchorProfit};
      const {error}=await supabase.rpc('admin_save_ai_process_member_preserving_profit',payload); if(error)throw error;
      onNotice(payload.p_status==='running'?'AI PROCESS 진행을 시작했습니다.':payload.p_status==='completed'?'AI PROCESS를 진행완료 처리했습니다.':'AI PROCESS 설정을 저장했습니다.');await load();
    }catch(error){
      const message=String(error?.message||'알 수 없는 오류');
      if(message.includes('INVESTMENT_REQUIRED')) onNotice('AI PROCESS를 시작하려면 투자금액을 먼저 입력해주세요.');
      else onNotice(`AI PROCESS 저장 실패: ${message}`);
    }finally{setWorking(false);}
  }

  async function reset(){
    if(!selectedId||working)return;if(!window.confirm("이 회원의 진행 상태를 '진행 전'으로 초기화할까요?"))return;setWorking(true);
    const {error}=await supabase.rpc('admin_reset_ai_process_member',{p_user_id:selectedId,p_available_count:Math.max(0,Math.floor(Number(form.available_count||0)))});
    if(error)onNotice(`초기화 실패: ${error.message}`);else{onNotice('AI PROCESS 진행 상태를 초기화했습니다.');await load();}setWorking(false);
  }

  async function adjust(mode){
    const amount=Number(profitAdjust);if(!selectedId||!Number.isFinite(amount)||amount<=0){onNotice('조정할 금액을 입력해주세요.');return;}
    if(!window.confirm(`${krw(amount)}을 수익에 ${mode==='add'?'추가':'차감'}할까요?`))return;setWorking(true);
    const {error}=await supabase.rpc('admin_adjust_ai_process_profit',{p_user_id:selectedId,p_amount:(mode==='add'?1:-1)*amount});
    if(error)onNotice(`수익 조정 실패: ${error.message}`);else{onNotice('수익 조정을 반영했습니다.');setProfitAdjust('');await load();}setWorking(false);
  }

  return <section className={styles.section}>
    <div className={styles.sectionHead}><div><span>AI PROCESS CONTROL</span><strong>회원별 AI PROCESS 설정</strong><p>진행기회, 투자금, 기간, 수익률, 진행상태와 수익 조정을 기존 로직 그대로 관리합니다.</p></div><div className={styles.toolbar}><input className={styles.search} placeholder="회원 검색" value={search} onChange={e=>setSearch(e.target.value)}/><button className={styles.buttonSoft} onClick={load}>새로고침</button></div></div>
    <div className={styles.split}>
      <div className={styles.sideList}>{filtered.length?filtered.map(m=>{const p=m.process||{};return <button key={m.id} className={`${styles.sideRow} ${String(m.id)===String(selectedId)?styles.sideRowActive:''}`} onClick={()=>choose(m)}><div className={styles.sideRowTop}><strong>{m.nickname}</strong><span style={{display:'inline-flex',alignItems:'center',gap:5,marginLeft:6,padding:'2px 7px',border:'1px solid #dbe2ea',borderRadius:6,fontSize:11,fontWeight:800,color:'#536173',background:'#f7f9fb'}}>진행 가능 {Number(p.available_count||0)}회</span><span className={p.status==='running'?styles.badgeBlue:p.status==='completed'?styles.badgeGreen:styles.badgeGray}>{aiProcessStatusLabel(p.status,p.available_count)}</span></div><span>{m.real_name||'-'}</span></button>}):<div className={styles.empty}>회원이 없습니다.</div>}</div>
      <div className={styles.panel}>{selected?<>
        <div className={styles.sectionHead}>
          <div>
            <span>SELECTED MEMBER</span>
            <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',marginTop:2}}>
              <strong>{selected.nickname} · {selected.real_name||'-'}</strong>
              <div style={{display:'inline-flex',alignItems:'center',gap:7,padding:'5px 8px',border:'1px solid #dbe2ea',borderRadius:8,background:'#f7f9fb'}}>
                <label htmlFor="ai-available-count" style={{fontSize:11,fontWeight:800,color:'#637083',whiteSpace:'nowrap'}}>진행 가능 횟수</label>
                <input id="ai-available-count" className={styles.input} style={{width:68,minHeight:30,padding:'4px 7px'}} type="number" min="0" value={form.available_count} onChange={e=>setForm({...form,available_count:e.target.value})}/>
                <b style={{fontSize:11,color:'#38465a'}}>회</b>
              </div>
            </div>
          </div>
          <span className={selected.process?.status==='running'?styles.badgeBlue:selected.process?.status==='completed'?styles.badgeGreen:styles.badgeGray}>{aiProcessStatusLabel(selected.process?.status,selected.process?.available_count)}</span>
        </div>
        {snapshot&&<div className={styles.kpiRow}><div className={styles.kpi}><span>현재 평가금액</span><strong>{krw(snapshot.totalAmount)}</strong></div><div className={styles.kpi}><span>누적 수익</span><strong>{krw(snapshot.earnedProfit)}</strong></div><div className={styles.kpi}><span>현재 수익률</span><strong>{snapshot.currentReturn.toFixed(2)}%</strong></div></div>}
        <div className={styles.grid3}>
          <div className={styles.field}><label>투자금액</label><input className={styles.input} type="number" min="0" value={form.investment_amount} onChange={e=>setForm({...form,investment_amount:e.target.value})}/></div>
          <div className={styles.field}><label>진행기간(일)</label><input className={styles.input} type="number" min="1" max="30" value={form.duration_days} onChange={e=>setForm({...form,duration_days:e.target.value})}/></div>
          <div className={styles.field}><label>최소 수익률(%)</label><input className={styles.input} type="number" min="0" value={form.min_return} onChange={e=>setForm({...form,min_return:e.target.value})}/></div>
          <div className={styles.field}><label>최대 수익률(%)</label><input className={styles.input} type="number" min="0" value={form.max_return} onChange={e=>setForm({...form,max_return:e.target.value})}/></div>
          <div className={styles.field}><label>상태</label><select className={styles.select} value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="ready">진행 전</option><option value="waiting">대기</option><option value="running">진행중</option><option value="completed">진행완료</option></select></div>
        </div>
        <div className={styles.toolbar} style={{marginTop:12}}><button className={styles.button} disabled={working} onClick={()=>save()}>설정 저장</button><button className={styles.buttonPrimary} disabled={working} onClick={()=>save('running')}>진행 시작</button><button className={styles.buttonSoft} disabled={working} onClick={()=>save('completed')}>진행 완료</button><button className={styles.buttonDanger} disabled={working} onClick={reset}>진행 초기화</button></div>
        <div className={styles.section} style={{boxShadow:'none',marginTop:12}}><div className={styles.sectionHead}><div><span>PROFIT ADJUSTMENT</span><strong>수익 금액 수동 조정</strong></div></div><div className={styles.toolbar}><input className={styles.input} type="number" min="1" placeholder="조정 금액" value={profitAdjust} onChange={e=>setProfitAdjust(e.target.value)}/><button className={styles.buttonSoft} disabled={working} onClick={()=>adjust('add')}>수익 추가</button><button className={styles.buttonDanger} disabled={working} onClick={()=>adjust('subtract')}>수익 차감</button></div></div>
      </>:<div className={styles.empty}>회원을 선택해주세요.</div>}</div>
    </div>
  </section>;
}
