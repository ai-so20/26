from pathlib import Path

path = Path('app/v2/V2LiveClientStage2.js')
s = path.read_text()
old = "const styles = { ...baseStyles, ...extraStyles, ...liveStyles, ...aiStyles };"
new = """const styleModules = [baseStyles, extraStyles, liveStyles, aiStyles];
const styles = Object.fromEntries(
  [...new Set(styleModules.flatMap((moduleStyles) => Object.keys(moduleStyles)))].map((key) => [
    key,
    styleModules.map((moduleStyles) => moduleStyles[key]).filter(Boolean).join(' '),
  ]),
);"""
if old not in s:
    raise SystemExit('styles merge target not found')
s = s.replace(old, new, 1)
path.write_text(s)
print('CSS module class collisions fixed by composing class names')
