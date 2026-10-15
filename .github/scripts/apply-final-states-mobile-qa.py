from pathlib import Path

reward_js = Path('app/v2/reward/RewardLiveClient.js')
reward_css = Path('app/v2/reward/reward-live.module.css')
base_css = Path('app/v2/v2.module.css')
extra_css = Path('app/v2/v2-extra.module.css')
ai_css = Path('app/v2/v2-ai-live.module.css')

# Reward center: distinguish loading / empty / error states.
s = reward_js.read_text()
old = "  const [sending, setSending] = useState(false);\n  const [notice, setNotice] = useState('');"
new = "  const [sending, setSending] = useState(false);\n  const [messageLoading, setMessageLoading] = useState(false);\n  const [notice, setNotice] = useState('');"
if old in s:
    s = s.replace(old, new, 1)

old = "  async function openPrivateChat(userId) {\n    setNotice('');\n    const { data: unreadData } = await supabase.rpc('get_my_private_unread_count');"
new = "  async function openPrivateChat(userId) {\n    setNotice('');\n    setMessageLoading(true);\n    const { data: unreadData } = await supabase.rpc('get_my_private_unread_count');"
if old in s:
    s = s.replace(old, new, 1)

old = "    if (error || !privateChatId) {\n      setNotice('상품 지급 메시지함을 불러오지 못했습니다.');\n      return;\n    }"
new = "    if (error || !privateChatId) {\n      setNotice('상품 지급 메시지함을 불러오지 못했습니다.');\n      setMessageLoading(false);\n      return;\n    }"
if old in s:
    s = s.replace(old, new, 1)

old = "    await supabase.rpc('mark_private_chat_read', { target_chat_id: privateChatId });\n    await loadPrivateMessages(privateChatId, userId);\n  }"
new = "    await supabase.rpc('mark_private_chat_read', { target_chat_id: privateChatId });\n    await loadPrivateMessages(privateChatId, userId);\n    setMessageLoading(false);\n  }"
if old in s:
    s = s.replace(old, new, 1)

old = "  if (loading) {\n    return <main className={styles.canvas}><section className={`${styles.appShell} ${styles.loadingShell}`}><div className={styles.loadingMark}>VIP</div><strong>상품지급센터 정보를 확인하고 있습니다.</strong></section></main>;\n  }"
new = "  if (loading) {\n    return (\n      <main className={styles.canvas}>\n        <section className={`${styles.appShell} ${styles.loadingShell}`}>\n          <div className={styles.loadingBrandRow}><div className={styles.loadingMark}>VIP</div><div><strong>상품지급센터 정보를 확인하고 있습니다.</strong><span>지급 내역과 회원 정보를 불러오는 중입니다.</span></div></div>\n          <div className={styles.loadingNavSkeleton}><i /><i /><i /></div>\n          <div className={styles.loadingContentSkeleton} aria-hidden=\"true\"><i className={styles.loadingLineLg} /><i className={styles.loadingLineSm} /><div className={styles.loadingPanelSkeleton}><i /><i /><i /></div><div className={styles.loadingListSkeleton}><i /><i /><i /></div></div>\n        </section>\n      </main>\n    );\n  }"
if old in s:
    s = s.replace(old, new, 1)

old = "          {notice && <div className={styles.notice}>{notice}</div>}"
new = "          {notice && <div className={`${styles.notice} ${styles.rewardNotice}`} role=\"alert\"><strong>{notice}</strong>{!chatId && profile.role !== 'admin' ? <button type=\"button\" onClick={() => openPrivateChat(user.id)}>다시 시도</button> : null}</div>}"
if old in s:
    s = s.replace(old, new, 1)

old = "                  {messages.length === 0 ? (\n                    <div className={styles.empty}>아직 도착한 지급 안내가 없습니다.</div>\n                  ) : messages.map((item) => {"
new = "                  {messageLoading ? (\n                    <div className={`${styles.empty} ${styles.rewardStatePanel}`} role=\"status\"><span className={styles.rewardStatePulse} /><strong>지급 안내를 확인하고 있습니다.</strong><p>최신 상품 지급 내역을 불러오는 중입니다.</p></div>\n                  ) : messages.length === 0 ? (\n                    <div className={`${styles.empty} ${styles.rewardStatePanel}`}><span className={styles.rewardStateIcon}>✓</span><strong>현재 도착한 지급 안내가 없습니다.</strong><p>이벤트 당첨 또는 출석 보상 지급 시 이곳에서 바로 확인할 수 있습니다.</p></div>\n                  ) : messages.map((item) => {"
if old in s:
    s = s.replace(old, new, 1)

