'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import baseStyles from './v2.module.css';
import extraStyles from './v2-extra.module.css';
import liveStyles from './v2-live.module.css';
import aiStyles from './v2-ai-live.module.css';

const styles = { ...baseStyles, ...extraStyles, ...liveStyles, ...aiStyles };
const AI_PROCESS_STEP_MINUTES = 3;

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

function aiKrw(value) {
  return `${Math.round(Number(value || 0)).toLocaleString('ko-KR')}원`;
}

function aiProcessHash(text) {
  let h = 2166136261;
  for (let i = 0; i < String(text || '').length; i += 1) {
    h ^= String(text).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function aiProcessRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function aiProcessStatusLabel(status, availableCount = 0) {
  if (status === 'waiting') return '시작 준비';
  if (status === 'running') return '진행중';
  if (status === 'completed') return '진행완료';
  return Number(availableCount || 0) > 0 ? '진행 가능' : '상담 가능';
}

function aiProcessDurationLabel(hours) {
  const value = Math.max(1, Math.min(2400, Number(hours || 24)));
  if (value % 24 === 0) return `${value / 24}일`;
  if (value > 24) return `${Math.floor(value / 24)}일 ${value % 24}시간`;
  return `${value}시간`;
}

function aiProcessDurationMs(row) {
  return Math.max(1, Math.min(2400, Number(row?.duration_hours || 24))) * 60 * 60 * 1000;
}

function aiProcessOpportunityDday(row) {
  if (Number(row?.available_count || 0) <= 0 || !row?.available_granted_at) return null;
  const grantedAt = new Date(row.available_granted_at).getTime();
  if (!Number.isFinite(grantedAt)) return null;
  const expiresAt = grantedAt + (10 * 24 * 60 * 60 * 1000);
  const remainingMs = expiresAt - Date.now();
  if (remainingMs <= 0) return 0;
  return Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
}

function aiProcessFinalReturn(row, userId) {
  const minReturn = Math.max(0, Number(row?.min_return || 0));
  const maxReturn = Math.max(minReturn, Number(row?.max_return || minReturn));
  const seed = aiProcessHash(`${row?.user_id || userId || 'member'}-${row?.started_at || 'not-started'}-${minReturn}-${maxReturn}`);
  const rand = aiProcessRandom(seed);
  return minReturn + (maxReturn - minReturn) * rand();
}

function getMemberProcessSnapshot(row, userId) {
  const investment = Math.max(0, Number(row?.investment_amount || 0));
  const targetReturn = aiProcessFinalReturn(row, userId);
  const targetProfit = investment * (targetReturn / 100);
  const durationMs = aiProcessDurationMs(row);
  const stepMs = AI_PROCESS_STEP_MINUTES * 60 * 1000;
  const totalSteps = Math.max(1, Math.round(durationMs / stepMs));
  const startedMs = row?.started_at ? new Date(row.started_at).getTime() : Date.now();
  const completedMs = row?.completed_at ? new Date(row.completed_at).getTime() : NaN;
  const snapshotNowMs = row?.status === 'completed' && Number.isFinite(completedMs) ? completedMs : Date.now();
  const rawElapsed = Math.max(0, snapshotNowMs - startedMs);
  const elapsedMs = Math.min(durationMs, rawElapsed);
  const elapsedSteps = Math.min(totalSteps, Math.floor(elapsedMs / stepMs));

  const seed = aiProcessHash(`${row?.user_id || userId || 'member'}-${row?.started_at || 'not-started'}-${investment}-${targetReturn}-${row?.duration_hours || 24}`);
  const rand = aiProcessRandom(seed);
  const rawWeights = [];
  for (let start = 0; start < totalSteps; start += 10) {
    const count = Math.min(10, totalSteps - start);
    const lossCount = count >= 5 ? (rand() < 0.5 ? 1 : 2) : (count >= 2 ? 1 : 0);
    const lossOffsets = new Set();
    while (lossOffsets.size < lossCount) lossOffsets.add(Math.floor(rand() * count));
    for (let offset = 0; offset < count; offset += 1) {
      const index = start + offset;
      const centerWave = 0.72 + 0.28 * Math.sin((index / Math.max(1, totalSteps - 1)) * Math.PI);
      const burst = rand() > 0.87 ? 1.65 + rand() * 1.5 : 1;
      const gain = (0.28 + rand() * 1.55) * centerWave * burst;
      rawWeights.push(lossOffsets.has(offset) ? -gain * (0.12 + rand() * 0.18) : gain);
    }
  }
  const weightTotal = rawWeights.reduce((sum, value) => sum + value, 0) || 1;
  const increments = rawWeights.map((value) => targetProfit * (value / weightTotal));
  const cumulative = [];
  let runningProfit = 0;
  for (const amount of increments) {
    runningProfit += amount;
    cumulative.push(runningProfit);
  }
  const cumulativeAt = (step) => step > 0 ? cumulative[Math.min(totalSteps, step) - 1] : 0;

  const legacyProfit = cumulativeAt(elapsedSteps);
  const anchorAt = row?.profit_anchor_at ? new Date(row.profit_anchor_at).getTime() : NaN;
  const hasAnchor = Number.isFinite(anchorAt) && row?.profit_anchor != null;
  const anchorElapsedSteps = hasAnchor ? Math.max(0, Math.floor((anchorAt - startedMs) / stepMs)) : 0;
  const remainingSteps = Math.max(1, totalSteps - anchorElapsedSteps);
  const stepsAfterAnchor = hasAnchor ? Math.max(0, elapsedSteps - anchorElapsedSteps) : 0;
  const anchorCurveTotal = cumulativeAt(totalSteps) - cumulativeAt(anchorElapsedSteps);
  const anchoredProfit = hasAnchor
    ? Number(row.profit_anchor) + Math.max(0, targetProfit - Number(row.profit_anchor)) * (anchorCurveTotal > 0
      ? (cumulativeAt(elapsedSteps) - cumulativeAt(anchorElapsedSteps)) / anchorCurveTotal
      : Math.min(1, stepsAfterAnchor / remainingSteps))
    : legacyProfit;
  const earnedProfit = Math.max(0, anchoredProfit + Number(row?.profit_adjustment || 0));
  const totalAmount = investment + earnedProfit;
  const currentReturn = investment > 0 ? (earnedProfit / investment) * 100 : 0;
  const progress = targetProfit > 0 ? Math.min(100, (earnedProfit / targetProfit) * 100) : 0;

  const nextBoundary = stepMs - (Math.max(0, Date.now() - startedMs) % stepMs);
  const nextMinutes = Math.floor(nextBoundary / 60000);
  const nextSeconds = Math.floor((nextBoundary % 60000) / 1000);
  const nextText = row?.status === 'running'
    ? `${String(nextMinutes).padStart(2, '0')}:${String(nextSeconds).padStart(2, '0')}`
    : '--:--';

  const profitForStep = (step) => {
    const base = hasAnchor
      ? (step <= anchorElapsedSteps
        ? Number(row.profit_anchor) * step / Math.max(1, anchorElapsedSteps)
        : Number(row.profit_anchor) + Math.max(0, targetProfit - Number(row.profit_anchor)) * (anchorCurveTotal > 0
          ? (cumulativeAt(step) - cumulativeAt(anchorElapsedSteps)) / anchorCurveTotal
          : (step - anchorElapsedSteps) / remainingSteps))
      : cumulativeAt(step);
    return Math.max(0, base + Number(row?.profit_adjustment || 0));
  };

  const firstVisibleStep = Math.max(0, elapsedSteps - 48);
  const history = [];
  for (let step = firstVisibleStep; step <= elapsedSteps; step += 1) {
    history.push({ step, amount: investment + (step === 0 ? 0 : profitForStep(step)) });
  }

  const width = 760;
  const height = 220;
  const padX = 18;
  const padY = 20;
  const amounts = history.map((item) => item.amount);
  const minAmount = Math.min(investment, ...amounts);
  const visibleGain = Math.max(...amounts) - minAmount;
  const visualRange = Math.max(1, visibleGain * 1.28);
  const maxAmount = minAmount + visualRange;
  const range = Math.max(1, maxAmount - minAmount);
  const chartPoints = history.map((item, index) => {
    const x = history.length <= 1 ? padX : padX + (index / (history.length - 1)) * (width - padX * 2);
    const normalized = Math.max(0, Math.min(1, (item.amount - minAmount) / range));
    const y = (height - padY) - normalized * (height - padY * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const remainingMs = Math.max(0, durationMs - elapsedMs);
  const remainingHours = Math.floor(remainingMs / 3600000);
  const remainingMinutes = Math.floor((remainingMs % 3600000) / 60000);

  return {
    investment,
    targetReturn,
    targetProfit,
    earnedProfit,
    totalAmount,
    currentReturn,
    progress,
    elapsedSteps,
    totalSteps,
    nextText,
    chartPoints,
    history,
    recentIncrement: elapsedSteps > 0 ? increments[elapsedSteps - 1] : 0,
    averagePerStep: elapsedSteps > 0 ? earnedProfit / elapsedSteps : 0,
    remainingText: row?.status === 'completed' ? '진행 완료' : `${remainingHours}시간 ${remainingMinutes}분`,
  };
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
            <p>기존 등록 정보로 입장하면 V2에서 실제 이벤트와 AI PROCESS 현황을 확인할 수 있습니다.</p>
          </div>
          <form className={styles.entryForm} onSubmit={onSubmit}>
            <label><span>오픈방 닉네임</span><input value={nickname} onChange={(e) => onNickname(e.target.value)} autoComplete="nickname" /></label>
            <label><span>성함</span><input value={realName} onChange={(e) => onRealName(e.target.value)} autoComplete="name" /></label>
            {notice && <div className={styles.noticeBox}>{notice}</div>}
            <button type="submit" disabled={working} className={styles.entryButton}>{working ? '확인 중...' : '입장하기'}</button>
          </form>
          <div className={styles.entryFoot}>기존 인증과 운영 데이터를 그대로 사용합니다.</div>
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
                <EventGame item={featuredEvent} answer={eventAnswers[featuredEvent.event_id]} busy={eventWorkingId === featuredEvent.event_id} spinning={Boolean(rouletteSpins[featuredEvent.event_id])} onAnswer={(value) => onAnswer(featuredEvent.event_id, value)} onJoin={(directAnswer) => onJoin(featuredEvent, directAnswer)} />
              ) : (
                <div className={styles.cardFooter}><div className={styles.timeBlock}><span>참여 상태</span><strong>{featuredEvent.participated ? '참여 완료' : activeEvent ? '참여 가능' : '시작 대기'}</strong></div></div>
              )}
            </section>
          ) : (
            <section className={styles.emptyCard}><strong>오늘 등록된 이벤트가 없습니다.</strong><p>새 회차가 등록되면 이곳에 표시됩니다.</p></section>
          )}
          <section className={styles.simpleList}>
            <div className={styles.listHeader}><span>오늘 일정</span><strong>실시간 이벤트</strong></div>
            {sortedEvents.length === 0 ? <div className={styles.emptyRow}>표시할 이벤트가 없습니다.</div> : sortedEvents.map((item) => {
              const live = item.status === 'active' || isEventLiveNow(item);
              const done = item.status === 'completed';
              return (
                <div key={item.event_id} className={`${styles.eventLiveRow} ${live ? styles.eventLiveRowActive : ''}`}>
                  <div className={styles.eventRowTop}>
                    <div className={styles.eventRowTitle}><span className={styles.rowIndex}>{item.round_number || '-'}</span><span className={styles.eventEmoji}>{eventIcon(item.event_type)}</span><div><small>{formatEventTime(item.starts_at)} ~ {formatEventTime(item.ends_at)}</small><strong>{item.title || '이벤트'}</strong></div></div>
                    <span className={styles.rowState}>{item.participated ? '참여완료' : live ? '진행중' : done ? '종료' : '대기'}</span>
                  </div>
                  <p className={styles.eventGuide}>{eventGuide(item.event_type)}</p>
                  {item.winner_nickname && <div className={styles.winnerLine}>🏆 당첨 · <strong>{item.winner_nickname}</strong></div>}
                  {live && !item.participated && <EventGame item={item} answer={eventAnswers[item.event_id]} busy={eventWorkingId === item.event_id} spinning={Boolean(rouletteSpins[item.event_id])} onAnswer={(value) => onAnswer(item.event_id, value)} onJoin={(directAnswer) => onJoin(item, directAnswer)} />}
                </div>
              );
            })}
          </section>
        </>
      ) : (
        <>
          <section className={styles.attendanceCardLarge}>
            <div className={styles.attendanceHeader}><div><span className={styles.cardKicker}>VIP DAILY CHECK-IN</span><h3>매일 출석 혜택</h3></div><strong className={styles.attendanceCount}>{attendanceCycle}<small>/10</small></strong></div>
            <div className={styles.progressTrack}><span style={{ width: `${Math.min(100, attendanceCycle * 10)}%` }} /></div>
            <div className={styles.attendanceDots}>{Array.from({ length: 10 }).map((_, index) => <span key={index} className={index < attendanceCycle ? styles.attendanceDotDone : ''}>{index + 1}</span>)}</div>
            <p>하루 1회 출석할 수 있으며, 10회 출석 달성 시 랜덤 기프티콘이 상품 지급 화면으로 안내됩니다.</p>
            <button type="button" onClick={onAttendance} disabled={attendanceWorking || attendanceStatus.checked_today} className={styles.primaryButtonWide}>{attendanceWorking ? '처리 중' : attendanceStatus.checked_today ? '✓ 오늘 출석 완료' : '오늘 출석하기'}</button>
          </section>
          <section className={styles.infoCard}><span className={styles.infoIcon}>i</span><div><strong>출석 보상 안내</strong><p>현재 {attendanceCycle}/10 · 10회 달성마다 랜덤 기프티콘이 자동 지급됩니다.</p></div></section>
        </>
      )}
      <section className={styles.listCard}><div className={styles.listCopy}><span className={styles.listIcon}>AI</span><div><strong>AI PROCESS 돌발 체험 이벤트</strong><p>진행 방법과 참여 안내는 기존 운영 기능을 그대로 유지합니다.</p></div></div><button type="button" className={styles.chevronButton}>진행방법 <span>›</span></button></section>
    </>
  );
}

