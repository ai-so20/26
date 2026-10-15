from pathlib import Path

p = Path('app/v2/reward/reward-live.module.css')
s = p.read_text()
marker = '/* REWARD VIOLET DEPTH SYSTEM 2026 */'
block = r'''

/* REWARD VIOLET DEPTH SYSTEM 2026 */
.rewardEmbeddedShell {
  --reward-accent: #6342A6;
  --reward-accent-press: #4F3486;
  --reward-soft: #F3EFFA;
  --reward-border: #D7CDE8;
  --neutral-border: #CDD2DA;
  --neutral-divider: #E1E4E9;
  --neutral-text: #171B24;
  --neutral-text-2: #454C59;
  --neutral-text-3: #626B78;
}

.rewardEmbeddedShell .pageHeading { margin-bottom: 22px; }
.rewardEmbeddedShell .pageHeading .kicker { color: var(--reward-accent); }
.rewardEmbeddedShell .pageHeading h1 { color: var(--neutral-text); }
.rewardEmbeddedShell .pageHeading .statusBadge { border-color: var(--reward-border); background: #FAF8FD; color: var(--reward-accent-press); }
.rewardEmbeddedShell .pageHeading .statusBadge i { background: var(--reward-accent); }

/* Summary is the single L2 surface. */
.rewardEmbeddedShell .summary {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--neutral-border);
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 4px 12px rgba(23,27,36,.08);
}
.rewardEmbeddedShell .summary::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: var(--reward-accent);
}
.rewardEmbeddedShell .summary > div:first-child { padding-left: 14px; }
.rewardEmbeddedShell .summary span { color: var(--neutral-text-3); }
.rewardEmbeddedShell .summary strong { color: var(--neutral-text); font-variant-numeric: tabular-nums; }
.rewardEmbeddedShell .summary > div:first-child strong { color: var(--reward-accent); }

/* Delivery stream remains L1; its hierarchy comes from content types, not card-on-card shadows. */
.rewardEmbeddedShell .deliveryCard {
  margin-top: 18px;
  border: 1px solid var(--neutral-divider);
  border-radius: 8px;
  background: #fff;
  box-shadow: none;
}
.rewardEmbeddedShell .deliveryHead { border-bottom: 1px solid var(--neutral-divider); background: #FAFAFB; }
.rewardEmbeddedShell .deliveryHead > div > span { color: var(--reward-accent); }
.rewardEmbeddedShell .deliveryHead strong { color: var(--neutral-text); }
.rewardEmbeddedShell .liveBadge { background: var(--reward-soft); color: var(--reward-accent-press); }
.rewardEmbeddedShell .messageList { background: #F4F5F7; }

/* The welcome block reads as a structured first message, not a second hero card. */
.rewardEmbeddedShell .rewardWelcomeInFeed {
  border: 1px solid var(--neutral-divider);
  border-radius: 8px;
  background: #fff;
  box-shadow: none;
}
.rewardEmbeddedShell .rewardWelcomeInFeed .rewardWelcomeTop {
  border-bottom: 1px solid var(--reward-border);
  border-left: 4px solid var(--reward-accent);
  background: #fff;
}
.rewardEmbeddedShell .rewardWelcomeInFeed .rewardWelcomeTop > span { color: var(--reward-accent); }
.rewardEmbeddedShell .rewardWelcomeInFeed .rewardBenefitPanel { background: #F8F7FA; border-bottom-color: var(--neutral-divider); }
.rewardEmbeddedShell .rewardBenefitIcon { border-color: var(--reward-border); background: #fff; color: var(--reward-accent); }
.rewardEmbeddedShell .rewardQuickLinks button { border-color: var(--neutral-divider); border-radius: 6px; }
.rewardEmbeddedShell .rewardQuickLinks button span { color: var(--reward-accent); }
.rewardEmbeddedShell .rewardQuickLinks button:first-child,
.rewardEmbeddedShell .rewardQuickLinks button:last-child { border-left-color: var(--reward-accent); }
.rewardEmbeddedShell .rewardAlert { border-left-color: var(--reward-accent); background: var(--reward-soft); }
.rewardEmbeddedShell .rewardAlertBell { border-color: var(--reward-border); }
.rewardEmbeddedShell .rewardAlertBell svg { stroke: var(--reward-accent); }
.rewardEmbeddedShell .rewardAlert strong { color: var(--reward-accent-press); }
.rewardEmbeddedShell .rewardAlert p { color: var(--neutral-text-2); }

/* Message semantics: center identity = violet, success stays green. */
.rewardEmbeddedShell .messageRowOther .bubble {
  border-left-color: var(--reward-accent);
  box-shadow: 0 2px 7px rgba(23,27,36,.045);
}
.rewardEmbeddedShell .giftCard {
  border-color: var(--reward-border);
  border-radius: 8px;
  background: linear-gradient(180deg, #FFFFFF 0%, #FAF8FD 100%);
  box-shadow: 0 4px 12px rgba(72,48,115,.08);
}
.rewardEmbeddedShell .giftTitle { color: var(--reward-accent); }
.rewardEmbeddedShell .giftProduct { border-radius: 6px; background: var(--reward-soft); }
.rewardEmbeddedShell .giftProduct strong { color: var(--neutral-text); }
.rewardEmbeddedShell .specialCard { border-color: var(--reward-border); border-radius: 8px; }
.rewardEmbeddedShell .specialKicker { color: var(--reward-accent); }
.rewardEmbeddedShell .linkButton,
.rewardEmbeddedShell .sendButton { background: var(--reward-accent); border-radius: 7px; }
.rewardEmbeddedShell .linkButton:active,
.rewardEmbeddedShell .sendButton:active { background: var(--reward-accent-press); }

.rewardEmbeddedShell .rewardFooterNotice { border-top-color: var(--reward-accent); }
.rewardEmbeddedShell .rewardFooterNotice strong { color: var(--neutral-text); }
.rewardEmbeddedShell .rewardFooterNotice p { color: var(--neutral-text-3); }

@media (max-width: 520px) {
  .rewardEmbeddedShell .summary { border-radius: 10px; }
  .rewardEmbeddedShell .deliveryCard,
  .rewardEmbeddedShell .rewardWelcomeInFeed { border-radius: 8px; }
}
'''
if marker not in s:
    s += block
p.write_text(s)
