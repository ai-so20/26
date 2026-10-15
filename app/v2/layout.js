import './depth-system.css';
import './reward-depth-v2.css';
import './event-depth-v3.css';
import './event-reward-hotfix.css';
import './event-split-v4.css';
import './fintech-structure-v5.css';
import V2EventNavBridge from './V2EventNavBridge';
import V2FintechVisualBridge from './V2FintechVisualBridge';

// V2 visual layers: shared depth, scoped event/reward passes, then fintech hierarchy refinements.
export default function V2Layout({ children }) {
  return (
    <>
      <V2EventNavBridge />
      <V2FintechVisualBridge />
      {children}
    </>
  );
}
