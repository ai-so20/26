from pathlib import Path

js_path = Path('app/v2/V2LiveClientStage2.js')
css_path = Path('app/v2/v2-live.module.css')

js = js_path.read_text()
css = css_path.read_text()

old = 'return <span className={styles.eventMotionIcon} aria-hidden="true"><svg viewBox="0 0 24 24">{paths[type] || paths.gift_box}</svg></span>;'
new = 'return <span className={styles.eventMotionIcon} data-event-type={type || \'gift_box\'} aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">{paths[type] || paths.gift_box}</svg></span>;'
if old not in js:
    raise SystemExit('EventTypeIcon return marker not found')
js = js.replace(old, new, 1)

marker = '/* EVENT MOTION ICONS V2 */'
if marker not in css:
    css += r'''

/* EVENT MOTION ICONS V2 */
.eventMotionIcon {
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  display: inline-grid;
  place-items: center;
  position: relative;
  overflow: hidden;
  border: 1px solid #d9e5f6;
  border-radius: 11px;
  background: #f7f9fc;
  color: #2f6fed;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,.75), 0 5px 14px rgba(42,71,111,.06);
  transform: translateZ(0);
}
.eventMotionIcon::after {
  content: "";
  position: absolute;
  width: 18px;
  height: 18px;
  border: 1px solid currentColor;
  border-radius: 50%;
  opacity: .08;
  transform: scale(.75);
  animation: eventIconHalo 2.8s ease-in-out infinite;
}
.eventMotionIcon svg {
  width: 20px;
  height: 20px;
  position: relative;
  z-index: 1;
  fill: none !important;
  stroke: currentColor !important;
  stroke-width: 1.85;
  stroke-linecap: round;
  stroke-linejoin: round;
  overflow: visible;
}
.eventMotionIcon[data-event-type="gift_box"] { color: #315fce; background: #f3f6fd; }
.eventMotionIcon[data-event-type="gift_box"] svg { animation: eventGiftFloat 2.6s ease-in-out infinite; }
.eventMotionIcon[data-event-type="number"] { color: #2563eb; background: #f3f7ff; }
.eventMotionIcon[data-event-type="number"] svg { animation: eventTargetPulse 2.35s ease-in-out infinite; transform-origin: center; }
.eventMotionIcon[data-event-type="roulette"] { color: #4158c7; background: #f5f6fc; }
.eventMotionIcon[data-event-type="roulette"] svg { animation: eventRouletteSpin 6.5s linear infinite; transform-origin: 12px 12px; }
.eventMotionIcon[data-event-type="first_come"] { color: #1974c9; background: #f2f8fc; }
.eventMotionIcon[data-event-type="first_come"] svg { animation: eventBoltNudge 2.1s ease-in-out infinite; }
.eventMotionIcon[data-event-type="quiz"] { color: #168080; background: #f1f8f8; }
.eventMotionIcon[data-event-type="quiz"] svg { animation: eventQuizThink 2.5s ease-in-out infinite; transform-origin: center; }
.eventMotionIcon[data-event-type="draw"] { color: #5367c9; background: #f5f6fc; }
.eventMotionIcon[data-event-type="draw"] svg { animation: eventTicketSlide 2.8s ease-in-out infinite; }

@keyframes eventIconHalo {
  0%,100% { transform: scale(.72); opacity: .04; }
  50% { transform: scale(1.28); opacity: .13; }
}
@keyframes eventGiftFloat {
  0%,100% { transform: translateY(0) rotate(0); }
  45% { transform: translateY(-1.8px) rotate(-2deg); }
  65% { transform: translateY(-1px) rotate(2deg); }
}
@keyframes eventTargetPulse {
  0%,100% { transform: scale(1); }
  50% { transform: scale(1.09); }
}
@keyframes eventRouletteSpin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
@keyframes eventBoltNudge {
  0%,100% { transform: translate(0,0); }
  45% { transform: translate(1px,-1px); }
  55% { transform: translate(-.5px,.5px); }
}
@keyframes eventQuizThink {
  0%,100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-1.2px) scale(1.04); }
}
@keyframes eventTicketSlide {
  0%,100% { transform: translateX(0); }
  50% { transform: translateX(1.2px); }
}
@media (prefers-reduced-motion: reduce) {
  .eventMotionIcon::after,
  .eventMotionIcon svg { animation: none !important; }
}
'''

js_path.write_text(js)
css_path.write_text(css)
print('event motion icons refined')
