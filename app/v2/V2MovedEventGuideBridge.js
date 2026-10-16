'use client';

import { useEffect } from 'react';

function makeGuide(kind) {
  const guide = document.createElement('div');
  guide.className = `v2MovedEventGuide v2MovedEventGuide-${kind}`;
  guide.dataset.v2MovedEventGuide = kind;

  const badge = document.createElement('span');
  badge.className = 'v2MovedEventGuideBadge';
  badge.textContent = kind === 'attendance' ? '30' : '24';

  const copy = document.createElement('div');
  const title = document.createElement('strong');
  const text = document.createElement('p');

  if (kind === 'attendance') {
    title.textContent = '출석 이벤트 · 누적 30회';
    text.textContent = '하루 1회 출석할 수 있으며, 누적 30회 출석 달성 시 3,000원 ~ 500,000원 상당 랜덤 기프티콘 혜택이 제공됩니다. 연속 출석이 아니어도 누적 횟수로 인정됩니다.';
  } else {
    title.textContent = '시간별 이벤트 · 매일 24회';
    text.textContent = '매일 00:00 ~ 24:00, 총 하루 24회차 이벤트가 진행됩니다. 회차당 1회 참여할 수 있으며 당첨 시 3,000원 ~ 300,000원 상당 랜덤 기프티콘이 지급됩니다.';
  }

  copy.append(title, text);
  guide.append(badge, copy);
  return guide;
}

function syncMovedGuides() {
  const page = document.querySelector('[class*="eventPage"]');
  if (!page) return;

  const primaryCard = page.querySelector('[class*="primaryCard"]');
  if (primaryCard && !primaryCard.querySelector('[data-v2-moved-event-guide="live"]')) {
    const cardBody = primaryCard.querySelector('[class*="cardBody"]');
    const guide = makeGuide('live');
    if (cardBody) primaryCard.insertBefore(guide, cardBody);
    else primaryCard.prepend(guide);
  }

  const attendanceCard = page.querySelector('[class*="attendanceCardLarge"]');
  if (attendanceCard && !attendanceCard.querySelector('[data-v2-moved-event-guide="attendance"]')) {
    const header = attendanceCard.querySelector('[class*="attendanceHeader"]');
    const guide = makeGuide('attendance');
    if (header?.nextSibling) attendanceCard.insertBefore(guide, header.nextSibling);
    else attendanceCard.appendChild(guide);
  }
}

export default function V2MovedEventGuideBridge() {
  useEffect(() => {
    let raf = 0;
    const schedule = () => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(syncMovedGuides);
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
