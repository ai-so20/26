'use client';

import { useEffect } from 'react';

const IDLE_STAGES = ['분석', '탐색', '매수', '관리', '매도', '재분석'];

function byClassFragment(fragment) {
  return document.querySelector(`[class*="${fragment}"]`);
}

function ensureIdlePipeline() {
  const headline = byClassFragment('aiPart1Headline');
  if (!headline) return;

  const legacy = [...headline.querySelectorAll('p')].find((node) =>
    String(node.textContent || '').includes('분석') && String(node.textContent || '').includes('재분석'));
  if (legacy) legacy.classList.add('v2AiLegacyArrowLine');

  if (headline.querySelector('.v2AiIdlePipeline')) return;

  const pipeline = document.createElement('div');
  pipeline.className = 'v2AiIdlePipeline';
  pipeline.setAttribute('role', 'list');
  pipeline.setAttribute('aria-label', 'AI PROCESS 진행 단계');

  IDLE_STAGES.forEach((label, index) => {
    const item = document.createElement('div');
    item.className = `v2AiIdlePipelineStep${index === 0 ? ' isCurrent' : ''}`;
    item.setAttribute('role', 'listitem');

    const node = document.createElement('i');
    node.textContent = String(index + 1).padStart(2, '0');

    const text = document.createElement('span');
    text.textContent = label;

    item.append(node, text);
    pipeline.appendChild(item);
  });

  headline.appendChild(pipeline);
}

function markRewardObjects() {
  document.querySelectorAll('[class*="giftCard"]').forEach((card) => {
    card.classList.add('v2RewardObject');
    if (!card.querySelector('.v2RewardObjectMark')) {
      const mark = document.createElement('span');
      mark.className = 'v2RewardObjectMark';
      mark.textContent = 'REWARD';
      card.prepend(mark);
    }
  });
}

function sync() {
  ensureIdlePipeline();
  markRewardObjects();
}

export default function V2FintechVisualBridge() {
  useEffect(() => {
    let raf = 0;
    const schedule = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(sync);
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
