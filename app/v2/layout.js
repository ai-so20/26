import './v3-88-rebuild.css';
import './v3-event-editorial.css';
import V2MovedEventGuideBridge from './V2MovedEventGuideBridge';
import V2SplitNavBridge from './V2SplitNavBridge';
import V2AiCompactBridge from './V2AiCompactBridge';
import V2AiRunningOrderBridge from './V2AiRunningOrderBridge';
import V2CompletedProgressBridge from './V2CompletedProgressBridge';

// V3 rebuild: previous global design passes are intentionally disconnected.
// Bridges remain only where they preserve existing interaction/content behavior.
export default function V2Layout({ children }) {
  return (
    <>
      <V2MovedEventGuideBridge />
      <V2SplitNavBridge />
      <V2AiCompactBridge />
      <V2AiRunningOrderBridge />
      <V2CompletedProgressBridge />
      {children}
    </>
  );
}
