from pathlib import Path
import re

reward_path = Path('app/v2/reward/RewardLiveClient.js')
css_path = Path('app/v2/reward/reward-live.module.css')
stage2_path = Path('app/v2/V2LiveClientStage2.js')
bridge_path = Path('app/v2/V2RewardBridge.js')

reward = reward_path.read_text()
css = css_path.read_text()
stage2 = stage2_path.read_text()
bridge = bridge_path.read_text()

# Naming: 상품지급센터
reward = reward.replace('상품 지급 정보를 확인하고 있습니다.', '상품지급센터 정보를 확인하고 있습니다.')
reward = reward.replace('회원 입장 후 상품 지급 내역을 확인할 수 있습니다.', '회원 입장 후 상품지급센터를 확인할 수 있습니다.')
reward = reward.replace('>상품 지급</button>', '>상품지급센터</button>')
reward = reward.replace('<div><span className={styles.kicker}>REWARD</span><h1>상품 지급</h1></div>', '<div><span className={styles.kicker}>REWARD CENTER</span><h1>상품지급센터</h1></div>')
reward = reward.replace('<div><span>입장 시 새 메시지</span><strong>{unreadAtOpen}<small>건</small></strong></div>', '<div><span>미확인 안내</span><strong>{unreadAtOpen}<small>건</small></strong></div>')
reward = reward.replace('<div><span>상품 지급 내역</span><strong>{giftCount}<small>건</small></strong></div>', '<div><span>지급 상품</span><strong>{giftCount}<small>건</small></strong></div>')
reward = reward.replace('<div><span>전체 메시지</span><strong>{messages.length}<small>건</small></strong></div>', '<div><span>전체 안내</span><strong>{messages.length}<small>건</small></strong></div>')
reward = reward.replace('<div><span>VIP REWARD INBOX</span><strong>상품 지급 내역</strong></div>', '<div><span>VIP REWARD CENTER</span><strong>지급 및 당첨 안내</strong></div>')
reward = reward.replace('아직 도착한 상품 지급 내역이 없습니다.', '아직 도착한 지급 안내가 없습니다.')

member_marker = '''          ) : (\n            <>\n              <section className={styles.summary}>'''
if member_marker not in reward:
    raise SystemExit('member reward marker not found')
welcome = '''          ) : (\n            <>\n              <section className={styles.rewardWelcome}>\n                <div className={styles.rewardWelcomeTop}>\n                  <span>VIP EVENT BENEFITS</span>\n                  <strong>{String(profile?.nickname || profile?.display_name || profile?.name || 'VIP 회원')}님, 환영합니다.</strong>\n                  <p>VIP 이벤트 혜택과 당첨 상품 지급 내역을 상품지급센터에서 확인할 수 있습니다.</p>\n                </div>\n\n                <div className={styles.rewardBenefitPanel}>\n                  <strong>VIP 이벤트 참여 안내</strong>\n                  <div className={styles.rewardBenefitRow}>\n                    <span className={styles.rewardBenefitIcon}>24</span>\n                    <div><b>시간별 이벤트 · 매일 24회</b><p>매일 00:00 ~ 24:00, 총 하루 24회차 이벤트가 진행됩니다. 회차당 1회 참여할 수 있으며 당첨 시 3,000원 ~ 300,000원 상당 랜덤 기프티콘이 지급됩니다.</p></div>\n                  </div>\n                  <div className={styles.rewardBenefitRow}>\n                    <span className={styles.rewardBenefitIcon}>30</span>\n                    <div><b>출석 이벤트 · 누적 30회</b><p>하루 1회 출석할 수 있으며, 누적 30회 출석 달성 시 3,000원 ~ 500,000원 상당 랜덤 기프티콘 혜택이 제공됩니다. 연속 출석이 아니어도 누적 횟수로 인정됩니다.</p></div>\n                  </div>\n                  <p className={styles.rewardBenefitFoot}>당첨 상품과 출석 달성 보상은 이곳 상품지급센터에서 바로 안내·지급됩니다.</p>\n                </div>\n\n                <div className={styles.rewardQuickLinks}>\n                  <button type="button" onClick={() => goTab('event')}><span>EVENT</span><strong>시간별 이벤트</strong></button>\n                  <button type="button" onClick={() => goTab('event')}><span>CHECK-IN</span><strong>출석 이벤트</strong></button>\n                </div>\n\n                <div className={styles.rewardAlert}>\n                  <span className={styles.rewardAlertBell} aria-hidden="true">\n                    <svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>\n                  </span>\n                  <div><strong>이벤트 당첨 알림</strong><p>상단 알림을 허용하면 이벤트 당첨 및 상품 지급 안내를 바로 확인할 수 있습니다.</p></div>\n                </div>\n              </section>\n\n              <section className={styles.summary}>'''
reward = reward.replace(member_marker, welcome, 1)

footer_marker = '''                </div>\n              </section>\n            </>'''
if footer_marker not in reward:
    raise SystemExit('reward footer marker not found')
footer = '''                </div>\n              </section>\n\n              <section className={styles.rewardFooterNotice}>\n                <strong>이벤트 당첨 시 이곳에서 즉시 상품이 지급됩니다.</strong>\n                <p>궁금한 사항은 카카오톡 1:1 고객센터로 문의해주세요.</p>\n              </section>\n            </>'''
reward = reward.replace(footer_marker, footer, 1)

