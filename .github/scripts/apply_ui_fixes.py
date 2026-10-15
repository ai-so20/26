from pathlib import Path
import re


def replace_once(text, old, new, label):
    if old not in text:
        raise RuntimeError(f'missing marker: {label}')
    return text.replace(old, new, 1)

# ---------- member UI ----------
p = Path('app/v2/V2LiveClientStage2.js')
s = p.read_text()

s = replace_once(s,
"function PageHeading({ kicker, title, description, status = '운영 중' }) {",
"function PageHeading({ kicker, title, description = '', status = '운영 중' }) {",
'PageHeading signature')
s = replace_once(s, '<p>{description}</p>', '{description ? <p>{description}</p> : null}', 'PageHeading description')
s = s.replace('            <p>기존 등록 정보로 입장하면 V2에서 실제 이벤트와 AI PROCESS 현황을 확인할 수 있습니다.</p>', '            <p>등록된 회원 정보로 입장해주세요.</p>')
s = s.replace('          <div className={styles.entryFoot}>기존 인증과 운영 데이터를 그대로 사용합니다.</div>\n', '')
s = s.replace('<PageHeading kicker="EVENT" title="이벤트" description="참여 가능한 이벤트와 출석 현황을 한곳에서 확인하세요." />', '<PageHeading kicker="EVENT" title="이벤트" />')
s = s.replace('<PageHeading kicker="AI PROCESS" title="AI프로세스" description="회원별 진행 가능 상태와 설정 내용을 확인하세요." status={aiProcessStatusLabel(status, availableCount)} />', '<PageHeading kicker="AI PROCESS" title="AI프로세스" status={aiProcessStatusLabel(status, availableCount)} />')
s = s.replace('<PageHeading kicker="AI PROCESS" title="AI프로세스" description="현재 진행 상태와 주요 결과를 한 화면에서 확인하세요." status={status === \'running\' ? \'진행중\' : \'진행완료\'} />', '<PageHeading kicker="AI PROCESS" title="AI프로세스" status={status === \'running\' ? \'진행중\' : \'진행완료\'} />')
s = s.replace('<PageHeading kicker="AI PROCESS" title="AI프로세스" description="현재 진행 상태와 주요 결과를 한 화면에서 확인하세요." status="회원 화면 연결 완료" />', '<PageHeading kicker="AI PROCESS" title="AI프로세스" status="관리자" />')
s = s.replace('<section className={styles.aiAdminHold}><strong>관리자 AI PROCESS 관리 화면은 기존 운영 화면을 유지합니다.</strong><p>관리자 회원별 설정·진행 시작/완료·수익 조정 기능은 삭제하지 않고 관리자 V2 단계에서 별도로 이식합니다.</p></section>', '<section className={styles.aiAdminHold}><strong>AI PROCESS 관리</strong></section>')
s = s.replace('<section className={styles.infoCard}><span className={styles.infoIcon}>i</span><div><strong>AI PROCESS 이용 안내</strong><p>진행 설정이 시작되면 투자금액·수익·총 금액·진행률·3분 단위 그래프가 이 화면에 자동으로 표시됩니다.</p></div></section>', '')
s = s.replace("      <div className={styles.aiLiveNotice}>{status === 'completed' ? '진행 완료 시점의 마지막 반영 금액으로 결과가 고정되어 표시됩니다.' : '회원별 설정값과 기존 AI PROCESS 계산 로직을 그대로 사용하며 화면은 1초 단위로 갱신되고 실제 수익 반영 기준은 3분 단위입니다.'}</div>\n", '')
s = s.replace('          <div className={styles.previewNotice}>V2 2차 실제 기능 연결 · 회원 세션/회원정보/실시간 이벤트/출석/AI PROCESS 회원 데이터·수익·그래프·진행상태가 기존 운영 기능에 연결되었습니다. 상품 지급과 관리자 전체 화면은 다음 단계에서 연결합니다.</div>\n', '')

