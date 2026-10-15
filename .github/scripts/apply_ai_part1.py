from pathlib import Path

js_path = Path('app/v2/V2LiveClientStage2.js')
css_path = Path('app/v2/v2-ai-live.module.css')
js = js_path.read_text()
css = css_path.read_text()

old = '''  const status = processRow.status || 'ready';
  const availableCount = Math.max(0, Number(processRow.available_count || 0));
  const opportunityDday = aiProcessOpportunityDday(processRow);

  if (status !== 'running' && status !== 'completed') {
    return (
      <>
        <PageHeading kicker="AI PROCESS" title="AI프로세스" status={aiProcessStatusLabel(status, availableCount)} />
        {error && <div className={styles.noticeBox}>{error}</div>}
        <section className={styles.aiWaitingCard}>
          <div className={styles.aiWaitingTop}>
            <div><span className={styles.aiEyebrow}>AI PROCESS STATUS</span><h2>{status === 'waiting' ? `${profile?.nickname || '회원'}님, 진행 준비가 완료되었습니다.` : availableCount > 0 ? `${profile?.nickname || '회원'}님, ${availableCount}회 진행 가능합니다.` : `${profile?.nickname || '회원'}님의 진행 가능한 횟수가 없습니다.`}</h2></div>
            <span className={styles.aiStatusWaiting}>{aiProcessStatusLabel(status, availableCount)}</span>
          </div>
          <p className={styles.aiWaitingText}>{status === 'waiting' ? '상담을 통해 진행 설정이 완료되었습니다. 담당자 확인 후 진행이 시작되면 회원 전용 수익 현황 화면으로 자동 전환됩니다.' : availableCount > 0 ? '회원님께 제공된 AI프로세스 이용 기회가 준비되어 있습니다. 상담 후 진행 설정이 완료되면 시작할 수 있습니다.' : '현재 AI프로세스 돌발 1만원 지원금 이벤트가 진행 중이며, 당첨 시 지원금으로 AI프로세스가 진행됩니다.'}</p>
          <div className={styles.aiAccessGrid}>
            <div><span>진행 가능한 횟수</span><strong>{availableCount}회</strong></div>
            <div><span>현재 상태</span><strong>{availableCount <= 0 && status === 'ready' ? '본인 자금 진행 불가' : aiProcessStatusLabel(status, availableCount)}</strong></div>
            {opportunityDday !== null && <div><span>진행 기회 유효기간</span><strong className={styles.aiDday}>D-{opportunityDday}</strong></div>}
            {status === 'waiting' && Number(processRow.investment_amount || 0) > 0 && <div><span>시작 금액</span><strong>{aiKrw(processRow.investment_amount)}</strong></div>}
          </div>
        </section>

      </>
    );
  }
'''

new = '''  const status = processRow.status || 'ready';
  const availableCount = Math.max(0, Number(processRow.available_count || 0));
  const opportunityDday = aiProcessOpportunityDday(processRow);
  const minReturn = Math.max(0, Number(processRow.min_return || 0));
  const maxReturn = Math.max(minReturn, Number(processRow.max_return || minReturn));
  const configuredReturn = `${minReturn.toFixed(1)}% ~ ${maxReturn.toFixed(1)}%`;

  if (status !== 'running' && status !== 'completed') {
    return (
      <>
        <PageHeading kicker="AI PROCESS" title="AI프로세스" status={aiProcessStatusLabel(status, availableCount)} />
        {error && <div className={styles.noticeBox}>{error}</div>}
        <section className={styles.aiPart1Hero}>
          <div className={styles.aiPart1Topline}>
            <span>AI PROCESS</span>
            <b>{aiProcessStatusLabel(status, availableCount)}</b>
          </div>
          <div className={styles.aiPart1Headline}>
            <div>
              <small>진행 가능</small>
              <strong>{availableCount}<em>회</em></strong>
            </div>
            <p>분석 → 탐색 → 매수 → 관리 → 매도 → 재분석</p>
          </div>
          <div className={styles.aiPart1Facts}>
            <div className={styles.aiPart1FactWide}><span>진행 시간</span><strong>최소 1시간 ~ 최대 30일</strong></div>
            <div><span>예상 수익률</span><strong>{availableCount > 0 || status === 'waiting' ? configuredReturn : '회원별 설정'}</strong></div>
            <div><span>현재 상태</span><strong>{availableCount <= 0 && status === 'ready' ? '본인 자금 진행 불가' : aiProcessStatusLabel(status, availableCount)}</strong></div>
            {opportunityDday !== null && <div><span>진행 기회</span><strong className={styles.aiPart1Accent}>D-{opportunityDday}</strong></div>}
            {status === 'waiting' && Number(processRow.investment_amount || 0) > 0 && <div><span>설정 금액</span><strong>{aiKrw(processRow.investment_amount)}</strong></div>}
          </div>
        </section>
        <section className={styles.aiPart1Flow}>
          <span>PROCESS FLOW</span>
          <div>
            {['분석', '탐색', '매수', '관리', '매도', '재분석'].map((label, index) => <b key={label}><i>{String(index + 1).padStart(2, '0')}</i>{label}</b>)}
          </div>
        </section>
      </>
    );
  }
'''

