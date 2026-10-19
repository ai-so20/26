'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';

function eventIsLive(item, isEventLiveNow) {
  return item?.status === 'active' || isEventLiveNow(item);
}

export default function V3EventExperience({
  styles,
  profile,
  autoEvents,
  attendanceStatus,
  attendanceWorking,
  eventAnswers,
  eventWorkingId,
  rouletteSpins,
  eventSuccess,
  notice,
  mode,
  setMode,
  onAttendance,
  onAnswer,
  onJoin,
  isEventLiveNow,
  formatEventTime,
  eventGuide,
  EventTypeIcon,
  EventGame,
  PageHeading,
}) {
  const attendanceTotal = Math.max(0, Number(attendanceStatus?.total_count || 0));
  const remainder = attendanceTotal % 30;
  const attendanceCycle = remainder === 0 && attendanceTotal > 0 ? (attendanceStatus?.checked_today ? 30 : 0) : remainder;
  const sortedEvents = useMemo(() => {
    const order = { active: 0, scheduled: 1, completed: 2 };
    return [...(autoEvents || [])].sort((a, b) => {
      const aLive = eventIsLive(a, isEventLiveNow);
      const bLive = eventIsLive(b, isEventLiveNow);
      if (aLive !== bLive) return aLive ? -1 : 1;
      const statusDelta = (order[a.status] ?? 3) - (order[b.status] ?? 3);
      return statusDelta || Number(a.round_number || 0) - Number(b.round_number || 0);
    });
  }, [autoEvents, isEventLiveNow]);
  const activeEvent = sortedEvents.find((item) => eventIsLive(item, isEventLiveNow)) || null;
  const featuredEvent = activeEvent || sortedEvents.find((item) => item.status === 'scheduled') || sortedEvents[0] || null;
  const participated = autoEvents.filter((item) => Boolean(item.participated)).length;
  const nickname = String(profile?.nickname || '').trim();
  const wins = nickname ? autoEvents.filter((item) => String(item.winner_nickname || '').trim() === nickname).length : 0;
  const [showSurpriseGuide, setShowSurpriseGuide] = useState(false);
  const [surpriseGuide, setSurpriseGuide] = useState({ title: 'AI PROCESS 돌발 체험 이벤트', body: '' });

  useEffect(() => {
    let mounted = true;
    void supabase.from('vip_surprise_guide').select('title,body').eq('id', 1).maybeSingle().then(({ data }) => {
      if (mounted && data) setSurpriseGuide({ title: data.title || 'AI PROCESS 돌발 체험 이벤트', body: data.body || '' });
    });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="v3EventExperience">
      <PageHeading kicker={mode === 'attendance' ? 'DAILY CHECK-IN' : 'LIVE EVENT'} title={mode === 'attendance' ? '출석' : '실시간'} />
      {(notice || eventSuccess) && <div role="status" aria-live="polite" className={`${styles.noticeBox} ${eventSuccess ? styles.noticeSuccess : styles.noticeError}`}>{eventSuccess ? `${eventSuccess.title} · ${eventSuccess.message}` : notice}</div>}

      <section className="v3EventLedger" aria-label="이벤트 현황">
        <div><span>오늘 이벤트</span><strong>{autoEvents.length}<small>회</small></strong></div>
        <div><span>내 참여</span><strong>{participated}<small>회</small></strong></div>
        <div><span>오늘 당첨</span><strong>{wins}<small>회</small></strong></div>
        <div><span>출석</span><strong>{attendanceCycle}<small>/30</small></strong></div>
      </section>

      <div className="v3EventSwitch" role="tablist" aria-label="이벤트 종류">
        <button type="button" className={mode === 'live' ? 'isActive' : ''} onClick={() => setMode('live')}>실시간 이벤트 <small>매 정각 시작</small></button>
        <button type="button" className={mode === 'attendance' ? 'isActive' : ''} onClick={() => setMode('attendance')}>출석 이벤트 <small>매일 1회 참여</small></button>
      </div>

      {mode === 'live' ? <>
        {featuredEvent ? <section className="v3FeaturedEvent">
          <div className="v3FeaturedMeta"><span>{activeEvent ? 'LIVE NOW' : 'NEXT EVENT'}</span><time>{formatEventTime(featuredEvent.starts_at)} — {formatEventTime(featuredEvent.ends_at)}</time></div>
          <div className="v3FeaturedBody">
            <div className="v3FeaturedIndex">{String(featuredEvent.round_number || '—').padStart(2, '0')}</div>
            <div className="v3FeaturedCopy"><span><EventTypeIcon type={featuredEvent.event_type} /> 실시간 이벤트</span><h2>{featuredEvent.title || '이벤트'}</h2><p>{featuredEvent.description || eventGuide(featuredEvent.event_type)}</p></div>
          </div>
          {activeEvent && !featuredEvent.participated ? <div className="v3FeaturedAction"><EventGame item={featuredEvent} answer={eventAnswers[featuredEvent.event_id]} busy={eventWorkingId === featuredEvent.event_id} spinning={Boolean(rouletteSpins[featuredEvent.event_id])} onAnswer={(value) => onAnswer(featuredEvent.event_id, value)} onJoin={(directAnswer) => onJoin(featuredEvent, directAnswer)} /></div> : <div className="v3FeaturedState"><span>참여 상태</span><strong>{featuredEvent.participated ? '참여 완료' : activeEvent ? '참여 가능' : '시작 대기'}</strong></div>}
        </section> : <section className="v3EmptyEvent"><strong>오늘 등록된 이벤트가 없습니다.</strong><p>새 회차가 등록되면 이곳에 표시됩니다.</p></section>}

        <section className="v3EventSchedule">
          <header><span>TODAY</span><strong>오늘 일정</strong></header>
          {sortedEvents.length === 0 ? <div className="v3ScheduleEmpty">표시할 이벤트가 없습니다.</div> : sortedEvents.map((item) => {
            const live = eventIsLive(item, isEventLiveNow);
            const done = item.status === 'completed';
            return <article key={item.event_id} className={`v3ScheduleRow ${live ? 'isLive' : ''}`}>
              <div className="v3ScheduleNo">{String(item.round_number || '—').padStart(2, '0')}</div>
              <div className="v3ScheduleMain"><small>{formatEventTime(item.starts_at)} — {formatEventTime(item.ends_at)}</small><strong>{item.title || '이벤트'}</strong><p>{eventGuide(item.event_type)}</p>{item.winner_nickname && <em>당첨 · {item.winner_nickname}</em>}</div>
              <div className="v3ScheduleState">{item.participated ? '참여완료' : live ? '진행중' : done ? '종료' : '대기'}</div>
              {live && !item.participated && <div className="v3ScheduleGame"><EventGame item={item} answer={eventAnswers[item.event_id]} busy={eventWorkingId === item.event_id} spinning={Boolean(rouletteSpins[item.event_id])} onAnswer={(value) => onAnswer(item.event_id, value)} onJoin={(directAnswer) => onJoin(item, directAnswer)} /></div>}
            </article>;
          })}
        </section>
      </> : <>
        <section className="v3AttendanceSheet">
          <header><div><span>30 DAYS</span><h2>매일 출석 혜택</h2><p>매일 한 번씩 출석하고, 누적 30회 달성 혜택을 받아보세요.</p></div><strong>{attendanceCycle}<small>/30</small></strong></header>
          <div className="v3AttendanceProgress"><span style={{ width: `${Math.min(100, (attendanceCycle / 30) * 100)}%` }} /></div>
          <div className="v3AttendanceGrid">{Array.from({ length: 30 }).map((_, index) => { const done = index < attendanceCycle; return <span key={index} className={done ? 'isDone' : ''}><b>{String(index + 1).padStart(2, '0')}</b>{done && <i>✓</i>}</span>; })}</div>
          <div className="v3AttendanceBottom"><p>보상까지 <strong>{Math.max(0, 30 - attendanceCycle)}회</strong> 남았습니다.</p><button type="button" onClick={onAttendance} disabled={attendanceWorking || attendanceStatus.checked_today}>{attendanceWorking ? '처리 중' : attendanceStatus.checked_today ? '오늘 출석 완료' : '오늘 출석하기'}</button></div>
        </section>
        <section className="v3AttendanceGuide"><span>GUIDE</span><strong>매일 출석 이벤트 안내</strong><p>하루 1회 출석할 수 있으며, 누적 30회 출석 달성 시 3,000원 ~ 500,000원 상당 랜덤 기프티콘 혜택이 제공됩니다. 출석은 매일 자정에 새로 가능하며, 연속 출석이 아니어도 누적 횟수로 인정됩니다. 달성 안내와 지급 상품은 상품지급센터에서 확인할 수 있습니다.</p></section>
      </>}

      <section className="v3SurpriseLine"><div><span>AI</span><strong>AI PROCESS 돌발 체험 이벤트</strong></div><button type="button" onClick={() => setShowSurpriseGuide((value) => !value)}>{showSurpriseGuide ? '접기' : '진행방법'} <span>↗</span></button></section>
      {showSurpriseGuide && <section className="v3SurpriseGuide"><header><strong>{surpriseGuide.title}</strong><button type="button" onClick={() => setShowSurpriseGuide(false)}>닫기</button></header><div>{surpriseGuide.body || '현재 안내 내용을 준비 중입니다.'}</div></section>}
    </div>
  );
}