old_icon = """function eventIcon(type) {
  return ({
    gift_box: '🎁',
    number: '🎯',
    roulette: '🎰',
    first_come: '⚡',
    quiz: '🧩',
    draw: '🎟️',
  }[type] || '🎁');
}"""
new_icon = """function EventTypeIcon({ type }) {
  const paths = {
    gift_box: <><rect x="5" y="9" width="14" height="10" rx="2"/><path d="M12 9v10M4 9h16M8 5c0 2 4 4 4 4s4-2 4-4c0-1.2-.9-2-2-2-1.4 0-2 1.2-2 2 0-.8-.6-2-2-2-1.1 0-2 .8-2 2Z"/></>,
    number: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1.4"/></>,
    roulette: <><circle cx="12" cy="12" r="8"/><path d="M12 4v8l5 4M12 12 7 17M4 12h16"/></>,
    first_come: <path d="M13.5 2 6 13h5l-1 9 8-12h-5l.5-8Z"/>,
    quiz: <><path d="M9.5 9a2.7 2.7 0 1 1 4.7 1.8c-1.3 1.1-2.2 1.6-2.2 3.2"/><circle cx="12" cy="18" r="1"/></>,
    draw: <><path d="M5 6h14v4a2 2 0 0 0 0 4v4H5v-4a2 2 0 0 0 0-4V6Z"/><path d="M12 7v10"/></>,
  };
  return <span className={styles.eventMotionIcon} aria-hidden="true"><svg viewBox="0 0 24 24">{paths[type] || paths.gift_box}</svg></span>;
}"""
s = replace_once(s, old_icon, new_icon, 'eventIcon')
s = s.replace('<span className={styles.cardKicker}>{eventIcon(featuredEvent.event_type)} 실시간 이벤트</span>', '<span className={styles.cardKicker}><EventTypeIcon type={featuredEvent.event_type} /> 실시간 이벤트</span>')
s = s.replace('<span className={styles.eventEmoji}>{eventIcon(item.event_type)}</span>', '<span className={styles.eventEmoji}><EventTypeIcon type={item.event_type} /></span>')

s = replace_once(s,
'            <div className={styles.attendanceDots}>{Array.from({ length: 10 }).map((_, index) => <span key={index} className={index < attendanceCycle ? styles.attendanceDotDone : \'\'}>{index + 1}</span>)}</div>',
'            <div className={styles.attendanceDots}>{Array.from({ length: 10 }).map((_, index) => { const done = index < attendanceCycle; return <span key={index} className={done ? styles.attendanceDotDone : \'\'}>{done && <i className={styles.attendanceStamp}>✓</i>}<b>{index + 1}</b></span>; })}</div>',
'attendance dots')

s = replace_once(s,
"  const wins = nickname ? autoEvents.filter((item) => String(item.winner_nickname || '').trim() === nickname).length : 0;\n\n  return (",
"""  const wins = nickname ? autoEvents.filter((item) => String(item.winner_nickname || '').trim() === nickname).length : 0;
  const [showSurpriseGuide, setShowSurpriseGuide] = useState(false);
  const [surpriseGuide, setSurpriseGuide] = useState({ title: 'AI PROCESS 돌발 체험 이벤트', body: '' });
  useEffect(() => {
    let active = true;
    void supabase.from('vip_surprise_guide').select('title,body').eq('id', 1).maybeSingle().then(({ data }) => {
      if (active && data) setSurpriseGuide({ title: data.title || 'AI PROCESS 돌발 체험 이벤트', body: data.body || '' });
    });
    return () => { active = false; };
  }, []);

  return (""",
'surprise state')
s = replace_once(s,
'      <section className={styles.listCard}><div className={styles.listCopy}><span className={styles.listIcon}>AI</span><div><strong>AI PROCESS 돌발 체험 이벤트</strong><p>진행 방법과 참여 안내는 기존 운영 기능을 그대로 유지합니다.</p></div></div><button type="button" className={styles.chevronButton}>진행방법 <span>›</span></button></section>',
'      <section className={styles.listCard}><div className={styles.listCopy}><span className={styles.listIcon}>AI</span><div><strong>AI PROCESS 돌발 체험 이벤트</strong></div></div><button type="button" onClick={() => setShowSurpriseGuide((value) => !value)} className={styles.chevronButton}>진행방법 <span>›</span></button></section>\n      {showSurpriseGuide && <section className={styles.surpriseGuideCard}><div className={styles.surpriseGuideHead}><strong>{surpriseGuide.title}</strong><button type="button" onClick={() => setShowSurpriseGuide(false)}>닫기</button></div><div className={styles.surpriseGuideBody}>{surpriseGuide.body || \'현재 안내 내용을 준비 중입니다.\'}</div></section>}',
'surprise UI')

