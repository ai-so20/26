'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import baseStyles from './v2.module.css';
import extraStyles from './v2-extra.module.css';
import liveStyles from './v2-live.module.css';

const styles = { ...baseStyles, ...extraStyles, ...liveStyles };

const navItems = [
  { id: 'event', label: '이벤트' },
  { id: 'ai', label: 'AI프로세스' },
  { id: 'private', label: '상품 지급' },
];

function avatarSrc(value) {
  const raw = String(value || '01');
  if (raw === 'admin') return '/avatars/admin.png.png';
  const key = raw.padStart(2, '0');
  return /^\d{2}$/.test(key) && Number(key) >= 1 && Number(key) <= 43
    ? `/avatars/${key}.png`
    : '/avatars/01.png';
}

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

function formatEventTime(value) {
  if (!value) return '--:--';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function eventIcon(type) {
  return ({
    gift_box: '🎁',
    number: '🎯',
    roulette: '🎰',
    first_come: '⚡',
    quiz: '🧩',
    draw: '🎟️',
  }[type] || '🎁');
}

function eventGuide(type) {
  const guides = {
    gift_box: '4개의 상자 중 하나를 선택하세요. 당첨 상자를 고른 회원이 여러 명이면 그중 1명을 무작위로 선정합니다.',
    number: '1~10 중 숫자 하나를 선택하세요. 정답자가 여러 명이면 정답자 중 무작위 1명, 정답자가 없으면 가장 가까운 숫자의 회원 중 1명을 선정합니다.',
    roulette: '룰렛 돌리기를 눌러 응모하세요. 화면 회전은 연출이며, 회차 종료 후 실제 참여자 중 서버가 무작위로 1명을 선정합니다.',
    first_come: '시작 후 참여 버튼을 가장 먼저 정상 접수한 1명이 즉시 당첨됩니다. 회원 기기 시간이 아닌 서버 접수 순서로 판정합니다.',
    quiz: '문제를 읽고 보기 하나를 선택해 제출하세요. 정답자만 당첨 대상이며, 정답자가 여러 명이면 그중 1명을 무작위로 선정합니다.',
    draw: '응모하기를 한 번 누르면 완료됩니다. 회차 종료 후 실제 응모자 전체 중 서버가 무작위로 1명을 선정합니다.',
  };
  return guides[type] || '회차당 1회 참여할 수 있습니다.';
}

function isEventLiveNow(event) {
  const nowMs = Date.now();
  const startMs = new Date(event?.starts_at).getTime();
  const endMs = new Date(event?.ends_at).getTime();
  return (
    Number.isFinite(startMs) &&
    Number.isFinite(endMs) &&
    nowMs >= startMs &&
    nowMs < endMs &&
    event?.status !== 'completed'
  );
}

function EventGame({ item, answer, busy, spinning, onAnswer, onJoin }) {
  const active = item.status === 'active' || isEventLiveNow(item);
  if (!active || item.participated) return null;

  if (item.event_type === 'gift_box') {
    return (
      <div className={styles.gameArea}>
        <div className={styles.gameLabel}>선물상자를 선택하세요</div>
        <div className={styles.gameFourGrid}>
          {[1, 2, 3, 4].map((box) => (
            <button key={box} type="button" onClick={() => onAnswer(String(box))} className={`${styles.gameChoice} ${String(answer) === String(box) ? styles.gameChoiceSelected : ''}`}>
              <span className={styles.gameChoiceIcon}>🎁</span><span>{box}번</span>
            </button>
          ))}
        </div>
        <button type="button" disabled={busy} onClick={() => onJoin()} className={styles.primaryButtonWide}>
          {busy ? '처리 중...' : '선택한 상자로 참여하기'}
        </button>
      </div>
    );
  }

  if (item.event_type === 'number') {
    return (
      <div className={styles.gameArea}>
        <div className={styles.gameLabel}>1 ~ 10 중에서 <b>숫자 1개</b>를 선택해주세요.</div>
        <div className={styles.numberRow}>
          <input type="number" min="1" max="10" inputMode="numeric" value={answer || ''} onChange={(e) => onAnswer(e.target.value)} placeholder="예: 7" className={styles.gameInput} />
          <button type="button" disabled={busy} onClick={() => onJoin()} className={styles.primaryButton}>{busy ? '처리 중' : '제출'}</button>
        </div>
      </div>
    );
  }

  if (item.event_type === 'quiz') {
    const options = [item.quiz_option_1, item.quiz_option_2, item.quiz_option_3, item.quiz_option_4];
    return (
      <div className={styles.gameArea}>
        <div className={styles.quizQuestion}>Q. {item.quiz_question || '퀴즈를 불러오는 중입니다.'}</div>
        <div className={styles.quizGrid}>
          {options.map((option, index) => (
            <button key={index} type="button" disabled={!option} onClick={() => onAnswer(String(index + 1))} className={`${styles.quizChoice} ${String(answer) === String(index + 1) ? styles.gameChoiceSelected : ''}`}>
              <span>{index + 1}</span><strong>{option || '-'}</strong>
            </button>
          ))}
        </div>
        <button type="button" disabled={busy} onClick={() => onJoin()} className={styles.primaryButtonWide}>{busy ? '제출 중...' : '정답 제출하기'}</button>
      </div>
    );
  }

  if (item.event_type === 'roulette') {
    return (
      <div className={styles.gameArea}>
        <div className={`${styles.rouletteWheel} ${spinning ? styles.rouletteSpinning : ''}`}>✦</div>
        <button type="button" disabled={busy || spinning} onClick={() => onJoin('roulette')} className={styles.primaryButtonWide}>
          {spinning ? '룰렛 회전 중...' : busy ? '처리 중...' : '룰렛 돌리고 응모하기'}
        </button>
      </div>
    );
  }

  const labels = { first_come: '⚡ 지금 참여하기', draw: '🎟️ 응모하기' };
  return (
    <div className={styles.gameArea}>
      <button type="button" disabled={busy} onClick={() => onJoin(null)} className={styles.primaryButtonWide}>
        {busy ? '처리 중...' : labels[item.event_type] || '참여하기'}
      </button>
    </div>
  );
}

function MemberEntry({ nickname, realName, working, notice, onNickname, onRealName, onSubmit }) {
  return (
    <main className={styles.canvas}>
      <section className={`${styles.appShell} ${styles.entryShell}`}>
        <div className={styles.entryPanel}>
          <div className={styles.brandBlock}>
            <span className={styles.brandEyebrow}>PRIVATE MEMBER</span>
            <strong className={styles.brand}>VIP LOUNGE</strong>
          </div>
          <div className={styles.entryCopy}>
            <span className={styles.kicker}>MEMBER ENTRY</span>
            <h1>VIP 회원 입장</h1>
            <p>기존 등록 정보로 입장하면 V2에서 실제 이벤트와 출석 기능을 확인할 수 있습니다.</p>
          </div>
          <form className={styles.entryForm} onSubmit={onSubmit}>
            <label><span>오픈방 닉네임</span><input value={nickname} onChange={(e) => onNickname(e.target.value)} autoComplete="nickname" /></label>
            <label><span>성함</span><input value={realName} onChange={(e) => onRealName(e.target.value)} autoComplete="name" /></label>
            {notice && <div className={styles.noticeBox}>{notice}</div>}
            <button type="submit" disabled={working} className={styles.entryButton}>{working ? '확인 중...' : '입장하기'}</button>
          </form>
          <div className={styles.entryFoot}>운영 데이터는 변경하지 않고 기존 인증·회원 기능을 그대로 사용합니다.</div>
        </div>
      </section>
    </main>
  );
}

function EventLive({ profile, autoEvents, attendanceStatus, attendanceWorking, eventAnswers, eventWorkingId, rouletteSpins, eventSuccess, notice, mode, setMode, onAttendance, onAnswer, onJoin }) {
  const attendanceTotal = Math.max(0, Number(attendanceStatus?.total_count || 0));
  const remainder = attendanceTotal % 10;
  const attendanceCycle = remainder === 0 && attendanceTotal > 0 ? (attendanceStatus?.checked_today ? 10 : 0) : remainder;
  const sortedEvents = useMemo(() => {
    const statusOrder = { active: 0, scheduled: 1, completed: 2 };
    return [...(autoEvents || [])].sort((a, b) => {
      const aLive = isEventLiveNow(a);
      const bLive = isEventLiveNow(b);
      if (aLive !== bLive) return aLive ? -1 : 1;
      const aOrder = statusOrder[a.status] ?? 3;
      const bOrder = statusOrder[b.status] ?? 3;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return Number(a.round_number || 0) - Number(b.round_number || 0);
    });
  }, [autoEvents]);
  const activeEvent = sortedEvents.find((item) => item.status === 'active' || isEventLiveNow(item)) || null;
  const featuredEvent = activeEvent || sortedEvents.find((item) => item.status === 'scheduled') || sortedEvents[0] || null;
  const participated = autoEvents.filter((item) => Boolean(item.participated)).length;
  const nickname = String(profile?.nickname || '').trim();
  const wins = nickname ? autoEvents.filter((item) => String(item.winner_nickname || '').trim() === nickname).length : 0;

  return (
    <>
      <PageHeading kicker="EVENT" title="이벤트" description="참여 가능한 이벤트와 출석 현황을 한곳에서 확인하세요." />
      {(notice || eventSuccess) && (
        <div className={`${styles.noticeBox} ${eventSuccess ? styles.noticeSuccess : ''}`}>
          {eventSuccess ? `${eventSuccess.title} · ${eventSuccess.message}` : notice}
        </div>
      )}

      <section className={styles.summaryCard}>
        <div className={styles.summaryTop}><div><span>오늘의 이벤트</span><strong>참여 현황</strong></div><span className={styles.muted}>실시간 데이터</span></div>
        <div className={styles.statsGrid}>
          <Stat label="오늘 이벤트" value={autoEvents.length} suffix="회" />
          <Stat label="내 참여" value={participated} suffix="회" />
          <Stat label="오늘 당첨" value={wins} suffix="회" />
          <Stat label="출석 진행" value={`${attendanceCycle}/10`} suffix="" />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}><div><span>이벤트 선택</span><strong>참여할 항목을 선택하세요</strong></div></div>
        <div className={styles.segmentGrid}>
          <Segment title="실시간 이벤트" subtitle="매 정각 시작" active={mode === 'live'} onClick={() => setMode('live')} />
          <Segment title="출석 이벤트" subtitle="매일 1회 참여" active={mode === 'attendance'} onClick={() => setMode('attendance')} />
        </div>
      </section>

      {mode === 'live' ? (
        <>
          {featuredEvent ? (
            <section className={styles.primaryCard}>
              <div className={styles.cardTopline}>
                <span className={activeEvent ? styles.liveBadge : styles.statusBadge}><i /> {activeEvent ? '진행중' : '다음 이벤트'}</span>
                <span className={styles.muted}>{formatEventTime(featuredEvent.starts_at)} ~ {formatEventTime(featuredEvent.ends_at)}</span>
              </div>
              <div className={styles.cardBody}>
                <span className={styles.cardKicker}>{eventIcon(featuredEvent.event_type)} 실시간 이벤트</span>
                <h2>{featuredEvent.title || '이벤트'}</h2>
                <p>{featuredEvent.description || eventGuide(featuredEvent.event_type)}</p>
              </div>
              {activeEvent && !featuredEvent.participated ? (
                <EventGame
                  item={featuredEvent}
                  answer={eventAnswers[featuredEvent.event_id]}
                  busy={eventWorkingId === featuredEvent.event_id}
                  spinning={Boolean(rouletteSpins[featuredEvent.event_id])}
                  onAnswer={(value) => onAnswer(featuredEvent.event_id, value)}
                  onJoin={(directAnswer) => onJoin(featuredEvent, directAnswer)}
                />
              ) : (
                <div className={styles.cardFooter}>
                  <div className={styles.timeBlock}><span>참여 상태</span><strong>{featuredEvent.participated ? '참여 완료' : activeEvent ? '참여 가능' : '시작 대기'}</strong></div>
                </div>
              )}
            </section>
          ) : (
            <section className={styles.emptyCard}><strong>오늘 등록된 이벤트가 없습니다.</strong><p>새 회차가 등록되면 이곳에 표시됩니다.</p></section>
          )}

          <section className={styles.simpleList}>
            <div className={styles.listHeader}><span>오늘 일정</span><strong>실시간 이벤트</strong></div>
            {sortedEvents.length === 0 ? (
              <div className={styles.emptyRow}>표시할 이벤트가 없습니다.</div>
            ) : sortedEvents.map((item) => {
              const live = item.status === 'active' || isEventLiveNow(item);
              const done = item.status === 'completed';
              const busy = eventWorkingId === item.event_id;
              return (
                <div key={item.event_id} className={`${styles.eventLiveRow} ${live ? styles.eventLiveRowActive : ''}`}>
                  <div className={styles.eventRowTop}>
                    <div className={styles.eventRowTitle}>
                      <span className={styles.rowIndex}>{item.round_number || '-'}</span>
                      <span className={styles.eventEmoji}>{eventIcon(item.event_type)}</span>
                      <div><small>{formatEventTime(item.starts_at)} ~ {formatEventTime(item.ends_at)}</small><strong>{item.title || '이벤트'}</strong></div>
                    </div>
                    <span className={styles.rowState}>{item.participated ? '참여완료' : live ? '진행중' : done ? '종료' : '대기'}</span>
                  </div>
                  <p className={styles.eventGuide}>{eventGuide(item.event_type)}</p>
                  {item.winner_nickname && <div className={styles.winnerLine}>🏆 당첨 · <strong>{item.winner_nickname}</strong></div>}
                  {live && !item.participated && (
                    <EventGame
                      item={item}
                      answer={eventAnswers[item.event_id]}
                      busy={busy}
                      spinning={Boolean(rouletteSpins[item.event_id])}
                      onAnswer={(value) => onAnswer(item.event_id, value)}
                      onJoin={(directAnswer) => onJoin(item, directAnswer)}
                    />
                  )}
                </div>
              );
            })}
          </section>
        </>
      ) : (
        <>
          <section className={styles.attendanceCardLarge}>
            <div className={styles.attendanceHeader}>
              <div><span className={styles.cardKicker}>VIP DAILY CHECK-IN</span><h3>매일 출석 혜택</h3></div>
              <strong className={styles.attendanceCount}>{attendanceCycle}<small>/10</small></strong>
            </div>
            <div className={styles.progressTrack}><span style={{ width: `${Math.min(100, attendanceCycle * 10)}%` }} /></div>
            <div className={styles.attendanceDots}>{Array.from({ length: 10 }).map((_, index) => <span key={index} className={index < attendanceCycle ? styles.attendanceDotDone : ''}>{index + 1}</span>)}</div>
            <p>하루 1회 출석할 수 있으며, 10회 출석 달성 시 랜덤 기프티콘이 상품 지급 화면으로 안내됩니다.</p>
            <button type="button" onClick={onAttendance} disabled={attendanceWorking || attendanceStatus.checked_today} className={styles.primaryButtonWide}>
              {attendanceWorking ? '처리 중' : attendanceStatus.checked_today ? '✓ 오늘 출석 완료' : '오늘 출석하기'}
            </button>
          </section>
          <section className={styles.infoCard}><span className={styles.infoIcon}>i</span><div><strong>출석 보상 안내</strong><p>현재 {attendanceCycle}/10 · 10회 달성마다 랜덤 기프티콘이 자동 지급됩니다.</p></div></section>
        </>
      )}

      <section className={styles.listCard}>
        <div className={styles.listCopy}><span className={styles.listIcon}>AI</span><div><strong>AI PROCESS 돌발 체험 이벤트</strong><p>진행 방법과 참여 안내는 기존 기능 연결 단계에서 그대로 유지합니다.</p></div></div>
        <button type="button" className={styles.chevronButton}>진행방법 <span>›</span></button>
      </section>
    </>
  );
}

