from pathlib import Path

js_path = Path('app/v2/V2LiveClientStage2.js')
css_path = Path('app/v2/v2-live.module.css')
js = js_path.read_text()
css = css_path.read_text()

js = js.replace("  const remainder = attendanceTotal % 10;\n  const attendanceCycle = remainder === 0 && attendanceTotal > 0 ? (attendanceStatus?.checked_today ? 10 : 0) : remainder;", "  const remainder = attendanceTotal % 30;\n  const attendanceCycle = remainder === 0 && attendanceTotal > 0 ? (attendanceStatus?.checked_today ? 30 : 0) : remainder;")

old = '''          <section className={styles.attendanceCardLarge}>
            <div className={styles.attendanceHeader}><div><span className={styles.cardKicker}>VIP DAILY CHECK-IN</span><h3>매일 출석 혜택</h3></div><strong className={styles.attendanceCount}>{attendanceCycle}<small>/10</small></strong></div>
            <div className={styles.progressTrack}><span style={{ width: `${Math.min(100, attendanceCycle * 10)}%` }} /></div>
            <div className={styles.attendanceDots}>{Array.from({ length: 10 }).map((_, index) => { const done = index < attendanceCycle; return <span key={index} className={done ? styles.attendanceDotDone : ''}>{done && <i className={styles.attendanceStamp}>✓</i>}<b>{index + 1}</b></span>; })}</div>
            <p>하루 1회 출석할 수 있으며, 10회 출석 달성 시 랜덤 기프티콘이 상품 지급 화면으로 안내됩니다.</p>
            <button type="button" onClick={onAttendance} disabled={attendanceWorking || attendanceStatus.checked_today} className={styles.primaryButtonWide}>{attendanceWorking ? '처리 중' : attendanceStatus.checked_today ? '✓ 오늘 출석 완료' : '오늘 출석하기'}</button>
          </section>
          <section className={styles.infoCard}><span className={styles.infoIcon}>i</span><div><strong>출석 보상 안내</strong><p>현재 {attendanceCycle}/10 · 10회 달성마다 랜덤 기프티콘이 자동 지급됩니다.</p></div></section>'''

new = '''          <section className={styles.attendanceCardLarge}>
            <div className={styles.attendanceHeader}><div><span className={styles.cardKicker}>VIP DAILY CHECK-IN</span><h3>매일 출석 혜택</h3><p className={styles.attendanceLead}>매일 한 번씩 출석하고, 누적 30회 달성 혜택을 받아보세요.</p></div><strong className={styles.attendanceCount}>{attendanceCycle}<small>/30</small></strong></div>
            <div className={styles.progressTrack}><span style={{ width: `${Math.min(100, (attendanceCycle / 30) * 100)}%` }} /></div>
            <div className={styles.attendanceRemaining}>🎁 보상까지 <strong>{Math.max(0, 30 - attendanceCycle)}회</strong> 남았어요!</div>
            <div className={styles.attendanceThirtyGrid}>{Array.from({ length: 30 }).map((_, index) => { const done = index < attendanceCycle; return <span key={index} className={`${styles.attendanceThirtyCell} ${done ? styles.attendanceThirtyDone : ''}`}><b>{index + 1}</b>{done && <i className={styles.attendanceThirtyStamp}>✓</i>}</span>; })}</div>
            <button type="button" onClick={onAttendance} disabled={attendanceWorking || attendanceStatus.checked_today} className={styles.primaryButtonWide}>{attendanceWorking ? '처리 중' : attendanceStatus.checked_today ? '✓ 오늘 출석 완료' : '오늘 출석하기'}</button>
          </section>
          <section className={styles.infoCard}><span className={styles.infoIcon}>i</span><div><strong>매일 출석 이벤트 안내</strong><p>하루 1회 출석할 수 있으며, 누적 30회 출석 달성 시 랜덤 기프티콘이 상품 지급 화면으로 지급됩니다. 출석은 매일 자정에 새로 가능하며, 연속 출석이 아니어도 누적 횟수로 인정됩니다.</p></div></section>'''

if old not in js:
    raise SystemExit('attendance UI block not found')
js = js.replace(old, new)

marker = '/* attendance 30-day grid */'
if marker not in css:
    css += '''\n\n/* attendance 30-day grid */
.attendanceLead { margin:6px 0 0; color:#7b8797; font-size:9px; line-height:1.5; }
.attendanceRemaining { margin:9px 0 12px; color:#6c5a2f; font-size:9px; font-weight:750; }
.attendanceRemaining strong { color:#2f6fed; }
.attendanceThirtyGrid { display:grid; grid-template-columns:repeat(6,minmax(0,1fr)); gap:6px; margin:12px 0 4px; }
.attendanceThirtyCell { position:relative; aspect-ratio:1/1; min-width:0; display:grid; place-items:center; overflow:hidden; border:1px solid #dfe6ef; border-radius:10px; background:#f8fafc; color:#8c98a8; font-size:8px; font-weight:850; }
.attendanceThirtyCell b { position:relative; z-index:1; font:inherit; }
.attendanceThirtyDone { border-color:#9ab8fb; background:#eef4ff; color:#2f6fed; }
.attendanceThirtyStamp { position:absolute; inset:50% auto auto 50%; transform:translate(-50%,-50%) rotate(-10deg); width:24px; height:24px; display:grid; place-items:center; border:2px solid #2f6fed; border-radius:50%; background:rgba(255,255,255,.88); color:#2f6fed; font-size:14px; font-style:normal; font-weight:950; opacity:.96; }
.attendanceThirtyDone b { position:absolute; right:4px; bottom:3px; font-size:7px; }
@media (max-width:420px) { .attendanceThirtyGrid { grid-template-columns:repeat(5,minmax(0,1fr)); gap:5px; } .attendanceThirtyCell { border-radius:9px; } }
'''

js_path.write_text(js)
css_path.write_text(css)
print('attendance 30-day UI patched')
