from pathlib import Path

live_css = Path('app/v2/v2-live.module.css')
reward_js = Path('app/v2/reward/RewardLiveClient.js')
reward_css = Path('app/v2/reward/reward-live.module.css')

# 1) Event hierarchy: only the current/next event should feel like the primary elevated surface.
s = live_css.read_text()
marker = '/* EVENT FINAL HIERARCHY POLISH 2026 */'
if marker not in s:
    s += r'''

/* EVENT FINAL HIERARCHY POLISH 2026 */
.eventPage .summaryCard {
  border-color: #E1E4E9;
  background: #FFFFFF;
  box-shadow: none;
}
.eventPage .summaryCard::before {
  width: 2px;
  opacity: .58;
}
.eventPage .primaryCard {
  border-color: #D7C2B3;
  box-shadow: 0 8px 22px rgba(62,40,24,.105);
}
.eventPage .primaryCard::after {
  content: '';
  position: absolute;
  left: 4px;
  right: 0;
  top: 0;
  height: 1px;
  background: rgba(255,255,255,.92);
  pointer-events: none;
}
.eventPage .statsGrid,
.eventPage .eventLiveRow,
.eventPage .attendanceThirtyGrid {
  font-variant-numeric: tabular-nums;
}
.eventPage button:focus-visible,
.eventPage input:focus-visible {
  outline: 2px solid #2155CD;
  outline-offset: 2px;
}
@media (max-width: 520px) {
  .eventPage .summaryCard { box-shadow: none; }
  .eventPage .primaryCard { box-shadow: 0 6px 18px rgba(62,40,24,.10); }
}
'''
    live_css.write_text(s)

# 2) Reduce generic English micro-labels in the reward center while preserving product names/brand wording.
s = reward_js.read_text()
replacements = {
    '<span className={styles.kicker}>REWARD CENTER</span>': '<span className={styles.kicker}>상품 지급</span>',
    '<div><span>VIP REWARD CENTER</span><strong>지급 및 당첨 안내</strong></div>': '<div><span>지급 안내</span><strong>지급 및 당첨 안내</strong></div>',
    '<span className={styles.liveBadge}>● LIVE</span>': '<span className={styles.liveBadge}>● 실시간</span>',
    '<span>VIP EVENT BENEFITS</span>': '<span>VIP 혜택 안내</span>',
    '<button type="button" onClick={() => goTab(\'event\')}><span>EVENT</span><strong>시간별 이벤트</strong></button>': '<button type="button" onClick={() => goTab(\'event\')}><span>시간별</span><strong>시간별 이벤트</strong></button>',
    '<button type="button" onClick={() => goTab(\'event\')}><span>CHECK-IN</span><strong>출석 이벤트</strong></button>': '<button type="button" onClick={() => goTab(\'event\')}><span>출석</span><strong>출석 이벤트</strong></button>',
}
for old, new in replacements.items():
    if old in s:
        s = s.replace(old, new)
reward_js.write_text(s)

# 3) Reward center: preserve violet identity but sharpen interaction and numeric rhythm.
s = reward_css.read_text()
marker = '/* REWARD FINAL VISUAL POLISH 2026 */'
if marker not in s:
    s += r'''

/* REWARD FINAL VISUAL POLISH 2026 */
.rewardEmbeddedShell .summary,
.rewardEmbeddedShell .giftProduct,
.rewardEmbeddedShell .meta {
  font-variant-numeric: tabular-nums;
}
.rewardEmbeddedShell .summary::after {
  content: '';
  position: absolute;
  left: 4px;
  right: 0;
  top: 0;
  height: 1px;
  background: rgba(255,255,255,.95);
  pointer-events: none;
}
.rewardEmbeddedShell .rewardQuickLinks button {
  transition: border-color .16s ease, background-color .16s ease, transform .16s ease;
}
.rewardEmbeddedShell .rewardQuickLinks button:hover {
  border-color: var(--reward-border);
  background: #FAF8FD;
}
.rewardEmbeddedShell .rewardQuickLinks button:active {
  transform: translateY(1px);
  background: var(--reward-soft);
}
.rewardEmbeddedShell button:focus-visible,
.rewardEmbeddedShell a:focus-visible,
.rewardEmbeddedShell textarea:focus-visible {
  outline: 2px solid #2155CD;
  outline-offset: 2px;
}
.rewardEmbeddedShell .liveBadge {
  border: 1px solid var(--reward-border);
  border-radius: 999px;
  padding: 5px 7px;
  white-space: nowrap;
}
@media (prefers-reduced-motion: reduce) {
  .rewardEmbeddedShell .rewardQuickLinks button { transition: none; }
}
'''
    reward_css.write_text(s)

print('final visual hierarchy polish applied')