function AiPreview() {
  return (
    <>
      <PageHeading kicker="AI PROCESS" title="AI프로세스" description="현재 진행 상태와 주요 결과를 한 화면에서 확인하세요." status="연결 예정" />
      <section className={styles.balanceCard}>
        <div className={styles.balanceTop}><div><span>현재 평가금액</span><strong>—<small>원</small></strong></div><span className={styles.processBadge}>2차 연결</span></div>
        <div className={styles.balanceMeta}><div><span>투자금</span><strong>기존 데이터 연결 예정</strong></div><div><span>누적 수익</span><strong>—</strong></div><div><span>진행 시간</span><strong>—</strong></div></div>
      </section>
      <section className={styles.infoCard}><span className={styles.infoIcon}>i</span><div><strong>기능은 삭제하지 않습니다.</strong><p>다음 단계에서 기존 AI PROCESS 데이터·수익·그래프·진행상태를 이 UI에 연결합니다.</p></div></section>
    </>
  );
}

function PrivatePreview() {
  return (
    <>
      <PageHeading kicker="REWARD" title="상품 지급" description="이벤트와 출석 혜택으로 받은 상품을 확인하세요." status="연결 예정" />
      <section className={styles.rewardSummary}><div><span>미확인 메시지</span><strong>—<small>건</small></strong></div><div><span>최근 지급</span><strong>—<small></small></strong></div></section>
      <section className={styles.messagePanel}><div className={styles.messageHeader}><div><span>상품 지급</span><strong>기존 지급 메시지 기능</strong></div></div><div className={styles.messageBubble}><strong>3차 기능 연결 예정</strong><p>기존 상품 지급·1:1 메시지·링크·알림 기능은 삭제하지 않고 이 화면에 그대로 연결합니다.</p></div></section>
    </>
  );
}

