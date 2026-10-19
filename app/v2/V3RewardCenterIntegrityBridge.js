'use client';

import { useEffect } from 'react';

function findButton(root, text) {
  return [...root.querySelectorAll('button')].find((button) => (button.textContent || '').trim().includes(text));
}

function normalizeRewardCenter(rewardRoot) {
  if (!rewardRoot) return;
  rewardRoot.dataset.v3RewardCenter = 'true';

  const deliveryHead = rewardRoot.querySelector('[class*="deliveryHead"] strong');
  if (deliveryHead && deliveryHead.textContent?.trim() === '지급 및 당첨 안내') {
    deliveryHead.textContent = '상품 지급 내역';
  }

  const list = rewardRoot.querySelector('[class*="messageList"]');
  if (list) {
    list.setAttribute('role', 'feed');
    list.setAttribute('aria-label', '상품 지급 및 이벤트 안내 내역');
  }

  const hourly = findButton(rewardRoot, '시간별 이벤트');
  if (hourly) hourly.setAttribute('aria-label', '시간별 이벤트로 이동');

  const attendance = findButton(rewardRoot, '출석 이벤트');
  if (attendance) {
    attendance.setAttribute('aria-label', '출석 이벤트로 이동');
    attendance.dataset.v3AttendanceShortcut = 'true';
  }

  rewardRoot.querySelectorAll('a[target="_blank"]').forEach((link) => {
    link.setAttribute('rel', 'noopener noreferrer');
  });
}

export default function V3RewardCenterIntegrityBridge() {
  useEffect(() => {
    let rewardObserver = null;
    let rewardRoot = null;
    let frame = 0;

    const syncReward = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => normalizeRewardCenter(rewardRoot));
    };

    const connectReward = () => {
      const nextRoot = document.querySelector('[class*="rewardEmbeddedShell"]');
      if (nextRoot === rewardRoot) return;

      rewardObserver?.disconnect();
      rewardObserver = null;
      rewardRoot = nextRoot;
      if (!rewardRoot) return;

      normalizeRewardCenter(rewardRoot);
      rewardObserver = new MutationObserver(syncReward);
      rewardObserver.observe(rewardRoot, { childList: true, subtree: true });
    };

    connectReward();
    const mountObserver = new MutationObserver(connectReward);
    const appRoot = document.querySelector('[data-v2-root="true"]') || document.body;
    mountObserver.observe(appRoot, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frame);
      rewardObserver?.disconnect();
      mountObserver.disconnect();
    };
  }, []);

  return null;
}