s = replace_once(s,
"function AiLive({ profile, userId, row, tick, error }) {\n  void tick;",
"""const aiTradingAssets = [
  { symbol: 'BTC/USD', name: 'Bitcoin', market: 'COIN' },
  { symbol: 'NVDA', name: 'NVIDIA', market: 'STOCK' },
  { symbol: 'ETH/USD', name: 'Ethereum', market: 'COIN' },
  { symbol: '005930', name: '삼성전자', market: 'STOCK' },
  { symbol: 'SOL/USD', name: 'Solana', market: 'COIN' },
  { symbol: 'AAPL', name: 'Apple', market: 'STOCK' },
  { symbol: 'XRP/USD', name: 'XRP', market: 'COIN' },
  { symbol: '000660', name: 'SK하이닉스', market: 'STOCK' },
];
const aiTradingSignals = [
  ['상승세 감지', 'AI 판단 매수 신청 완료'],
  ['조건 탐색', '진입 구간 탐색 중'],
  ['매수 조건 충족', '매수 신청 완료'],
  ['보유 구간 관리', '수익 구간 모니터링'],
  ['목표 구간 감지', '매도 신청 완료'],
  ['체결 결과 반영', '재분석 진행'],
];
function buildAiTradingRows(clock, count = 8) {
  const slot = Math.floor(Number(clock || Date.now()) / 300000);
  return Array.from({ length: count }, (_, index) => {
    const asset = aiTradingAssets[(slot + index * 3) % aiTradingAssets.length];
    const signal = aiTradingSignals[(slot + index) % aiTradingSignals.length];
    return { id: String(slot) + '-' + String(index), ...asset, signal: signal[0], action: signal[1] };
  });
}

function AiLive({ profile, userId, row, tick, error }) {""",
'ai trading helpers')
s = replace_once(s,
"  const areaPoints = snapshot.chartPoints ? `18,200 ${snapshot.chartPoints} 742,200` : '';\n\n  return (",
"  const areaPoints = snapshot.chartPoints ? `18,200 ${snapshot.chartPoints} 742,200` : '';\n  const tradingRows = buildAiTradingRows(Date.now() + Number(tick || 0));\n\n  return (",
'ai trading rows')
s = s.replace("<div className={styles.aiProgressMeta}><span>진행률 {snapshot.progress.toFixed(2)}%</span><span>{status === 'running' ? `다음 반영 ${snapshot.nextText}` : '최종 반영 완료'}</span><span>{snapshot.remainingText}</span></div>", "<div className={styles.aiProgressMeta}><span>진행률 {snapshot.progress.toFixed(2)}%</span><span>{snapshot.remainingText}</span></div>")
s = s.replace('<div className={styles.sectionHead}><div><span>AI 진행 구조</span><strong>분석부터 재분석까지</strong></div><small>3분 단위 반영</small></div>', '<div className={styles.sectionHead}><div><span>AI 진행 구조</span><strong>분석부터 재분석까지</strong></div></div>')
s = s.replace('<div className={styles.aiChartHead}><div><span>최근 3분 반영 그래프</span><h3>평가금액 변화</h3></div><strong className={styles.aiChartValue}>+{aiKrw(snapshot.earnedProfit)}</strong></div>', '<div className={styles.aiChartHead}><div><span>최근 반영 그래프</span><h3>평가금액 변화</h3></div><strong className={styles.aiChartValue}>+{aiKrw(snapshot.earnedProfit)}</strong></div>')
s = s.replace('{activities.length === 0 ? <div className={styles.emptyRow}>첫 3분 반영을 기다리고 있습니다.</div>', '{activities.length === 0 ? <div className={styles.emptyRow}>진행 기록을 준비하고 있습니다.</div>')
s = s.replace('<section className={styles.metricCard}><span>3분 평균 반영</span><strong className={styles.positive}>+{aiKrw(snapshot.averagePerStep)}</strong><small>현재까지 누적 기준</small></section>', '<section className={styles.metricCard}><span>평균 반영</span><strong className={styles.positive}>+{aiKrw(snapshot.averagePerStep)}</strong></section>')
s = replace_once(s,
'      <section className={styles.aiChartCard}>',
'''      <section className={styles.tradingCard}>
        <div className={styles.tradingHead}><div><span>AI TRADING</span><strong>주식 · 코인 트레이딩 현황</strong></div><b>LIVE</b></div>
        <div className={styles.tradingList}>{tradingRows.map((item) => <div key={item.id} className={styles.tradingRow}><span className={item.market === 'COIN' ? styles.tradingCoin : styles.tradingStock}>{item.market === 'COIN' ? '₿' : '◈'}</span><div className={styles.tradingAsset}><strong>{item.name}</strong><small>{item.symbol} · {item.market}</small></div><div className={styles.tradingAction}><strong>{item.signal}</strong><span>{item.action}</span></div></div>)}</div>
      </section>

      <section className={styles.aiChartCard}>''',
'ai trading card')

