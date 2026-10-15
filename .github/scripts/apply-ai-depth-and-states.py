from pathlib import Path

js_path = Path('app/v2/V2LiveClientStage2.js')
ai_css_path = Path('app/v2/v2-ai-live.module.css')
extra_css_path = Path('app/v2/v2-extra.module.css')

js = js_path.read_text()
ai_css = ai_css_path.read_text()
extra_css = extra_css_path.read_text()

# 1) Recent reflection log: round number -> actual reflection time.
old = """  const recentHistory = snapshot.history.slice(-7);\n  const activities = recentHistory.slice(1).map((item, index) => {\n    const prev = recentHistory[index];\n    const delta = item.amount - prev.amount;\n    const stageIndex = Math.max(0, (item.step - 1) % stageLabels.length);\n    return { step: item.step, amount: item.amount, delta, stage: stageLabels[stageIndex] };\n  }).reverse();"""
new = """  const recentHistory = snapshot.history.slice(-7);\n  const processStartedMs = processRow.started_at ? new Date(processRow.started_at).getTime() : NaN;\n  const activities = recentHistory.slice(1).map((item, index) => {\n    const prev = recentHistory[index];\n    const delta = item.amount - prev.amount;\n    const stageIndex = Math.max(0, (item.step - 1) % stageLabels.length);\n    const reflectedAt = Number.isFinite(processStartedMs)\n      ? new Date(processStartedMs + item.step * AI_PROCESS_STEP_MINUTES * 60 * 1000).toISOString()\n      : null;\n    return { step: item.step, amount: item.amount, delta, stage: stageLabels[stageIndex], reflectedAt };\n  }).reverse();"""
if old not in js:
    raise SystemExit('activities source block not found')
js = js.replace(old, new, 1)

old = """<div className={styles.aiPart3Index}><span>{String(item.step).padStart(2, '0')}</span><small>회차</small></div>"""
new = """<div className={styles.aiPart3Index}><span>{formatEventTime(item.reflectedAt)}</span><small>반영 시간</small></div>"""
if old not in js:
    raise SystemExit('history index render not found')
js = js.replace(old, new, 1)

# 2) Initial member verification state: replace single-line loader with layout-preserving skeleton.
old = """  if (loading) return <main className={styles.canvas}><section className={`${styles.appShell} ${styles.loadingShell}`}><div className={styles.loadingMark}>VIP</div><strong>회원 정보를 확인하고 있습니다.</strong></section></main>;"""
new = """  if (loading) return (\n    <main className={styles.canvas}>\n      <section className={`${styles.appShell} ${styles.loadingShell}`}>\n        <div className={styles.loadingBrandRow}><div className={styles.loadingMark}>VIP</div><div><strong>회원 정보를 확인하고 있습니다.</strong><span>잠시만 기다려주세요.</span></div></div>\n        <div className={styles.loadingNavSkeleton}><i /><i /><i /></div>\n        <div className={styles.loadingContentSkeleton} aria-hidden=\"true\">\n          <i className={styles.loadingLineLg} />\n          <i className={styles.loadingLineSm} />\n          <div className={styles.loadingPanelSkeleton}><i /><i /><i /></div>\n          <div className={styles.loadingListSkeleton}><i /><i /><i /></div>\n        </div>\n      </section>\n    </main>\n  );"""
if old not in js:
    raise SystemExit('loading block not found')
js = js.replace(old, new, 1)

js_path.write_text(js)

