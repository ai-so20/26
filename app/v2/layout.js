import './depth-system.css';
import './reward-depth-v2.css';
import './event-depth-v3.css';
import './event-reward-hotfix.css';
import './moved-event-guide.css';
import './split-pages-v6.css';
import './event-guide-fulltext.css';
import './design-audit-v7.css';
import './reference-layout-v8.css';
import './final-polish-v9.css';
import './ai-state-language-v10.css';
import './reward-header-compact-v11.css';
import './event-mobile-layout-hotfix-v12.css';
import './ai-idle-readability-v12.css';
import './ai-market-compact-v13.css';
import './ai-market-split-v14.css';
import './ai-history-row-compact-v15.css';
import './readability-unify-v16.css';
import './financial-editorial-foundation.css';
import V2MovedEventGuideBridge from './V2MovedEventGuideBridge';
import V2SplitNavBridge from './V2SplitNavBridge';
import V2AiCompactBridge from './V2AiCompactBridge';
import V2AiRunningOrderBridge from './V2AiRunningOrderBridge';

export default function V2Layout({ children }) {
  return (
    <div className="v2-financial-editorial">
      <V2MovedEventGuideBridge />
      <V2SplitNavBridge />
      <V2AiCompactBridge />
      <V2AiRunningOrderBridge />
      {children}
    </div>
  );
}
