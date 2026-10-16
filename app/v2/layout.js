import './depth-system.css';
import './reward-depth-v2.css';
import './event-depth-v3.css';
import './event-reward-hotfix.css';
import './moved-event-guide.css';
import V2MovedEventGuideBridge from './V2MovedEventGuideBridge';

// V2 visual layers: shared depth, reward/event passes, then scoped hotfixes.
export default function V2Layout({ children }) {
  return (
    <>
      <V2MovedEventGuideBridge />
      {children}
    </>
  );
}
