'use client';

import { useState } from 'react';

const tabs = [
  ['home','홈'],
  ['event','이벤트'],
  ['ai','AI PROCESS'],
  ['reward','지급센터'],
];

export default function ReferenceShell({styles}) {
  const [tab,setTab] = useState('home');
  const [profileOpen,setProfileOpen] = useState(false);
  return <main className={styles.stage}>
    <div className={styles.app}>
      <header className={styles.header}>
        <strong>VIP</strong>
        <button type="button" onClick={()=>setProfileOpen(true)} aria-label="내 정보">•••</button>
      </header>
      <section className={styles.screen} data-screen={tab}>
        {tab==='home' && <Home styles={styles} go={setTab}/>} 
        {tab==='event' && <Event styles={styles}/>} 
        {tab==='ai' && <Ai styles={styles}/>} 
        {tab==='reward' && <Reward styles={styles}/>} 
      </section>
      <nav className={styles.nav}>{tabs.map(([id,label])=><button key={id} type="button" className={tab===id?styles.active:''} onClick={()=>setTab(id)}><i/><span>{label}</span></button>)}</nav>
      {profileOpen && <div className={styles.scrim} onClick={()=>setProfileOpen(false)}><aside className={styles.sheet} onClick={e=>e.stopPropagation()}><div className={styles.sheetHead}><strong>내 정보</strong><button type="button" onClick={()=>setProfileOpen(false)}>닫기</button></div><dl><div><dt>닉네임</dt><dd>회원 정보 연결 예정</dd></div><div><dt>이름</dt><dd>회원 정보 연결 예정</dd></div></dl></aside></div>}
    </div>
  </main>
}

function Home({styles,go}){return <div className={styles.stack}>
  <div className={styles.member}><span>MEMBER</span><h1>VIP 서비스</h1><p>현재 이용 가능한 서비스와 진행 상태를 확인하세요.</p></div>
  <button className={styles.eventHero} type="button" onClick={()=>go('event')}><span>EVENT</span><strong>실시간 이벤트</strong><small>현재 회차와 혜택 확인</small><b>›</b></button>
  <button className={styles.attendanceHero} type="button"><span>DAILY</span><strong>매일 출석 이벤트</strong><small>30회 출석 · 랜덤 기프티콘 혜택</small><b>›</b></button>
  <button className={styles.aiIntro} type="button" onClick={()=>go('ai')}><span>AI PROCESS</span><strong>AI가 시장 흐름을 분석하고 진행 과정을 단계별로 관리합니다.</strong><small>분석 · 탐색 · 매수 · 관리 · 매도 · 재분석</small><b>AI PROCESS 보기 ›</b></button>
</div>}

function Event({styles}){return <div className={styles.stack}><div className={styles.title}><span>EVENT</span><h1>실시간 이벤트</h1></div><section className={styles.benefit}><span>EVENT BENEFIT</span><strong>기프티콘 혜택</strong><p>실제 이벤트 데이터의 지급 범위와 회차 정보를 이 영역에 연결합니다.</p></section><section className={styles.panel}><b>현재 회차</b><h2>이벤트 데이터 연결 영역</h2><p>기존 참여 방식 6종과 실제 퀴즈 데이터를 그대로 이식합니다.</p></section><section className={styles.splitLink}><div><span>DAILY EVENT</span><strong>출석 이벤트</strong><small>실시간 이벤트와 별도 화면으로 유지</small></div><b>›</b></section></div>}

function Ai({styles}){return <div className={styles.stack}><div className={styles.title}><span>AI PROCESS</span><h1>AI PROCESS</h1><p>AI가 시장 흐름을 분석하고 투자 진행 상태를 단계별로 관리하며, 평가금액과 반영 내역을 확인할 수 있습니다.</p></div><section className={styles.balance}><span>평가금액</span><strong>데이터 연결 예정</strong><small>기존 ai_process_members 계산 로직 유지</small></section><div className={styles.steps}>{['분석','탐색','매수','관리','매도','재분석'].map((x,i)=><div key={x}><i>{i+1}</i><span>{x}</span></div>)}</div><section className={styles.fold}><div><span>최근 반영 내역</span><strong>최대 100개 · 10개씩 보기</strong></div><b>＋</b></section><section className={styles.fold}><div><span>주식 · 코인 현황</span><strong>현재 AI 탐색/관리 상태</strong></div><b>＋</b></section></div>}

function Reward({styles}){return <div className={styles.stack}><div className={styles.title}><span>REWARD CENTER</span><h1>상품지급센터</h1></div><section className={styles.panel}><b>지급 내역</b><h2>기존 지급센터 데이터 연결 영역</h2><p>기프티콘·링크·이미지 지급 기록을 금융형 내역 구조로 표시합니다.</p></section></div>}