reward_js.write_text(s)

# Shared mobile shell: native app feel and 360/390/430 resilience.
s = base_css.read_text()
marker = '/* FINAL MOBILE QA 360 390 430 */'
if marker not in s:
    s += r'''

/* FINAL MOBILE QA 360 390 430 */
@media (max-width: 520px) {
  .canvas {
    padding: 0;
    background: #F4F5F7;
    overflow-x: clip;
  }
  .appShell {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    min-height: 100vh;
    margin: 0;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }
  .header {
    height: 64px;
    padding: 0 16px;
    gap: 10px;
  }
  .brand { font-size: 17px; }
  .brandEyebrow { font-size: 9px; }
  .iconButton { width: 42px; height: 42px; }
  .nav { padding: 0 8px; }
  .navItem { height: 50px; font-size: 12.5px; }
  .content {
    min-width: 0;
    padding: 20px 16px calc(88px + env(safe-area-inset-bottom));
    overflow-x: clip;
    background: #F4F5F7;
  }
  .pageHeading {
    display: grid;
    grid-template-columns: minmax(0,1fr) auto;
    align-items: start;
    gap: 10px;
    margin-bottom: 20px;
  }
  .pageHeading > div { min-width: 0; }
  .pageHeading h1 { font-size: 24px; overflow-wrap: anywhere; }
  .pageHeading p { font-size: 12px; line-height: 1.65; }
  .statusBadge { max-width: 116px; overflow: hidden; text-overflow: ellipsis; }
  .summaryTop, .cardTopline, .sectionHead { min-width: 0; }
  button, a { -webkit-tap-highlight-color: transparent; }
}
@media (max-width: 390px) {
  .content { padding-left: 14px; padding-right: 14px; }
  .header { padding-left: 14px; padding-right: 14px; }
  .pageHeading h1 { font-size: 23px; }
  .navItem { font-size: 12px; }
}
@media (max-width: 360px) {
  .content { padding-left: 12px; padding-right: 12px; }
  .header { padding-left: 12px; padding-right: 12px; }
  .statusBadge { padding-left: 7px; padding-right: 7px; font-size: 9.5px; }
}
'''
base_css.write_text(s)

# Generic feedback/empty states.
s = extra_css.read_text()
marker = '/* FINAL FEEDBACK STATES 2026 */'
if marker not in s:
    s += r'''

/* FINAL FEEDBACK STATES 2026 */
.noticeBox,
.noticeError,
.noticeSuccess {
  border-radius: 8px;
}
.emptyRow {
  min-height: 118px;
  display: grid;
  place-items: center;
  padding: 22px 16px;
  color: #626B78;
  background: #FAFAFB;
  font-size: 12px;
  line-height: 1.65;
  text-align: center;
}
.primaryButtonWide:disabled,
.primaryButton:disabled,
.secondaryButton:disabled {
  border-color: #D7DBE1 !important;
  background: #E5E7EB !important;
  color: #626B78 !important;
  box-shadow: none !important;
  cursor: not-allowed;
}
@media (max-width: 520px) {
  .simpleList,
  .attendanceCardLarge,
  .balanceCard,
  .infoCard,
  .metricCard,
  .rewardSummary,
  .inboxList,
  .messagePanel { max-width: 100%; min-width: 0; box-sizing: border-box; }
  .listRow { min-width: 0; }
  .listRow > div { min-width: 0; }
}
'''
extra_css.write_text(s)