s = s.replace("  const [showProfile, setShowProfile] = useState(false);\n", '')
s = s.replace("    setShowProfile(false);\n", '')
old_header = '''          <div className={styles.headerActions}>
            <button type="button" className={styles.iconButton} aria-label="알림"><span className={styles.bellDot} /><span className={styles.bellIcon}>⌁</span></button>
            <button type="button" className={styles.profileButton} onClick={() => setShowProfile((value) => !value)}><img src={avatarSrc(profile.avatar)} alt="" className={styles.avatarImage} /><span className={styles.profileCopy}><strong>{profile.nickname || 'VIP 회원'}</strong><small>내 정보</small></span></button>
          </div>
        </header>
        {showProfile && <div className={styles.profilePopover}><div className={styles.profilePopoverHead}><img src={avatarSrc(profile.avatar)} alt="" /><div><strong>{profile.nickname || 'VIP 회원'}</strong><span>{profile.role === 'admin' ? '관리자' : 'VIP 회원'}</span></div></div><dl><div><dt>닉네임</dt><dd>{profile.nickname || '-'}</dd></div><div><dt>성함</dt><dd>{profile.real_name || '-'}</dd></div><div><dt>회원등급</dt><dd>{profile.role === 'admin' ? '관리자' : 'VIP 회원'}</dd></div><div><dt>승인상태</dt><dd>{profile.approval_status === '1' ? '승인 완료' : profile.approval_status}</dd></div></dl><button type="button" onClick={handleLogout}>로그아웃</button></div>}'''
new_header = '''          <div className={styles.headerActions}>
            <button type="button" className={styles.iconButton} aria-label="알림"><span className={styles.bellDot} /><svg className={styles.bellSvg} viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg></button>
            <button type="button" className={styles.logoutButton} onClick={handleLogout}>로그아웃</button>
          </div>
        </header>'''
s = replace_once(s, old_header, new_header, 'member header')
p.write_text(s)

p = Path('app/v2/V2CompatibilityLayer.js')
s = p.read_text()
s = s.replace('      <button type="button" onClick={() => { setNotice(\'\'); setAccessMode(\'login\'); }}>비밀번호로 로그인</button>\n', '')
s = s.replace('    {accessActions}{profileTools}{rewardBadge}{bellBadge}', '    {accessActions}{rewardBadge}{bellBadge}')
s = re.sub(r"\n\s*\{accessMode === 'login' && modal\(<form onSubmit=\{legacyLogin\}>[\s\S]*?\)\}\n\n\s*(?=\{accessMode === 'signup')", '\n    ', s, count=1)
p.write_text(s)

p = Path('app/v2/reward/RewardLiveClient.js')
s = p.read_text()
s = s.replace("  const [showProfile, setShowProfile] = useState(false);\n", '')
s = s.replace('<p>V2 회원 입장 후 상품 지급 내역을 확인할 수 있습니다.</p>', '<p>회원 입장 후 상품 지급 내역을 확인할 수 있습니다.</p>')
old_reward_header = '''          <div className={styles.headerActions}>
            <button type="button" className={styles.iconButton} aria-label="알림"><span className={styles.bellIcon}>⌁</span></button>
            <button type="button" className={styles.profileButton} onClick={() => setShowProfile((value) => !value)}>
              <img src={avatarSrc(profile.avatar)} alt="" className={styles.avatarImage} />
              <span className={styles.profileCopy}><strong>{profile.nickname || 'VIP 회원'}</strong><small>내 정보</small></span>
            </button>
          </div>
        </header>

        {showProfile && (
          <div className={styles.profilePopover}>
            <div className={styles.profilePopoverHead}><img src={avatarSrc(profile.avatar)} alt="" /><div><strong>{profile.nickname || 'VIP 회원'}</strong><span>{profile.role === 'admin' ? '관리자' : 'VIP 회원'}</span></div></div>
            <dl><div><dt>닉네임</dt><dd>{profile.nickname || '-'}</dd></div><div><dt>성함</dt><dd>{profile.real_name || '-'}</dd></div><div><dt>승인상태</dt><dd>{String(profile.approval_status) === '1' ? '승인 완료' : profile.approval_status}</dd></div></dl>
            <button type="button" onClick={logout}>로그아웃</button>
          </div>
        )}'''
