const fs = require('fs');

const jsPath = 'app/v2/V2LiveClientStage2.js';
const cssPath = 'app/v2/v2-ai-live.module.css';
let js = fs.readFileSync(jsPath, 'utf8');
let css = fs.readFileSync(cssPath, 'utf8');

const oldBlock = `      <section className={styles.balanceCard}>
        <div className={styles.balanceTop}>
          <div><span>현재 평가금액</span><strong>{Math.round(snapshot.totalAmount).toLocaleString('ko-KR')}<small>원</small></strong></div>
          <span className={styles.processBadge}>{status === 'running' ? '● 진행중' : '✓ 진행완료'}</span>
        </div>
        <div className={styles.balanceMeta}>
          <div><span>투자금</span><strong>{aiKrw(snapshot.investment)}</strong></div>
          <div><span>누적 수익</span><strong className={styles.positive}>+{aiKrw(snapshot.earnedProfit)}</strong></div>
          <div><span>현재 수익률</span><strong className={styles.positive}>+{snapshot.currentReturn.toFixed(2)}%</strong></div>
        </div>
      </section>

      {status === 'completed' && <div className={styles.aiResultBar}><span>출금예정금액</span><strong>{aiKrw(snapshot.totalAmount)}</strong></div>}

      <section className={styles.aiProgressCard}>
        <div className={styles.aiProgressTop}><div><span className={styles.aiEyebrow}>PROCESS PROGRESS</span><h3>{status === 'completed' ? 'AI프로세스 진행이 완료되었습니다.' : 'AI프로세스가 진행 중입니다.'}</h3></div><span className={status === 'completed' ? styles.aiStatusComplete : styles.aiStatusPill}>{status === 'completed' ? 'COMPLETE' : 'ACTIVE'}</span></div>
        <div className={styles.aiProgressTrack}><span style={{ width: \`${snapshot.progress}%\` }} /></div>
        <div className={styles.aiProgressMeta}><span>진행률 {snapshot.progress.toFixed(2)}%</span><span>{snapshot.remainingText}</span></div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}><div><span>AI 진행 구조</span><strong>분석부터 재분석까지</strong></div></div>
        <div className={styles.processRail}>
          {stageLabels.map((label, index) => <div key={label} className={\`${styles.processStep} ${index === activeStageIndex || status === 'completed' ? styles.processStepActive : ''}\`}><span>{index + 1}</span><strong>{label}</strong><small>{index === activeStageIndex && status === 'running' ? '진행 중' : status === 'completed' ? '완료' : '대기'}</small></div>)}
        </div>
      </section>`;

const newBlock = `      <section className={styles.aiPart2Hero}>
        <div className={styles.aiPart2Topline}>
          <span>AI PROCESS · {status === 'running' ? 'RUNNING' : 'COMPLETE'}</span>
          <b>{status === 'running' ? 'LIVE' : 'DONE'}</b>
        </div>
        <div className={styles.aiPart2Primary}>
          <div>
            <span>현재 평가금액</span>
            <strong>{Math.round(snapshot.totalAmount).toLocaleString('ko-KR')}<em>원</em></strong>
          </div>
          <div className={styles.aiPart2Return}>
            <span>누적 수익률</span>
            <strong>+{snapshot.currentReturn.toFixed(2)}%</strong>
          </div>
        </div>
        <div className={styles.aiPart2Bento}>
          <div className={styles.aiPart2Investment}><span>투자금</span><strong>{aiKrw(snapshot.investment)}</strong></div>
          <div className={styles.aiPart2Profit}><span>누적 수익</span><strong>+{aiKrw(snapshot.earnedProfit)}</strong></div>
          <div className={styles.aiPart2Progress}>
            <div><span>진행률</span><strong>{snapshot.progress.toFixed(2)}%</strong></div>
            <i><b style={{ width: \`${snapshot.progress}%\` }} /></i>
          </div>
          <div className={styles.aiPart2Remain}><span>남은 시간</span><strong>{status === 'running' ? snapshot.remainingText : '완료'}</strong></div>
          <div className={styles.aiPart2Duration}><span>설정 진행기간</span><strong>{aiProcessDurationLabel(processRow.duration_hours)}</strong></div>
        </div>
      </section>

      {status === 'completed' && <div className={styles.aiResultBar}><span>출금예정금액</span><strong>{aiKrw(snapshot.totalAmount)}</strong></div>}

      <section className={styles.aiStageBoard}>
        <div className={styles.aiStageHead}><span>PROCESS FLOW</span><strong>{status === 'completed' ? '진행 완료' : stageLabels[activeStageIndex]}</strong></div>
        <div className={styles.aiStageTrack}>
          {stageLabels.map((label, index) => {
            const active = index === activeStageIndex && status === 'running';
            const done = status === 'completed' || index < activeStageIndex;
            return <div key={label} className={\`${styles.aiStageItem} ${active ? styles.aiStageItemActive : ''} ${done ? styles.aiStageItemDone : ''}\`}><i>{String(index + 1).padStart(2, '0')}</i><span>{label}</span><b>{active ? '진행 중' : done ? '완료' : '대기'}</b></div>;
          })}
        </div>
      </section>`;

