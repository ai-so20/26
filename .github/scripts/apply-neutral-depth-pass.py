from pathlib import Path

live = Path('app/v2/v2-live.module.css')
reward = Path('app/v2/reward/reward-live.module.css')

# Event: remove decorative color bars; build depth from neutral surfaces, borders, highlights and shadows.
s = live.read_text()
marker = '/* NEUTRAL DEPTH PASS 2026 */'
if marker not in s:
    s += r'''

/* NEUTRAL DEPTH PASS 2026 */
.eventPage .pageHeading .kicker {
  color: #626B78;
}
.eventPage .pageHeading .statusBadge {
  border-color: #D9DEE5;
  background: #FFFFFF;
  color: #454C59;
  box-shadow: 0 1px 2px rgba(23,27,36,.04);
}
.eventPage .pageHeading .statusBadge i {
  background: #16734B;
}

/* Summary stays calm: white surface, precise border, soft ambient depth. */
.eventPage .summaryCard {
  border-color: #D8DDE4;
  background: linear-gradient(180deg, #FFFFFF 0%, #FCFCFD 100%);
  box-shadow:
    0 1px 2px rgba(23,27,36,.035),
    0 8px 20px rgba(23,27,36,.055);
}
.eventPage .summaryCard::before {
  display: none;
}
.eventPage .summaryCard::after {
  content: '';
  position: absolute;
  left: 1px;
  right: 1px;
  top: 1px;
  height: 1px;
  background: rgba(255,255,255,.96);
  pointer-events: none;
}
.eventPage .summaryTop {
  padding-left: 0;
}
.eventPage .summaryTop > div > span {
  color: #626B78;
}
.eventPage .statEmphasis strong {
  color: #171B24 !important;
}

/* Selection uses a recessed track; active item is the raised layer. */
.eventPage .segmentGrid {
  border-color: #DDE1E7;
  background: #ECEFF3;
  box-shadow: inset 0 1px 2px rgba(23,27,36,.055);
}
.eventPage .segmentActive {
  border: 1px solid rgba(255,255,255,.95);
  background: #FFFFFF;
  box-shadow:
    0 1px 2px rgba(23,27,36,.07),
    0 4px 10px rgba(23,27,36,.07);
}
.eventPage .segmentActive .segmentMark {
  border-color: #687487;
  background: #687487;
}

/* Current event is the sole raised feature surface; no decorative side stripe. */
.eventPage .primaryCard {
  border-color: #D3D9E1;
  background: linear-gradient(180deg, #FFFFFF 0%, #FAFBFC 100%);
  box-shadow:
    0 1px 2px rgba(23,27,36,.045),
    0 10px 26px rgba(23,27,36,.095);
}
.eventPage .primaryCard::before {
  display: none;
}
.eventPage .primaryCard::after {
  left: 1px;
  right: 1px;
  background: rgba(255,255,255,.98);
}
.eventPage .cardTopline,
.eventPage .cardBody,
.eventPage .cardFooter {
  padding-left: 16px;
}
.eventPage .cardKicker {
  color: #626B78;
}

/* Event role color is reserved for action, not decoration. */
.eventPage .primaryButtonWide,
.eventPage .primaryButton {
  background: #A44912;
  box-shadow: 0 3px 8px rgba(94,53,28,.14);
}
.eventPage .gameArea {
  border-color: #E0E4E9;
  background: #F1F3F6;
  box-shadow: inset 0 1px 2px rgba(23,27,36,.035);
}
.eventPage .gameChoice,
.eventPage .quizChoice,
.eventPage .gameInput {
  background: #FFFFFF;
  box-shadow: 0 1px 2px rgba(23,27,36,.035);
}
.eventPage .eventMotionIcon,
.eventPage .eventMotionIcon[data-event-type] {
  border-color: #DDE2E8;
  background: #F7F8FA;
  color: #596678;
  box-shadow: inset 0 1px 0 rgba(255,255,255,.95), 0 2px 5px rgba(23,27,36,.05);
}

/* Schedule is deliberately flat; active row is separated by tone rather than a color stripe. */
.eventPage .simpleList {
  border-color: #DCE1E7;
  box-shadow: 0 1px 2px rgba(23,27,36,.025);
}
.eventPage .eventLiveRowActive {
  background: #F3F5F7;
}
.eventPage .eventLiveRowActive::before {
  display: none;
}

.eventPage .attendanceCardLarge {
  border-color: #D8DDE4;
  background: linear-gradient(180deg, #FFFFFF 0%, #FCFCFD 100%);
  box-shadow: 0 5px 14px rgba(23,27,36,.06);
}

@media (max-width: 520px) {
  .eventPage .summaryCard {
    box-shadow: 0 1px 2px rgba(23,27,36,.03), 0 6px 16px rgba(23,27,36,.05);
  }
  .eventPage .primaryCard {
    box-shadow: 0 1px 2px rgba(23,27,36,.04), 0 8px 20px rgba(23,27,36,.085);
  }
}
'''
    live.write_text(s)