new_reward_header = '''          <div className={styles.headerActions}>
            <button type="button" className={styles.iconButton} aria-label="알림"><svg className={styles.bellSvg} viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg></button>
            <button type="button" className={styles.logoutButton} onClick={logout}>로그아웃</button>
          </div>
        </header>'''
s = replace_once(s, old_reward_header, new_reward_header, 'reward header')
s = s.replace('<div><span className={styles.kicker}>REWARD</span><h1>상품 지급</h1><p>이벤트·출석 혜택으로 지급된 상품과 운영팀 메시지를 확인하세요.</p></div>', '<div><span className={styles.kicker}>REWARD</span><h1>상품 지급</h1></div>')
s = s.replace('<section className={styles.infoCard}><span className={styles.infoIcon}>i</span><div><strong>관리자 기능은 다음 단계에서 연결합니다.</strong><p>회원용 상품 지급 화면은 실제 메시지·기프티콘·링크·읽음 처리까지 연결된 상태입니다.</p></div></section>', '<section className={styles.infoCard}><span className={styles.infoIcon}>i</span><div><strong>관리자 상품 지급</strong></div></section>')
s = s.replace('<div><span>VIP REWARD INBOX</span><strong>상품 지급 메시지함</strong><p>운영팀이 지급한 기프티콘과 안내 링크를 바로 확인할 수 있습니다.</p></div>', '<div><span>VIP REWARD INBOX</span><strong>상품 지급 내역</strong></div>')
s = s.replace('<div className={styles.empty}>아직 도착한 상품 지급 메시지가 없습니다.<br />새 지급 내역이 생기면 이 화면에 실시간으로 표시됩니다.</div>', '<div className={styles.empty}>아직 도착한 상품 지급 내역이 없습니다.</div>')
s = re.sub(r'\n\s*<form className=\{styles\.composer\} onSubmit=\{sendMessage\}>[\s\S]*?</form>', '', s, count=1)
s = re.sub(r'\n\s*<section className=\{styles\.guide\}>[\s\S]*?</section>', '', s, count=1)
p.write_text(s)

p = Path('app/v2/admin/AdminLiveClient.js')
s = p.read_text()
s = s.replace('<p>승인된 관리자 계정으로 V2 회원 화면에 먼저 입장해주세요.</p>', '<p>관리자 로그인이 필요합니다.</p>')
s = s.replace('V2 회원 입장으로 이동', '회원 입장으로 이동')
s = s.replace('<p>화면별 색상 테마를 나누지 않고 하나의 금융형 관리 UI로 통합했습니다.</p>', '')
s = s.replace('    <div className={styles.footer}>V2 CLEAN UI · 기존 운영 기능을 새로운 관리자 화면으로 이식한 Preview입니다.</div>\n', '')
p.write_text(s)

p = Path('app/v2/v2.module.css')
s = p.read_text()
if '/* final mobile containment */' not in s:
    s += r'''
/* final mobile containment */
.canvas { width: 100%; max-width: 100vw; overflow-x: hidden; box-sizing: border-box; }
.appShell { width: min(100%, 470px); max-width: 100%; min-width: 0; box-sizing: border-box; }
.appShell * { box-sizing: border-box; }
.content, .header, .nav { min-width: 0; max-width: 100%; }
.headerActions { flex-shrink: 0; }
.bellSvg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; vertical-align: middle; }
.logoutButton { height: 40px; padding: 0 10px; border: 1px solid #dfe5ec; border-radius: 12px; background: #fff; color: #5f6d80; font-size: 10px; font-weight: 700; cursor: pointer; }
.eventMotionIcon { width: 30px; height: 30px; border-radius: 10px; display: inline-grid; place-items: center; flex: 0 0 auto; background: #f0f5ff; color: #2f6fed; animation: eventIconFloat 2.4s ease-in-out infinite; vertical-align: middle; }
.eventMotionIcon svg { width: 19px; height: 19px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
@keyframes eventIconFloat { 0%,100%{ transform: translateY(0); } 50%{ transform: translateY(-2px); } }
@media (max-width: 520px) {
  html, body { max-width: 100%; overflow-x: hidden; }
  .canvas { width: 100vw; max-width: 100vw; overflow-x: clip; }
  .appShell { width: 100%; max-width: 100vw; margin: 0; }
  .content { width: 100%; overflow-x: hidden; }
  .logoutButton { padding: 0 8px; font-size: 9px; }
}
'''
p.write_text(s)

