import './v3-88-rebuild.css';
import './v3-event-editorial.css';
import './v3-ai-process-2026.css';
import './v3-reward-ledger-2026.css';
import './v3-mobile-final-2026.css';
import './v3-predeploy-hardening-2026.css';
import './v3-navigation-integrity-2026.css';
import './v3-attendance-integrity-2026.css';
import V2SplitNavBridge from './V2SplitNavBridge';
import V3EventValidationBridge from './V3EventValidationBridge';
import V3AiStateIntegrityBridge from './V3AiStateIntegrityBridge';
import V3AiRefreshIntegrityBridge from './V3AiRefreshIntegrityBridge';
import V3RewardCenterIntegrityBridge from './V3RewardCenterIntegrityBridge';

// V3 rebuild: legacy presentation-mutating bridges are disconnected.
// Only interaction/state bridges that preserve required behavior remain.
export default function V2Layout({ children }) {
  return (
    <>
      <V2SplitNavBridge />
      <V3EventValidationBridge />
      <V3AiStateIntegrityBridge />
      <V3AiRefreshIntegrityBridge />
      <V3RewardCenterIntegrityBridge />
      {children}
    </>
  );
}
