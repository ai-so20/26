'use client';

import { useState } from 'react';
import styles from './v2.module.css';

const navItems = [
  { id: 'event', label: '이벤트' },
  { id: 'ai', label: 'AI프로세스' },
  { id: 'private', label: '상품 지급' },
];

function Stat({ label, value, suffix, emphasis = false }) {
  return (
    <div className={`${styles.stat} ${emphasis ? styles.statEmphasis : ''}`}>
      <span>{label}</span>
      <strong>{value}<small>{suffix}</small></strong>
    </div>
  );
}

function Segment({ title, subtitle, active, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`${styles.segment} ${active ? styles.segmentActive : ''}`}>
      <span className={styles.segmentMark} />
      <span className={styles.segmentCopy}>
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </span>
    </button>
  );
}

function PageHeading({ kicker, title, description, status = '운영 중' }) {
  return (
    <section className={styles.pageHeading}>
      <div>
        <span className={styles.kicker}>{kicker}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <span className={styles.statusBadge}><i /> {status}</span>
    </section>
  );
}

function EventPreview() {
  const [mode, setMode] = useState('live');

  return (
    <>
      <PageHeading kicker="EVENT" title="이벤트" description="참여 가능한 이벤트와 출석 현황을 한곳에서 확인하세요." />

      <section className={styles.summaryCard}>
        <div className={styles.summaryTop}>
          <div><span>오늘의 이벤트</span><strong>참여 현황</strong></div>
          <button type="button" className={styles.textButton}>전체 보기</button>
        </div>
        <div className={styles.statsGrid}>
          <Stat label="오늘 이벤트" value="4" suffix="회" />
          <Stat label="내 참여" value="0" suffix="회" />
          <Stat label="오늘 당첨" value="0" suffix="회" />
          <Stat label="출석 진행" value="0/10" suffix="" />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div><span>이벤트 선택</span><strong>참여할 항목을 선택하세요</strong></div>
        </div>
        <div className={styles.segmentGrid}>
          <Segment title="실시간 이벤트" subtitle="매 정각 시작" active={mode === 'live'} onClick={() => setMode('live')} />
          <Segment title="출석 이벤트" subtitle="매일 1회 참여" active={mode === 'attendance'} onClick={() => setMode('attendance')} />
        </div>
      </section>

      {mode === 'live' ? (
        <>
          <section className={styles.primaryCard}>
            <div className={styles.cardTopline}>
              <span className={styles.liveBadge}><i /> 진행중</span>
              <span className={styles.muted}>매 정각 시작 · 1시간 참여</span>
            </div>
            <div className={styles.cardBody}>
              <span className={styles.cardKicker}>실시간 이벤트</span>
              <h2>현재 이벤트에 참여해보세요</h2>
              <p>이벤트 마감 후 결과와 당첨 여부가 자동으로 안내됩니다.</p>
            </div>
            <div className={styles.cardFooter}>
              <div className={styles.timeBlock}><span>참여 상태</span><strong>참여 가능</strong></div>
              <button type="button" className={styles.primaryButton}>이벤트 참여</button>
            </div>
          </section>

          <section className={styles.simpleList}>
            <div className={styles.listHeader}><span>오늘 일정</span><strong>이벤트 회차</strong></div>
            {['12:00 · 퀴즈 이벤트', '13:00 · 숫자 이벤트', '14:00 · 룰렛 이벤트'].map((item, index) => (
              <div key={item} className={styles.listRow}>
                <div><span className={styles.rowIndex}>{String(index + 1).padStart(2, '0')}</span><strong>{item}</strong></div>
                <span className={styles.rowState}>{index === 0 ? '진행중' : '대기'}</span>
              </div>
            ))}
          </section>
        </>
      ) : (
        <>
          <section className={styles.attendanceCardLarge}>
            <div className={styles.attendanceHeader}>
              <div><span className={styles.cardKicker}>출석 이벤트</span><h3>오늘의 출석을 완료해주세요</h3></div>
              <strong className={styles.attendanceCount}>0<small>/10</small></strong>
            </div>
            <div className={styles.progressTrack}><span style={{ width: '0%' }} /></div>
            <div className={styles.attendanceDots}>
              {Array.from({ length: 10 }).map((_, index) => <span key={index}>{index + 1}</span>)}
            </div>
            <p>10회 출석 달성마다 랜덤 기프티콘이 자동 지급됩니다.</p>
            <button type="button" className={styles.primaryButtonWide}>오늘 출석하기</button>
          </section>
          <section className={styles.infoCard}>
            <span className={styles.infoIcon}>i</span>
            <div><strong>출석 보상 안내</strong><p>출석 완료와 보상 지급 상태는 같은 화면에서 확인할 수 있도록 구성합니다.</p></div>
          </section>
        </>
      )}

      <section className={styles.listCard}>
        <div className={styles.listCopy}>
          <span className={styles.listIcon}>AI</span>
          <div><strong>AI PROCESS 돌발 체험 이벤트</strong><p>진행 방법과 참여 안내를 확인할 수 있습니다.</p></div>
        </div>
        <button type="button" className={styles.chevronButton}>진행방법 <span>›</span></button>
      </section>
    </>
  );
}