# Reward-specific loading/empty/error hierarchy and narrow-width safeguards.
s = reward_css.read_text()
marker = '/* REWARD FINAL STATES + MOBILE QA */'
if marker not in s:
    s += r'''

/* REWARD FINAL STATES + MOBILE QA */
.rewardNotice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-color: #E3CCD2;
  border-radius: 8px;
  background: #FFF7F8;
  color: #9D3340;
}
.rewardNotice strong { min-width: 0; font-size: 11px; line-height: 1.5; }
.rewardNotice button {
  flex: 0 0 auto;
  min-height: 36px;
  padding: 0 11px;
  border: 1px solid #D7CDE8;
  border-radius: 6px;
  background: #fff;
  color: #4F3486;
  font: inherit;
  font-size: 10px;
  font-weight: 850;
  cursor: pointer;
}
.rewardStatePanel {
  min-height: 150px;
  align-content: center;
  gap: 5px;
  padding: 24px 18px;
  border: 1px dashed #D7DCE3;
  border-radius: 8px;
  background: rgba(255,255,255,.72);
}
.rewardStatePanel strong { color: #303746; font-size: 12px; }
.rewardStatePanel p { max-width: 300px; margin: 0; color: #626B78; font-size: 10.5px; line-height: 1.65; }
.rewardStateIcon,
.rewardStatePulse {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  margin: 0 auto 5px;
  border-radius: 50%;
  background: #F3EFFA;
  color: #6342A6;
  font-size: 12px;
  font-weight: 900;
}
.rewardStatePulse { position: relative; font-size: 0; }
.rewardStatePulse::after {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6342A6;
  animation: rewardPulse 1.1s ease-in-out infinite alternate;
}
@keyframes rewardPulse { from { opacity: .35; transform: scale(.72); } to { opacity: 1; transform: scale(1); } }
@media (prefers-reduced-motion: reduce) { .rewardStatePulse::after { animation: none; } }
@media (max-width: 430px) {
  .rewardEmbeddedShell .summary strong { font-size: 15px; }
  .rewardEmbeddedShell .deliveryHead { padding: 13px 12px; }
  .rewardEmbeddedShell .messageList { min-height: 340px; height: 52vh; }
  .rewardEmbeddedShell .bubbleWrap { max-width: 92%; }
  .rewardEmbeddedShell .rewardQuickLinks { grid-template-columns: minmax(0,1fr) minmax(0,1fr); }
  .rewardEmbeddedShell .rewardQuickLinks button { padding: 12px 10px; }
  .rewardEmbeddedShell .rewardQuickLinks button strong { font-size: 11px; }
  .rewardNotice { align-items: flex-start; }
}
@media (max-width: 360px) {
  .rewardEmbeddedShell .summary { grid-template-columns: 1fr 1fr; }
  .rewardEmbeddedShell .summary > div:nth-child(3) { grid-column: 1 / -1; border-top: 1px solid #E1E4E9; padding-top: 10px; }
  .rewardEmbeddedShell .rewardQuickLinks { grid-template-columns: 1fr; }
  .rewardEmbeddedShell .pageHeading .statusBadge { max-width: 92px; }
}
'''
reward_css.write_text(s)

# AI mobile safeguards: preserve hierarchy rather than shrink text until unreadable.
s = ai_css.read_text()
marker = '/* AI FINAL MOBILE QA 360 390 430 */'
if marker not in s:
    s += r'''

/* AI FINAL MOBILE QA 360 390 430 */
@media (max-width: 430px) {
  .aiPart1Hero,
  .aiPart2Hero,
  .aiChartCard,
  .aiPart3History,
  .aiMarketScanner,
  .aiStageBoard,
  .aiIdleSection { max-width: 100%; min-width: 0; box-sizing: border-box; }
  .aiPart2Primary > div:first-child strong { font-size: clamp(25px, 8vw, 31px); white-space: normal; overflow-wrap: anywhere; }
  .aiPart3Current strong { font-size: 14px; }
  .aiPart3HistoryRow { grid-template-columns: 48px 12px minmax(0,1fr); }
  .aiPart3HistoryValue { grid-column: 3; justify-self: stretch; text-align: left; padding-top: 7px; border-top: 1px solid #EEF1F5; }
  .aiMarketHistoryRow { min-width: 0; }
}
@media (max-width: 360px) {
  .aiPart1Headline strong { font-size: 36px; }
  .aiPart1Facts { grid-template-columns: 1fr; }
  .aiPart1FactWide { grid-column: auto; }
  .aiPart2Bento { grid-template-columns: 1fr; grid-template-areas: 'investment' 'profit' 'progress' 'remain' 'duration'; }
  .aiStageItem { grid-template-columns: 30px minmax(0,1fr) auto; gap: 7px; }
}
'''
ai_css.write_text(s)

print('final feedback states and mobile QA applied')
