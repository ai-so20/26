from pathlib import Path

js_path = Path('app/v2/V2LiveClientStage2.js')
css_path = Path('app/v2/v2-ai-live.module.css')

js = js_path.read_text()

old = '''        <section className={styles.aiProcessBrief}>
          <span>AI PROCESS</span>
          <strong>주식·코인 흐름을 6단계로 분석하고 3분 단위로 반영합니다.</strong>
          <p>분석 · 탐색 · 매수 판단 · 보유 관리 · 매도 판단 · 재분석을 반복하며, 설정된 진행기간 동안 평가금액·수익·반영 기록을 확인할 수 있습니다.</p>
        </section>
        <section className={styles.aiPart1Flow}>
          <span>진행 흐름</span>
          <div>
            {['분석', '탐색', '매수', '관리', '매도', '재분석'].map((label, index) => <b key={label}><i>{String(index + 1).padStart(2, '0')}</i>{label}</b>)}
          </div>
        </section>'''

new = '''        <section className={styles.aiIdleSection}>
          <div className={styles.aiIdleSectionHead}>
            <span>진행 구조</span>
            <h3>AI프로세스 진행 구조</h3>
            <p>AI가 시장 데이터를 분석하고 설정된 기준에 따라 단계별로 진행합니다.</p>
          </div>
          <div className={styles.aiIdleFlowGrid}>
            {[
              ['시장 분석', '시장 데이터를 분석해 현재 조건을 확인합니다.'],
              ['기회 포착', '설정 기준에 맞는 진행 구간을 탐색합니다.'],
              ['AI 진행', '선정된 조건을 기반으로 프로세스를 진행합니다.'],
              ['실시간 확인', '진행 상태와 데이터를 지속적으로 확인합니다.'],
              ['위험 관리', '설정된 기준에 따라 위험 구간을 관리합니다.'],
              ['결과 관리', '진행 결과를 확인하고 프로세스를 마무리합니다.'],
            ].map(([title, copy], index) => (
              <div key={title} className={styles.aiIdleFlowItem}>
                <i>{index + 1}</i>
                <div><strong>{title}</strong><p>{copy}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section className={`${styles.aiIdleSection} ${styles.aiIdleLimited}`}>
          <div className={styles.aiIdleLimitedMark} aria-hidden="true">◆</div>
          <div>
            <span>제한 운영</span>
            <h3>VIP 회원을 위한 제한 운영</h3>
            <p>AI PROCESS는 자체 기술과 운영 시스템을 기반으로 구성되어 있으며, VIP 회원을 위해 회원별 이용 가능 횟수와 진행 설정에 따라 개별적으로 운영됩니다.</p>
          </div>
        </section>

        <section className={styles.aiIdleSection}>
          <div className={styles.aiIdleSectionHead}>
            <span>이용 절차</span>
            <h3>AI프로세스 이용 절차</h3>
          </div>
          <div className={styles.aiIdleSteps}>
            {[
              ['카카오톡 1:1 고객센터', '진행 상담 신청'],
              ['예약 안내', '이용 가능 일정 확인'],
              ['진행 설정', 'AI 프로세스 안내'],
              ['프로세스 진행', '설정된 방식으로 진행'],
              ['결과 확인', '진행 결과 안내'],
            ].map(([title, copy], index) => (
              <div key={title} className={styles.aiIdleStep}>
                <i>{index + 1}</i>
                <strong>{title}</strong>
                <p>{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={`${styles.aiIdleSection} ${styles.aiIdleConsult}`}>
          <div>
            <span>현재 상태</span>
            <h3>현재 상태 · {availableCount > 0 ? '이용 가능' : '이용 상담 가능'}</h3>
            <p>AI프로세스 이용을 원하시면 카카오톡 1:1 고객센터로 문의해 주세요. 이용 가능 여부와 진행 방법을 개별적으로 안내해드립니다.</p>
          </div>
          <div className={styles.aiIdleConsultBar}>카카오톡 1:1 고객센터에서 AI프로세스 진행 상담을 신청해주세요.</div>
        </section>'''

if old not in js:
    raise SystemExit('target AI idle block not found')
js = js.replace(old, new, 1)
js_path.write_text(js.rstrip() + '\n')

css = css_path.read_text()
marker = '/* AI IDLE CONTENT REBUILD */'
if marker in css:
    css = css.split(marker)[0].rstrip() + '\n'

