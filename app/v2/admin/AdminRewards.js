'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import styles from './admin.module.css';

const CONFIGS = {
  event: { label:'일반 이벤트', load:'admin_get_gift_inventory', bulk:'admin_bulk_add_gift_inventory', clearAvailable:'admin_delete_all_gift_inventory', clearAssigned:'admin_delete_all_assigned_gift_inventory' },
  ai: { label:'AI 전용', load:'admin_get_ai_gift_inventory', bulk:'admin_bulk_add_ai_gift_inventory', clearAvailable:'admin_delete_all_available_ai_gift_inventory', clearAssigned:'admin_delete_all_assigned_ai_gift_inventory' },
  attendance: { label:'출석체크', load:'admin_get_attendance_gift_inventory', bulk:'admin_bulk_add_attendance_gift_inventory', clearAvailable:'admin_delete_all_attendance_gift_inventory', clearAssigned:'admin_delete_all_assigned_attendance_gift_inventory' },
};

function parseAmount(name){
  const text=String(name||'').trim();
  const man=text.match(/(\d+(?:\.\d+)?)\s*만\s*원?/); if(man){const n=Math.round(Number(man[1])*10000);return Number.isFinite(n)?n:null;}
  const won=text.match(/(\d[\d,\s]*)\s*원/); if(won){const n=Number(won[1].replace(/[,\s]/g,''));return Number.isFinite(n)?n:null;}
  return null;
}

