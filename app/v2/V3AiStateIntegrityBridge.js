'use client';

import { useEffect } from 'react';

const ROOT = '[data-v2-root="true"]';

function normalizeCompletedState(root) {
  const page = root.querySelector('[class*="aiPart2Hero"]');
  if (!page) return;

  const topLine = page.querySelector('[class*="aiPart2Topline"]');
  const completed = Boolean(topLine && /COMPLETE|DONE/.test(topLine.textContent || ''));
  if (!completed) return;

  const remain = page.querySelector('[class*="aiPart2Remain"] strong');
  if (remain && remain.textContent?.trim() !== '완료') remain.textContent = '완료';

  const progress = page.querySelector('[class*="aiPart2Progress"]');
  const progressValue = progress?.querySelector('strong');
  const progressBar = progress?.querySelector('i > b');
  if (progressValue) progressValue.textContent = '100.00%';
  if (progressBar) progressBar.style.width = '100%';
}

export default function V3AiStateIntegrityBridge() {
  useEffect(() => {
    const root = document.querySelector(ROOT);
    if (!root) return undefined;

    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => normalizeCompletedState(root));
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
