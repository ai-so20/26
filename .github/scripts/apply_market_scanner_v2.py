from pathlib import Path
import re

js_path = Path('app/v2/V2LiveClientStage2.js')
css_path = Path('app/v2/v2-ai-live.module.css')
js = js_path.read_text()
css = css_path.read_text()

new_engine = r'''const aiTradingAssets = [
  { symbol: 'BTC/USD', name: 'Bitcoin', market: 'COIN' },
  { symbol: 'ETH/USD', name: 'Ethereum', market: 'COIN' },
  { symbol: 'SOL/USD', name: 'Solana', market: 'COIN' },
  { symbol: 'XRP/USD', name: 'XRP', market: 'COIN' },
  { symbol: 'AAPL', name: 'Apple', market: 'STOCK' },
  { symbol: 'NVDA', name: 'NVIDIA', market: 'STOCK' },
  { symbol: 'MSFT', name: 'Microsoft', market: 'STOCK' },
  { symbol: 'TSLA', name: 'Tesla', market: 'STOCK' },
];

function aiMarketUnit(seed) {
  return (aiProcessHash(seed) % 10000) / 9999;
}

function aiMarketDirection(seed, bullishBias = false) {
  const value = aiMarketUnit(seed);
  if (bullishBias) {
    if (value < .16) return { key: 'down', label: '하락 흐름', tone: 'down' };
    if (value < .36) return { key: 'flat', label: '횡보', tone: 'flat' };
    if (value < .78) return { key: 'up', label: '상승 흐름', tone: 'up' };
    return { key: 'strong-up', label: '강한 상승', tone: 'up' };
  }
  if (value < .16) return { key: 'strong-down', label: '강한 하락', tone: 'down' };
  if (value < .38) return { key: 'down', label: '하락 흐름', tone: 'down' };
  if (value < .62) return { key: 'flat', label: '횡보', tone: 'flat' };
  if (value < .86) return { key: 'up', label: '상승 흐름', tone: 'up' };
  return { key: 'strong-up', label: '강한 상승', tone: 'up' };
}

function aiMarketStateAt(asset, stepSeed) {
  const step = Math.max(0, Math.floor(Number(stepSeed || 0)));
  const base = aiProcessHash(asset.symbol);
  const cycleLength = 20 + (base % 9);
  const offset = base % cycleLength;
  const shifted = step + offset;
  const cycle = Math.floor(shifted / cycleLength);
  const pos = shifted % cycleLength;
  const cycleBias = aiMarketUnit(`${asset.symbol}-${cycle}-bias`);
  const tradeCycle = cycleBias >= .38;
  const bullishCycle = cycleBias >= .56;
  const exitRisk = aiMarketUnit(`${asset.symbol}-${cycle}-exit`) < .24;
  let phase = 'scan';
  let label = '탐색 중';
  let action = '시장 구조 · 변동성 동시 분석';
  let direction = aiMarketDirection(`${asset.symbol}-${cycle}-scan`);

  if (pos < 3) {
    phase = 'scan';
    label = '탐색 중';
    direction = aiMarketDirection(`${asset.symbol}-${cycle}-scan`);
    action = direction.tone === 'down' ? '하락 구간 감지 · 위험도 분석' : '시장 구조 · 변동성 동시 분석';
  } else if (pos < 7) {
    phase = 'watch';
    label = '진입 관찰';
    direction = tradeCycle
      ? aiMarketDirection(`${asset.symbol}-${cycle}-watch`, bullishCycle)
      : { key: cycleBias < .18 ? 'strong-down' : 'down', label: cycleBias < .18 ? '강한 하락' : '하락 흐름', tone: 'down' };
    action = direction.tone === 'down' ? '하락세 감지 · 진입 보류' : direction.tone === 'up' ? '진입 조건 확인 중' : '방향성 확인 중';
  } else if (!tradeCycle) {
    if (pos < cycleLength - 3) {
      phase = 'watch';
      label = '진입 보류';
      direction = { key: cycleBias < .18 ? 'strong-down' : 'down', label: cycleBias < .18 ? '강한 하락' : '하락 흐름', tone: 'down' };
      action = '하락세 지속 · 신규 진입 제외';
    } else {
      phase = 'cooldown';
      label = '재탐색 대기';
      direction = aiMarketDirection(`${asset.symbol}-${cycle}-cooldown`);
      action = '조건 미충족 · 다음 탐색 주기 준비';
    }
  } else if (pos < 9) {
    phase = 'buy';
    label = '매수 진행';
    direction = bullishCycle
      ? { key: 'strong-up', label: '강한 상승', tone: 'up' }
      : { key: 'up', label: '상승 전환', tone: 'up' };
    action = '진입 조건 충족 · 매수 처리 중';
  } else if (pos < cycleLength - 4) {
    phase = 'hold';
    label = '보유 관리';
    const holdSegment = Math.floor((pos - 9) / 3);
    direction = aiMarketDirection(`${asset.symbol}-${cycle}-hold-${holdSegment}`, true);
    action = direction.tone === 'down'
      ? '하락 전환 감지 · 리스크 재평가'
      : direction.tone === 'up'
        ? '수익 구간 추적 · 보유 유지'
        : '변동성 관리 · 보유 유지';
  } else if (pos < cycleLength - 2) {
    phase = 'sell';
    label = '매도 진행';
    direction = exitRisk
      ? { key: 'down', label: '하락 전환', tone: 'down' }
      : { key: 'up', label: '목표 구간', tone: 'up' };
    action = exitRisk ? '하락 전환 대응 · 매도 처리 중' : '목표 구간 도달 · 매도 처리 중';
  } else {
    phase = 'cooldown';
    label = '재탐색 대기';
    direction = aiMarketDirection(`${asset.symbol}-${cycle}-cooldown`);
    action = '처리 결과 반영 · 다음 탐색 준비';
  }

  return { ...asset, phase, label, action, direction, cycle, cycleLength, pos };
}

function buildAiMarketStates(stepSeed) {
  return aiTradingAssets.map((asset) => aiMarketStateAt(asset, stepSeed));
}

function buildAiMarketHistory(stepSeed, startedAt, count = 100) {
  const latestStep = Math.max(1, Math.floor(Number(stepSeed || 1)));
  const targetCount = Math.min(100, Math.max(1, Math.floor(Number(count || 100))));
  const startedMs = startedAt ? new Date(startedAt).getTime() : NaN;
  const rows = [];
  const maxLookback = Math.min(latestStep, 720);
  for (let step = latestStep; step >= Math.max(1, latestStep - maxLookback) && rows.length < targetCount; step -= 1) {
    for (const asset of aiTradingAssets) {
      if (rows.length >= targetCount) break;
      const current = aiMarketStateAt(asset, step);
      const previous = aiMarketStateAt(asset, step - 1);
      const changed = current.phase !== previous.phase || current.direction.key !== previous.direction.key;
      if (!changed) continue;
      rows.push({
        id: `${asset.symbol}-${step}-${current.phase}-${current.direction.key}`,
        step,
        at: Number.isFinite(startedMs) ? new Date(startedMs + step * AI_PROCESS_STEP_MINUTES * 60 * 1000).toISOString() : null,
        ...current,
        previousLabel: previous.label,
      });
    }
  }
  return rows;
}

function formatAiMarketPrice(value) {
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0) return '—';
  if (price < 1) return `$${price.toFixed(4)}`;
  if (price < 100) return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}'''

