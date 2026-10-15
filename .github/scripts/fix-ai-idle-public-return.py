from pathlib import Path

p = Path('app/v2/V2LiveClientStage2.js')
s = p.read_text()
old = """  const opportunityDday = aiProcessOpportunityDday(processRow);\n  const minReturn = Math.max(0, Number(processRow.min_return || 0));\n  const maxReturn = Math.max(minReturn, Number(processRow.max_return || minReturn));\n  const configuredReturn = `${minReturn.toFixed(1)}% ~ ${maxReturn.toFixed(1)}%`;\n"""
new = """  const opportunityDday = aiProcessOpportunityDday(processRow);\n  const publicExpectedReturn = '10% ~ 1000%';\n"""
if old not in s:
    raise SystemExit('idle return variables block not found')
s = s.replace(old, new, 1)
s = s.replace('<div><span>예상 수익률</span><strong>10% ~ 1000%</strong></div>', '<div><span>예상 수익률</span><strong>{publicExpectedReturn}</strong></div>', 1)
s = s.replace("{opportunityDday !== null && <div><span>진행 기회</span><strong className={styles.aiPart1Accent}>D-{opportunityDday}</strong></div>}", "{opportunityDday !== null && <div className={styles.aiPart1FactWide}><span>진행 기회</span><strong className={styles.aiPart1Accent}>D-{opportunityDday}</strong></div>}", 1)
s = s.replace("{status === 'waiting' && Number(processRow.investment_amount || 0) > 0 && <div><span>설정 금액</span><strong>{aiKrw(processRow.investment_amount)}</strong></div>}", "{status === 'waiting' && Number(processRow.investment_amount || 0) > 0 && <div className={styles.aiPart1FactWide}><span>설정 금액</span><strong>{aiKrw(processRow.investment_amount)}</strong></div>}", 1)
p.write_text(s)