export default function V2LiveClient() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [nickname, setNickname] = useState('');
  const [realName, setRealName] = useState('');
  const [entryWorking, setEntryWorking] = useState(false);
  const [notice, setNotice] = useState('');
  const [activeTab, setActiveTab] = useState('event');
  const [eventMode, setEventMode] = useState('live');
  const [autoEvents, setAutoEvents] = useState([]);
  const [attendanceStatus, setAttendanceStatus] = useState({ checked_today: false, total_count: 0, reward_ready: false, next_reward_at: 10 });
  const [attendanceWorking, setAttendanceWorking] = useState(false);
  const [eventAnswers, setEventAnswers] = useState({});
  const [eventWorkingId, setEventWorkingId] = useState(null);
  const [rouletteSpins, setRouletteSpins] = useState({});
  const [eventSuccess, setEventSuccess] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [, setClockTick] = useState(0);

  useEffect(() => {
    let mounted = true;
    const boot = async () => {
      try { await fetch('/api/avatars/ensure', { method: 'POST', cache: 'no-store' }); } catch {}
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session?.user) { setLoading(false); return; }
      await loadProfile(session.user);
    };
    void boot();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!user || !profile) return;
    void loadAutoEvents();
    void loadAttendanceStatus();
    const timer = window.setInterval(() => { void loadAutoEvents(); void loadAttendanceStatus(); }, 30000);
    return () => window.clearInterval(timer);
  }, [user?.id, profile?.id]);

  useEffect(() => {
    const timer = window.setInterval(() => setClockTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  async function loadProfile(authUser) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
    if (error || !data) {
      await supabase.auth.signOut();
      setNotice('회원 정보를 불러오지 못했습니다.');
      setLoading(false);
      return;
    }
    if (data.approval_status !== '1') {
      await supabase.auth.signOut();
      setNotice('관리자 승인 대기 중인 계정입니다.');
      setLoading(false);
      return;
    }
    setUser(authUser);
    setProfile(data);
    setLoading(false);
  }

  async function handleMemberEntry(e) {
    e.preventDefault();
    if (entryWorking) return;
    setEntryWorking(true);
    setNotice('');
    try {
      const response = await fetch('/api/auth/member-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, realName }),
      });
      const result = await response.json();
      if (!response.ok || !result.session) { setNotice(result.error || '입장 정보를 확인해주세요.'); return; }
      const { data, error } = await supabase.auth.setSession(result.session);
      if (error || !data.user) { setNotice('입장 중 오류가 발생했습니다.'); return; }
      const { data: member, error: profileError } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
      if (profileError || member?.approval_status !== '1') {
        await supabase.auth.signOut();
        setNotice('등록 정보를 확인해주세요.');
        return;
      }
      window.sessionStorage.setItem('vip-active-tab', 'event');
      window.localStorage.removeItem('vip-ui-locked');
      setActiveTab('event');
      setUser(data.user);
      setProfile(member);
    } catch {
      setNotice('입장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setEntryWorking(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setAutoEvents([]);
    setShowProfile(false);
    setNotice('');
  }

  async function loadAutoEvents() {
    const { data, error } = await supabase.rpc('get_auto_events');
    if (error) { setNotice('이벤트 정보를 불러오지 못했습니다.'); return; }
    setAutoEvents((data || []).filter((item) => item.event_type !== 'attendance'));
  }

  async function loadAttendanceStatus() {
    const { data, error } = await supabase.rpc('get_daily_attendance_status');
    if (error) return;
    const row = Array.isArray(data) ? data[0] : data;
    if (row) setAttendanceStatus({
      checked_today: Boolean(row.checked_today),
      total_count: Number(row.total_count || 0),
      reward_ready: Boolean(row.reward_ready),
      next_reward_at: Number(row.next_reward_at || 10),
    });
  }

  async function checkDailyAttendance() {
    if (attendanceWorking || attendanceStatus.checked_today) return;
    setAttendanceWorking(true);
    setNotice('');
    const { data, error } = await supabase.rpc('check_daily_attendance');
    if (error) {
      setNotice(`출석 참여 실패: ${error.message}`);
      setAttendanceWorking(false);
      return;
    }
    const result = Array.isArray(data) ? data[0] : data;
    setEventSuccess({ eventId: 'daily-attendance', title: 'VIP DAILY CHECK-IN', message: result?.message || '오늘의 출석이 완료되었습니다.' });
    await loadAttendanceStatus();
    setAttendanceWorking(false);
    window.setTimeout(() => setEventSuccess((current) => current?.eventId === 'daily-attendance' ? null : current), 3600);
  }

  function setEventAnswer(eventId, value) {
    setEventAnswers((current) => ({ ...current, [eventId]: value }));
  }

  async function joinAutoEvent(eventItem, directAnswer = undefined) {
    if (!eventItem?.event_id || eventWorkingId) return;
    let answer = directAnswer;
    if (answer === undefined) answer = eventAnswers[eventItem.event_id] ?? null;
    if (eventItem.event_type === 'number') {
      const n = Number(answer);
      if (!Number.isInteger(n) || n < 1 || n > 100) { setNotice('숫자 맞히기는 1부터 100까지 숫자 하나를 선택해주세요.'); return; }
      answer = String(n);
    }
    if (eventItem.event_type === 'quiz' && !['1', '2', '3', '4'].includes(String(answer))) { setNotice('퀴즈 보기 중 하나를 먼저 선택해주세요.'); return; }
    if (eventItem.event_type === 'gift_box' && !['1', '2', '3', '4'].includes(String(answer))) { setNotice('선물상자 1~4번 중 하나를 선택해주세요.'); return; }
    if (eventItem.event_type === 'roulette') {
      setRouletteSpins((current) => ({ ...current, [eventItem.event_id]: true }));
      await new Promise((resolve) => setTimeout(resolve, 900));
      answer = 'roulette';
    }
    setEventWorkingId(eventItem.event_id);
    setNotice('');
    const { error } = await supabase.rpc('join_auto_event', { target_event_id: eventItem.event_id, submitted_answer: answer });
    if (error) {
      setNotice(`이벤트 참여 실패: ${error.message}`);
      setEventSuccess(null);
    } else {
      setEventSuccess({ eventId: eventItem.event_id, title: eventItem.title || '이벤트', message: `${eventItem.title || '이벤트'} 참여가 완료되었습니다.` });
      await loadAutoEvents();
      window.setTimeout(() => setEventSuccess((current) => current?.eventId === eventItem.event_id ? null : current), 3600);
    }
    setEventWorkingId(null);
    if (eventItem.event_type === 'roulette') setRouletteSpins((current) => ({ ...current, [eventItem.event_id]: false }));
  }

  if (loading) return <main className={styles.canvas}><section className={`${styles.appShell} ${styles.loadingShell}`}><div className={styles.loadingMark}>VIP</div><strong>회원 정보를 확인하고 있습니다.</strong></section></main>;
  if (!user || !profile) return <MemberEntry nickname={nickname} realName={realName} working={entryWorking} notice={notice} onNickname={setNickname} onRealName={setRealName} onSubmit={handleMemberEntry} />;

  return (
    <main className={styles.canvas}>
      <section className={styles.appShell}>
        <header className={styles.header}>
          <div className={styles.brandBlock}><span className={styles.brandEyebrow}>PRIVATE MEMBER</span><strong className={styles.brand}>VIP LOUNGE</strong></div>
          <div className={styles.headerActions}>
            <button type="button" className={styles.iconButton} aria-label="알림"><span className={styles.bellDot} /><span className={styles.bellIcon}>⌁</span></button>
            <button type="button" className={styles.profileButton} onClick={() => setShowProfile((value) => !value)}>
              <img src={avatarSrc(profile.avatar)} alt="" className={styles.avatarImage} />
              <span className={styles.profileCopy}><strong>{profile.nickname || 'VIP 회원'}</strong><small>내 정보</small></span>
            </button>
          </div>
        </header>

        {showProfile && (
          <div className={styles.profilePopover}>
            <div className={styles.profilePopoverHead}><img src={avatarSrc(profile.avatar)} alt="" /><div><strong>{profile.nickname || 'VIP 회원'}</strong><span>{profile.role === 'admin' ? '관리자' : 'VIP 회원'}</span></div></div>
            <dl><div><dt>닉네임</dt><dd>{profile.nickname || '-'}</dd></div><div><dt>성함</dt><dd>{profile.real_name || '-'}</dd></div><div><dt>회원등급</dt><dd>{profile.role === 'admin' ? '관리자' : 'VIP 회원'}</dd></div><div><dt>승인상태</dt><dd>{profile.approval_status === '1' ? '승인 완료' : profile.approval_status}</dd></div></dl>
            <button type="button" onClick={handleLogout}>로그아웃</button>
          </div>
        )}

        <nav className={styles.nav} aria-label="주요 메뉴">
          {navItems.map((item) => (
            <button key={item.id} type="button" onClick={() => { setActiveTab(item.id); window.sessionStorage.setItem('vip-active-tab', item.id); }} className={`${styles.navItem} ${activeTab === item.id ? styles.navActive : ''}`}>{item.label}</button>
          ))}
        </nav>

        <div className={styles.content}>
          {activeTab === 'event' && <EventLive profile={profile} autoEvents={autoEvents} attendanceStatus={attendanceStatus} attendanceWorking={attendanceWorking} eventAnswers={eventAnswers} eventWorkingId={eventWorkingId} rouletteSpins={rouletteSpins} eventSuccess={eventSuccess} notice={notice} mode={eventMode} setMode={setEventMode} onAttendance={checkDailyAttendance} onAnswer={setEventAnswer} onJoin={joinAutoEvent} />}
          {activeTab === 'ai' && <AiPreview />}
          {activeTab === 'private' && <PrivatePreview />}
          <div className={styles.previewNotice}>V2 1차 실제 기능 연결 · 회원 세션/회원정보/실시간 이벤트/출석은 운영 기능에 연결되었습니다. AI PROCESS와 상품 지급은 다음 단계에서 연결합니다.</div>
        </div>
      </section>
    </main>
  );
}
