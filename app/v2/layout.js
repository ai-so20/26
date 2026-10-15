import './depth-system.css';
import './reward-depth-v2.css';
import './event-depth-v3.css';
import './event-reward-hotfix.css';
import './event-split-v4.css';
import V2EventNavBridge from './V2EventNavBridge';

// V2 visual layers: shared depth, reward/event passes, then scoped split-page behavior.
export default function V2Layout({ children }) {
  return (
    <>
      <V2EventNavBridge />
      {children}
    </>
  );
}