patch = r'''

/* AI IDLE CONTENT REBUILD */
.aiIdleSection {
  margin-top: 14px;
  padding: 20px 22px;
  border: 1px solid #d9e2ee;
  border-radius: 8px;
  background: #fff;
  color: #172840;
}
.aiIdleSectionHead { margin-bottom: 16px; }
.aiIdleSectionHead > span,
.aiIdleLimited span,
.aiIdleConsult span {
  display: block;
  margin-bottom: 5px;
  color: #3569ad;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: .04em;
}
.aiIdleSection h3 {
  margin: 0;
  font-size: 18px;
  line-height: 1.35;
  letter-spacing: -.035em;
}
.aiIdleSectionHead > p,
.aiIdleLimited p,
.aiIdleConsult p {
  margin: 7px 0 0;
  color: #5d6c7e;
  font-size: 12px;
  line-height: 1.7;
  word-break: keep-all;
}
.aiIdleFlowGrid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-top: 1px solid #e5ebf2;
  border-left: 1px solid #e5ebf2;
}
.aiIdleFlowItem {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  gap: 10px;
  min-height: 86px;
  padding: 15px 14px;
  border-right: 1px solid #e5ebf2;
  border-bottom: 1px solid #e5ebf2;
}
.aiIdleFlowItem > i,
.aiIdleStep > i {
  display: grid;
  place-items: center;
  width: 25px;
  height: 25px;
  border-radius: 50%;
  background: #155eb9;
  color: #fff;
  font-size: 10px;
  font-style: normal;
  font-weight: 800;
}
.aiIdleFlowItem strong { font-size: 13px; }
.aiIdleFlowItem p {
  margin: 5px 0 0;
  color: #68788c;
  font-size: 11px;
  line-height: 1.55;
  word-break: keep-all;
}
.aiIdleLimited {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 16px;
  border-color: #153f73;
  background: #0f315e;
  color: #fff;
}
.aiIdleLimitedMark {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid rgba(255,255,255,.32);
  border-radius: 10px;
  color: #f0c66c;
  font-size: 18px;
}
.aiIdleLimited span { color: #b9d5f7; }
.aiIdleLimited p { color: #d6e2f0; }
.aiIdleSteps {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0;
  padding-top: 4px;
}
.aiIdleStep {
  position: relative;
  min-width: 0;
  padding: 4px 8px 0;
  text-align: center;
}
.aiIdleStep:not(:last-child)::after {
  content: '›';
  position: absolute;
  top: 7px;
  right: -4px;
  color: #a6b5c7;
  font-size: 17px;
}
.aiIdleStep > i { margin: 0 auto 8px; }
.aiIdleStep strong {
  display: block;
  font-size: 11px;
  line-height: 1.4;
  word-break: keep-all;
}
.aiIdleStep p {
  margin: 4px 0 0;
  color: #7b8999;
  font-size: 9.5px;
  line-height: 1.45;
  word-break: keep-all;
}
.aiIdleConsult {
  border-color: #c7d6e8;
  background: #f7faff;
}
.aiIdleConsultBar {
  margin-top: 15px;
  padding: 11px 13px;
  border-top: 1px solid #d8e3ef;
  color: #234f82;
  font-size: 11px;
  font-weight: 750;
  text-align: center;
  line-height: 1.55;
}

@media (max-width: 520px) {
  .aiIdleSection {
    margin-top: 12px;
    padding: 18px 16px;
    border-radius: 6px;
  }
  .aiIdleSectionHead { margin-bottom: 14px; }
  .aiIdleSectionHead > span,
  .aiIdleLimited span,
  .aiIdleConsult span { font-size: 11px; }
  .aiIdleSection h3 { font-size: 18px; }
  .aiIdleSectionHead > p,
  .aiIdleLimited p,
  .aiIdleConsult p { font-size: 12.5px; line-height: 1.75; }
  .aiIdleFlowGrid { grid-template-columns: 1fr; }
  .aiIdleFlowItem {
    grid-template-columns: 30px minmax(0, 1fr);
    min-height: 0;
    padding: 13px 12px;
  }
  .aiIdleFlowItem strong { font-size: 13px; }
  .aiIdleFlowItem p { font-size: 11.5px; line-height: 1.6; }
  .aiIdleLimited { grid-template-columns: 38px minmax(0, 1fr); gap: 12px; }
  .aiIdleLimitedMark { width: 38px; height: 38px; }
  .aiIdleSteps {
    grid-template-columns: 1fr;
    gap: 0;
    border-top: 1px solid #e5ebf2;
  }
  .aiIdleStep {
    display: grid;
    grid-template-columns: 30px minmax(0, 1fr);
    gap: 2px 10px;
    padding: 12px 2px;
    border-bottom: 1px solid #e5ebf2;
    text-align: left;
  }
  .aiIdleStep:not(:last-child)::after { display: none; }
  .aiIdleStep > i { grid-row: 1 / span 2; margin: 0; }
  .aiIdleStep strong { align-self: end; font-size: 12.5px; }
  .aiIdleStep p { margin: 0; font-size: 11px; line-height: 1.5; }
  .aiIdleConsultBar { margin-top: 14px; font-size: 11.5px; line-height: 1.6; }
}
'''

css_path.write_text(css.rstrip() + patch.rstrip() + '\n')
