from pathlib import Path

js = Path('app/v2/V2LiveClientStage2.js')
base = Path('app/v2/v2.module.css')
extra = Path('app/v2/v2-extra.module.css')
ai = Path('app/v2/v2-ai-live.module.css')

text = js.read_text()
old = "const [tradingOpen, setTradingOpen] = useState(true);"
if old not in text:
    raise SystemExit('tradingOpen guard not found')
text = text.replace(old, "const [tradingOpen, setTradingOpen] = useState(false);", 1)
js.write_text(text)

base_marker = '/* FINAL DE-AI DESIGN SYSTEM */'
base_css = r'''

/* FINAL DE-AI DESIGN SYSTEM */
.canvas {
  background: #f3f5f7;
  padding: 18px 10px;
}
.appShell {
  border-radius: 8px;
  border-color: #d9dee5;
  box-shadow: 0 8px 28px rgba(15, 31, 51, .055);
}
.header {
  height: 64px;
  padding: 0 20px;
  border-bottom-color: #dfe4ea;
}
.brandEyebrow, .kicker, .cardKicker {
  letter-spacing: .11em;
  font-weight: 750;
}
.nav {
  display: flex;
  gap: 26px;
  padding: 0 20px;
  border-bottom-color: #dfe4ea;
}
.navItem {
  width: auto;
  min-width: 0;
  height: 48px;
  padding: 0;
  font-size: 12px;
  font-weight: 720;
}
.navActive::after {
  left: 0;
  right: 0;
  height: 2px;
  border-radius: 0;
}
.content {
  padding: 22px 20px 34px;
  background: #fbfcfd;
}
.pageHeading {
  align-items: end;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #dfe4ea;
}
.pageHeading h1 {
  margin: 2px 0 0;
  font-size: 23px;
}
.pageHeading p { margin-top: 5px; }
.statusBadge, .liveBadge {
  border-radius: 3px;
  padding: 5px 7px;
  background: transparent;
  border-color: #d7dde5;
  font-size: 8px;
}
.summaryCard,
.primaryCard,
.attendanceCard,
.listCard {
  border-radius: 5px;
  box-shadow: none;
}
.summaryCard {
  padding: 0;
  border-left: 0;
  border-right: 0;
  border-radius: 0;
  background: transparent;
}
.summaryTop { padding: 11px 0; }
.statsGrid { padding: 13px 0; }
.section { margin-top: 18px; }
.segmentGrid {
  gap: 0;
  border: 1px solid #dfe4ea;
  background: #fff;
}
.segment {
  min-height: 50px;
  border: 0;
  border-right: 1px solid #e3e7ec;
  border-radius: 0;
  background: transparent;
  padding: 9px 12px;
}
.segment:last-child { border-right: 0; }
.segmentActive {
  border-color: transparent;
  background: #f2f6fc;
  box-shadow: inset 0 -2px 0 #2f6fed;
}
.segmentMark {
  width: 6px;
  height: 6px;
  flex-basis: 6px;
  border-radius: 50%;
  border-width: 1px;
}
.primaryCard {
  border-radius: 5px;
  box-shadow: none;
}
.primaryButton, .secondaryButton, .primaryButtonWide {
  border-radius: 4px !important;
  box-shadow: none !important;
}
.listCard {
  min-height: 58px;
  padding: 10px 2px;
  border-width: 1px 0 0;
  border-radius: 0;
  background: transparent;
}
.listIcon {
  width: 30px;
  height: 30px;
  flex-basis: 30px;
  border-radius: 3px;
}
.iconButton, .profileButton { border-radius: 5px; }
.avatar { border-radius: 4px; }
.progressTrack, .progressTrack span { border-radius: 2px; }
.previewNotice { border-radius: 4px; }
@media (max-width: 420px) {
  .canvas { padding: 0; }
  .appShell { border-radius: 0; }
  .content { padding: 19px 14px 30px; }
  .header { padding: 0 14px; }
  .nav { padding: 0 14px; gap: 22px; }
}
'''
base_text = base.read_text()
if base_marker not in base_text:
    base.write_text(base_text + base_css)

extra_marker = '/* FINAL DE-AI CONTENT SURFACES */'
extra_css = r'''

/* FINAL DE-AI CONTENT SURFACES */
.simpleList,
.attendanceCardLarge,
.balanceCard,
.infoCard,
.metricCard,
.rewardSummary,
.inboxList,
.messagePanel {
  border-radius: 5px;
  box-shadow: none;
}
.simpleList { border-left: 0; border-right: 0; border-radius: 0; }
.listHeader { padding-left: 2px; padding-right: 2px; }
.eventLiveRow, .listRow { background: transparent; }
.rowState, .processBadge, .newBadge {
  border-radius: 3px;
}
.attendanceCardLarge {
  padding: 17px 0;
  border-width: 1px 0;
  border-radius: 0;
  background: transparent;
}
.infoCard {
  padding: 13px 0;
  border-width: 1px 0 0;
  border-radius: 0;
  background: transparent;
}
.infoIcon { border-radius: 3px; }
.attendanceDots span { border-radius: 3px; }
.twoColumnCards {
  gap: 0;
  border: 1px solid #dfe4ea;
  background: #fff;
}
.metricCard {
  border: 0;
  border-right: 1px solid #e3e7ec;
  border-radius: 0;
}
.metricCard:last-child { border-right: 0; }
.rewardSummary { border-radius: 4px; }
.inboxList, .messagePanel { border-radius: 4px; }
.inboxRowActive { background: #f1f5fa; }
.rewardIcon, .giftPlaceholder, .messageBubble { border-radius: 4px; }
.processStep { border-radius: 4px; }
.processStep > span { border-radius: 3px; }
'''
extra_text = extra.read_text()
if extra_marker not in extra_text:
    extra.write_text(extra_text + extra_css)

ai_marker = '/* FINAL DE-AI AI PROCESS */'
ai_css = r'''

/* FINAL DE-AI AI PROCESS */
.aiPart1Hero,
.aiPart2Hero,
.aiMarketScanner,
.aiStageBoard,
.aiChartCard,
.aiPart3History,
.tradingCard {
  border-radius: 4px !important;
}
.aiPart1Hero,
.aiPart2Hero {
  box-shadow: 0 10px 24px rgba(13, 27, 49, .10);
}
.aiProcessBrief {
  border-radius: 0 !important;
  border-left: 0 !important;
  border-right: 0 !important;
  background: transparent !important;
  padding-left: 2px !important;
  padding-right: 2px !important;
}
.aiStageBoard {
  border-left: 0 !important;
  border-right: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
}
.aiStageItem { border-radius: 0 !important; }
.aiStageItemActive { box-shadow: inset 3px 0 0 #2f6fed !important; }
.aiMarketScanner {
  border: 1px solid #142742 !important;
  background: #0b1729 !important;
  box-shadow: 0 12px 28px rgba(10, 24, 42, .11) !important;
}
.aiMarketScannerHead { border-radius: 0 !important; }
.aiMarketPulse { border-radius: 2px !important; }
.aiMarketTelemetry > div { border-radius: 0 !important; }
.aiMarketLiveRow,
.aiMarketHistoryRow { border-radius: 0 !important; }
.aiMarketCoinMark,
.aiMarketStockMark { border-radius: 3px !important; }
.aiTradingPager button { border-radius: 2px !important; }
.aiChartCard,
.aiPart3History {
  box-shadow: none !important;
}
.aiFoldMeta b, .aiFoldMeta i { border-radius: 2px !important; }
'''
ai_text = ai.read_text()
if ai_marker not in ai_text:
    ai.write_text(ai_text + ai_css)
