'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../supabase';
import styles from './admin.module.css';

const ROOM_ID='0a495a02-bcb8-4e38-b3ef-4e7059c2a883';

export default function AdminOperations({ onNotice }){
  const [events,setEvents]=useState([]);const [entries,setEntries]=useState([]);const [entryEvent,setEntryEvent]=useState(null);const [entryLoading,setEntryLoading]=useState(false);
  const [groupFrozen,setGroupFrozen]=useState(false);const [groupMessages,setGroupMessages]=useState([]);const [directory,setDirectory]=useState({});
  const [realSurprise,setRealSurprise]=useState([]);
  const [footer,setFooter]=useState('');const [copy,setCopy]=useState({group_start_title:'',group_start_body:'',group_complete_title:'',group_complete_body:'',private_start_body:''});
  const [guide,setGuide]=useState({title:'돌발 체험 이벤트 안내',body:''});const [surprise,setSurprise]=useState({completion_message:'',action_label:'',action_url:''});const [working,setWorking]=useState(false);
  const sortedEvents=useMemo(()=>[...events].sort((a,b)=>new Date(b.starts_at||0)-new Date(a.starts_at||0)),[events]);

  useEffect(()=>{void loadAll();},[]);

  async function loadAll(){
    const [ev,state,dir,msgs,copyRow,guideRow,surpriseRow,realRows]=await Promise.all([
      supabase.rpc('get_auto_events'),supabase.rpc('get_group_chat_state',{target_room_id:ROOM_ID}),supabase.rpc('get_chat_member_directory'),
      supabase.from('group_messages').select('*').eq('room_id',ROOM_ID).eq('is_deleted',false).order('created_at',{ascending:false}).limit(100),
      supabase.from('vip_surprise_copy_settings').select('event_winner_footer,group_start_title,group_start_body,group_complete_title,group_complete_body,private_start_body').eq('id',1).maybeSingle(),
      supabase.from('vip_surprise_guide').select('title,body').eq('id',1).maybeSingle(),
      supabase.from('vip_surprise_settings').select('completion_message,action_label,action_url').eq('id',1).maybeSingle(),
      supabase.rpc('admin_list_real_surprise_processes'),
    ]);
    if(ev.error)onNotice(`이벤트 불러오기 실패: ${ev.error.message}`);else setEvents((ev.data||[]).filter(x=>x.event_type!=='attendance'));
    if(!state.error)setGroupFrozen(Boolean(state.data));
    const map={};(dir.data||[]).forEach(x=>{const id=x.member_id||x.id;if(id)map[String(id)]=x.nickname||'회원';});setDirectory(map);
    if(!msgs.error)setGroupMessages([...(msgs.data||[])].reverse());
    if(copyRow.data){setFooter(copyRow.data.event_winner_footer??'');setCopy({group_start_title:copyRow.data.group_start_title||'',group_start_body:copyRow.data.group_start_body||'',group_complete_title:copyRow.data.group_complete_title||'',group_complete_body:copyRow.data.group_complete_body||'',private_start_body:copyRow.data.private_start_body||''});}
    if(guideRow.data)setGuide({title:guideRow.data.title||'',body:guideRow.data.body||''});
    if(surpriseRow.data)setSurprise({completion_message:surpriseRow.data.completion_message||'',action_label:surpriseRow.data.action_label||'',action_url:surpriseRow.data.action_url||''});
    if(!realRows.error)setRealSurprise(realRows.data||[]);
  }

  async function openEntries(event){const id=event?.event_id||event?.id;if(!id)return;setEntryEvent(event);setEntries([]);setEntryLoading(true);const {data,error}=await supabase.rpc('get_admin_event_entries',{target_event_id:id});if(error)onNotice(`참여자 명단 불러오기 실패: ${error.message}`);else setEntries(data||[]);setEntryLoading(false);}

  async function toggleFreeze(){setWorking(true);const next=!groupFrozen;const {error}=await supabase.rpc('set_group_chat_frozen',{target_room_id:ROOM_ID,frozen:next});if(error)onNotice(`채팅 상태 변경 실패: ${error.message}`);else{setGroupFrozen(next);onNotice(next?'그룹채팅을 얼렸습니다.':'그룹채팅을 다시 열었습니다.');}setWorking(false);}

  async function deleteGroupMessage(message){if(!window.confirm('이 그룹 메시지를 모든 회원에게서 완전히 삭제할까요?'))return;const {error}=await supabase.rpc('admin_delete_group_message',{target_message_id:message.id});if(error)onNotice(`메시지 삭제 실패: ${error.message}`);else{setGroupMessages(cur=>cur.filter(x=>x.id!==message.id));onNotice('그룹 메시지를 삭제했습니다.');}}

  async function saveFooter(){setWorking(true);const {error}=await supabase.rpc('admin_update_event_winner_footer',{p_footer:footer});if(error)onNotice(`당첨 안내 문구 저장 실패: ${error.message}`);else onNotice('당첨 안내 문구를 저장했습니다.');setWorking(false);}
  async function saveCopy(){setWorking(true);const {error}=await supabase.rpc('admin_update_vip_surprise_copy',{p_group_start_title:copy.group_start_title,p_group_start_body:copy.group_start_body,p_group_complete_title:copy.group_complete_title,p_group_complete_body:copy.group_complete_body,p_private_start_body:copy.private_start_body});if(error)onNotice(`자동 공지 문구 저장 실패: ${error.message}`);else onNotice('자동 공지 문구를 저장했습니다.');setWorking(false);}
  async function saveGuide(){setWorking(true);const {error}=await supabase.rpc('admin_update_vip_surprise_guide',{p_title:guide.title,p_body:guide.body});if(error)onNotice(`안내문 저장 실패: ${error.message}`);else onNotice('돌발 체험 이벤트 안내문을 저장했습니다.');setWorking(false);}
  async function saveSurprise(){setWorking(true);const {error}=await supabase.rpc('admin_update_vip_surprise_settings',{p_completion_message:surprise.completion_message,p_action_label:surprise.action_label,p_action_url:surprise.action_url});if(error)onNotice(`돌발 프로세스 설정 저장 실패: ${error.message}`);else onNotice('돌발 프로세스 안내 설정을 저장했습니다.');setWorking(false);}

  return <>
    <section className={styles.section}><div className={styles.sectionHead}><div><span>EVENT OPERATIONS</span><strong>실시간 이벤트 운영 현황</strong><p>기존 자동 이벤트 회차와 참여자 명단을 조회합니다.</p></div><button className={styles.buttonSoft} onClick={loadAll}>새로고침</button></div>
      <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>회차</th><th>이벤트</th><th>시간</th><th>상태</th><th>당첨</th><th>참여자</th></tr></thead><tbody>{sortedEvents.length?sortedEvents.map(e=><tr key={e.event_id||e.id}><td>{e.round_number||'-'}</td><td><strong>{e.title||e.event_type||'이벤트'}</strong><span className={styles.sub}>{e.event_type||'-'}</span></td><td>{e.starts_at?new Date(e.starts_at).toLocaleString('ko-KR'):'-'}</td><td><span className={e.status==='active'?styles.badgeBlue:e.status==='completed'?styles.badgeGreen:styles.badgeGray}>{e.status||'-'}</span></td><td>{e.winner_nickname||'-'}</td><td><button className={styles.mini} onClick={()=>openEntries(e)}>명단 보기</button></td></tr>):<tr><td colSpan="6"><div className={styles.empty}>이벤트 데이터가 없습니다.</div></td></tr>}</tbody></table></div>
    </section>

    <section className={styles.section}><div className={styles.sectionHead}><div><span>GROUP CHAT CONTROL</span><strong>그룹채팅 운영·메시지 관리</strong><p>현재 운영 플래그와 별개로 기존 동결/해제 및 관리자 삭제 기능을 유지합니다.</p></div><button className={groupFrozen?styles.buttonPrimary:styles.button} disabled={working} onClick={toggleFreeze}>{groupFrozen?'채팅 다시 열기':'채팅 얼리기'}</button></div>
      <div className={styles.inlineNote}>현재 DB 상태: <b>{groupFrozen?'동결':'열림'}</b> · 최근 메시지 {groupMessages.length}개</div>
      <div className={styles.tableWrap} style={{marginTop:10}}><table className={styles.table}><thead><tr><th>회원</th><th>메시지</th><th>시간</th><th>관리</th></tr></thead><tbody>{groupMessages.slice(-100).reverse().map(m=><tr key={m.id}><td>{directory[String(m.member_id)]||m.member_id||'시스템'}</td><td>{String(m.content||'').slice(0,140)}</td><td>{m.created_at?new Date(m.created_at).toLocaleString('ko-KR'):'-'}</td><td><button className={`${styles.mini} ${styles.miniDanger}`} onClick={()=>deleteGroupMessage(m)}>삭제</button></td></tr>)}</tbody></table></div>
    </section>

    <section className={styles.section}><div className={styles.sectionHead}><div><span>SURPRISE EVENT SETTINGS</span><strong>돌발 이벤트 문구·안내 설정</strong><p>기존 공개 문구와 자동 공지 설정을 같은 RPC로 저장합니다.</p></div></div>
      <div className={styles.settingsGrid}>
        <div className={styles.settingCard}><h3>당첨 안내 하단 문구</h3><textarea className={styles.textarea} value={footer} onChange={e=>setFooter(e.target.value)}/><button className={styles.buttonPrimary} disabled={working} onClick={saveFooter} style={{marginTop:8}}>저장</button></div>
        <div className={styles.settingCard}><h3>돌발 체험 이벤트 안내문</h3><div className={styles.stack}><input className={styles.input} value={guide.title} onChange={e=>setGuide({...guide,title:e.target.value})} placeholder="제목"/><textarea className={styles.textarea} value={guide.body} onChange={e=>setGuide({...guide,body:e.target.value})} placeholder="안내 내용"/><button className={styles.buttonPrimary} disabled={working} onClick={saveGuide}>저장</button></div></div>
        <div className={styles.settingCard}><h3>돌발 프로세스 완료 안내</h3><div className={styles.stack}><textarea className={styles.textarea} value={surprise.completion_message} onChange={e=>setSurprise({...surprise,completion_message:e.target.value})} placeholder="완료 메시지"/><input className={styles.input} value={surprise.action_label} onChange={e=>setSurprise({...surprise,action_label:e.target.value})} placeholder="버튼 문구"/><input className={styles.input} value={surprise.action_url} onChange={e=>setSurprise({...surprise,action_url:e.target.value})} placeholder="https://..."/><button className={styles.buttonPrimary} disabled={working} onClick={saveSurprise}>저장</button></div></div>
        <div className={styles.settingCard}><h3>자동 공지 문구</h3><div className={styles.stack}><input className={styles.input} value={copy.group_start_title} onChange={e=>setCopy({...copy,group_start_title:e.target.value})} placeholder="그룹 시작 제목"/><textarea className={styles.textarea} value={copy.group_start_body} onChange={e=>setCopy({...copy,group_start_body:e.target.value})} placeholder="그룹 시작 내용"/><input className={styles.input} value={copy.group_complete_title} onChange={e=>setCopy({...copy,group_complete_title:e.target.value})} placeholder="그룹 완료 제목"/><textarea className={styles.textarea} value={copy.group_complete_body} onChange={e=>setCopy({...copy,group_complete_body:e.target.value})} placeholder="그룹 완료 내용"/><textarea className={styles.textarea} value={copy.private_start_body} onChange={e=>setCopy({...copy,private_start_body:e.target.value})} placeholder="개인 시작 내용"/><button className={styles.buttonPrimary} disabled={working} onClick={saveCopy}>저장</button></div></div>
      </div>
    </section>

    <section className={styles.section}><div className={styles.sectionHead}><div><span>SURPRISE PROCESS</span><strong>일반 회원 돌발 이벤트 현황</strong><p>기존 돌발 이벤트 진행 현황을 그대로 조회합니다.</p></div></div><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>회원</th><th>상태</th><th>시작</th><th>완료</th><th>정보</th></tr></thead><tbody>{realSurprise.length?realSurprise.map((r,i)=><tr key={r.id||r.user_id||i}><td>{r.nickname||r.real_name||r.user_id||'-'}</td><td><span className={r.status==='running'?styles.badgeBlue:r.status==='completed'?styles.badgeGreen:styles.badgeGray}>{r.status||'-'}</span></td><td>{r.started_at?new Date(r.started_at).toLocaleString('ko-KR'):'-'}</td><td>{r.completed_at?new Date(r.completed_at).toLocaleString('ko-KR'):'-'}</td><td>{r.amount!=null?Number(r.amount).toLocaleString('ko-KR'):'-'}</td></tr>):<tr><td colSpan="5"><div className={styles.empty}>현재 표시할 돌발 이벤트 현황이 없습니다.</div></td></tr>}</tbody></table></div></section>

    {entryEvent&&<div className={styles.modalBackdrop} onMouseDown={e=>{if(e.target===e.currentTarget)setEntryEvent(null);}}><div className={styles.modal}><h3>{entryEvent.title||'이벤트'} 참여자</h3>{entryLoading?<div className={styles.empty}>불러오는 중...</div>:<div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>회원</th><th>답변</th><th>참여시간</th></tr></thead><tbody>{entries.length?entries.map((r,i)=><tr key={r.entry_id||r.id||i}><td>{r.nickname||r.real_name||r.member_id||'-'}</td><td>{r.submitted_answer??r.answer??'-'}</td><td>{r.created_at?new Date(r.created_at).toLocaleString('ko-KR'):'-'}</td></tr>):<tr><td colSpan="3"><div className={styles.empty}>참여자가 없습니다.</div></td></tr>}</tbody></table></div>}<div className={styles.modalActions}><button className={styles.button} onClick={()=>setEntryEvent(null)}>닫기</button></div></div></div>}
  </>;
}