# Main navigation label
stage2 = stage2.replace("{ id: 'private', label: '상품 지급' }", "{ id: 'private', label: '상품지급센터' }")
stage2 = stage2.replace("{ id: 'private', label: '상품 지급',", "{ id: 'private', label: '상품지급센터',")

# Reward bridge must accept the new label.
old_bridge = "if (String(button.textContent || '').trim() !== '상품 지급') return;"
new_bridge = "if (!['상품 지급', '상품지급센터'].includes(String(button.textContent || '').trim())) return;"
if old_bridge in bridge:
    bridge = bridge.replace(old_bridge, new_bridge)

# Public-facing support naming across app source. Avoid double-prefixing existing Kakao copy.
for path in Path('app').rglob('*'):
    if not path.is_file() or path.suffix not in {'.js', '.jsx', '.ts', '.tsx'}:
        continue
    text = path.read_text()
    replaced = re.sub(r'(?<!카카오톡 )1:1 고객센터', '카카오톡 1:1 고객센터', text)
    if path == reward_path:
        reward = replaced if text == reward else reward
    elif path == stage2_path:
        stage2 = replaced if text == stage2 else stage2
    elif path == bridge_path:
        bridge = replaced if text == bridge else bridge
    elif replaced != text:
        path.write_text(replaced)

css_append = r'''

/* PRODUCT REWARD CENTER */
.rewardWelcome {
  margin-bottom: 10px;
  overflow: hidden;
  border: 1px solid #dbe4f0;
  background: #ffffff;
  box-shadow: 0 10px 28px rgba(31,45,61,.055);
}
.rewardWelcomeTop { padding: 18px 18px 15px; border-bottom: 1px solid #e9eef5; }
.rewardWelcomeTop > span { display:block; color:#2f6fed; font-size:8px; font-weight:900; letter-spacing:.14em; }
.rewardWelcomeTop > strong { display:block; margin-top:8px; color:#172033; font-size:18px; letter-spacing:-.035em; }
.rewardWelcomeTop > p { margin:7px 0 0; color:#718096; font-size:10px; line-height:1.65; }
.rewardBenefitPanel { margin:14px; padding:15px; border:1px solid #dce6f6; background:#f7f9fd; }
.rewardBenefitPanel > strong { display:block; color:#20304a; font-size:11px; }
.rewardBenefitRow { display:grid; grid-template-columns:34px minmax(0,1fr); gap:10px; margin-top:13px; align-items:start; }
.rewardBenefitIcon { width:34px; height:34px; display:grid; place-items:center; border:1px solid #ccdaf1; background:#fff; color:#2f6fed; font-size:9px; font-weight:900; }
.rewardBenefitRow b { display:block; color:#27364d; font-size:10px; }
.rewardBenefitRow p { margin:4px 0 0; color:#66758a; font-size:9px; line-height:1.68; }
.rewardBenefitFoot { margin:14px 0 0; padding-top:12px; border-top:1px solid #dfe7f2; color:#53657e; font-size:9px; line-height:1.65; font-weight:700; }
.rewardQuickLinks { display:grid; grid-template-columns:1fr 1fr; gap:8px; padding:0 14px 14px; }
.rewardQuickLinks button { min-width:0; padding:13px 12px; border:1px solid #dce4ee; background:#fff; color:#26354c; text-align:left; cursor:pointer; }
.rewardQuickLinks button span { display:block; color:#2f6fed; font-size:7px; font-weight:900; letter-spacing:.1em; }
.rewardQuickLinks button strong { display:block; margin-top:4px; font-size:10px; }
.rewardAlert { margin:0 14px 14px; padding:13px; display:grid; grid-template-columns:38px minmax(0,1fr); gap:11px; align-items:center; border:1px solid #cddbf2; background:#eef4ff; }
.rewardAlertBell { width:38px; height:38px; display:grid; place-items:center; background:#fff; border:1px solid #d6e1f4; }
.rewardAlertBell svg { width:19px; height:19px; fill:none; stroke:#2f6fed; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
.rewardAlert strong { display:block; color:#20314c; font-size:10px; }
.rewardAlert p { margin:4px 0 0; color:#5f718d; font-size:9px; line-height:1.55; }
.rewardFooterNotice { margin-top:10px; padding:16px 14px; border-top:2px solid #172033; border-bottom:1px solid #dfe5ed; background:#fff; text-align:center; }
.rewardFooterNotice strong { display:block; color:#1e2d43; font-size:11px; letter-spacing:-.02em; }
.rewardFooterNotice p { margin:5px 0 0; color:#6f7d90; font-size:9px; line-height:1.6; }
@media (max-width:420px) {
  .rewardWelcomeTop { padding:16px 14px 13px; }
  .rewardWelcomeTop > strong { font-size:16px; }
  .rewardBenefitPanel { margin:11px; padding:13px; }
  .rewardQuickLinks { padding:0 11px 11px; gap:7px; }
  .rewardAlert { margin:0 11px 11px; }
}
'''
if '/* PRODUCT REWARD CENTER */' not in css:
    css += css_append

reward_path.write_text(reward)
css_path.write_text(css)
stage2_path.write_text(stage2)
bridge_path.write_text(bridge)

# Guardrails: receiving functions and reward parsing must remain.
required = [
    "get_or_create_admin_chat",
    "mark_private_chat_read",
    "get_my_private_unread_count",
    "[[GIFT_REWARD]]",
    "[[IMAGE]]",
    "private_messages",
]
final_reward = reward_path.read_text()
for token in required:
    if token not in final_reward:
        raise SystemExit(f'missing guardrail: {token}')

print('reward center refinement applied')