if (!js.includes(oldBlock)) throw new Error('AI PROCESS part 2 source block not found');
js = js.replace(oldBlock, newBlock);

const marker = '/* AI PROCESS PART 2 - editorial data */';
if (!css.includes(marker)) {
  css += `\n\n${marker}\n.aiPart2Hero { margin-top:10px; padding:20px; overflow:hidden; border:1px solid #172b4d; background:#0d1b31; color:#fff; box-shadow:0 16px 34px rgba(13,27,49,.14); }\n.aiPart2Topline { display:flex; align-items:center; justify-content:space-between; gap:12px; color:#91a4bf; font-size:8px; font-weight:900; letter-spacing:.15em; }\n.aiPart2Topline b { padding:5px 8px; border:1px solid rgba(86,154,255,.35); background:rgba(47,111,237,.15); color:#87b5ff; font-size:8px; letter-spacing:.12em; }\n.aiPart2Primary { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:18px; align-items:end; padding:25px 0 20px; border-bottom:1px solid rgba(255,255,255,.1); }\n.aiPart2Primary > div:first-child span,.aiPart2Return span,.aiPart2Bento span { display:block; color:#91a4bf; font-size:9px; font-weight:750; }\n.aiPart2Primary > div:first-child strong { display:block; margin-top:7px; font-size:34px; line-height:1; letter-spacing:-.055em; white-space:nowrap; }\n.aiPart2Primary > div:first-child em { margin-left:5px; color:#91a4bf; font-size:12px; font-style:normal; font-weight:700; letter-spacing:-.02em; }\n.aiPart2Return { text-align:right; }\n.aiPart2Return strong { display:block; margin-top:6px; color:#6ee7b7; font-size:24px; line-height:1; letter-spacing:-.04em; }\n.aiPart2Bento { display:grid; grid-template-columns:1.15fr .85fr; grid-template-areas:'investment profit' 'progress progress' 'remain duration'; gap:1px; margin-top:1px; background:rgba(255,255,255,.09); }\n.aiPart2Bento > div { min-width:0; padding:14px 13px; background:#101f37; }\n.aiPart2Bento strong { display:block; margin-top:6px; color:#f7f9fc; font-size:14px; letter-spacing:-.025em; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }\n.aiPart2Investment { grid-area:investment; } .aiPart2Profit { grid-area:profit; } .aiPart2Progress { grid-area:progress; } .aiPart2Remain { grid-area:remain; } .aiPart2Duration { grid-area:duration; }\n.aiPart2Profit strong { color:#6ee7b7; }\n.aiPart2Progress > div { display:flex; align-items:end; justify-content:space-between; gap:12px; }\n.aiPart2Progress > div strong { margin:0; color:#8bb8ff; font-size:18px; }\n.aiPart2Progress > i { display:block; height:5px; margin-top:10px; overflow:hidden; background:#1e3150; }\n.aiPart2Progress > i b { display:block; height:100%; background:#4384f5; transition:width .25s ease; }\n.aiStageBoard { margin-top:10px; border-top:2px solid #172033; border-bottom:1px solid #dfe5ec; background:#fff; }\n.aiStageHead { display:flex; align-items:end; justify-content:space-between; gap:12px; padding:14px 2px 12px; }\n.aiStageHead span { color:#8b96a5; font-size:8px; font-weight:900; letter-spacing:.15em; }\n.aiStageHead strong { color:#172033; font-size:15px; letter-spacing:-.035em; }\n.aiStageTrack { display:grid; }\n.aiStageItem { position:relative; display:grid; grid-template-columns:38px minmax(0,1fr) auto; align-items:center; gap:10px; min-height:48px; border-top:1px solid #edf1f5; color:#7f8a99; }\n.aiStageItem i { color:#a0a9b6; font-size:9px; font-style:normal; font-weight:850; letter-spacing:.08em; }\n.aiStageItem span { color:#445166; font-size:11px; font-weight:850; }\n.aiStageItem b { color:#a0a9b6; font-size:8px; font-weight:800; }\n.aiStageItemActive { background:linear-gradient(90deg,#f1f6ff 0,#fff 72%); }\n.aiStageItemActive::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px; background:#2f6fed; }\n.aiStageItemActive i,.aiStageItemActive span,.aiStageItemActive b { color:#2f6fed; }\n.aiStageItemDone i,.aiStageItemDone b { color:#16815f; }\n@media (max-width:420px) { .aiPart2Hero{padding:17px 15px;} .aiPart2Primary{gap:10px;} .aiPart2Primary > div:first-child strong{font-size:29px;} .aiPart2Return strong{font-size:20px;} .aiPart2Bento{grid-template-columns:1.1fr .9fr;} .aiStageItem{grid-template-columns:34px minmax(0,1fr) auto;} }\n`;
}

fs.writeFileSync(jsPath, js);
fs.writeFileSync(cssPath, css);
console.log('AI PROCESS part 2 patched');