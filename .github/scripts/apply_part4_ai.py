from pathlib import Path
import re

js_path = Path('app/v2/V2LiveClientStage2.js')
css_path = Path('app/v2/v2-ai-live.module.css')
js = js_path.read_text()
css = css_path.read_text()

# Trading rows: derive up to 100 records from actual 3-minute process steps.
pattern = re.compile(r"function buildAiTradingRows\(clock, count = 8\) \{.*?\n\}\n\nfunction AiLive", re.S)
replacement = '''function buildAiTradingRows(stepSeed, count = 100) {
  const latestStep = Math.max(1, Math.floor(Number(stepSeed || 1)));
  const recordCount = Math.min(100, Math.max(1, Math.floor(Number(count || 1))));
  return Array.from({ length: recordCount }, (_, index) => {
    const recordStep = Math.max(1, latestStep - index);
    const asset = aiTradingAssets[(recordStep * 3 + index) % aiTradingAssets.length];
    const signal = aiTradingSignals[(recordStep + index) % aiTradingSignals.length];
    return { id: `trade-${recordStep}-${index}`, recordStep, ...asset, signal: signal[0], action: signal[1] };
  });
}

function AiLive'''
js, count = pattern.subn(replacement, js, count=1)
if count != 1:
    raise SystemExit('buildAiTradingRows marker not found')

hook_marker = "function AiLive({ profile, userId, row, tick, error }) {\n"
if hook_marker not in js:
    raise SystemExit('AiLive hook marker not found')
js = js.replace(hook_marker, hook_marker + "  const [tradingOpen, setTradingOpen] = useState(true);\n  const [historyOpen, setHistoryOpen] = useState(true);\n  const [tradingPage, setTradingPage] = useState(1);\n", 1)

brief = '''        <section className={styles.aiProcessBrief}>
          <span>AI PROCESS</span>
          <strong>주식·코인 흐름을 6단계로 분석하고 3분 단위로 반영합니다.</strong>
          <p>분석 · 탐색 · 매수 판단 · 보유 관리 · 매도 판단 · 재분석을 반복하며, 설정된 진행기간 동안 평가금액·수익·반영 기록을 확인할 수 있습니다.</p>
        </section>
'''
idle_marker = "        </section>\n        <section className={styles.aiPart1Flow}>"
if idle_marker not in js:
    raise SystemExit('idle description marker not found')
js = js.replace(idle_marker, "        </section>\n" + brief + "        <section className={styles.aiPart1Flow}>", 1)

running_marker = "      </section>\n\n      {status === 'completed' && <div className={styles.aiResultBar}>"
if running_marker not in js:
    raise SystemExit('running description marker not found')
run_brief = '''      <section className={styles.aiProcessBrief}>
        <span>AI PROCESS</span>
        <strong>시장 흐름 분석부터 재분석까지 6단계를 순환합니다.</strong>
        <p>3분 단위 반영값을 기준으로 평가금액과 수익 흐름이 갱신되며, 주식·코인 트레이딩 현황과 최근 반영 기록을 함께 확인할 수 있습니다.</p>
      </section>

'''
js = js.replace(running_marker, "      </section>\n\n" + run_brief + "      {status === 'completed' && <div className={styles.aiResultBar}>", 1)

old_rows = "  const tradingRows = buildAiTradingRows(Date.now() + Number(tick || 0));"
if old_rows not in js:
    raise SystemExit('trading rows marker not found')
new_rows = '''  const tradingRecordCount = Math.min(100, Math.max(1, Number(snapshot.elapsedSteps || 1)));
  const tradingRowsAll = buildAiTradingRows(snapshot.elapsedSteps, tradingRecordCount);
  const tradingTotalPages = Math.max(1, Math.ceil(tradingRowsAll.length / 10));
  const tradingPageSafe = Math.min(Math.max(1, tradingPage), tradingTotalPages);
  const tradingRows = tradingRowsAll.slice((tradingPageSafe - 1) * 10, tradingPageSafe * 10);'''
js = js.replace(old_rows, new_rows, 1)