marker = '/* AI PROCESS DEPTH & DATA POLISH 2026 */'
if marker not in ai_css:
    ai_css += r'''

/* AI PROCESS DEPTH & DATA POLISH 2026 */
.aiPart2Hero {
  border-radius: 12px;
  box-shadow: 0 10px 28px rgba(13,27,49,.15);
}
.aiStageBoard {
  margin-top: 18px;
  border: 1px solid #E1E4E9;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: none;
}
.aiStageHead {
  padding: 15px 16px 13px;
  background: #FAFAFB;
  border-bottom: 1px solid #E1E4E9;
}
.aiStageTrack { background: #fff; }
.aiStageItem { padding: 0 14px; }
.aiStageItemActive {
  background: linear-gradient(90deg,#EDF3FF 0,#FFFFFF 74%);
}
.aiMarketScanner,
.aiChartCard,
.aiPart3History {
  margin-top: 18px;
  border: 1px solid #E1E4E9;
  border-radius: 8px;
  background: #fff;
  box-shadow: none;
}
.aiMarketScanner {
  overflow: hidden;
}
.aiMarketScannerHead {
  background: #FAFAFB;
  border-bottom-color: #E1E4E9;
}
.aiChartCard {
  position: relative;
  padding: 18px;
  border-color: #CDD2DA;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(23,27,36,.08);
}
.aiChartCard::before {
  content: '';
  position: absolute;
  left: 0;
  top: 18px;
  bottom: 18px;
  width: 4px;
  background: #2155CD;
}
.aiPart3ChartTop,
.aiPart3ChartMeta,
.aiChart,
.aiPart3ChartFoot { margin-left: 8px; }
.aiPart3History { overflow: hidden; }
.aiFoldHead {
  background: #FAFAFB;
  border-bottom-color: #E1E4E9;
}
.aiPart3HistoryRow {
  grid-template-columns: 64px 14px minmax(0,1fr) auto;
  padding: 13px 16px;
}
.aiPart3Index span {
  color: #2155CD;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -.02em;
}
.aiPart3Index small { font-size: 7px; }
.twoColumnCards {
  margin-top: 18px;
  gap: 10px;
}
.metricCard {
  min-width: 0;
  padding: 15px 16px;
  border: 1px solid #E1E4E9;
  border-radius: 8px;
  background: #fff;
  box-shadow: none;
}
.metricCard span { display: block; margin-bottom: 7px; }
.metricCard strong { display: block; font-size: 15px; line-height: 1.25; }
.metricCard small { display: block; margin-top: 7px; color: #626B78; font-size: 9px; line-height: 1.45; }
.aiProcessBrief {
  margin-top: 18px;
  border-left-color: #2155CD;
  background: #F8FAFD;
}
.aiIdleSection {
  border-color: #E1E4E9;
}
.aiIdleConsult { box-shadow: 0 4px 12px rgba(23,27,36,.06); }
@media (max-width: 520px) {
  .aiPart2Hero { border-radius: 10px; }
  .aiStageItem { padding: 0 11px; }
  .aiChartCard { padding: 16px 13px; }
  .aiPart3ChartTop,
  .aiPart3ChartMeta,
  .aiChart,
  .aiPart3ChartFoot { margin-left: 6px; }
  .aiPart3HistoryRow { grid-template-columns: 58px 12px minmax(0,1fr); gap: 7px; padding: 12px 11px; }
  .aiPart3HistoryValue { grid-column: 3; text-align: left; }
  .twoColumnCards { grid-template-columns: 1fr 1fr; gap: 8px; }
  .metricCard { padding: 14px 12px; }
}
'''
    ai_css_path.write_text(ai_css)

loading_marker = '/* STRUCTURED MEMBER LOADING STATE 2026 */'
if loading_marker not in extra_css:
    extra_css += r'''

/* STRUCTURED MEMBER LOADING STATE 2026 */
.loadingShell {
  place-items: stretch;
  align-content: start;
  gap: 0;
  min-height: 100vh;
  padding: 22px 20px 28px;
}
.loadingBrandRow {
  min-height: 58px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #E1E4E9;
}
.loadingBrandRow > div:last-child { min-width: 0; display: grid; gap: 3px; }
.loadingBrandRow strong { color: #171B24; font-size: 12px; }
.loadingBrandRow span { color: #626B78; font-size: 9px; }
.loadingMark {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: #202735;
}
.loadingNavSkeleton {
  display: grid;
  grid-template-columns: repeat(3,minmax(0,1fr));
  gap: 18px;
  padding: 15px 2px 13px;
  border-bottom: 1px solid #E1E4E9;
}
.loadingNavSkeleton i,
.loadingContentSkeleton i,
.loadingPanelSkeleton i,
.loadingListSkeleton i {
  display: block;
  background: linear-gradient(90deg,#ECEEF2 25%,#F6F7F9 50%,#ECEEF2 75%);
  background-size: 220% 100%;
  animation: vipSkeleton 1.35s ease-in-out infinite;
}
.loadingNavSkeleton i { height: 10px; border-radius: 4px; }
.loadingContentSkeleton { padding-top: 26px; }
.loadingLineLg { width: 36%; height: 22px; border-radius: 5px; }
.loadingLineSm { width: 58%; height: 10px; margin-top: 9px; border-radius: 4px; }
.loadingPanelSkeleton {
  margin-top: 26px;
  padding: 18px;
  border: 1px solid #CDD2DA;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 4px 12px rgba(23,27,36,.06);
}
.loadingPanelSkeleton i:first-child { width: 40%; height: 12px; }
.loadingPanelSkeleton i:nth-child(2) { width: 70%; height: 30px; margin-top: 13px; }
.loadingPanelSkeleton i:last-child { width: 100%; height: 68px; margin-top: 18px; }
.loadingListSkeleton { margin-top: 20px; border-top: 1px solid #E1E4E9; }
.loadingListSkeleton i { height: 54px; border-bottom: 1px solid #E1E4E9; background-color: #fff; }
@keyframes vipSkeleton { 0% { background-position: 200% 0; } 100% { background-position: -20% 0; } }
@media (prefers-reduced-motion: reduce) {
  .loadingNavSkeleton i,
  .loadingContentSkeleton i,
  .loadingPanelSkeleton i,
  .loadingListSkeleton i { animation: none; }
}
@media (max-width: 420px) {
  .loadingShell { padding: 18px 16px 24px; }
  .loadingLineLg { width: 46%; }
  .loadingLineSm { width: 72%; }
}
'''
    extra_css_path.write_text(extra_css)

print('AI depth, reflection timestamps, metric spacing, and loading skeleton applied')