pattern = re.compile(r"const aiTradingAssets = \[.*?\n}\n\nfunction AiLive", re.S)
match = pattern.search(js)
if not match:
    raise SystemExit('trading engine block not found')
js = js[:match.start()] + new_engine + "\n\nfunction AiLive" + js[match.end():]

hook_old = """  const [tradingOpen, setTradingOpen] = useState(true);\n  const [historyOpen, setHistoryOpen] = useState(true);\n  const [tradingPage, setTradingPage] = useState(1);\n"""
hook_new = """  const [tradingOpen, setTradingOpen] = useState(true);\n  const [historyOpen, setHistoryOpen] = useState(true);\n  const [tradingPage, setTradingPage] = useState(1);\n  const [marketFeed, setMarketFeed] = useState({ quotes: [], updatedAt: null, stale: false, loading: true, error: '' });\n\n  useEffect(() => {\n    if (profile?.role === 'admin') return undefined;\n    let active = true;\n    const loadMarketFeed = async () => {\n      try {\n        const response = await fetch('/api/market-sim', { cache: 'no-store' });\n        const data = await response.json().catch(() => null);\n        if (!active) return;\n        if (!response.ok || !data?.success) {\n          setMarketFeed((current) => ({ ...current, loading: false, error: data?.error || '시장가격 연결 대기 중' }));\n          return;\n        }\n        setMarketFeed({ quotes: Array.isArray(data.quotes) ? data.quotes : [], updatedAt: data.updatedAt || null, stale: Boolean(data.stale), loading: false, error: '' });\n      } catch {\n        if (active) setMarketFeed((current) => ({ ...current, loading: false, error: '시장가격 연결 대기 중' }));\n      }\n    };\n    void loadMarketFeed();\n    const timer = window.setInterval(loadMarketFeed, 60000);\n    return () => { active = false; window.clearInterval(timer); };\n  }, [profile?.role]);\n"""
if hook_old not in js:
    raise SystemExit('AiLive hooks anchor not found')
