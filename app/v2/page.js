import V2LiveClientStage2 from './V2LiveClientStage2';
import V2RewardBridge from './V2RewardBridge';
import V2AdminBridge from './V2AdminBridge';
import V2CompatibilityLayer from './V2CompatibilityLayer';

export default function V2Page() {
  return (
    <>
      <V2RewardBridge />
      <V2AdminBridge />
      <V2LiveClientStage2 />
      <V2CompatibilityLayer />
    </>
  );
}
