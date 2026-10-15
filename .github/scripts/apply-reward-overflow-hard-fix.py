from pathlib import Path

p = Path('app/v2/reward/reward-live.module.css')
s = p.read_text()
marker = '/* REWARD MOBILE OVERFLOW HARD FIX */'
if marker not in s:
    s += r'''

/* REWARD MOBILE OVERFLOW HARD FIX */
.rewardEmbeddedCanvas,
.rewardEmbeddedShell,
.rewardEmbeddedShell .content,
.rewardEmbeddedShell .page {
  inline-size: 100%;
  max-inline-size: 100%;
  min-inline-size: 0;
  box-sizing: border-box;
  overflow-x: clip;
}

.rewardEmbeddedShell .pageHeading,
.rewardEmbeddedShell .summary,
.rewardEmbeddedShell .deliveryCard,
.rewardEmbeddedShell .deliveryHead,
.rewardEmbeddedShell .messageList,
.rewardEmbeddedShell .rewardWelcomeInFeed,
.rewardEmbeddedShell .rewardWelcomeTop,
.rewardEmbeddedShell .rewardBenefitPanel,
.rewardEmbeddedShell .rewardQuickLinks,
.rewardEmbeddedShell .rewardAlert,
.rewardEmbeddedShell .rewardFooterNotice,
.rewardEmbeddedShell .messageRow,
.rewardEmbeddedShell .bubbleWrap,
.rewardEmbeddedShell .bubble,
.rewardEmbeddedShell .specialCard,
.rewardEmbeddedShell .giftCard,
.rewardEmbeddedShell .image {
  max-inline-size: 100%;
  min-inline-size: 0;
  box-sizing: border-box;
}

.rewardEmbeddedShell .messageList {
  overflow-x: clip;
}

.rewardEmbeddedShell .bubbleWrap {
  width: auto;
}

.rewardEmbeddedShell .specialCard,
.rewardEmbeddedShell .giftCard {
  min-width: 0;
  width: min(100%, 430px);
}

.rewardEmbeddedShell .pageHeading {
  width: 100%;
  align-items: center;
}

.rewardEmbeddedShell .pageHeading > div {
  flex: 1 1 auto;
  min-width: 0;
}

.rewardEmbeddedShell .pageHeading .statusBadge {
  flex: 0 0 auto;
  max-width: 42%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rewardEmbeddedShell .rewardQuickLinks {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
}

.rewardEmbeddedShell .rewardQuickLinks button,
.rewardEmbeddedShell .rewardBenefitRow,
.rewardEmbeddedShell .rewardBenefitRow > div {
  min-width: 0;
  max-width: 100%;
}

@media (max-width: 520px) {
  .rewardEmbeddedCanvas,
  .rewardEmbeddedShell,
  .rewardEmbeddedShell .content,
  .rewardEmbeddedShell .page {
    width: 100% !important;
    max-width: 100% !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
  }

  .rewardEmbeddedShell .pageHeading {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
  }

  .rewardEmbeddedShell .pageHeading .statusBadge {
    max-width: 104px;
    padding-left: 7px;
    padding-right: 7px;
  }

  .rewardEmbeddedShell .summary {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .rewardEmbeddedShell .summary > div {
    min-width: 0;
    padding-left: 6px;
    padding-right: 6px;
  }

  .rewardEmbeddedShell .deliveryHead {
    gap: 8px;
  }

  .rewardEmbeddedShell .messageList {
    width: 100%;
    padding-left: 8px;
    padding-right: 8px;
  }

  .rewardEmbeddedShell .rewardWelcomeTop,
  .rewardEmbeddedShell .rewardBenefitPanel,
  .rewardEmbeddedShell .rewardQuickLinks,
  .rewardEmbeddedShell .rewardAlert {
    width: 100%;
  }
}
'''

p.write_text('\n'.join(line.rstrip() for line in s.splitlines()) + '\n')
