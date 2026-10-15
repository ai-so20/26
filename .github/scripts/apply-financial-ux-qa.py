from pathlib import Path

patches = {
    Path('app/v2/v2.module.css'): r'''

/* FINANCIAL UX QA PASS */
:root {
  --ux-text-strong: #172033;
  --ux-text-body: #4f5d70;
  --ux-text-muted: #647287;
  --ux-line: #dce2e9;
  --ux-surface: #ffffff;
  --ux-blue: #2f6fed;
}

.pageHeading p,
.cardBody p,
.attendanceCard p,
.listCopy p,
.previewNotice,
.muted,
.summaryTop span,
.sectionHead span,
.timeBlock span,
.stat span,
.stat small,
.segmentCopy small {
  color: var(--ux-text-muted);
}

button.textButton,
button.chevronButton,
.primaryButton,
.secondaryButton,
.iconButton,
.profileButton,
.logoutButton,
.segment {
  min-height: 44px;
}

button.textButton,
button.chevronButton {
  min-width: 44px;
  padding-left: 8px;
  padding-right: 8px;
}

.primaryButton,
.secondaryButton {
  font-size: 12.5px;
}

@media (max-width: 520px) {
  .canvas { background: #fff; }
  .appShell { min-height: 100dvh; }
  .header {
    height: 58px;
    padding: 0 14px;
  }
  .brand { font-size: 17px; }
  .brandEyebrow { font-size: 10.5px; color: #5f6d80; }
  .content {
    padding: 18px 14px calc(92px + env(safe-area-inset-bottom));
  }
  .pageHeading {
    margin-bottom: 14px;
    padding-bottom: 11px;
  }
  .pageHeading h1 { font-size: 24px; }
  .pageHeading p {
    font-size: 12.5px;
    line-height: 1.65;
    color: #536176;
  }

  /* mobile-first financial navigation: primary destinations stay within thumb reach */
  .nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 90;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0;
    width: 100%;
    min-height: calc(64px + env(safe-area-inset-bottom));
    padding: 0 8px env(safe-area-inset-bottom);
    border-top: 1px solid #d9e0e8;
    border-bottom: 0;
    background: rgba(255,255,255,.98);
    box-shadow: 0 -8px 24px rgba(15,31,51,.08);
    backdrop-filter: blur(12px);
  }
  .navItem {
    width: 100%;
    height: 64px;
    min-height: 64px;
    padding: 0 4px;
    font-size: 13px;
    font-weight: 760;
    color: #667386;
  }
  .navActive {
    color: #17325f;
    background: #f5f8fd;
  }
  .navActive::after {
    left: 28%;
    right: 28%;
    top: 0;
    bottom: auto;
    height: 3px;
    background: var(--ux-blue);
  }

  /* first-screen metrics stay readable without forcing a 2x2 dashboard card stack */
  .statsGrid {
    grid-template-columns: repeat(4, minmax(0,1fr));
    gap: 0;
    padding-top: 12px;
  }
  .stat {
    padding: 0 7px;
    border-right: 1px solid #e3e7ec !important;
  }
  .stat:first-child { padding-left: 0; }
  .stat:last-child { padding-right: 0; border-right: 0 !important; }
  .stat:nth-child(3) { padding-left: 7px; }
  .stat span,
  .stat small {
    font-size: 10.5px;
    line-height: 1.35;
    color: #667386;
  }
  .stat strong {
    margin-top: 6px;
    font-size: 18px;
    line-height: 1.05;
  }

  .summaryTop strong,
  .sectionHead strong { font-size: 14.5px; }
  .summaryTop span,
  .sectionHead span,
  .timeBlock span,
  .segmentCopy small,
  .muted,
  .statusBadge,
  .liveBadge,
  .textButton,
  .chevronButton {
    font-size: 11px;
    color: #5f6d80;
  }
  .segmentCopy strong,
  .listCopy strong,
  .timeBlock strong { font-size: 13px; }
  .cardBody p,
  .attendanceCard p,
  .listCopy p,
  .previewNotice {
    font-size: 12.5px;
    line-height: 1.65;
    color: #536176;
  }

  .segment { min-height: 52px; }
  .primaryButton,
  .secondaryButton { min-height: 46px; }
}

@media (max-width: 350px) {
  .statsGrid { grid-template-columns: repeat(2, 1fr); gap: 12px 0; }
  .stat:nth-child(2) { border-right: 0 !important; }
  .stat:nth-child(3) { padding-left: 0; }
}
''',
    Path('app/v2/v2-extra.module.css'): r'''

/* FINANCIAL UX QA PASS */
.infoCard p,
.attendanceCardLarge p,
.metricCard small,
.inboxCopy small,
.messageBubble > p,
.giftPlaceholder small,
.activityRow p,
.activityTime,
.balanceTop span,
.balanceMeta span,
.metricCard span,
.rewardSummary span,
.messageHeader span {
  color: #5f6d80;
}

@media (max-width: 520px) {
  .infoCard strong,
  .listHeader strong,
  .messageHeader strong,
  .messageBubble > strong { font-size: 13px; }
  .infoCard p,
  .attendanceCardLarge p,
  .messageBubble > p,
  .activityRow p,
  .giftPlaceholder small {
    font-size: 12px;
    line-height: 1.7;
    color: #536176;
  }
  .infoIcon {
    width: 32px;
    height: 32px;
    flex-basis: 32px;
    font-size: 12px;
  }
  .metricCard span,
  .metricCard small,
  .balanceTop span,
  .balanceMeta span,
  .rewardSummary span,
  .messageHeader span,
  .inboxCopy small,
  .activityTime {
    font-size: 10.5px;
    color: #647287;
  }
  .metricCard strong,
  .balanceMeta strong { font-size: 13px; }
  .attendanceThirtyCell { min-height: 38px; }
  .attendanceThirtyCell b { font-size: 11px; }
  .primaryButtonWide { min-height: 46px; font-size: 12.5px; }
  .inboxRow { min-height: 68px; }
}
''',
    Path('app/v2/v2-ai-live.module.css'): r'''

/* FINANCIAL UX QA PASS */
@media (max-width: 520px) {
  .aiEyebrow,
  .aiChartHead span,
  .aiProgressMeta,
  .aiActivityValue,
  .aiPart1Topline span,
  .aiPart1Topline b,
  .aiPart1Headline small,
  .aiPart1Flow > span,
  .aiPart1Flow i,
  .aiPart2Topline,
  .aiPart2Primary > div:first-child span,
  .aiPart2Return span,
  .aiPart2Bento span,
  .aiStageHead span,
  .aiStageItem i,
  .aiStageItem b,
  .aiPart3ChartTop > div:first-child > span,
  .aiPart3Current span,
  .aiPart3ChartMeta span,
  .aiPart3ChartFoot,
  .aiPart3ChartFoot strong,
  .aiPart3HistoryHead span,
  .aiPart3HistoryHead > b,
  .aiPart3Index small,
  .aiPart3HistoryValue span,
  .aiProcessBrief > span {
    font-size: 10px !important;
  }

  .aiWaitingText,
  .aiLiveNotice,
  .aiAdminHold p,
  .aiPart1Headline p,
  .aiPart1Facts span,
  .aiPart1Flow b,
  .aiProcessBrief > p {
    font-size: 11.5px !important;
    line-height: 1.65 !important;
  }

  .aiStageHead strong { font-size: 12px !important; }
  .aiStageItem span { font-size: 10.5px !important; }
  .aiStageItem b { line-height: 1.25; }

  .aiPart3HistoryCopy > strong,
  .aiPart3HistoryCopy > span,
  .aiPart3HistoryValue strong {
    font-size: 11px !important;
  }
  .aiPart3HistoryRow { min-height: 66px; }

  .aiMarketScannerHead span,
  .aiMarketScannerHead small,
  .aiMarketTelemetry span,
  .aiMarketTelemetry small,
  .aiMarketColumns,
  .aiMarketAsset small,
  .aiMarketDirection small,
  .aiMarketState small,
  .aiMarketHistoryHead span,
  .aiMarketHistoryHead small,
  .aiMarketHistoryTime small,
  .aiMarketHistoryAsset small,
  .aiMarketHistoryAction small,
  .aiMarketFootnote {
    font-size: 10.5px !important;
    line-height: 1.55 !important;
  }
  .aiMarketAsset strong,
  .aiMarketDirection strong,
  .aiMarketState strong,
  .aiMarketHistoryTime strong,
  .aiMarketHistoryAsset strong,
  .aiMarketHistoryChange,
  .aiMarketHistoryAction strong {
    font-size: 12px !important;
  }

  .aiMarketScannerToggle,
  .aiPart3HistoryToggle,
  .aiMarketPageButton {
    min-width: 44px !important;
    min-height: 44px !important;
  }
}
'''
}

for path, patch in patches.items():
    text = path.read_text()
    marker = '/* FINANCIAL UX QA PASS */'
    if marker in text:
        text = text.split(marker)[0].rstrip() + '\n'
    path.write_text(text.rstrip() + patch + '\n')
