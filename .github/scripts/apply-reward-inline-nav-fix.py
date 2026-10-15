from pathlib import Path

p = Path('app/v2/reward/reward-live.module.css')
s = p.read_text()
marker = '/* REWARD EMBEDDED WIDTH FIX */'
append = r'''

/* REWARD EMBEDDED WIDTH FIX */
.rewardEmbeddedCanvas {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  padding: 0 !important;
  margin: 0;
  box-sizing: border-box;
  overflow-x: hidden;
}
.rewardEmbeddedShell {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  margin: 0;
  box-sizing: border-box;
  overflow: hidden;
}
.rewardEmbeddedShell .page,
.rewardEmbeddedShell .summary,
.rewardEmbeddedShell .deliveryCard,
.rewardEmbeddedShell .messageList,
.rewardEmbeddedShell .rewardWelcomeInFeed,
.rewardEmbeddedShell .rewardBenefitPanel,
.rewardEmbeddedShell .rewardQuickLinks,
.rewardEmbeddedShell .rewardAlert,
.rewardEmbeddedShell .rewardFooterNotice {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.rewardEmbeddedShell .pageHeading {
  min-width: 0;
}
.rewardEmbeddedShell .pageHeading > div {
  min-width: 0;
}
.rewardEmbeddedShell .statusBadge {
  flex: 0 0 auto;
}
.rewardEmbeddedShell .rewardBenefitRow > div {
  min-width: 0;
}
.rewardEmbeddedShell .rewardBenefitRow p,
.rewardEmbeddedShell .rewardBenefitFoot,
.rewardEmbeddedShell .rewardAlert p {
  overflow-wrap: anywhere;
  word-break: keep-all;
}
@media (max-width: 520px) {
  .rewardEmbeddedCanvas,
  .rewardEmbeddedShell {
    width: 100% !important;
    max-width: 100% !important;
  }
  .rewardEmbeddedShell .pageHeading {
    gap: 10px;
  }
  .rewardEmbeddedShell .pageHeading h1 {
    font-size: 24px;
  }
  .rewardEmbeddedShell .messageList {
    padding-left: 10px;
    padding-right: 10px;
  }
}
'''
if marker not in s:
    s += append
p.write_text('\n'.join(line.rstrip() for line in s.splitlines()) + '\n')
