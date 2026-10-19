'use client';

import { useEffect } from 'react';

function findButton(root, text) {
  return [...root.querySelectorAll('button')].find((button) => (button.textContent || '').trim().includes(text));
}

export default function V3RewardCenterIntegrityBridge() {
  useEffect(() => {
    let frame = 0;

    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rewardRoot = document.querySelector('[class*="rewardEmbeddedShell"]');
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
      });
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return null;
}