p = Path('app/v2/v2-live.module.css')
s = p.read_text()
if '/* final attendance stamp */' not in s:
    s += r'''
/* final attendance stamp */
.attendanceDots > span { position: relative; overflow: hidden; }
.attendanceDots > span b { position: relative; z-index: 1; font: inherit; }
.attendanceDotDone { background: #eef4ff !important; border-color: #76a2ff !important; color: #2f6fed !important; }
.attendanceStamp { position: absolute; inset: 50% auto auto 50%; transform: translate(-50%,-58%) rotate(-10deg); width: 30px; height: 30px; border: 2px solid #2f6fed; border-radius: 50%; display: grid; place-items: center; font-style: normal; font-size: 18px; font-weight: 900; color: #2f6fed; opacity: .92; background: rgba(255,255,255,.82); }
.attendanceDotDone b { position: absolute !important; right: 6px; bottom: 4px; font-size: 8px !important; }
.surpriseGuideCard { margin-top: 10px; border: 1px solid #dfe6ef; border-radius: 16px; background: #fff; padding: 16px; }
.surpriseGuideHead { display:flex; align-items:center; justify-content:space-between; gap:12px; }
.surpriseGuideHead strong { font-size: 13px; color:#172033; }
.surpriseGuideHead button { border:0; background:#f1f4f8; color:#647287; border-radius:9px; padding:7px 9px; font-size:9px; cursor:pointer; }
.surpriseGuideBody { margin-top: 12px; white-space: pre-line; font-size: 10px; line-height: 1.75; color:#59677a; }
.eventEmoji .eventMotionIcon { width: 28px; height: 28px; border-radius: 9px; }
.cardKicker .eventMotionIcon { width: 24px; height: 24px; border-radius: 8px; margin-right: 6px; }
.cardKicker { display:flex; align-items:center; }
'''
p.write_text(s)

p = Path('app/v2/v2-ai-live.module.css')
s = p.read_text()
if '/* restored AI trading activity */' not in s:
    s += r'''
/* restored AI trading activity */
.tradingCard { margin-top: 10px; border: 1px solid #e0e6ed; background:#fff; border-radius:18px; overflow:hidden; box-shadow:0 7px 20px rgba(31,45,61,.04); min-width:0; }
.tradingHead { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:15px 16px; border-bottom:1px solid #edf1f5; }
.tradingHead div { min-width:0; display:grid; gap:3px; }
.tradingHead span { color:#8a96a6; font-size:8px; font-weight:800; letter-spacing:.11em; }
.tradingHead strong { color:#172033; font-size:14px; }
.tradingHead b { color:#2f6fed; background:#eef4ff; border-radius:999px; padding:5px 8px; font-size:8px; letter-spacing:.08em; }
.tradingList { display:grid; }
.tradingRow { display:grid; grid-template-columns:34px minmax(0,.8fr) minmax(0,1.2fr); align-items:center; gap:9px; padding:11px 14px; border-bottom:1px solid #f0f3f6; min-width:0; }
.tradingRow:last-child { border-bottom:0; }
.tradingCoin,.tradingStock { width:30px; height:30px; border-radius:10px; display:grid; place-items:center; font-size:14px; font-weight:800; }
.tradingCoin { color:#2f6fed; background:#edf4ff; }
.tradingStock { color:#13795b; background:#edf8f4; }
.tradingAsset,.tradingAction { min-width:0; display:grid; gap:2px; }
.tradingAsset strong,.tradingAction strong { font-size:10px; color:#263247; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.tradingAsset small,.tradingAction span { font-size:8px; color:#8995a5; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.aiChart, .processRail, .twoColumnCards, .aiProgressCard, .aiChartCard { max-width:100%; min-width:0; }
.aiChart { width:100%; height:auto; display:block; }
@media (max-width:520px){ .tradingRow{grid-template-columns:32px minmax(0,.7fr) minmax(0,1.3fr); padding:10px 11px; gap:7px;} .tradingHead{padding:13px 12px;} }
'''
p.write_text(s)

for file in ['app/v2/V2LiveClientStage2.js','app/v2/reward/RewardLiveClient.js','app/v2/admin/AdminLiveClient.js']:
    txt=Path(file).read_text()
    forbidden=['V2 2차 실제 기능 연결','기존 운영 기능을 새로운 관리자 화면으로 이식한 Preview','기능은 삭제하지 않습니다.','다음 단계에서 연결']
    for needle in forbidden:
        if needle in txt:
            raise RuntimeError(f'forbidden public copy still present in {file}: {needle}')

print('UI fixes applied')
