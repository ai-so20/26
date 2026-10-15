from pathlib import Path

# Wrap event page so role color/depth rules stay scoped.
p = Path('app/v2/V2LiveClientStage2.js')
s = p.read_text()
old = "{activeTab === 'event' && <EventLive profile={profile} autoEvents={autoEvents} attendanceStatus={attendanceStatus} attendanceWorking={attendanceWorking} eventAnswers={eventAnswers} eventWorkingId={eventWorkingId} rouletteSpins={rouletteSpins} eventSuccess={eventSuccess} notice={notice} mode={eventMode} setMode={setEventMode} onAttendance={checkDailyAttendance} onAnswer={setEventAnswer} onJoin={joinAutoEvent} />}"
new = "{activeTab === 'event' && <div className={styles.eventPage}><EventLive profile={profile} autoEvents={autoEvents} attendanceStatus={attendanceStatus} attendanceWorking={attendanceWorking} eventAnswers={eventAnswers} eventWorkingId={eventWorkingId} rouletteSpins={rouletteSpins} eventSuccess={eventSuccess} notice={notice} mode={eventMode} setMode={setEventMode} onAttendance={checkDailyAttendance} onAnswer={setEventAnswer} onJoin={joinAutoEvent} /></div>}"
if old in s:
    s = s.replace(old, new, 1)
elif 'className={styles.eventPage}' not in s:
    raise SystemExit('event render anchor not found')
p.write_text(s)

