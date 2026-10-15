import styles from './v2.module.css';

const navItems = ['이벤트', 'AI프로세스', '상품 지급'];

function Stat({ label, value, suffix }) {
  return (
    <div className={styles.stat}>
      <span>{label}</span>
      <strong>{value}<small>{suffix}</small></strong>
    </div>
  );
}

function Segment({ title, subtitle, active }) {
  return (
    <button type="button" className={`${styles.segment} ${active ? styles.segmentActive : ''}`}>
      <span className={styles.segmentMark} />
      <span className={styles.segmentCopy}>
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </span>
    </button>
  );
}

export default function V2PreviewPage() {
  return (
    <main className={styles.canvas}>
      <section className={styles.appShell}>
        <header className={styles.header}>
          <div className={styles.brandBlock}>
            <span className={styles.brandEyebrow}>PRIVATE MEMBER</span>
            <strong className={styles.brand}>VIP LOUNGE</strong>
          </div>
          <div className={styles.headerActions}>
            <button type="button" className={styles.iconButton} aria-label="알림">
              <span className={styles.bellDot} />
              <span className={styles.bellIcon}>⌁</span>
            </button>
            <button type="button" className={styles.profileButton}>
              <span className={styles.avatar}>V</span>
              <span className={styles.profileCopy}><strong>VIP 회원</strong><small>내 정보</small></span>
            </button>
          </div>
        </header>

        <nav className={styles.nav} aria-label="주요 메뉴">
          {navItems.map((item, index) => (
            <button key={item} type="button" className={`${styles.navItem} ${index === 0 ? styles.navActive : ''}`}>
              {item}
            </button>
          ))}
        </nav>

        <div className={styles.content}>
          <section className={styles.pageHeading}>
            <div>
              <span className={styles.kicker}>EVENT</span>
              <h1>이벤트</h1>
              <p>참여 가능한 이벤트와 출석 현황을 한곳에서 확인하세요.</p>
            </div>
            <span className={styles.statusBadge}><i /> 운영 중</span>
          </section>

          <section className={styles.summaryCard}>
            <div className={styles.summaryTop}>
              <div>
                <span>오늘의 이벤트</span>
                <strong>참여 현황</strong>
              </div>
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
              <div>
                <span>이벤트 선택</span>
                <strong>참여할 항목을 선택하세요</strong>
              </div>
            </div>
            <div className={styles.segmentGrid}>
              <Segment title="실시간 이벤트" subtitle="매 정각 시작" active />
              <Segment title="출석 이벤트" subtitle="매일 1회 참여" />
            </div>
          </section>

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
              <div className={styles.timeBlock}>
                <span>참여 상태</span>
                <strong>참여 가능</strong>
              </div>
              <button type="button" className={styles.primaryButton}>이벤트 참여</button>
            </div>
          </section>

          <section className={styles.attendanceCard}>
            <div className={styles.attendanceHeader}>
              <div>
                <span className={styles.cardKicker}>출석 이벤트</span>
                <h3>오늘의 출석을 완료해주세요</h3>
              </div>
              <strong className={styles.attendanceCount}>0<small>/10</small></strong>
            </div>
            <div className={styles.progressTrack}><span style={{ width: '0%' }} /></div>
            <p>10회 출석 달성마다 랜덤 기프티콘이 자동 지급됩니다.</p>
            <button type="button" className={styles.secondaryButton}>오늘 출석하기</button>
          </section>

          <section className={styles.listCard}>
            <div className={styles.listCopy}>
              <span className={styles.listIcon}>AI</span>
              <div>
                <strong>AI PROCESS 돌발 체험 이벤트</strong>
                <p>진행 방법과 참여 안내를 확인할 수 있습니다.</p>
              </div>
            </div>
            <button type="button" className={styles.chevronButton}>진행방법 <span>›</span></button>
          </section>

          <div className={styles.previewNotice}>
            V2 대표 화면 프리뷰 · 기존 기능과 데이터는 아직 연결하지 않은 디자인 검토용 화면입니다.
          </div>
        </div>
      </section>
    </main>
  );
}
