from pathlib import Path
import re

def clean(text):
    return '\n'.join(line.rstrip() for line in text.splitlines()) + '\n'

# 1) Main V2: render reward center inline instead of redirect placeholder
p = Path('app/v2/V2LiveClientStage2.js')
s = p.read_text()
if "import RewardLiveClient from './reward/RewardLiveClient';" not in s:
    s = s.replace("import aiStyles from './v2-ai-live.module.css';", "import aiStyles from './v2-ai-live.module.css';\nimport RewardLiveClient from './reward/RewardLiveClient';")
s = s.replace("{activeTab === 'private' && <PrivatePreview />}", "{activeTab === 'private' && <RewardLiveClient embedded embeddedUser={user} embeddedProfile={profile} onNavigateTab={(tab) => { setActiveTab(tab); try { window.sessionStorage.setItem('vip-active-tab', tab); } catch {} }} />}")
p.write_text(clean(s))

# 2) Page: remove old click bridge that forced a full page navigation
p = Path('app/v2/page.js')
s = p.read_text()
s = s.replace("import V2RewardBridge from './V2RewardBridge';\n", "")
s = s.replace("      <V2RewardBridge />\n", "")
p.write_text(clean(s))

# 3) Reward center: support embedded mode and reuse already-loaded member state
p = Path('app/v2/reward/RewardLiveClient.js')
s = p.read_text()
s = s.replace(
    "export default function RewardLiveClient() {\n  const [loading, setLoading] = useState(true);\n  const [user, setUser] = useState(null);\n  const [profile, setProfile] = useState(null);",
    "export default function RewardLiveClient({ embedded = false, embeddedUser = null, embeddedProfile = null, onNavigateTab = null }) {\n  const [loading, setLoading] = useState(!(embedded && embeddedUser && embeddedProfile));\n  const [user, setUser] = useState(embeddedUser || null);\n  const [profile, setProfile] = useState(embeddedProfile || null);"
)

boot_anchor = "    const boot = async () => {\n      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {"
if boot_anchor in s:
    s = s.replace(boot_anchor, "    const boot = async () => {\n      if (embedded && embeddedUser && embeddedProfile) {\n        setUser(embeddedUser);\n        setProfile(embeddedProfile);\n        setLoading(false);\n        if (embeddedProfile.role !== 'admin') void openPrivateChat(embeddedUser.id);\n        return;\n      }\n\n      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {")

s = s.replace("  }, []);", "  }, [embedded, embeddedUser?.id, embeddedProfile?.id]);", 1)

s = s.replace(
    "  function goTab(tab) {\n    try { window.sessionStorage.setItem('vip-active-tab', tab); } catch {}\n    window.location.assign('/v2');\n  }",
    "  function goTab(tab) {\n    try { window.sessionStorage.setItem('vip-active-tab', tab); } catch {}\n    if (embedded && typeof onNavigateTab === 'function') {\n      onNavigateTab(tab);\n      return;\n    }\n    window.location.assign('/v2');\n  }"
)

s = s.replace("<main className={styles.canvas}>\n      <section className={styles.appShell}>", "<main className={`${styles.canvas} ${embedded ? styles.rewardEmbeddedCanvas : ''}`}>\n      <section className={`${styles.appShell} ${embedded ? styles.rewardEmbeddedShell : ''}`}>", 1)

match = re.search(r"\n\s*<section className=\{styles\.rewardWelcome\}>.*?</section>\n", s, re.S)
if match:
    welcome = match.group(0).strip()
    welcome = welcome.replace("className={styles.rewardWelcome}", "className={`${styles.rewardWelcome} ${styles.rewardWelcomeInFeed}`}")
    s = s[:match.start()] + "\n" + s[match.end():]
    marker = '<div className={styles.messageList} ref={messageBoxRef}>'
    if marker in s:
        s = s.replace(marker, marker + "\n                  " + welcome.replace("\n", "\n                  "), 1)

p.write_text(clean(s))

# 4) Reward CSS: embedded SPA treatment + clearer section separation inside the chat stream
p = Path('app/v2/reward/reward-live.module.css')
s = p.read_text()
append = r'''

/* REWARD INLINE SPA + VISUAL SEPARATION */
.rewardEmbeddedCanvas { min-height: 0; background: transparent; }
.rewardEmbeddedShell { max-width: none; min-height: 0; padding: 0; border: 0; background: transparent; box-shadow: none; }
.rewardEmbeddedShell > header,
.rewardEmbeddedShell > nav { display: none !important; }
.rewardEmbeddedShell > .content { padding: 0 !important; }
.rewardWelcomeInFeed { margin: 0 0 18px; border: 1px solid #d7e0ec; background: #fff; box-shadow: none; }
.rewardWelcomeInFeed .rewardWelcomeTop { border-bottom: 3px solid #17345f; background: #fff; }
.rewardWelcomeInFeed .rewardBenefitPanel { margin: 0; border: 0; border-bottom: 1px solid #e3e8ef; background: #f4f7fb; }
.rewardWelcomeInFeed .rewardBenefitRow + .rewardBenefitRow { padding-top: 13px; border-top: 1px solid #dfe6ef; }
.rewardWelcomeInFeed .rewardQuickLinks { padding: 12px 14px; background: #fff; border-bottom: 1px solid #e4e9f0; }
.rewardWelcomeInFeed .rewardQuickLinks button:first-child { border-left: 3px solid #2f6fed; }
.rewardWelcomeInFeed .rewardQuickLinks button:last-child { border-left: 3px solid #16a085; }
.rewardWelcomeInFeed .rewardAlert { margin: 0; border: 0; border-left: 4px solid #f0b429; background: #fff8e7; }
.deliveryCard { border-radius: 8px; }
.deliveryHead { background: #fff; border-bottom: 2px solid #172033; }
.messageList { background: #f3f5f8; }
.messageRowOther .bubble { border-left: 3px solid #2f6fed; border-radius: 4px 12px 12px 12px; }
.messageRowMine .bubble { border-radius: 12px 4px 12px 12px; }
.summary { border-radius: 8px; box-shadow: none; }
@media (max-width: 520px) {
  .rewardEmbeddedShell { padding: 0 !important; }
  .rewardWelcomeInFeed { margin-bottom: 14px; }
  .rewardWelcomeInFeed .rewardWelcomeTop > p,
  .rewardWelcomeInFeed .rewardBenefitRow p,
  .rewardWelcomeInFeed .rewardAlert p { font-size: 11.5px; line-height: 1.7; }
  .rewardWelcomeInFeed .rewardBenefitRow b,
  .rewardWelcomeInFeed .rewardAlert strong { font-size: 12px; }
}
'''
if '/* REWARD INLINE SPA + VISUAL SEPARATION */' not in s:
    s += append
p.write_text(clean(s))