export default function AdminRewards({ onNotice, onStats }){
  const [kind,setKind]=useState('event');
  const [inventories,setInventories]=useState({event:[],ai:[],attendance:[]});
  const [bulkText,setBulkText]=useState('');
  const [working,setWorking]=useState(false);
  const rows=inventories[kind]||[];
  const available=rows.filter(r=>r.status==='available').length;
  const assigned=rows.filter(r=>r.status==='assigned').length;

  useEffect(()=>{void loadAll();},[]);
  useEffect(()=>{setBulkText('');},[kind]);

  async function loadAll(){
    const entries=await Promise.all(Object.entries(CONFIGS).map(async([key,cfg])=>{const {data,error}=await supabase.rpc(cfg.load);return [key,data||[],error];}));
    const next={event:[],ai:[],attendance:[]};let firstError=null;
    entries.forEach(([key,data,error])=>{next[key]=data;if(error&&!firstError)firstError=error;});
    setInventories(next);
    const totalAvailable=Object.values(next).flat().filter(r=>r.status==='available').length;
    onStats?.({availableGifts:totalAvailable});
    if(firstError)onNotice(`상품 재고 불러오기 실패: ${firstError.message}`);
  }

  function parseItemLines(){
    const lines=String(bulkText||'').replace(/\u2028|\u2029/g,'\n').replace(/\r\n?/g,'\n').split('\n').map(s=>s.trim()).filter(Boolean);
    if(!lines.length)throw new Error(kind==='ai'?'AI 당첨 공지에 사용할 상품명을 입력해주세요.':'등록할 기프티콘 목록을 붙여넣어주세요.');
    if(lines.length>1000)throw new Error('한 번에 최대 1,000개까지 등록할 수 있습니다.');
    if(kind==='ai'){
      if(lines.some(line=>line.length>120))throw new Error('AI 전용 상품명은 한 줄당 120자 이내로 입력해주세요.');
      return lines;
    }
    return lines.map((line,index)=>{
      const parts=line.split('|').map(v=>v.trim());if(parts.length<2)throw new Error(`${index+1}번째 줄 형식이 올바르지 않습니다. 상품명 | https://기프티콘링크 형식으로 입력해주세요.`);
      const product_name=parts[0],gift_url=parts.slice(1).join('|').trim(),amount=parseAmount(product_name);
      if(!product_name)throw new Error(`${index+1}번째 줄의 상품명이 비어 있습니다.`);
      if(!Number.isFinite(amount)||amount<3000||amount>200000)throw new Error(`${index+1}번째 상품명에서 금액을 읽을 수 없습니다.`);
      if(!/^https:\/\//i.test(gift_url))throw new Error(`${index+1}번째 줄의 링크는 https:// 로 시작해야 합니다.`);
      return {product_name,amount,gift_url};
    });
  }

  async function addBulk(event){
    event.preventDefault();if(working)return;let items;try{items=parseItemLines();}catch(error){onNotice(error.message);return;}setWorking(true);
    try{
      if(kind==='ai'){
        const {data,error}=await supabase.rpc(CONFIGS.ai.bulk,{p_product_names:items});if(error)throw error;const result=Array.isArray(data)?data[0]:data;onNotice(`AI 전용 당첨상품 ${Number(result?.inserted_count??items.length)}개를 등록했습니다.`);
      }else{
        let inserted=0,skipped=0;for(let offset=0;offset<items.length;offset+=100){const batch=items.slice(offset,offset+100);const {data,error}=await supabase.rpc(CONFIGS[kind].bulk,{p_items:batch});if(error)throw error;const result=Array.isArray(data)?data[0]:data;inserted+=Number(result?.inserted_count??batch.length);skipped+=Number(result?.skipped_count??0);}
        onNotice(skipped?`기프티콘 ${inserted}개 등록 · 중복 ${skipped}개 제외`:`기프티콘 ${inserted}개를 등록했습니다.`);
      }
      setBulkText('');await loadAll();
    }catch(error){onNotice(`상품 등록 실패: ${error?.message||'알 수 없는 오류'}`);}finally{setWorking(false);}
  }

  async function removeGift(gift){
    if(!gift?.id||working)return;const assignedGift=gift.status==='assigned';
    if(!window.confirm(assignedGift?'지급완료 내역에서 이 상품을 삭제할까요? 이미 회원에게 지급된 메시지는 유지됩니다.':'아직 지급되지 않은 이 상품을 삭제할까요?'))return;
    setWorking(true);let rpc;
    if(kind==='event')rpc=assignedGift?'admin_delete_gift_inventory':'admin_delete_available_gift';
    else if(kind==='ai')rpc='admin_delete_ai_gift_inventory';
    else rpc='admin_delete_attendance_gift_inventory';
    const {error}=await supabase.rpc(rpc,{p_gift_id:gift.id});if(error)onNotice(`상품 삭제 실패: ${error.message}`);else{onNotice('상품 내역을 삭제했습니다.');await loadAll();}setWorking(false);
  }

  async function clearStatus(status){
    const count=rows.filter(r=>r.status===status).length;if(!count){onNotice(status==='available'?'삭제할 지급대기 상품이 없습니다.':'삭제할 지급완료 내역이 없습니다.');return;}
    if(!window.confirm(`${CONFIGS[kind].label} ${status==='available'?'지급대기':'지급완료'} ${count}개를 모두 삭제할까요?`))return;
    setWorking(true);const rpc=status==='available'?CONFIGS[kind].clearAvailable:CONFIGS[kind].clearAssigned;const {data,error}=await supabase.rpc(rpc);if(error)onNotice(`전체 삭제 실패: ${error.message}`);else{const result=Array.isArray(data)?data[0]:data;onNotice(`${Number(result?.deleted_count??count)}개를 삭제했습니다.`);await loadAll();}setWorking(false);
  }

  const placeholder=kind==='ai'?'상품명만 한 줄에 하나씩 입력\n예: 스타벅스 아메리카노':'상품명 | https://기프티콘링크\n예: 신세계 상품권 1만원 | https://...';

  return <section className={styles.section}>
    <div className={styles.sectionHead}><div><span>REWARD INVENTORY</span><strong>상품 재고 관리</strong><p>일반 이벤트·AI 전용·출석체크 상품을 기존 지급 순서와 상태값 그대로 관리합니다.</p></div><button className={styles.buttonSoft} onClick={loadAll}>전체 새로고침</button></div>
    <div className={styles.inventoryTabs}>{Object.entries(CONFIGS).map(([key,cfg])=><button key={key} className={`${styles.inventoryTab} ${kind===key?styles.inventoryTabActive:''}`} onClick={()=>setKind(key)}>{cfg.label}</button>)}</div>
    <div className={styles.inventorySummary}><div><span>전체</span><strong>{rows.length}</strong></div><div><span>지급대기</span><strong>{available}</strong></div><div><span>지급완료</span><strong>{assigned}</strong></div></div>
    <form onSubmit={addBulk}><textarea className={styles.textarea} placeholder={placeholder} value={bulkText} onChange={e=>setBulkText(e.target.value)}/><div className={styles.toolbar} style={{marginTop:8}}><button className={styles.buttonPrimary} disabled={working}>일괄 등록</button><button type="button" className={styles.buttonDanger} disabled={working} onClick={()=>clearStatus('available')}>지급대기 전체삭제</button><button type="button" className={styles.button} disabled={working} onClick={()=>clearStatus('assigned')}>지급완료 내역삭제</button></div></form>
    <div className={styles.tableWrap} style={{marginTop:12}}><table className={styles.table}><thead><tr><th>순서</th><th>상품명</th><th>금액</th><th>상태</th><th>지급 회원</th><th>관리</th></tr></thead><tbody>{rows.length?rows.slice(0,300).map(g=><tr key={g.id}><td>#{g.queue_no||'-'}</td><td><strong>{g.product_name||'-'}</strong>{g.gift_url&&<a className={styles.link} href={g.gift_url} target="_blank" rel="noreferrer"><span className={styles.sub}>링크 확인</span></a>}</td><td>{g.amount?Number(g.amount).toLocaleString('ko-KR')+'원':'-'}</td><td><span className={g.status==='assigned'?styles.badgeGreen:styles.badgeBlue}>{g.status==='assigned'?'지급완료':'지급대기'}</span></td><td>{g.assigned_winner_nickname||g.assigned_nickname||'-'}</td><td><button className={`${styles.mini} ${styles.miniDanger}`} disabled={working} onClick={()=>removeGift(g)}>삭제</button></td></tr>):<tr><td colSpan="6"><div className={styles.empty}>등록된 상품이 없습니다.</div></td></tr>}</tbody></table></div>
  </section>;
}