# Trading card -> collapsible, 10 items per page, max 10 pages.
start = js.index('      <section className={styles.tradingCard}>')
end = js.index('      <section className={styles.aiChartCard}>', start)
trading_block = '''      <section className={styles.tradingCard}>
        <button type="button" className={styles.aiFoldHead} onClick={() => setTradingOpen((value) => !value)} aria-expanded={tradingOpen}>
          <div><span>AI TRADING</span><strong>주식 · 코인 트레이딩 현황</strong></div>
          <div className={styles.aiFoldMeta}><b>{tradingRecordCount} / 100</b><i>{tradingOpen ? '접기' : '펼치기'}</i></div>
        </button>
        {tradingOpen && (
          <>
            <div className={styles.tradingList}>{tradingRows.map((item) => <div key={item.id} className={styles.tradingRow}><span className={item.market === 'COIN' ? styles.tradingCoin : styles.tradingStock}>{item.market === 'COIN' ? '₿' : '◈'}</span><div className={styles.tradingAsset}><strong>{item.name}</strong><small>{item.symbol} · {item.market} · #{String(item.recordStep).padStart(3, '0')}</small></div><div className={styles.tradingAction}><strong>{item.signal}</strong><span>{item.action}</span></div></div>)}</div>
            <div className={styles.aiTradingPager}>
              <button type="button" disabled={tradingPageSafe <= 1} onClick={() => setTradingPage((page) => Math.max(1, page - 1))}>‹</button>
              <div>{Array.from({ length: tradingTotalPages }).map((_, index) => { const page = index + 1; return <button key={page} type="button" className={page === tradingPageSafe ? styles.aiTradingPageActive : ''} onClick={() => setTradingPage(page)}>{page}</button>; })}</div>
              <button type="button" disabled={tradingPageSafe >= tradingTotalPages} onClick={() => setTradingPage((page) => Math.min(tradingTotalPages, page + 1))}>›</button>
            </div>
          </>
        )}
      </section>

'''
js = js[:start] + trading_block + js[end:]

# Recent reflection history -> collapsible.
history_start = js.index('      <section className={styles.aiPart3History}>')
history_end = js.index('      <div className={styles.twoColumnCards}>', history_start)
history_block = '''      <section className={styles.aiPart3History}>
        <button type="button" className={styles.aiFoldHead} onClick={() => setHistoryOpen((value) => !value)} aria-expanded={historyOpen}>
          <div><span>REFLECTION LOG</span><strong>최근 반영 내역</strong></div>
          <div className={styles.aiFoldMeta}><b>{activities.length}건</b><i>{historyOpen ? '접기' : '펼치기'}</i></div>
        </button>
        {historyOpen && <div className={styles.aiPart3HistoryList}>
          {activities.length === 0 ? <div className={styles.emptyRow}>반영 내역이 없습니다.</div> : activities.map((item) => (
            <div key={item.step} className={styles.aiPart3HistoryRow}>
              <div className={styles.aiPart3Index}><span>{String(item.step).padStart(2, '0')}</span><small>회차</small></div>
              <div className={styles.aiPart3Rail}><i /></div>
              <div className={styles.aiPart3HistoryCopy}>
                <strong>{item.stage} · {item.delta >= 0 ? '상승 반영' : '조정 반영'}</strong>
                <span className={item.delta >= 0 ? styles.aiPart3Positive : styles.aiPart3Negative}>{item.delta >= 0 ? '+' : ''}{aiKrw(item.delta)}</span>
              </div>
              <div className={styles.aiPart3HistoryValue}><span>평가금액</span><strong>{aiKrw(item.amount)}</strong></div>
            </div>
          ))}
        </div>}
      </section>

'''
js = js[:history_start] + history_block + js[history_end:]

