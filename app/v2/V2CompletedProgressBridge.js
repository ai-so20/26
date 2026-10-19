'use client';

import { useEffect } from 'react';

export default function V2CompletedProgressBridge() {
  useEffect(() => {
    const apply = () => {
      const hero = document.querySelector('[class*="aiPart2Hero"]');
      if (!hero || !hero.textContent?.includes('COMPLETE')) return;
      const progress = hero.querySelector('[class*="aiPart2Progress"]');
      if (!progress) return;
      const value = progress.querySelector('strong');
      const bar = progress.querySelector('i > b');
      if (value) value.textContent = '100.00%';
      if (bar) bar.style.width = '100%';
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
