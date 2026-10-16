'use client';

import { useEffect } from 'react';

function firstByClassPart(part) {
  return document.querySelector(`[class*="${part}"]`);
}

function syncRunningOrder() {
  const hero = firstByClassPart('aiPart2Hero');
  if (!hero) return;

  const market = firstByClassPart('aiMarketScanner');
  const chart = firstByClassPart('aiChartCard');
  const history = firstByClassPart('aiPart3History');
  const brief = firstByClassPart('aiProcessBrief');
  const stage = firstByClassPart('aiStageBoard');
  const tail = firstByClassPart('twoColumnCards');

  const parent = hero.parentElement;
  if (!parent || !tail || tail.parentElement !== parent) return;

  [market, chart, history, brief, stage].forEach((node) => {
    if (node && node.parentElement === parent) parent.insertBefore(node, tail);
  });
}

export default function V2AiRunningOrderBridge() {
  useEffect(() => {
    let raf = 0;
    const schedule = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(syncRunningOrder);
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    schedule();

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
