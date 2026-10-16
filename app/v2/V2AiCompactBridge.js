'use client';

import { useEffect } from 'react';

function text(node) {
  return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
}

function directItems(root) {
  return [...(root?.children || [])].filter((node) => node instanceof HTMLElement && node.tagName === 'DIV');
}

function buildDetail(kind) {
  const detail = document.createElement('div');
  detail.className = 'v2AiCompactDetail';
  detail.dataset.v2AiDetail = kind;

  const index = document.createElement('span');
  index.className = 'v2AiCompactDetailIndex';

  const copy = document.createElement('div');
  copy.className = 'v2AiCompactDetailText';
  const title = document.createElement('strong');
  const body = document.createElement('p');

  copy.append(title, body);
  detail.append(index, copy);
  return detail;
}

function updateDetail(root, kind, item, index) {
  if (!root || !item) return;
  let detail = root.parentElement?.querySelector(`:scope > .v2AiCompactDetail[data-v2-ai-detail="${kind}"]`);
  if (!detail) {
    detail = buildDetail(kind);
    root.insertAdjacentElement('afterend', detail);
  }

  const title = item.querySelector('strong');
  const body = item.querySelector('p');
  const indexNode = detail.querySelector('.v2AiCompactDetailIndex');
  const titleNode = detail.querySelector('.v2AiCompactDetailText strong');
  const bodyNode = detail.querySelector('.v2AiCompactDetailText p');

  if (indexNode) indexNode.textContent = `STEP ${String(index + 1).padStart(2, '0')}`;
  if (titleNode) titleNode.textContent = text(title);
  if (bodyNode) bodyNode.textContent = text(body);
}

function enhance(root, kind) {
  if (!root) return;
  root.classList.add('v2AiCompactRail');
  const items = directItems(root);
  if (!items.length) return;

  let activeIndex = Number(root.dataset.v2AiActiveIndex || 0);
  if (!Number.isFinite(activeIndex) || activeIndex < 0 || activeIndex >= items.length) activeIndex = 0;

  const activate = (nextIndex) => {
    const bounded = Math.max(0, Math.min(items.length - 1, Number(nextIndex) || 0));
    root.dataset.v2AiActiveIndex = String(bounded);
    items.forEach((item, index) => {
      const active = index === bounded;
      item.dataset.v2AiActive = active ? 'true' : 'false';
      item.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    updateDetail(root, kind, items[bounded], bounded);
  };

  items.forEach((item, index) => {
    if (!item.dataset.v2AiCompactBound) {
      item.dataset.v2AiCompactBound = 'true';
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.addEventListener('click', () => activate(index));
      item.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activate(index);
        }
      });
    }
  });

  activate(activeIndex);
}

function sync() {
  const flow = document.querySelector('[class*="aiIdleFlowGrid"]');
  const steps = document.querySelector('[class*="aiIdleSteps"]');
  enhance(flow, 'flow');
  enhance(steps, 'steps');
}

export default function V2AiCompactBridge() {
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
