import './depth-system.css';
import './reward-depth-v2.css';
import './event-depth-v3.css';
import './event-reward-hotfix.css';
import './moved-event-guide.css';
import './split-pages-v6.css';
import './event-guide-fulltext.css';
import V2MovedEventGuideBridge from './V2MovedEventGuideBridge';
import V2SplitNavBridge from './V2SplitNavBridge';

// V2 visual layers: shared depth, reward/event passes, scoped guidance and split navigation.
export default function V2Layout({ children }) {
  return (
    <>
      <V2MovedEventGuideBridge />
      <V2SplitNavBridge />
      {children}
    </>
  );
}
