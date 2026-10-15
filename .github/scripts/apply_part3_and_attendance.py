from pathlib import Path
import re

js_path = Path('app/v2/V2LiveClientStage2.js')
css_path = Path('app/v2/v2-ai-live.module.css')
js = js_path.read_text()
css = css_path.read_text()

js = js.replace('value={`${attendanceCycle}/10`}', 'value={`${attendanceCycle}/30`}')
js = js.replace("next_reward_at: 10", "next_reward_at: 30")
old_info = "하루 1회 출석할 수 있으며, 누적 30회 출석 달성 시 랜덤 기프티콘이 상품 지급 화면으로 지급됩니다. 출석은 매일 자정에 새로 가능하며, 연속 출석이 아니어도 누적 횟수로 인정됩니다."
new_info = "하루 1회 출석할 수 있으며, 누적 30회 출석 달성 시 3,000원 ~ 500,000원 상당 랜덤 기프티콘 혜택이 제공됩니다. 출석은 매일 자정에 새로 가능하며, 연속 출석이 아니어도 누적 횟수로 인정됩니다. 달성 안내와 지급 상품은 상품지급센터에서 확인할 수 있습니다."
if old_info not in js:
    raise SystemExit('attendance info copy marker not found')
js = js.replace(old_info, new_info)

start = js.index('      <section className={styles.aiChartCard}>')
end = js.index('      <div className={styles.twoColumnCards}>', start)
new_part3 = '''      <section className={styles.aiChartCard}>
        <div className={styles.aiPart3ChartTop}>
          <div>
            <span>PERFORMANCE</span>
            <h3>평가금액 변화</h3>
          </div>
          <div className={styles.aiPart3Current}>
            <span>현재 평가금액</span>
            <strong>{aiKrw(snapshot.totalAmount)}</strong>
          </div>
        </div>
        <div className={styles.aiPart3ChartMeta}>
          <div><span>누적 수익</span><strong>+{aiKrw(snapshot.earnedProfit)}</strong></div>
          <div><span>누적 반영</span><strong>{snapshot.elapsedSteps.toLocaleString('ko-KR')}회</strong></div>
        </div>
        <svg className={styles.aiChart} viewBox="0 0 760 220" role="img" aria-label="AI PROCESS 평가금액 그래프">
          <line className={styles.aiChartGrid} x1="18" y1="55" x2="742" y2="55" />
          <line className={styles.aiChartGrid} x1="18" y1="110" x2="742" y2="110" />
          <line className={styles.aiChartGrid} x1="18" y1="165" x2="742" y2="165" />
          {areaPoints && <polygon className={styles.aiChartArea} points={areaPoints} />}
          {snapshot.chartPoints && <polyline className={styles.aiChartLine} points={snapshot.chartPoints} />}
          {snapshot.chartPoints && (() => { const last = snapshot.chartPoints.trim().split(' ').at(-1)?.split(','); return last?.length === 2 ? <circle className={styles.aiChartDot} cx={last[0]} cy={last[1]} r="5" /> : null; })()}
        </svg>
        <div className={styles.aiPart3ChartFoot}><span>최근 최대 48개 반영 흐름</span><strong>{status === 'running' ? '진행 중' : '진행 완료'}</strong></div>
      </section>

      <section className={styles.aiPart3History}>
        <div className={styles.aiPart3HistoryHead}>
          <div><span>REFLECTION LOG</span><strong>최근 반영 내역</strong></div>
          <b>{activities.length}건</b>
        </div>
        <div className={styles.aiPart3HistoryList}>
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
        </div>
      </section>

'''
js = js[:start] + new_part3 + js[end:]

