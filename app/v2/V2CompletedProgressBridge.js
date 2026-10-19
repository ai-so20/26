'use client';

import { useEffect } from 'react';

function syncCompletedProgress() {
  const hero = document.querySelector('[class*="aiPart2Hero"]');
  if (!hero) return;

  const top = hero.querySelector('[class*="aiPart2Topline"]');
  const isComplete = /COMPLETE|DONE|진행완료/i.test(String(top?.textContent || ''));
  const progress = hero.querySelector('[class*="aiPart2Progress"]');
  if (!progress) return;

  const value = progress.querySelector('strong');
  const bar = progress.querySelector('i > b');

  if (isComplete) {
    progress.dataset.completedDisplay = 'true';
    if (value && value.dataset.originalProgressText == null) value.dataset.originalProgressText = value.textContent || '';
    if (bar && bar.dataset.originalProgressWidth == null) bar.dataset.originalProgressWidth = bar.style.width || '';
    if (value) value.textContent = '100.00%';
    if (bar) bar.style.width = '100%';
    return;
  }

  if (progress.dataset.completedDisplay === 'true') {
    delete progress.dataset.completedDisplay;
    if (value?.dataset.originalProgressText != null) {
      value.textContent = value.dataset.originalProgressText;
      delete value.dataset.originalProgressText;
    }
    if (bar?.dataset.originalProgressWidth != null) {
      bar.style.width = bar.dataset.originalProgressWidth;
      delete bar.dataset.originalProgressWidth;
    }
  }
}

export default function V2CompletedProgressBridge() {
  useEffect(() => {
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(syncCompletedProgress);
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    schedule();

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