function AiLive({ profile, userId, row, tick, error }) {
  void tick;
  if (profile?.role === 'admin') {
    return (
      <>
        <PageHeading kicker="AI PROCESS" title="AI프로세스" description="현재 진행 상태와 주요 결과를 한 화면에서 확인하세요." status="회원 화면 연결 완료" />
        <section className={styles.aiAdminHold}><strong>관리자 AI PROCESS 관리 화면은 기존 운영 화면을 유지합니다.</strong><p>관리자 회원별 설정·진행 시작/완료·수익 조정 기능은 삭제하지 않고 관리자 V2 단계에서 별도로 이식합니다.</p></section>
      </>
    );
  }

  const processRow = row || { user_id: userId, available_count: 0, status: 'ready', investment_amount: 0, duration_hours: 720, min_return: 800, max_return: 1200, available_granted_at: null, started_at: null, completed_at: null };
  const status = processRow.status || 'ready';
  const availableCount = Math.max(0, Number(processRow.available_count || 0));
  const opportunityDday = aiProcessOpportunityDday(processRow);

  if (status !== 'running' && status !== 'completed') {
    return (
      <>
        <PageHeading kicker="AI PROCESS" title="AI프로세스" description="회원별 진행 가능 상태와 설정 내용을 확인하세요." status={aiProcessStatusLabel(status, availableCount)} />
        {error && <div className={styles.noticeBox}>{error}</div>}
        <section className={styles.aiWaitingCard}>
          <div className={styles.aiWaitingTop}>
            <div><span className={styles.aiEyebrow}>AI PROCESS STATUS</span><h2>{status === 'waiting' ? `${profile?.nickname || '회원'}님, 진행 준비가 완료되었습니다.` : availableCount > 0 ? `${profile?.nickname || '회원'}님, ${availableCount}회 진행 가능합니다.` : `${profile?.nickname || '회원'}님의 진행 가능한 횟수가 없습니다.`}</h2></div>
            <span className={styles.aiStatusWaiting}>{aiProcessStatusLabel(status, availableCount)}</span>
          </div>
          <p className={styles.aiWaitingText}>{status === 'waiting' ? '상담을 통해 진행 설정이 완료되었습니다. 담당자 확인 후 진행이 시작되면 회원 전용 수익 현황 화면으로 자동 전환됩니다.' : availableCount > 0 ? '회원님께 제공된 AI프로세스 이용 기회가 준비되어 있습니다. 상담 후 진행 설정이 완료되면 시작할 수 있습니다.' : '현재 AI프로세스 돌발 1만원 지원금 이벤트가 진행 중이며, 당첨 시 지원금으로 AI프로세스가 진행됩니다.'}</p>
          <div className={styles.aiAccessGrid}>
            <div><span>진행 가능한 횟수</span><strong>{availableCount}회</strong></div>
            <div><span>현재 상태</span><strong>{availableCount <= 0 && status === 'ready' ? '본인 자금 진행 불가' : aiProcessStatusLabel(status, availableCount)}</strong></div>
            {opportunityDday !== null && <div><span>진행 기회 유효기간</span><strong className={styles.aiDday}>D-{opportunityDday}</strong></div>}
            {status === 'waiting' && Number(processRow.investment_amount || 0) > 0 && <div><span>시작 금액</span><strong>{aiKrw(processRow.investment_amount)}</strong></div>}
          </div>
        </section>
        <section className={styles.infoCard}><span className={styles.infoIcon}>i</span><div><strong>AI PROCESS 이용 안내</strong><p>진행 설정이 시작되면 투자금액·수익·총 금액·진행률·3분 단위 그래프가 이 화면에 자동으로 표시됩니다.</p></div></section>
      </>
    );
  }

  const snapshot = getMemberProcessSnapshot(processRow, userId);
  const stageLabels = ['분석', '탐색', '매수', '관리', '매도', '재분석'];
  const activeStageIndex = status === 'completed' ? 5 : Math.max(0, (Math.max(1, snapshot.elapsedSteps) - 1) % stageLabels.length);
  const recentHistory = snapshot.history.slice(-7);
  const activities = recentHistory.slice(1).map((item, index) => {
    const prev = recentHistory[index];
    const delta = item.amount - prev.amount;
    const stageIndex = Math.max(0, (item.step - 1) % stageLabels.length);
    return { step: item.step, amount: item.amount, delta, stage: stageLabels[stageIndex] };
  }).reverse();
  const areaPoints = snapshot.chartPoints ? `18,200 ${snapshot.chartPoints} 742,200` : '';

  return (
    <>
      <PageHeading kicker="AI PROCESS" title="AI프로세스" description="현재 진행 상태와 주요 결과를 한 화면에서 확인하세요." status={status === 'running' ? '진행중' : '진행완료'} />
      {error && <div className={styles.noticeBox}>{error}</div>}
      <section className={styles.balanceCard}>
        <div className={styles.balanceTop}>
          <div><span>현재 평가금액</span><strong>{Math.round(snapshot.totalAmount).toLocaleString('ko-KR')}<small>원</small></strong></div>
          <span className={styles.processBadge}>{status === 'running' ? '● 진행중' : '✓ 진행완료'}</span>
        </div>
        <div className={styles.balanceMeta}>
          <div><span>투자금</span><strong>{aiKrw(snapshot.investment)}</strong></div>
          <div><span>누적 수익</span><strong className={styles.positive}>+{aiKrw(snapshot.earnedProfit)}</strong></div>
          <div><span>현재 수익률</span><strong className={styles.positive}>+{snapshot.currentReturn.toFixed(2)}%</strong></div>
        </div>
      </section>

      {status === 'completed' && <div className={styles.aiResultBar}><span>출금예정금액</span><strong>{aiKrw(snapshot.totalAmount)}</strong></div>}

      <section className={styles.aiProgressCard}>
        <div className={styles.aiProgressTop}><div><span className={styles.aiEyebrow}>PROCESS PROGRESS</span><h3>{status === 'completed' ? 'AI프로세스 진행이 완료되었습니다.' : 'AI프로세스가 진행 중입니다.'}</h3></div><span className={status === 'completed' ? styles.aiStatusComplete : styles.aiStatusPill}>{status === 'completed' ? 'COMPLETE' : 'ACTIVE'}</span></div>
        <div className={styles.aiProgressTrack}><span style={{ width: `${snapshot.progress}%` }} /></div>
        <div className={styles.aiProgressMeta}><span>진행률 {snapshot.progress.toFixed(2)}%</span><span>{status === 'running' ? `다음 반영 ${snapshot.nextText}` : '최종 반영 완료'}</span><span>{snapshot.remainingText}</span></div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}><div><span>AI 진행 구조</span><strong>분석부터 재분석까지</strong></div><small>3분 단위 반영</small></div>
        <div className={styles.processRail}>
          {stageLabels.map((label, index) => <div key={label} className={`${styles.processStep} ${index === activeStageIndex || status === 'completed' ? styles.processStepActive : ''}`}><span>{index + 1}</span><strong>{label}</strong><small>{index === activeStageIndex && status === 'running' ? '진행 중' : status === 'completed' ? '완료' : '대기'}</small></div>)}
        </div>
      </section>

      <section className={styles.aiChartCard}>
        <div className={styles.aiChartHead}><div><span>최근 3분 반영 그래프</span><h3>평가금액 변화</h3></div><strong className={styles.aiChartValue}>+{aiKrw(snapshot.earnedProfit)}</strong></div>
        <svg className={styles.aiChart} viewBox="0 0 760 220" role="img" aria-label="AI PROCESS 평가금액 그래프">
          <line className={styles.aiChartGrid} x1="18" y1="55" x2="742" y2="55" />
          <line className={styles.aiChartGrid} x1="18" y1="110" x2="742" y2="110" />
          <line className={styles.aiChartGrid} x1="18" y1="165" x2="742" y2="165" />
          {areaPoints && <polygon className={styles.aiChartArea} points={areaPoints} />}
          {snapshot.chartPoints && <polyline className={styles.aiChartLine} points={snapshot.chartPoints} />}
          {snapshot.chartPoints && (() => { const last = snapshot.chartPoints.trim().split(' ').at(-1)?.split(','); return last?.length === 2 ? <circle className={styles.aiChartDot} cx={last[0]} cy={last[1]} r="5" /> : null; })()}
        </svg>
        <div className={styles.aiChartFoot}><span>최근 최대 48개 반영 구간</span><span>누적 {snapshot.elapsedSteps.toLocaleString('ko-KR')}회 반영</span></div>
      </section>

      <section className={styles.simpleList}>
        <div className={styles.listHeader}><span>진행 기록</span><strong>최근 반영 내역</strong></div>
        <div className={styles.activityList}>
          {activities.length === 0 ? <div className={styles.emptyRow}>첫 3분 반영을 기다리고 있습니다.</div> : activities.map((item) => <div key={item.step} className={styles.activityRow}><span className={styles.activityTime}>{item.step}회</span><i className={styles.activityDot} /><div><strong>{item.stage} · {item.delta >= 0 ? '상승 반영' : '조정 반영'}</strong><p>{item.delta >= 0 ? '+' : ''}{aiKrw(item.delta)} 반영</p><span className={styles.aiActivityValue}>평가금액 {aiKrw(item.amount)}</span></div></div>)}
        </div>
      </section>

      <div className={styles.twoColumnCards}>
        <section className={styles.metricCard}><span>설정 진행기간</span><strong>{aiProcessDurationLabel(processRow.duration_hours)}</strong><small>{status === 'running' ? `남은 시간 ${snapshot.remainingText}` : '진행 완료'}</small></section>
        <section className={styles.metricCard}><span>3분 평균 반영</span><strong className={styles.positive}>+{aiKrw(snapshot.averagePerStep)}</strong><small>현재까지 누적 기준</small></section>
      </div>
      <div className={styles.aiLiveNotice}>{status === 'completed' ? '진행 완료 시점의 마지막 반영 금액으로 결과가 고정되어 표시됩니다.' : '회원별 설정값과 기존 AI PROCESS 계산 로직을 그대로 사용하며 화면은 1초 단위로 갱신되고 실제 수익 반영 기준은 3분 단위입니다.'}</div>
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

export default function V2LiveClientStage2() {
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
  const [aiMemberProcess, setAiMemberProcess] = useState(null);
  const [aiProcessTick, setAiProcessTick] = useState(0);
  const [aiLoadError, setAiLoadError] = useState('');

  useEffect(() => {
    let mounted = true;
    const boot = async () => {
      try { await fetch('/api/avatars/ensure', { method: 'POST', cache: 'no-store' }); } catch {}
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!session?.user) { setLoading(false); return; }
      if (typeof window !== 'undefined') {
        const savedTab = window.sessionStorage.getItem('vip-active-tab');
        if (['event', 'ai', 'private'].includes(savedTab)) setActiveTab(savedTab);
      }
      await loadProfile(session.user);
    };
    void boot();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!user || !profile) return;
    void loadAutoEvents();
    void loadAttendanceStatus();
    if (profile.role !== 'admin') void loadAiMemberProcess();
    const timer = window.setInterval(() => { void loadAutoEvents(); void loadAttendanceStatus(); }, 30000);
    return () => window.clearInterval(timer);
  }, [user?.id, profile?.id, profile?.role]);

  useEffect(() => {
    if (!user?.id || !profile || profile.role === 'admin') return;
    const channel = supabase
      .channel(`v2-ai-process-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ai_process_members', filter: `user_id=eq.${user.id}` }, () => { void loadAiMemberProcess(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, profile?.role]);

  useEffect(() => {
    if (activeTab !== 'ai' || !user?.id || !profile || profile.role === 'admin') return;
    let active = true;
    const refresh = () => { if (active && document.visibilityState === 'visible') void loadAiMemberProcess(); };
    refresh();
    const timer = window.setInterval(refresh, 10000);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [activeTab, user?.id, profile?.role]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClockTick((value) => value + 1);
      setAiProcessTick((value) => value + 1);
    }, 1000);
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
      const response = await fetch('/api/auth/member-entry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nickname, realName }) });
      const result = await response.json();
      if (!response.ok || !result.session) { setNotice(result.error || '입장 정보를 확인해주세요.'); return; }
      const { data, error } = await supabase.auth.setSession(result.session);
      if (error || !data.user) { setNotice('입장 중 오류가 발생했습니다.'); return; }
      const { data: member, error: profileError } = await supabase.from('profiles').select('*').eq('id', data.user.id).single();
      if (profileError || member?.approval_status !== '1') { await supabase.auth.signOut(); setNotice('등록 정보를 확인해주세요.'); return; }
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
    setAiMemberProcess(null);
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
    if (row) setAttendanceStatus({ checked_today: Boolean(row.checked_today), total_count: Number(row.total_count || 0), reward_ready: Boolean(row.reward_ready), next_reward_at: Number(row.next_reward_at || 10) });
  }

  async function loadAiMemberProcess() {
    if (!user?.id || profile?.role === 'admin') return;
    const { data, error } = await supabase.from('ai_process_members').select('*').eq('user_id', user.id).maybeSingle();
    if (error) {
      console.error('V2 AI PROCESS 회원 상태 불러오기 오류:', error);
      setAiLoadError('AI PROCESS 상태를 불러오지 못했습니다.');
      return;
    }
    setAiLoadError('');
    setAiMemberProcess(data || { user_id: user.id, available_count: 0, status: 'ready', investment_amount: 0, duration_hours: 720, min_return: 800, max_return: 1200, available_granted_at: null, started_at: null, completed_at: null });
  }

  async function checkDailyAttendance() {
    if (attendanceWorking || attendanceStatus.checked_today) return;
    setAttendanceWorking(true);
    setNotice('');
    const { data, error } = await supabase.rpc('check_daily_attendance');
    if (error) { setNotice(`출석 참여 실패: ${error.message}`); setAttendanceWorking(false); return; }
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
            <button type="button" className={styles.profileButton} onClick={() => setShowProfile((value) => !value)}><img src={avatarSrc(profile.avatar)} alt="" className={styles.avatarImage} /><span className={styles.profileCopy}><strong>{profile.nickname || 'VIP 회원'}</strong><small>내 정보</small></span></button>
          </div>
        </header>
        {showProfile && <div className={styles.profilePopover}><div className={styles.profilePopoverHead}><img src={avatarSrc(profile.avatar)} alt="" /><div><strong>{profile.nickname || 'VIP 회원'}</strong><span>{profile.role === 'admin' ? '관리자' : 'VIP 회원'}</span></div></div><dl><div><dt>닉네임</dt><dd>{profile.nickname || '-'}</dd></div><div><dt>성함</dt><dd>{profile.real_name || '-'}</dd></div><div><dt>회원등급</dt><dd>{profile.role === 'admin' ? '관리자' : 'VIP 회원'}</dd></div><div><dt>승인상태</dt><dd>{profile.approval_status === '1' ? '승인 완료' : profile.approval_status}</dd></div></dl><button type="button" onClick={handleLogout}>로그아웃</button></div>}
        <nav className={styles.nav} aria-label="주요 메뉴">
          {navItems.map((item) => <button key={item.id} type="button" onClick={() => { setActiveTab(item.id); window.sessionStorage.setItem('vip-active-tab', item.id); }} className={`${styles.navItem} ${activeTab === item.id ? styles.navActive : ''}`}>{item.label}</button>)}
        </nav>
        <div className={styles.content}>
          {activeTab === 'event' && <EventLive profile={profile} autoEvents={autoEvents} attendanceStatus={attendanceStatus} attendanceWorking={attendanceWorking} eventAnswers={eventAnswers} eventWorkingId={eventWorkingId} rouletteSpins={rouletteSpins} eventSuccess={eventSuccess} notice={notice} mode={eventMode} setMode={setEventMode} onAttendance={checkDailyAttendance} onAnswer={setEventAnswer} onJoin={joinAutoEvent} />}
          {activeTab === 'ai' && <AiLive profile={profile} userId={user.id} row={aiMemberProcess} tick={aiProcessTick} error={aiLoadError} />}
          {activeTab === 'private' && <PrivatePreview />}
          <div className={styles.previewNotice}>V2 2차 실제 기능 연결 · 회원 세션/회원정보/실시간 이벤트/출석/AI PROCESS 회원 데이터·수익·그래프·진행상태가 기존 운영 기능에 연결되었습니다. 상품 지급과 관리자 전체 화면은 다음 단계에서 연결합니다.</div>
        </div>
      </section>
    </main>
  );
}