css_append = r'''

/* AI PROCESS PART 3 - performance & reflection log */
.aiPart3ChartTop { display:flex; align-items:flex-end; justify-content:space-between; gap:18px; }
.aiPart3ChartTop > div:first-child { min-width:0; }
.aiPart3ChartTop > div:first-child > span { display:block; color:#8b97a8; font-size:8px; font-weight:900; letter-spacing:.14em; }
.aiPart3ChartTop h3 { margin:4px 0 0; color:#172033; font-size:17px; letter-spacing:-.035em; }
.aiPart3Current { flex:0 0 auto; text-align:right; }
.aiPart3Current span { display:block; color:#8b97a8; font-size:8px; font-weight:750; }
.aiPart3Current strong { display:block; margin-top:4px; color:#172033; font-size:16px; letter-spacing:-.03em; }
.aiPart3ChartMeta { display:grid; grid-template-columns:1fr 1fr; gap:1px; margin:14px 0 2px; background:#e8edf4; border:1px solid #e8edf4; }
.aiPart3ChartMeta > div { padding:10px 12px; background:#f9fbfd; }
.aiPart3ChartMeta span { display:block; color:#8d98a8; font-size:8px; font-weight:750; }
.aiPart3ChartMeta strong { display:block; margin-top:4px; color:#2b394e; font-size:11px; }
.aiPart3ChartMeta > div:first-child strong { color:#16805d; }
.aiPart3ChartFoot { display:flex; align-items:center; justify-content:space-between; gap:12px; padding-top:9px; border-top:1px solid #edf1f5; color:#8e99a8; font-size:8px; }
.aiPart3ChartFoot strong { color:#42516a; font-size:8px; }
.aiPart3History { margin-top:10px; border:1px solid #dfe5ec; background:#fff; overflow:hidden; }
.aiPart3HistoryHead { display:flex; align-items:flex-end; justify-content:space-between; gap:12px; padding:15px 16px 13px; border-bottom:1px solid #e9eef4; }
.aiPart3HistoryHead > div { display:grid; gap:3px; }
.aiPart3HistoryHead span { color:#8b97a8; font-size:8px; font-weight:900; letter-spacing:.13em; }
.aiPart3HistoryHead strong { color:#172033; font-size:15px; letter-spacing:-.03em; }
.aiPart3HistoryHead > b { color:#6d7b90; font-size:9px; }
.aiPart3HistoryList { display:grid; }
.aiPart3HistoryRow { display:grid; grid-template-columns:44px 16px minmax(0,1fr) auto; align-items:center; gap:8px; min-width:0; padding:12px 15px; border-bottom:1px solid #edf1f5; }
.aiPart3HistoryRow:last-child { border-bottom:0; }
.aiPart3Index { display:grid; justify-items:start; gap:1px; }
.aiPart3Index span { color:#2f6fed; font-size:13px; font-weight:900; line-height:1; }
.aiPart3Index small { color:#a0a9b6; font-size:7px; font-weight:800; }
.aiPart3Rail { position:relative; align-self:stretch; display:grid; place-items:center; }
.aiPart3Rail::before { content:""; position:absolute; top:-12px; bottom:-12px; width:1px; background:#dce5ef; }
.aiPart3HistoryRow:first-child .aiPart3Rail::before { top:50%; }
.aiPart3HistoryRow:last-child .aiPart3Rail::before { bottom:50%; }
.aiPart3Rail i { position:relative; z-index:1; width:8px; height:8px; border:3px solid #dce9ff; border-radius:50%; background:#2f6fed; box-sizing:content-box; }
.aiPart3HistoryCopy { min-width:0; display:grid; gap:4px; }
.aiPart3HistoryCopy > strong { overflow:hidden; color:#263348; font-size:10px; text-overflow:ellipsis; white-space:nowrap; }
.aiPart3HistoryCopy > span { font-size:9px; font-weight:850; }
.aiPart3Positive { color:#16805d; }
.aiPart3Negative { color:#c34f58; }
.aiPart3HistoryValue { min-width:0; text-align:right; }
.aiPart3HistoryValue span { display:block; color:#9aa4b2; font-size:7px; }
.aiPart3HistoryValue strong { display:block; margin-top:3px; color:#46556b; font-size:9px; white-space:nowrap; }
@media (max-width:420px) {
  .aiPart3ChartTop { align-items:flex-start; }
  .aiPart3Current strong { font-size:13px; }
  .aiPart3HistoryRow { grid-template-columns:36px 14px minmax(0,1fr); padding:11px 12px; gap:7px; }
  .aiPart3HistoryValue { grid-column:3; text-align:left; padding-top:3px; }
  .aiPart3HistoryValue span { display:inline; margin-right:5px; }
  .aiPart3HistoryValue strong { display:inline; font-size:8px; }
}
'''
if 'AI PROCESS PART 3 - performance & reflection log' not in css:
    css += css_append

js_path.write_text(js)
css_path.write_text(css)
print('patched part3 + attendance copy')