css_append = r'''

/* AI PROCESS PART 4 - compact flow, foldable logs, paged trading */
.aiProcessBrief { margin-top:10px; padding:14px 16px; border-left:3px solid #2f6fed; border-top:1px solid #e4e9f0; border-right:1px solid #e4e9f0; border-bottom:1px solid #e4e9f0; background:#fff; }
.aiProcessBrief > span { display:block; color:#2f6fed; font-size:8px; font-weight:900; letter-spacing:.14em; }
.aiProcessBrief > strong { display:block; margin-top:5px; color:#172033; font-size:12px; letter-spacing:-.025em; }
.aiProcessBrief > p { margin:5px 0 0; color:#69778c; font-size:9px; line-height:1.55; }

.aiStageBoard { padding:0 !important; overflow:hidden; }
.aiStageHead { min-height:auto !important; padding:10px 13px !important; align-items:center !important; border-bottom:1px solid #e9eef4; }
.aiStageHead span { font-size:7px !important; }
.aiStageHead strong { font-size:11px !important; }
.aiStageTrack { display:grid !important; grid-template-columns:repeat(6,minmax(0,1fr)) !important; gap:0 !important; }
.aiStageItem { min-width:0 !important; min-height:auto !important; padding:9px 3px 8px !important; display:grid !important; grid-template-columns:1fr !important; justify-items:center !important; gap:2px !important; text-align:center !important; border-left:0 !important; border-top:0 !important; border-right:1px solid #edf1f5 !important; border-bottom:0 !important; background:#fff !important; }
.aiStageItem:last-child { border-right:0 !important; }
.aiStageItem i { width:auto !important; height:auto !important; margin:0 !important; background:transparent !important; color:#9aa6b6 !important; font-size:7px !important; font-style:normal !important; }
.aiStageItem span { font-size:9px !important; white-space:nowrap; }
.aiStageItem b { font-size:7px !important; white-space:nowrap; }
.aiStageItemActive { background:#f2f6ff !important; box-shadow:inset 0 -3px #2f6fed !important; }
.aiStageItemActive i,.aiStageItemActive span,.aiStageItemActive b { color:#2f6fed !important; }
.aiStageItemDone i,.aiStageItemDone b { color:#16805d !important; }

.aiFoldHead { width:100%; min-width:0; display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px 16px; border:0; border-bottom:1px solid #edf1f5; background:#fff; color:inherit; text-align:left; cursor:pointer; }
.aiFoldHead > div:first-child { min-width:0; display:grid; gap:3px; }
.aiFoldHead span { color:#8a96a6; font-size:8px; font-weight:900; letter-spacing:.12em; }
.aiFoldHead strong { color:#172033; font-size:14px; letter-spacing:-.025em; }
.aiFoldMeta { flex:0 0 auto; display:flex; align-items:center; gap:8px; }
.aiFoldMeta b { color:#2f6fed; background:#eef4ff; padding:5px 7px; font-size:8px; }
.aiFoldMeta i { color:#718096; font-size:8px; font-style:normal; font-weight:800; }

.aiTradingPager { display:grid; grid-template-columns:30px minmax(0,1fr) 30px; align-items:center; gap:6px; padding:10px 12px 12px; border-top:1px solid #edf1f5; }
.aiTradingPager > div { min-width:0; display:flex; justify-content:center; gap:4px; flex-wrap:wrap; }
.aiTradingPager button { min-width:26px; height:26px; padding:0 6px; border:1px solid #dde4ed; background:#fff; color:#66758a; font-size:8px; font-weight:800; cursor:pointer; }
.aiTradingPager button:disabled { opacity:.35; cursor:default; }
.aiTradingPager .aiTradingPageActive { border-color:#2f6fed; background:#2f6fed; color:#fff; }

.twoColumnCards { display:grid !important; grid-template-columns:repeat(2,minmax(0,1fr)) !important; gap:8px !important; }
.metricCard { min-height:0 !important; padding:12px 13px !important; }
.metricCard > span { font-size:8px !important; }
.metricCard > strong { margin-top:5px !important; font-size:15px !important; }
.metricCard > small { margin-top:4px !important; font-size:7px !important; }

@media (max-width:520px) {
  .aiStageHead { padding:9px 10px !important; }
  .aiStageItem { padding:8px 2px 7px !important; }
  .aiStageItem span { font-size:8px !important; }
  .aiStageItem b { font-size:6px !important; }
  .aiFoldHead { padding:12px 13px; }
  .aiFoldHead strong { font-size:13px; }
  .tradingRow { grid-template-columns:30px minmax(0,.85fr) minmax(0,1.15fr) !important; }
  .twoColumnCards { grid-template-columns:repeat(2,minmax(0,1fr)) !important; }
  .metricCard { padding:11px !important; }
}
'''
if 'AI PROCESS PART 4 - compact flow, foldable logs, paged trading' not in css:
    css += css_append

# Guardrails: preserve live data functions and core AI process logic.
required = [
    'AI_PROCESS_STEP_MINUTES = 3',
    'getMemberProcessSnapshot(processRow, userId)',
    'snapshot.earnedProfit',
    'snapshot.remainingText',
    'ai_process_members',
    'checkDailyAttendance',
    'joinAutoEvent',
    '주식 · 코인 트레이딩 현황',
    '최근 반영 내역',
]
for token in required:
    if token not in js:
        raise SystemExit(f'required token missing: {token}')

js_path.write_text(js)
css_path.write_text(css)
print('patched AI PROCESS part 4')