if old not in js:
    raise SystemExit('AI waiting block not found')
js = js.replace(old, new, 1)

marker = '/* AI PART 1 EDITORIAL */'
if marker not in css:
    css += '''\n\n/* AI PART 1 EDITORIAL */
.aiPart1Hero { margin-top:10px; padding:20px; overflow:hidden; position:relative; background:#101b31; color:#fff; border:1px solid #172744; box-shadow:0 18px 38px rgba(19,34,59,.14); }
.aiPart1Hero::after { content:""; position:absolute; width:160px; height:160px; right:-72px; top:-82px; border:1px solid rgba(84,139,255,.28); border-radius:50%; box-shadow:0 0 0 28px rgba(67,119,234,.035),0 0 0 58px rgba(67,119,234,.025); }
.aiPart1Topline { display:flex; align-items:center; justify-content:space-between; gap:12px; position:relative; z-index:1; }
.aiPart1Topline span { color:#93a9cf; font-size:8px; font-weight:900; letter-spacing:.18em; }
.aiPart1Topline b { color:#c8d7f0; font-size:8px; font-weight:800; letter-spacing:.08em; }
.aiPart1Headline { display:grid; grid-template-columns:auto 1fr; align-items:end; gap:18px; margin-top:30px; position:relative; z-index:1; }
.aiPart1Headline small { display:block; color:#93a9cf; font-size:8px; font-weight:800; }
.aiPart1Headline strong { display:flex; align-items:baseline; gap:4px; margin-top:3px; font-size:42px; line-height:.95; letter-spacing:-.07em; }
.aiPart1Headline em { font-size:12px; font-style:normal; letter-spacing:-.02em; color:#8eb4ff; }
.aiPart1Headline p { margin:0 0 3px; color:#c8d4e8; font-size:9px; line-height:1.55; text-align:right; }
.aiPart1Facts { display:grid; grid-template-columns:1.35fr .85fr; gap:1px; margin-top:22px; background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.10); position:relative; z-index:1; }
.aiPart1Facts > div { min-width:0; padding:13px 14px; background:rgba(10,21,40,.78); }
.aiPart1FactWide { grid-column:1 / -1; }
.aiPart1Facts span { display:block; color:#8096ba; font-size:8px; font-weight:800; }
.aiPart1Facts strong { display:block; margin-top:5px; color:#f7faff; font-size:12px; line-height:1.25; }
.aiPart1Accent { color:#79a7ff !important; }
.aiPart1Flow { margin-top:10px; padding:16px 17px; background:#fff; border:1px solid #dfe6ef; }
.aiPart1Flow > span { color:#8996a9; font-size:8px; font-weight:900; letter-spacing:.13em; }
.aiPart1Flow > div { display:grid; grid-template-columns:repeat(6,1fr); gap:0; margin-top:12px; }
.aiPart1Flow b { min-width:0; position:relative; padding:0 6px 0 0; color:#27354a; font-size:8px; font-weight:800; }
.aiPart1Flow b:not(:last-child)::after { content:""; position:absolute; top:7px; right:3px; width:8px; height:1px; background:#cbd5e2; }
.aiPart1Flow i { display:block; margin-bottom:5px; color:#2f6fed; font-size:7px; font-style:normal; letter-spacing:.06em; }
@media (max-width:420px){ .aiPart1Hero{padding:18px 16px;} .aiPart1Headline{grid-template-columns:1fr; gap:10px;} .aiPart1Headline p{text-align:left;} .aiPart1Facts{grid-template-columns:1fr 1fr;} .aiPart1Flow{padding:14px 12px;} .aiPart1Flow b{font-size:7px;padding-right:4px;} .aiPart1Flow b:not(:last-child)::after{right:1px;width:5px;} }
'''

js_path.write_text(js)
css_path.write_text(css)

for forbidden in ['회원님께 제공된', '자동으로 표시됩니다', '이 화면에 그대로 연결합니다', '다음 단계에서']:
    if forbidden in new:
        raise SystemExit(f'explanatory copy remains: {forbidden}')
print('AI PROCESS part 1 applied')
