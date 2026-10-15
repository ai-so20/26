from pathlib import Path

patches = {
    Path('app/v2/v2.module.css'): r'''

/* MOBILE READABILITY PASS */
@media (max-width: 520px) {
  .pageHeading p,
  .cardBody p,
  .attendanceCard p,
  .listCopy p,
  .attendanceLead,
  .previewNotice {
    font-size: 11.5px;
    line-height: 1.7;
  }
  .brandEyebrow,
  .kicker,
  .cardKicker,
  .summaryTop span,
  .sectionHead span,
  .timeBlock span,
  .stat span,
  .stat small,
  .segmentCopy small,
  .muted,
  .statusBadge,
  .liveBadge,
  .textButton,
  .chevronButton {
    font-size: 10.5px;
  }
  .segmentCopy strong,
  .listCopy strong,
  .timeBlock strong {
    font-size: 12.5px;
  }
  .navItem { font-size: 13.5px; }
  .primaryButton,
  .secondaryButton { font-size: 12px; }
}
''',
    Path('app/v2/v2-extra.module.css'): r'''

/* MOBILE READABILITY PASS */
@media (max-width: 520px) {
  .listHeader span,
  .rowIndex,
  .rowState,
  .balanceTop span,
  .balanceMeta span,
  .metricCard span,
  .rewardSummary span,
  .messageHeader span,
  .processBadge,
  .activityTime,
  .metricCard small,
  .inboxCopy small,
  .newBadge,
  .giftPlaceholder small {
    font-size: 10px !important;
  }
  .listHeader strong,
  .listRow strong,
  .balanceMeta strong,
  .processStep strong,
  .activityRow strong,
  .inboxCopy strong,
  .messageBubble > strong,
  .giftPlaceholder strong {
    font-size: 11.5px;
  }
  .processStep small,
  .activityRow p,
  .messageBubble > p,
  .infoCard p {
    font-size: 11px;
    line-height: 1.7;
  }
  .infoCard strong { font-size: 12.5px; }
  .attendanceCardLarge p { font-size: 11.5px; line-height: 1.7; }
  .attendanceDots span { font-size: 10.5px; }
  .primaryButtonWide { font-size: 12px; }
  .metricCard strong { font-size: 18px; }
}
''',
    Path('app/v2/v2-ai-live.module.css'): r'''

/* MOBILE READABILITY PASS */
@media (max-width: 520px) {
  .aiEyebrow,
  .aiProgressMeta,
  .aiChartHead span,
  .aiChartFoot,
  .aiActivityValue,
  .aiPart1Topline span,
  .aiPart1Topline b,
  .aiPart1Headline small,
  .aiPart1Flow > span,
  .aiPart1Flow i,
  .aiPart2Topline {
    font-size: 10px;
  }
  .aiWaitingText,
  .aiLiveNotice,
  .aiAdminHold p,
  .aiPart1Headline p,
  .aiPart1Facts span,
  .aiPart1Flow b,
  .aiPart2Primary > div:first-child span,
  .aiPart2Return span,
  .aiPart2Bento span {
    font-size: 11px;
    line-height: 1.65;
  }
  .aiPart1Facts strong { font-size: 13px; }
  .aiPart2Bento strong { font-size: 14px; }

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
    font-size: 10px !important;
    line-height: 1.55;
  }
  .aiMarketScannerHead strong { font-size: 15px; }
  .aiMarketTelemetry strong { font-size: 14px; }
  .aiMarketAsset strong,
  .aiMarketDirection strong,
  .aiMarketState strong,
  .aiMarketHistoryTime strong,
  .aiMarketHistoryAsset strong,
  .aiMarketHistoryChange,
  .aiMarketHistoryAction strong {
    font-size: 11.5px !important;
    line-height: 1.4;
  }
  .aiMarketLiveRow {
    min-height: 84px;
    row-gap: 8px;
  }
  .aiMarketHistoryRow { min-height: 72px; }
}
'''
}

for path, block in patches.items():
    text = path.read_text(encoding='utf-8')
    marker = '/* MOBILE READABILITY PASS */'
    if marker in text:
        text = text.split(marker)[0].rstrip() + '\n'
    path.write_text(text + block, encoding='utf-8')

js = Path('app/v2/V2LiveClientStage2.js')
text = js.read_text(encoding='utf-8')
text = text.replace("const [tradingOpen, setTradingOpen] = useState(true);", "const [tradingOpen, setTradingOpen] = useState(false);")
js.write_text(text, encoding='utf-8')