function AiPreview() {
  return (
    <>
      <PageHeading kicker="AI PROCESS" title="AI프로세스" description="현재 진행 상태와 주요 결과를 한 화면에서 확인하세요." status="정상" />

      <section className={styles.balanceCard}>
        <div className={styles.balanceTop}>
          <div><span>현재 평가금액</span><strong>19,500,000<small>원</small></strong></div>
          <span className={styles.processBadge}>진행중</span>
        </div>
        <div className={styles.balanceMeta}>
          <div><span>투자금</span><strong>19,500,000원</strong></div>
          <div><span>누적 수익</span><strong className={styles.positive}>+0원</strong></div>
          <div><span>진행 시간</span><strong>2시간</strong></div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <div><span>PROCESS STATUS</span><strong>AI 진행 현황</strong></div>
          <span className={styles.muted}>3분 단위 반영</span>
        </div>
        <div className={styles.processRail}>
          {[
            ['분석', '완료'], ['탐색', '완료'], ['매수', '진행'], ['관리', '대기'], ['매도', '대기'], ['재분석', '대기']
          ].map(([label, state], index) => (
            <div key={label} className={`${styles.processStep} ${index <= 2 ? styles.processStepActive : ''}`}>
              <span>{index + 1}</span><strong>{label}</strong><small>{state}</small>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.primaryCard}>
        <div className={styles.cardTopline}>
          <span className={styles.liveBadge}><i /> AI PROCESS 진행 중</span>
          <span className={styles.muted}>최근 반영 14:12</span>
        </div>
        <div className={styles.activityList}>
          {[
            ['14:12', '시장 흐름 재분석 완료', '변동성 및 거래량을 재검토했습니다.'],
            ['14:09', '상승세 감지', 'AI 판단에 따라 매수 신청 상태를 갱신했습니다.'],
            ['14:06', '자산별 상태 반영', '현재 평가 정보와 진행 상태를 업데이트했습니다.']
          ].map(([time, title, desc]) => (
            <div className={styles.activityRow} key={time + title}>
              <span className={styles.activityTime}>{time}</span>
              <span className={styles.activityDot} />
              <div><strong>{title}</strong><p>{desc}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.twoColumnCards}>
        <div className={styles.metricCard}><span>수익 반영</span><strong>3분</strong><small>자동 반영 간격</small></div>
        <div className={styles.metricCard}><span>현재 상태</span><strong>RUNNING</strong><small>진행중</small></div>
      </section>

      <section className={styles.infoCard}>
        <span className={styles.infoIcon}>i</span>
        <div><strong>AI프로세스 진행 안내</strong><p>상담 후 설정된 진행 조건과 실제 반영 기록은 기존 기능을 그대로 연결합니다.</p></div>
      </section>
    </>
  );
}

function PrivatePreview() {
  const [selected, setSelected] = useState(0);
  const items = [
    { title: '이벤트 당첨 상품', meta: '오늘 13:05', badge: 'NEW', body: '당첨된 기프티콘과 지급 안내를 이곳에서 확인할 수 있습니다.' },
    { title: '출석 보상 지급', meta: '10월 14일', badge: '', body: '출석 보상 지급 내역과 사용 안내를 확인할 수 있습니다.' },
    { title: '상품 지급 안내', meta: '10월 12일', badge: '', body: '지급된 상품 관련 메시지와 링크가 표시됩니다.' },
  ];
  const current = items[selected];

  return (
    <>
      <PageHeading kicker="REWARD" title="상품 지급" description="이벤트와 출석 혜택으로 받은 상품을 확인하세요." status="확인 가능" />

      <section className={styles.rewardSummary}>
        <div><span>미확인 메시지</span><strong>1<small>건</small></strong></div>
        <div><span>최근 지급</span><strong>오늘<small>13:05</small></strong></div>
      </section>

      <section className={styles.inboxLayout}>
        <div className={styles.inboxList}>
          <div className={styles.listHeader}><span>지급 내역</span><strong>최근 메시지</strong></div>
          {items.map((item, index) => (
            <button key={item.title} type="button" onClick={() => setSelected(index)} className={`${styles.inboxRow} ${selected === index ? styles.inboxRowActive : ''}`}>
              <span className={styles.rewardIcon}>▣</span>
              <span className={styles.inboxCopy}><strong>{item.title}</strong><small>{item.meta}</small></span>
              {item.badge && <span className={styles.newBadge}>{item.badge}</span>}
              <span className={styles.rowArrow}>›</span>
            </button>
          ))}
        </div>

        <div className={styles.messagePanel}>
          <div className={styles.messageHeader}>
            <div><span>상품 지급</span><strong>{current.title}</strong></div>
            <span className={styles.muted}>{current.meta}</span>
          </div>
          <div className={styles.messageBubble}>
            <strong>{current.title}</strong>
            <p>{current.body}</p>
            <div className={styles.giftPlaceholder}><span>GIFT</span><div><strong>지급 상품</strong><small>실제 상품명 · 링크 · 상태를 기존 데이터와 연결</small></div></div>
          </div>
          <div className={styles.messageActions}>
            <button type="button" className={styles.secondaryButton}>이벤트 확인</button>
            <button type="button" className={styles.primaryButton}>상품 확인</button>
          </div>
        </div>
      </section>
    </>
  );
}

export default function V2PreviewPage() {
  const [activeTab, setActiveTab] = useState('event');

  return (
    <main className={styles.canvas}>
      <section className={styles.appShell}>
        <header className={styles.header}>
          <div className={styles.brandBlock}>
            <span className={styles.brandEyebrow}>PRIVATE MEMBER</span>
            <strong className={styles.brand}>VIP LOUNGE</strong>
          </div>
          <div className={styles.headerActions}>
            <button type="button" className={styles.iconButton} aria-label="알림"><span className={styles.bellDot} /><span className={styles.bellIcon}>⌁</span></button>
            <button type="button" className={styles.profileButton}><span className={styles.avatar}>V</span><span className={styles.profileCopy}><strong>VIP 회원</strong><small>내 정보</small></span></button>
          </div>
        </header>

        <nav className={styles.nav} aria-label="주요 메뉴">
          {navItems.map((item) => (
            <button key={item.id} type="button" onClick={() => setActiveTab(item.id)} className={`${styles.navItem} ${activeTab === item.id ? styles.navActive : ''}`}>
              {item.label}
            </button>
          ))}
        </nav>

        <div className={styles.content}>
          {activeTab === 'event' && <EventPreview />}
          {activeTab === 'ai' && <AiPreview />}
          {activeTab === 'private' && <PrivatePreview />}
          <div className={styles.previewNotice}>V2 UI 구조 검토용 화면입니다. 탭과 일부 선택 UI만 동작하며 실제 데이터·지급·이벤트 실행은 아직 운영 기능에 연결하지 않았습니다.</div>
        </div>
      </section>
    </main>
  );
}
