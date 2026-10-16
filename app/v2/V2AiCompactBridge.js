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
  const nextIndexText = `STEP ${String(index + 1).padStart(2, '0')}`;
  const nextTitle = text(title);
  const nextBody = text(body);

  if (indexNode && indexNode.textContent !== nextIndexText) indexNode.textContent = nextIndexText;
  if (titleNode && titleNode.textContent !== nextTitle) titleNode.textContent = nextTitle;
  if (bodyNode && bodyNode.textContent !== nextBody) bodyNode.textContent = nextBody;
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
      const next = active ? 'true' : 'false';
      if (item.dataset.v2AiActive !== next) item.dataset.v2AiActive = next;
      if (item.getAttribute('aria-selected') !== next) item.setAttribute('aria-selected', next);
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

function removeOrphanDetail(kind) {
  document.querySelectorAll(`.v2AiCompactDetail[data-v2-ai-detail="${kind}"]`).forEach((node) => node.remove());
}

function setMarketVisualState(scanner, open) {
  if (!scanner) return;
  const next = open ? 'true' : 'false';
  if (scanner.dataset.v2MarketOpen !== next) scanner.dataset.v2MarketOpen = next;

  const head = scanner.querySelector('[class*="aiMarketScannerHead"]');
  if (head) {
    if (head.getAttribute('aria-expanded') !== next) head.setAttribute('aria-expanded', next);
    const action = head.querySelector('[class*="aiMarketScannerHeadRight"] em');
    const label = open ? '접기' : '펼치기';
    if (action && action.textContent !== label) action.textContent = label;
  }
}

function bindMarketFold(scanner) {
  const head = scanner?.querySelector('[class*="aiMarketScannerHead"]');
  if (!head || head.dataset.v2MarketFoldBound) return;
  head.dataset.v2MarketFoldBound = 'true';
  head.addEventListener('click', (event) => {
    if (scanner.dataset.v2MarketManaged !== 'true') return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    setMarketVisualState(scanner, scanner.dataset.v2MarketOpen !== 'true');
  }, true);
}

function setHistoryCardState(card, open) {
  if (!card) return;
  const next = open ? 'true' : 'false';
  if (card.dataset.v2HistoryOpen !== next) card.dataset.v2HistoryOpen = next;

  const head = card.querySelector('[class*="aiMarketHistoryHead"]');
  if (head && head.getAttribute('aria-expanded') !== next) head.setAttribute('aria-expanded', next);

  const action = card.querySelector('.v2AiHistoryCardAction');
  const label = open ? '접기' : '펼치기';
  if (action && action.textContent !== label) action.textContent = label;
}

function bindHistoryFold(card) {
  const head = card?.querySelector('[class*="aiMarketHistoryHead"]');
  if (!head || head.dataset.v2HistoryFoldBound) return;
  head.dataset.v2HistoryFoldBound = 'true';
  head.setAttribute('role', 'button');
  head.setAttribute('tabindex', '0');

  let action = head.querySelector('.v2AiHistoryCardAction');
  if (!action) {
    action = document.createElement('em');
    action.className = 'v2AiHistoryCardAction';
    head.appendChild(action);
  }

  const toggle = () => setHistoryCardState(card, card.dataset.v2HistoryOpen !== 'true');
  head.addEventListener('click', toggle);
  head.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle();
    }
  });
}

function enhanceMarketCards() {
  const scanner = document.querySelector('[class*="aiMarketScanner"]');
  if (!scanner) {
    document.querySelectorAll('.v2AiMarketHistoryCard').forEach((node) => node.remove());
    return;
  }

  const head = scanner.querySelector('[class*="aiMarketScannerHead"]');
  if (!head) return;

  const oldToggle = scanner.querySelector('.v2AiMarketHistoryToggle');
  if (oldToggle) oldToggle.remove();

  const mounted = Boolean(scanner.querySelector('[class*="aiMarketTelemetry"]'));
  if (!mounted) {
    if (!scanner.dataset.v2MarketProbeDone) {
      scanner.dataset.v2MarketProbeDone = 'true';
      head.click();
    }
    return;
  }

  scanner.dataset.v2MarketManaged = 'true';
  bindMarketFold(scanner);
  if (!scanner.dataset.v2MarketVisualInitialized) {
    scanner.dataset.v2MarketVisualInitialized = 'true';
    setMarketVisualState(scanner, false);
  } else {
    setMarketVisualState(scanner, scanner.dataset.v2MarketOpen === 'true');
  }

  let card = document.querySelector('.v2AiMarketHistoryCard');
  let historyHead = scanner.querySelector('[class*="aiMarketHistoryHead"]') || card?.querySelector('[class*="aiMarketHistoryHead"]');
  let historyList = scanner.querySelector('[class*="aiMarketHistoryList"]') || card?.querySelector('[class*="aiMarketHistoryList"]');
  let pager = scanner.querySelector('[class*="aiTradingPager"]') || card?.querySelector('[class*="aiTradingPager"]');
  if (!historyHead || !historyList || !pager) return;

  if (!card) {
    card = document.createElement('section');
    card.className = 'v2AiMarketHistoryCard';
    scanner.insertAdjacentElement('afterend', card);
  } else if (scanner.nextElementSibling !== card) {
    scanner.insertAdjacentElement('afterend', card);
  }

  if (historyHead.parentElement !== card) card.appendChild(historyHead);
  if (historyList.parentElement !== card) card.appendChild(historyList);
  if (pager.parentElement !== card) card.appendChild(pager);

  bindHistoryFold(card);
  if (!card.dataset.v2HistoryInitialized) {
    card.dataset.v2HistoryInitialized = 'true';
    setHistoryCardState(card, false);
  } else {
    setHistoryCardState(card, card.dataset.v2HistoryOpen === 'true');
  }
}

function sync() {
  const flow = document.querySelector('[class*="aiIdleFlowGrid"]');
  const steps = document.querySelector('[class*="aiIdleSteps"]');

  if (flow) enhance(flow, 'flow');
  else removeOrphanDetail('flow');

  if (steps) enhance(steps, 'steps');
  else removeOrphanDetail('steps');

  enhanceMarketCards();
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
      removeOrphanDetail('flow');
      removeOrphanDetail('steps');
      document.querySelectorAll('.v2AiMarketHistoryCard').forEach((node) => node.remove());
    };
  }, []);

  return null;
}
