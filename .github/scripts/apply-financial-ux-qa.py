from pathlib import Path

# Preserve the already-applied first financial QA pass, then apply phase 2 idempotently.
js_path = Path('app/v2/V2LiveClientStage2.js')
extra_path = Path('app/v2/v2-extra.module.css')
base_path = Path('app/v2/v2.module.css')
live_path = Path('app/v2/v2-live.module.css')

js = js_path.read_text()
old_row = '<span className={styles.rowState}>{item.participated ? \'참여완료\' : live ? \'진행중\' : done ? \'종료\' : \'대기\'}</span>'
new_row = '<span className={`${styles.rowState} ${item.participated ? styles.rowStateJoined : live ? styles.rowStateLive : done ? styles.rowStateClosed : styles.rowStateWaiting}`}>{item.participated ? \'참여완료\' : live ? \'진행중\' : done ? \'종료\' : \'대기\'}</span>'
if old_row in js:
    js = js.replace(old_row, new_row)

old_featured = '<div className={styles.cardFooter}><div className={styles.timeBlock}><span>참여 상태</span><strong>{featuredEvent.participated ? \'참여 완료\' : activeEvent ? \'참여 가능\' : \'시작 대기\'}</strong></div></div>'
new_featured = '<div className={styles.cardFooter}><div className={styles.timeBlock}><span>참여 상태</span><strong className={`${styles.eventFeaturedState} ${featuredEvent.participated ? styles.eventFeaturedJoined : activeEvent ? styles.eventFeaturedLive : styles.eventFeaturedWaiting}`}>{featuredEvent.participated ? \'참여 완료\' : activeEvent ? \'참여 가능\' : \'시작 대기\'}</strong></div></div>'
if old_featured in js:
    js = js.replace(old_featured, new_featured)

js_path.write_text(js.rstrip() + '\n')

phase2_extra = r'''

/* FINANCIAL UX QA PHASE 2 - semantic event status */
.rowState {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 0 2px;
  border: 0;
  border-radius: 0;
  background: transparent;
  font-size: 10.5px;
  font-weight: 850;
  letter-spacing: -.01em;
}
.rowState::before {
  content: '';
  width: 6px;
  height: 6px;
  flex: 0 0 6px;
  border-radius: 50%;
  background: currentColor;
  opacity: .9;
}
.rowStateLive { color: #d94343; }
.rowStateJoined { color: #16805d; }
.rowStateWaiting { color: #9a6700; }
.rowStateClosed { color: #7a8594; }

.eventFeaturedState {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 850;
}
.eventFeaturedState::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.eventFeaturedLive { color: #2366d1; }
.eventFeaturedJoined { color: #16805d; }
.eventFeaturedWaiting { color: #9a6700; }

@media (max-width: 520px) {
  .rowState { font-size: 11.5px !important; min-height: 32px; }
  .eventFeaturedState { font-size: 13px; }
}
'''

phase2_base = r'''

/* FINANCIAL UX QA PHASE 2 - interaction feedback */
.canvas button:focus-visible {
  outline: 2px solid #2f6fed;
  outline-offset: 2px;
}
.primaryButton:not(:disabled):active,
.secondaryButton:not(:disabled):active,
.textButton:not(:disabled):active,
.chevronButton:not(:disabled):active,
.segment:not(:disabled):active,
.navItem:not(:disabled):active {
  opacity: .72;
}
.primaryButton:disabled,
.secondaryButton:disabled,
.textButton:disabled,
.chevronButton:disabled,
.segment:disabled {
  cursor: default;
  opacity: .5;
}
'''

phase2_live = r'''

/* FINANCIAL UX QA PHASE 2 - event hierarchy */
.eventLiveRowActive {
  position: relative;
  background: #f8fbff;
}
.eventLiveRowActive::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #2f6fed;
}
@media (max-width: 520px) {
  .eventRowTitle small { font-size: 10.5px; color: #69778a; }
  .eventRowTitle strong { font-size: 13px; }
  .eventGuide { font-size: 11.5px; line-height: 1.65; color: #5f6d80; }
  .winnerLine { font-size: 11px; }
}
'''

for path, marker, patch in [
    (extra_path, '/* FINANCIAL UX QA PHASE 2 - semantic event status */', phase2_extra),
    (base_path, '/* FINANCIAL UX QA PHASE 2 - interaction feedback */', phase2_base),
    (live_path, '/* FINANCIAL UX QA PHASE 2 - event hierarchy */', phase2_live),
]:
    text = path.read_text()
    if marker in text:
        text = text.split(marker)[0].rstrip() + '\n'
    path.write_text(text.rstrip() + patch.rstrip() + '\n')