# Event page visual system: neutral canvas + amber role color + selective depth.
p = Path('app/v2/v2-live.module.css')
s = p.read_text()
marker = '/* EVENT DEPTH SYSTEM 2026 */'
block = r'''

/* EVENT DEPTH SYSTEM 2026 */
.eventPage {
  --event-accent: #A44912;
  --event-accent-press: #843A0E;
  --event-soft: #FFF3E8;
  --surface: #FFFFFF;
  --surface-inset: #ECEEF2;
  --border: #CDD2DA;
  --divider: #E1E4E9;
  --text: #171B24;
  --text-2: #454C59;
  --text-3: #626B78;
}

.eventPage .pageHeading { margin-bottom: 22px; }
.eventPage .pageHeading h1 { color: var(--text); }
.eventPage .pageHeading .kicker { color: var(--event-accent); }
.eventPage .pageHeading .statusBadge { border-color: #E7D4C6; background: #FFF9F4; color: #744125; }
.eventPage .pageHeading .statusBadge i { background: var(--event-accent); }

/* L2: one primary summary surface */
.eventPage .summaryCard {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: 0 4px 12px rgba(23,27,36,.08);
}
.eventPage .summaryCard::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--event-accent);
}
.eventPage .summaryTop { padding-left: 18px; }
.eventPage .summaryTop > div > span { color: var(--event-accent); font-weight: 850; }
.eventPage .summaryTop > div > strong { color: var(--text); }
.eventPage .statsGrid { background: #fff; }
.eventPage .stat { min-width: 0; }
.eventPage .stat > span { color: var(--text-3); }
.eventPage .stat strong { color: var(--text); font-variant-numeric: tabular-nums; }
.eventPage .statEmphasis strong { color: var(--event-accent) !important; }

/* Selection: flat control, not another floating card */
.eventPage .section { margin-top: 26px; }
.eventPage .sectionHead span { color: var(--text-3); }
.eventPage .sectionHead strong { color: var(--text); }
.eventPage .segmentGrid {
  gap: 8px;
  padding: 4px;
  border: 1px solid var(--divider);
  border-radius: 10px;
  background: #F6F7F9;
}
.eventPage .segment {
  min-height: 48px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  box-shadow: none;
}
.eventPage .segmentActive {
  background: #fff;
  color: var(--text);
  box-shadow: 0 2px 7px rgba(23,27,36,.08);
}
.eventPage .segmentActive .segmentMark { background: var(--event-accent); }

/* L2 feature card: current/next event gets the strongest identity */
.eventPage .primaryCard {
  position: relative;
  margin-top: 18px;
  overflow: hidden;
  border: 1px solid #D8C9BE;
  border-radius: 12px;
  background: linear-gradient(180deg, #FFFFFF 0%, #FFFBF7 100%);
  box-shadow: 0 7px 20px rgba(62,40,24,.09);
}
.eventPage .primaryCard::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--event-accent);
}
.eventPage .cardTopline,
.eventPage .cardBody,
.eventPage .cardFooter { padding-left: 18px; }
.eventPage .cardKicker { color: var(--event-accent); }
.eventPage .cardBody h2 { color: var(--text); letter-spacing: -.035em; }
.eventPage .cardBody p { color: var(--text-2); }
.eventPage .eventFeaturedLive,
.eventPage .eventFeaturedWaiting { color: var(--event-accent); }
.eventPage .eventFeaturedJoined { color: #16734B; }

/* Event controls inherit the page role color; status colors remain semantic. */
.eventPage .primaryButtonWide,
.eventPage .primaryButton { background: var(--event-accent); border-color: var(--event-accent); }
.eventPage .primaryButtonWide:active,
.eventPage .primaryButton:active { background: var(--event-accent-press); }
.eventPage .gameArea { border-color: #E6D8CE; border-radius: 8px; background: #FFF9F4; }
.eventPage .gameChoiceSelected,
.eventPage .quizChoice.gameChoiceSelected {
  border-color: var(--event-accent) !important;
  background: var(--event-soft) !important;
  color: var(--event-accent-press) !important;
  box-shadow: inset 0 0 0 1px rgba(164,73,18,.08);
}
.eventPage .gameInput:focus { border-color: var(--event-accent); box-shadow: 0 0 0 3px rgba(164,73,18,.10); }

/* L1 schedule: one list surface, rows separated by dividers */
.eventPage .simpleList {
  margin-top: 22px;
  overflow: hidden;
  border: 1px solid var(--divider);
  border-radius: 8px;
  background: #fff;
  box-shadow: none;
}
.eventPage .listHeader { background: #FAFAFB; }
.eventPage .listHeader span { color: var(--text-3); }
.eventPage .listHeader strong { color: var(--text); }
.eventPage .eventLiveRow { border-top-color: var(--divider); background: #fff; }
.eventPage .eventLiveRowActive {
  position: relative;
  background: #FFFAF6;
}
.eventPage .eventLiveRowActive::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--event-accent);
}
.eventPage .eventRowTitle strong { color: var(--text); }
.eventPage .eventRowTitle small,
.eventPage .eventGuide { color: var(--text-3); }
.eventPage .rowStateLive { color: #BC303A; background: #FFF0F1; }
.eventPage .rowStateJoined { color: #16734B; background: #EAF6EF; }
.eventPage .rowStateWaiting { color: #8A5200; background: #FFF4DA; }
.eventPage .rowStateClosed { color: #626B78; background: #E5E7EB; }

/* Event icon language shifts from blue to restrained warm accent. */
.eventPage .eventMotionIcon,
.eventPage .eventMotionIcon[data-event-type] {
  border-color: #E7D7CB;
  background: #FFF7F0;
  color: var(--event-accent);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.9), 0 4px 10px rgba(82,49,27,.06);
}

/* Attendance keeps the same page identity but stays calmer than the feature card. */
.eventPage .attendanceCardLarge {
  margin-top: 18px;
  border: 1px solid var(--divider);
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 4px 12px rgba(23,27,36,.06);
}
.eventPage .attendanceCount,
.eventPage .attendanceRemaining strong { color: var(--event-accent); }
.eventPage .progressTrack { background: #EEE7E1; }
.eventPage .progressTrack > span { background: var(--event-accent); }
.eventPage .attendanceThirtyDone {
  border-color: #D5A47E;
  background: var(--event-soft);
  color: var(--event-accent);
}
.eventPage .attendanceThirtyStamp {
  border-color: var(--event-accent);
  color: var(--event-accent);
}

@media (max-width: 520px) {
  .eventPage .pageHeading { margin-bottom: 18px; }
  .eventPage .summaryCard { border-radius: 10px; }
  .eventPage .summaryTop { padding-left: 16px; }
  .eventPage .primaryCard { border-radius: 10px; }
  .eventPage .cardTopline,
  .eventPage .cardBody,
  .eventPage .cardFooter { padding-left: 16px; }
  .eventPage .simpleList { border-radius: 8px; }
  .eventPage .eventLiveRow { padding-left: 13px; padding-right: 13px; }
}
'''
if marker not in s:
    s += block
p.write_text(s)