js = js.replace(hook_old, hook_new, 1)

calc_old = re.compile(r"  const tradingRecordCount = Math\.min\(100, Math\.max\(1, Number\(snapshot\.elapsedSteps \|\| 1\)\)\);\n  const tradingRowsAll = buildAiTradingRows\(snapshot\.elapsedSteps, tradingRecordCount\);\n  const tradingTotalPages = Math\.max\(1, Math\.ceil\(tradingRowsAll\.length / 10\)\);\n  const tradingPageSafe = Math\.min\(Math\.max\(1, tradingPage\), tradingTotalPages\);\n  const tradingRows = tradingRowsAll\.slice\(\(tradingPageSafe - 1\) \* 10, tradingPageSafe \* 10\);\n")
calc_new = """  const marketStates = buildAiMarketStates(snapshot.elapsedSteps);\n  const marketHistoryAll = buildAiMarketHistory(snapshot.elapsedSteps, processRow.started_at, 100);\n  const tradingTotalPages = Math.max(1, Math.ceil(marketHistoryAll.length / 10));\n  const tradingPageSafe = Math.min(Math.max(1, tradingPage), tradingTotalPages);\n  const tradingRows = marketHistoryAll.slice((tradingPageSafe - 1) * 10, tradingPageSafe * 10);\n  const quoteMap = Object.fromEntries((marketFeed.quotes || []).map((quote) => [quote.symbol, quote]));\n  const marketCounts = marketStates.reduce((acc, item) => { acc[item.phase] = (acc[item.phase] || 0) + 1; return acc; }, {});\n  const marketUpdatedText = marketFeed.updatedAt ? formatEventTime(marketFeed.updatedAt) : '--:--';\n"""
js, n = calc_old.subn(calc_new, js, count=1)
if n != 1:
    raise SystemExit('trading calculation block not found')

