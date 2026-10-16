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
import V2MovedEventGuideBridge from './V2MovedEventGuideBridge';
import V2SplitNavBridge from './V2SplitNavBridge';
import V2AiCompactBridge from './V2AiCompactBridge';

// V2 visual layers: shared depth, reward/event passes, scoped guidance and split navigation.
export default function V2Layout({ children }) {
  return (
    <>
      <V2MovedEventGuideBridge />
      <V2SplitNavBridge />
      <V2AiCompactBridge />
      {children}
    </>
  );
}
