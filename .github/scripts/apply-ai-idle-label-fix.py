from pathlib import Path

js_path = Path('app/v2/V2LiveClientStage2.js')
css_path = Path('app/v2/v2-ai-live.module.css')

js = js_path.read_text()
old = "<div><span>예상 수익률</span><strong>{availableCount > 0 || status === 'waiting' ? configuredReturn : '회원별 설정'}</strong></div>"
new = "<div><span>예상 수익률</span><strong>10% ~ 1000%</strong></div>"
if old not in js:
    raise SystemExit('expected return target not found')
js = js.replace(old, new, 1)
js_path.write_text(js.rstrip() + '\n')

css = css_path.read_text()
marker = '/* AI IDLE LABEL FIX */'
patch = r'''

/* AI IDLE LABEL FIX */
.aiPart1Headline small {
  white-space: nowrap;
  word-break: keep-all;
  writing-mode: horizontal-tb;
}
@media (max-width: 520px) {
  .aiPart1Headline small {
    min-width: max-content;
    font-size: 11px;
  }
}
'''
if marker in css:
    css = css.split(marker)[0].rstrip() + '\n'
css_path.write_text(css.rstrip() + patch.rstrip() + '\n')