section_pattern = re.compile(r"      <section className=\{styles\.tradingCard\}>.*?      </section>\n\n      <section className=\{styles\.aiChartCard\}>", re.S)
new_section = r'''      <section className={styles.aiMarketScanner}>
        <button type="button" className={styles.aiMarketScannerHead} onClick={() => setTradingOpen((value) => !value)} aria-expanded={tradingOpen}>
          <div>
            <span>AI MARKET SCANNER</span>
            <strong>실시간 시장 탐색판</strong>
            <small>8개 자산을 동시에 추적하며 자산별 판단 상태를 유지합니다.</small>
          </div>
          <div className={styles.aiMarketScannerHeadRight}>
            <b className={styles.aiMarketPulse}><i /> LIVE SCAN</b>
            <em>{tradingOpen ? '접기' : '펼치기'}</em>
          </div>
        </button>
        {tradingOpen && (
          <>
            <div className={styles.aiMarketTelemetry}>
              <div><span>시장가격</span><strong>{marketFeed.loading ? '연결 중' : marketFeed.error ? '대기' : marketFeed.stale ? '최근 정상값' : '연결됨'}</strong><small>{marketUpdatedText} · 5분 갱신</small></div>
              <div><span>탐색·관찰</span><strong>{Number(marketCounts.scan || 0) + Number(marketCounts.watch || 0)}<small>자산</small></strong></div>
              <div><span>매수·보유</span><strong>{Number(marketCounts.buy || 0) + Number(marketCounts.hold || 0)}<small>자산</small></strong></div>
              <div><span>매도·대기</span><strong>{Number(marketCounts.sell || 0) + Number(marketCounts.cooldown || 0)}<small>자산</small></strong></div>
            </div>

            <div className={styles.aiMarketColumns} aria-hidden="true"><span>자산 / 현재가</span><span>방향 감지</span><span>AI 상태</span></div>
            <div className={styles.aiMarketLiveList}>
              {marketStates.map((item) => {
                const quote = quoteMap[item.symbol];
                return (
                  <div key={item.symbol} className={styles.aiMarketLiveRow} data-tone={item.direction.tone} data-phase={item.phase}>
                    <div className={styles.aiMarketAsset}>
                      <span className={item.market === 'COIN' ? styles.aiMarketCoinMark : styles.aiMarketStockMark}>{item.market === 'COIN' ? '₿' : 'ST'}</span>
                      <div><strong>{item.name}</strong><small>{item.symbol} · {formatAiMarketPrice(quote?.price)}</small></div>
                    </div>
                    <div className={styles.aiMarketDirection}><i /><div><strong>{item.direction.label}</strong><small>{item.direction.tone === 'down' ? '리스크 우선 분석' : item.direction.tone === 'up' ? '기회 구간 추적' : '방향성 확인'}</small></div></div>
                    <div className={styles.aiMarketState}><strong>{item.label}</strong><small>{item.action}</small></div>
                  </div>
                );
              })}
            </div>

            <div className={styles.aiMarketHistoryHead}>
              <div><span>STATE CHANGE LOG</span><strong>상태 변화 기록</strong><small>같은 자산은 매수 후 보유·관리·매도 단계를 거친 뒤 다시 탐색합니다.</small></div>
              <b>{marketHistoryAll.length}<small>/100</small></b>
            </div>
            <div className={styles.aiMarketHistoryList}>
              {tradingRows.length === 0 ? <div className={styles.emptyRow}>아직 상태 변화 기록이 없습니다.</div> : tradingRows.map((item) => (
                <div key={item.id} className={styles.aiMarketHistoryRow} data-tone={item.direction.tone}>
                  <div className={styles.aiMarketHistoryTime}><strong>{formatEventTime(item.at)}</strong><small>#{String(item.step).padStart(3, '0')}</small></div>
                  <div className={styles.aiMarketHistoryAsset}><strong>{item.name}</strong><small>{item.symbol} · {item.market}</small></div>
                  <div className={styles.aiMarketHistoryChange}><span>{item.previousLabel}</span><i>→</i><strong>{item.label}</strong></div>
                  <div className={styles.aiMarketHistoryAction}><strong>{item.direction.label}</strong><small>{item.action}</small></div>
                </div>
              ))}
            </div>
            <div className={styles.aiTradingPager}>
              <button type="button" disabled={tradingPageSafe <= 1} onClick={() => setTradingPage((page) => Math.max(1, page - 1))}>‹</button>
              <div>{Array.from({ length: tradingTotalPages }).map((_, index) => { const page = index + 1; return <button key={page} type="button" className={page === tradingPageSafe ? styles.aiTradingPageActive : ''} onClick={() => setTradingPage(page)}>{page}</button>; })}</div>
              <button type="button" disabled={tradingPageSafe >= tradingTotalPages} onClick={() => setTradingPage((page) => Math.min(tradingTotalPages, page + 1))}>›</button>
            </div>
            <div className={styles.aiMarketFootnote}>시장가격 데이터와 AI PROCESS 내부 판단 상태를 함께 표시합니다. 상태는 3분 반영 주기마다 자산별로 독립 갱신됩니다.</div>
          </>
        )}
      </section>

      <section className={styles.aiChartCard}>'''
js, n = section_pattern.subn(new_section, js, count=1)
if n != 1:
    raise SystemExit('trading section not found')

