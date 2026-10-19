'use client';

import { useEffect } from 'react';

const ROOT = '[data-v2-root="true"]';

function syncAiLabels(root) {
  const scanner = root.querySelector('[class*="aiMarketScanner"]');
  if (!scanner) return;

  scanner.querySelectorAll('small').forEach((node) => {
    const text = node.textContent || '';
    if (text.includes('5분 갱신')) node.textContent = text.replace('5분 갱신', '1분 갱신');
  });

  const historyHead = scanner.querySelector('[class*="aiMarketHistoryHead"]');
  const count = historyHead?.querySelector('b');
  if (count) count.setAttribute('aria-label', `상태 변화 기록 ${count.textContent || ''}`.trim());

  const pager = scanner.querySelector('[class*="aiTradingPager"]');
  if (pager) pager.setAttribute('aria-label', '상태 변화 기록 페이지');

  const foldHead = root.querySelector('[class*="aiFoldHead"]');
  if (foldHead) foldHead.setAttribute('aria-label', '최근 반영 내역 접기 또는 펼치기');
}

export default function V3AiRefreshIntegrityBridge() {
  useEffect(() => {
    const root = document.querySelector(ROOT);
    if (!root) return undefined;

    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => syncAiLabels(root));
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { childList: true, subtree: true, characterData: true });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return null;
}