# Reward: keep violet for actions/identity only; remove side stripes and use neutral depth/inset surfaces.
s = reward.read_text()
if marker not in s:
    s += r'''

/* NEUTRAL DEPTH PASS 2026 */
.rewardEmbeddedShell .pageHeading .kicker {
  color: #626B78;
}
.rewardEmbeddedShell .pageHeading .statusBadge {
  border-color: #D9DEE5;
  background: #FFFFFF;
  color: #454C59;
  box-shadow: 0 1px 2px rgba(23,27,36,.04);
}
.rewardEmbeddedShell .pageHeading .statusBadge i {
  background: #16734B;
}
.rewardEmbeddedShell .summary {
  border-color: #D8DDE4;
  background: linear-gradient(180deg, #FFFFFF 0%, #FCFCFD 100%);
  box-shadow:
    0 1px 2px rgba(23,27,36,.035),
    0 8px 20px rgba(23,27,36,.055);
}
.rewardEmbeddedShell .summary::before {
  display: none;
}
.rewardEmbeddedShell .summary::after {
  left: 1px;
  right: 1px;
}
.rewardEmbeddedShell .summary > div:first-child {
  padding-left: 0;
}
.rewardEmbeddedShell .summary > div:first-child strong {
  color: #171B24;
}

.rewardEmbeddedShell .deliveryCard {
  border-color: #DCE1E7;
  background: #FFFFFF;
  box-shadow: 0 1px 2px rgba(23,27,36,.025);
}
.rewardEmbeddedShell .deliveryHead {
  background: linear-gradient(180deg, #FCFCFD 0%, #F7F8FA 100%);
}
.rewardEmbeddedShell .deliveryHead > div > span {
  color: #626B78;
}
.rewardEmbeddedShell .liveBadge {
  border-color: #D9DEE5;
  background: #FFFFFF;
  color: #596678;
}
.rewardEmbeddedShell .messageList {
  background: #EEF1F4;
  box-shadow: inset 0 1px 3px rgba(23,27,36,.04);
}

.rewardEmbeddedShell .rewardWelcomeInFeed {
  border-color: #D8DDE4;
  background: #FFFFFF;
  box-shadow: 0 2px 6px rgba(23,27,36,.045);
}
.rewardEmbeddedShell .rewardWelcomeInFeed .rewardWelcomeTop {
  border-left: 0;
  border-bottom-color: #DDE2E8;
  background: linear-gradient(180deg, #FFFFFF 0%, #FBFCFD 100%);
}
.rewardEmbeddedShell .rewardWelcomeInFeed .rewardWelcomeTop > span {
  color: #626B78;
}
.rewardEmbeddedShell .rewardWelcomeInFeed .rewardBenefitPanel {
  background: #F1F3F6;
  box-shadow: inset 0 1px 2px rgba(23,27,36,.035);
}
.rewardEmbeddedShell .rewardBenefitIcon {
  border-color: #D8DEE6;
  background: #FFFFFF;
  color: #596678;
  box-shadow: 0 1px 2px rgba(23,27,36,.04);
}
.rewardEmbeddedShell .rewardQuickLinks button:first-child,
.rewardEmbeddedShell .rewardQuickLinks button:last-child {
  border-left-color: #DCE1E7;
}
.rewardEmbeddedShell .rewardQuickLinks button {
  background: #FFFFFF;
  box-shadow: 0 1px 2px rgba(23,27,36,.035);
}
.rewardEmbeddedShell .rewardQuickLinks button span {
  color: #626B78;
}
.rewardEmbeddedShell .rewardAlert {
  border-left-color: #D8DEE6;
  background: #F3F5F7;
  box-shadow: inset 0 1px 2px rgba(23,27,36,.03);
}
.rewardEmbeddedShell .rewardAlertBell {
  border-color: #D8DEE6;
  background: #FFFFFF;
}
.rewardEmbeddedShell .rewardAlertBell svg {
  stroke: #596678;
}
.rewardEmbeddedShell .rewardAlert strong {
  color: #303746;
}

/* Message and product depth: neutral bubble, product card raised one level; violet only for CTA/identity. */
.rewardEmbeddedShell .messageRowOther .bubble {
  border-left-color: #DCE1E7;
  box-shadow: 0 1px 3px rgba(23,27,36,.045);
}
.rewardEmbeddedShell .giftCard {
  border-color: #D6DCE4;
  background: linear-gradient(180deg, #FFFFFF 0%, #FAFBFC 100%);
  box-shadow: 0 5px 14px rgba(23,27,36,.075);
}
.rewardEmbeddedShell .giftTitle {
  color: #303746;
}
.rewardEmbeddedShell .giftProduct {
  border: 1px solid #E0E4E9;
  background: #F1F3F6;
  box-shadow: inset 0 1px 2px rgba(23,27,36,.035);
}
.rewardEmbeddedShell .specialKicker {
  color: #626B78;
}
.rewardEmbeddedShell .rewardFooterNotice {
  border-top-color: #DCE1E7;
}

@media (max-width: 520px) {
  .rewardEmbeddedShell .summary {
    box-shadow: 0 1px 2px rgba(23,27,36,.03), 0 6px 16px rgba(23,27,36,.05);
  }
}
'''
    reward.write_text(s)

print('neutral depth pass applied')
