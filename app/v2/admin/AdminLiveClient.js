'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../supabase';
import AdminMembers from './AdminMembers';
import AdminAiProcess from './AdminAiProcess';
import AdminRewards from './AdminRewards';
import AdminMessages from './AdminMessages';
import AdminOperations from './AdminOperations';
import styles from './admin.module.css';

const tabs=[
  ['overview','운영 요약'],['members','회원 관리'],['ai','AI PROCESS'],['rewards','상품 재고'],['messages','상품 지급/1:1'],['operations','이벤트·운영'],
];

export default function AdminLiveClient(){
  const [loading,setLoading]=useState(true);const [user,setUser]=useState(null);const [profile,setProfile]=useState(null);const [notice,setNotice]=useState('');const [tab,setTab]=useState('overview');
  const [stats,setStats]=useState({totalMembers:0,pendingMembers:0,runningProcesses:0,availableGifts:0,unreadChats:0});

  useEffect(()=>{void boot();},[]);
  useEffect(()=>{if(user?.id&&profile?.role==='admin')void loadSummary();},[user?.id,profile?.role]);

  async function boot(){
    const {data:{session}}=await supabase.auth.getSession();if(!session?.user){setLoading(false);return;}
    const {data,error}=await supabase.from('profiles').select('*').eq('id',session.user.id).single();
    if(error||!data||String(data.approval_status)!=='1'||data.role!=='admin'){setLoading(false);return;}
    setUser(session.user);setProfile(data);setLoading(false);
  }

  async function loadSummary(){
    const [members,processes,gifts,aiGifts,attendanceGifts,unreads]=await Promise.all([
      supabase.rpc('get_admin_approval_list'),supabase.from('ai_process_members').select('user_id,status'),supabase.rpc('admin_get_gift_inventory'),supabase.rpc('admin_get_ai_gift_inventory'),supabase.rpc('admin_get_attendance_gift_inventory'),supabase.rpc('get_admin_private_unread_counts'),
    ]);
    setStats({
      totalMembers:(members.data||[]).length,
      pendingMembers:(members.data||[]).filter(r=>String(r.approval_status)==='0').length,
      runningProcesses:(processes.data||[]).filter(r=>r.status==='running').length,
      availableGifts:[...(gifts.data||[]),...(aiGifts.data||[]),...(attendanceGifts.data||[])].filter(r=>r.status==='available').length,
      unreadChats:(unreads.data||[]).reduce((sum,r)=>sum+Number(r.unread_count||0),0),
    });
  }

  function mergeStats(patch){setStats(cur=>({...cur,...patch}));}
  async function logout(){await supabase.auth.signOut();window.location.assign('/v2');}

  if(loading)return <main className={styles.shell}><div className={styles.frame}><div className={styles.loading}>관리자 정보를 확인하고 있습니다.</div></div></main>;
  if(!user||!profile)return <main className={styles.shell}><div className={styles.frame}><div className={styles.gate}><div className={styles.gateBox}><h2>관리자 로그인이 필요합니다.</h2><p>관리자 로그인이 필요합니다.</p><button className={styles.buttonPrimary} onClick={()=>window.location.assign('/v2')}>회원 입장으로 이동</button></div></div></div></main>;

  return <main className={styles.shell}><div className={styles.frame}>
    <header className={styles.header}><div className={styles.brand}><small>AI PROCESS · OPERATIONS</small><strong>VIP LOUNGE 관리자</strong></div><div className={styles.headerActions}><button className={styles.button} onClick={()=>window.location.assign('/v2')}>회원 화면</button><button className={styles.buttonDanger} onClick={logout}>로그아웃</button></div></header>

    <div className={styles.summary}>
      <div className={styles.summaryCard}><span>전체 회원</span><strong>{stats.totalMembers}</strong></div>
      <div className={styles.summaryCard}><span>승인 대기</span><strong>{stats.pendingMembers}</strong></div>
      <div className={styles.summaryCard}><span>AI 진행중</span><strong>{stats.runningProcesses}</strong></div>
      <div className={styles.summaryCard}><span>지급대기 상품</span><strong>{stats.availableGifts}</strong></div>
    </div>

    <nav className={styles.tabs} aria-label="V2 관리자 메뉴">{tabs.map(([id,label])=><button key={id} className={`${styles.tab} ${tab===id?styles.tabActive:''}`} onClick={()=>{setTab(id);setNotice('');if(id==='overview')void loadSummary();}}>{label}{id==='messages'&&stats.unreadChats>0?` · ${stats.unreadChats}`:''}</button>)}</nav>
    {notice&&<div className={styles.notice}>{notice}</div>}
    <div className={styles.content}>
      {tab==='overview'&&<Overview stats={stats} setTab={setTab} refresh={loadSummary}/>}
      {tab==='members'&&<AdminMembers user={user} onNotice={setNotice} onStats={mergeStats}/>}
      {tab==='ai'&&<AdminAiProcess onNotice={setNotice} onStats={mergeStats}/>}
      {tab==='rewards'&&<AdminRewards onNotice={setNotice} onStats={mergeStats}/>}
      {tab==='messages'&&<AdminMessages user={user} onNotice={setNotice} onStats={mergeStats}/>}
      {tab==='operations'&&<AdminOperations onNotice={setNotice}/>}
    </div>
  </div></main>;
}

function Overview({stats,setTab,refresh}){
  const cards=[
    ['members','회원 관리',`${stats.totalMembers}명 · 승인대기 ${stats.pendingMembers}명`,'회원 승인, 지급 유형, 회원정보와 계정 관리'],
    ['ai','AI PROCESS',`진행중 ${stats.runningProcesses}명`,'회원별 진행 설정, 시작/완료, 수익 조정'],
    ['rewards','상품 재고',`지급대기 ${stats.availableGifts}개`,'일반 이벤트·AI·출석 상품 재고 관리'],
    ['messages','상품 지급 / 1:1',`미확인 ${stats.unreadChats}건`,'회원별 지급 메시지, 링크·이미지·푸시 관리'],
    ['operations','이벤트 · 운영','운영 설정','이벤트 참여자, 그룹채팅, 돌발 이벤트 문구 관리'],
  ];
  return <section className={styles.section}><div className={styles.sectionHead}><div><span>ADMIN OVERVIEW</span><strong>운영 기능</strong></div><button className={styles.buttonSoft} onClick={refresh}>현황 새로고침</button></div><div className={styles.grid2}>{cards.map(([id,title,value,desc])=><button key={id} type="button" onClick={()=>setTab(id)} style={{border:'1px solid #e5ebf2',borderRadius:14,background:'#fff',padding:16,textAlign:'left',cursor:'pointer',color:'inherit'}}><span style={{fontSize:9,color:'#8c97a6',fontWeight:800}}>{title}</span><strong style={{display:'block',marginTop:6,fontSize:18}}>{value}</strong><span style={{display:'block',marginTop:5,fontSize:9,color:'#8b96a5',lineHeight:1.5}}>{desc}</span></button>)}</div></section>;
}