css_marker = '/* AI MARKET SCANNER V2 */'
if css_marker not in css:
    css += r'''

/* AI MARKET SCANNER V2 */
.aiMarketScanner { margin-top:10px; overflow:hidden; border:1px solid #172b4d; background:#0b1729; color:#eef5ff; box-shadow:0 18px 42px rgba(13,27,49,.16); }
.aiMarketScannerHead { width:100%; padding:17px 18px; display:flex; align-items:flex-start; justify-content:space-between; gap:18px; border:0; border-bottom:1px solid rgba(255,255,255,.09); background:transparent; color:inherit; text-align:left; cursor:pointer; }
.aiMarketScannerHead > div:first-child { min-width:0; }
.aiMarketScannerHead span,.aiMarketHistoryHead span { display:block; color:#6f8fbd; font-size:8px; font-weight:900; letter-spacing:.18em; }
.aiMarketScannerHead strong { display:block; margin-top:5px; font-size:16px; letter-spacing:-.025em; }
.aiMarketScannerHead small { display:block; margin-top:5px; color:#8ca0bd; font-size:8px; line-height:1.5; }
.aiMarketScannerHeadRight { flex:0 0 auto; display:grid; justify-items:end; gap:7px; }
.aiMarketScannerHeadRight em { color:#8da0bb; font-size:8px; font-style:normal; font-weight:800; }
.aiMarketPulse { display:flex; align-items:center; gap:6px; color:#8bb6ff; font-size:8px; letter-spacing:.08em; }
.aiMarketPulse i { width:7px; height:7px; border-radius:50%; background:#4f8cff; box-shadow:0 0 0 0 rgba(79,140,255,.5); animation:aiMarketPulse 1.8s ease-out infinite; }
@keyframes aiMarketPulse { 0%{box-shadow:0 0 0 0 rgba(79,140,255,.48)} 70%{box-shadow:0 0 0 7px rgba(79,140,255,0)} 100%{box-shadow:0 0 0 0 rgba(79,140,255,0)} }
.aiMarketTelemetry { display:grid; grid-template-columns:1.25fr repeat(3,.75fr); border-bottom:1px solid rgba(255,255,255,.08); background:#0f1e34; }
.aiMarketTelemetry > div { min-width:0; padding:12px 14px; border-right:1px solid rgba(255,255,255,.07); }
.aiMarketTelemetry > div:last-child { border-right:0; }
.aiMarketTelemetry span { display:block; color:#7188a9; font-size:7px; font-weight:800; }
.aiMarketTelemetry strong { display:block; margin-top:4px; color:#f3f7fd; font-size:12px; }
.aiMarketTelemetry strong small { margin-left:3px; color:#8196b3; font-size:7px; }
.aiMarketTelemetry > div > small { display:block; margin-top:3px; color:#637997; font-size:7px; }
.aiMarketColumns { display:grid; grid-template-columns:1.05fr .8fr 1.2fr; gap:12px; padding:8px 15px; border-bottom:1px solid rgba(255,255,255,.07); color:#617897; font-size:7px; font-weight:900; letter-spacing:.04em; }
.aiMarketLiveList { display:grid; }
.aiMarketLiveRow { position:relative; display:grid; grid-template-columns:1.05fr .8fr 1.2fr; align-items:center; gap:12px; min-width:0; padding:11px 15px; border-bottom:1px solid rgba(255,255,255,.07); }
.aiMarketLiveRow::before { content:""; position:absolute; left:0; top:0; bottom:0; width:2px; background:#5d789d; }
.aiMarketLiveRow[data-tone='up']::before { background:#44c49a; }
.aiMarketLiveRow[data-tone='down']::before { background:#e66d78; }
.aiMarketLiveRow:last-child { border-bottom:0; }
.aiMarketAsset,.aiMarketDirection,.aiMarketState { min-width:0; }
.aiMarketAsset { display:grid; grid-template-columns:30px minmax(0,1fr); align-items:center; gap:9px; }
.aiMarketCoinMark,.aiMarketStockMark { width:28px; height:28px; display:grid; place-items:center; border:1px solid rgba(132,171,229,.18); background:#122641; color:#77a8f7; font-size:10px; font-weight:900; }
.aiMarketStockMark { color:#91a9c8; }
.aiMarketAsset strong,.aiMarketDirection strong,.aiMarketState strong { display:block; color:#eef4fb; font-size:9px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.aiMarketAsset small,.aiMarketDirection small,.aiMarketState small { display:block; margin-top:3px; color:#7186a4; font-size:7px; line-height:1.35; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.aiMarketDirection { display:flex; align-items:center; gap:7px; }
.aiMarketDirection > i { width:7px; height:7px; flex:0 0 7px; border:1px solid #7c8da3; transform:rotate(45deg); }
.aiMarketLiveRow[data-tone='up'] .aiMarketDirection > i { border-color:#4ed3a8; background:rgba(78,211,168,.14); }
.aiMarketLiveRow[data-tone='down'] .aiMarketDirection > i { border-color:#ef7d86; background:rgba(239,125,134,.12); }
.aiMarketLiveRow[data-tone='up'] .aiMarketDirection strong { color:#6fe0ba; }
.aiMarketLiveRow[data-tone='down'] .aiMarketDirection strong { color:#f28d95; }
.aiMarketState { padding-left:12px; border-left:1px solid rgba(255,255,255,.07); }
.aiMarketState strong { color:#dce9fb; }
.aiMarketHistoryHead { padding:15px 16px 11px; display:flex; align-items:flex-end; justify-content:space-between; gap:14px; border-top:1px solid rgba(255,255,255,.10); background:#0d1a2d; }
.aiMarketHistoryHead > div { min-width:0; }
.aiMarketHistoryHead > div > strong { display:block; margin-top:4px; color:#f0f5fb; font-size:13px; }
.aiMarketHistoryHead > div > small { display:block; margin-top:4px; color:#6f83a0; font-size:7px; line-height:1.45; }
.aiMarketHistoryHead > b { flex:0 0 auto; color:#76a7f4; font-size:18px; letter-spacing:-.04em; }
.aiMarketHistoryHead > b small { margin-left:2px; color:#657b99; font-size:8px; }
.aiMarketHistoryList { display:grid; background:#0c182a; }
.aiMarketHistoryRow { display:grid; grid-template-columns:55px .75fr .9fr 1.25fr; align-items:center; gap:10px; padding:10px 14px; border-top:1px solid rgba(255,255,255,.055); min-width:0; }
.aiMarketHistoryTime,.aiMarketHistoryAsset,.aiMarketHistoryChange,.aiMarketHistoryAction { min-width:0; }
.aiMarketHistoryTime strong,.aiMarketHistoryAsset strong,.aiMarketHistoryAction strong { display:block; color:#dce8f8; font-size:8px; }
.aiMarketHistoryTime small,.aiMarketHistoryAsset small,.aiMarketHistoryAction small { display:block; margin-top:2px; color:#667b98; font-size:7px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.aiMarketHistoryChange { display:flex; align-items:center; gap:5px; color:#6f82a0; font-size:7px; white-space:nowrap; overflow:hidden; }
.aiMarketHistoryChange span,.aiMarketHistoryChange strong { overflow:hidden; text-overflow:ellipsis; }
.aiMarketHistoryChange strong { color:#a9c3e8; font-size:8px; }
.aiMarketHistoryChange i { color:#506988; font-style:normal; }
.aiMarketHistoryRow[data-tone='up'] .aiMarketHistoryAction strong { color:#6fd9b5; }
.aiMarketHistoryRow[data-tone='down'] .aiMarketHistoryAction strong { color:#ed8991; }
.aiMarketScanner .aiTradingPager { border-top:1px solid rgba(255,255,255,.08); background:#0e1b2f; }
.aiMarketScanner .aiTradingPager button { border-color:rgba(255,255,255,.10); background:#101f35; color:#8297b5; }
.aiMarketScanner .aiTradingPager button:hover:not(:disabled),.aiMarketScanner .aiTradingPageActive { border-color:#4e83d8 !important; background:#17345e !important; color:#a8c9ff !important; }
.aiMarketFootnote { padding:10px 15px 12px; border-top:1px solid rgba(255,255,255,.07); color:#607693; font-size:7px; line-height:1.5; }
@media (max-width:620px) {
  .aiMarketTelemetry { grid-template-columns:1.25fr repeat(3,.75fr); }
  .aiMarketTelemetry > div { padding:10px 9px; }
  .aiMarketColumns { display:none; }
  .aiMarketLiveRow { grid-template-columns:1fr 1fr; gap:8px 10px; padding:11px 12px; }
  .aiMarketAsset { grid-column:1; }
  .aiMarketDirection { grid-column:2; }
  .aiMarketState { grid-column:1 / -1; padding:8px 0 0 39px; border-left:0; border-top:1px solid rgba(255,255,255,.055); }
  .aiMarketHistoryRow { grid-template-columns:46px .85fr 1.2fr; gap:8px; padding:9px 11px; }
  .aiMarketHistoryAction { grid-column:2 / -1; padding-left:0; }
}
@media (max-width:420px) {
  .aiMarketScannerHead { padding:15px 13px; }
  .aiMarketScannerHead strong { font-size:14px; }
  .aiMarketScannerHead small { max-width:230px; }
  .aiMarketTelemetry { grid-template-columns:repeat(2,1fr); }
  .aiMarketTelemetry > div { border-bottom:1px solid rgba(255,255,255,.06); }
  .aiMarketTelemetry > div:nth-child(2) { border-right:0; }
  .aiMarketTelemetry > div:nth-child(3),.aiMarketTelemetry > div:nth-child(4) { border-bottom:0; }
  .aiMarketHistoryHead { align-items:flex-start; }
}
@media (prefers-reduced-motion: reduce) { .aiMarketPulse i { animation:none; } }
'''

js_path.write_text(js)
css_path.write_text(css)
print('AI market scanner v2 applied')
