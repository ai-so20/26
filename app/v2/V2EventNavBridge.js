'use client';

import { useEffect } from 'react';

function buttonText(node) {
  return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
}

function findMainNav() {
  return [...document.querySelectorAll('nav')].find((nav) => {
    const text = buttonText(nav);
    return text.includes('이벤트') && text.includes('AI프로세스') && text.includes('상품지급센터');
  }) || null;
}

function findNavButton(nav, label) {
  return [...(nav?.querySelectorAll('button') || [])].find((button) => buttonText(button) === label) || null;
}

function findEventModeButton(label) {
  return [...document.querySelectorAll('button')].find((button) => buttonText(button).includes(label)) || null;
}

function setEventMode(mode) {
  const targetLabel = mode === 'attendance' ? '출석 이벤트' : '실시간 이벤트';
  const target = findEventModeButton(targetLabel);
  if (target) target.click();
  document.documentElement.dataset.v2EventMode = mode;
  window.sessionStorage.setItem('vip-event-page-mode', mode);
}

export default function V2EventNavBridge() {
  useEffect(() => {
    let syncing = false;

    const sync = () => {
      if (syncing) return;
      syncing = true;
      try {
        const nav = findMainNav();
        if (!nav) return;

        const eventButton = findNavButton(nav, '이벤트');
        const aiButton = findNavButton(nav, 'AI프로세스');
        const rewardButton = findNavButton(nav, '상품지급센터');
        if (!eventButton || !aiButton || !rewardButton) return;

        nav.classList.add('v2FourNav');

        let attendanceButton = nav.querySelector('[data-v2-attendance-nav="true"]');
        if (!attendanceButton) {
          attendanceButton = document.createElement('button');
          attendanceButton.type = 'button';
          attendanceButton.textContent = '출석';
          attendanceButton.dataset.v2AttendanceNav = 'true';
          attendanceButton.className = `${eventButton.className} v2AttendanceNav`;
          attendanceButton.addEventListener('click', () => {
            if (!document.querySelector('[class*="eventPage"]')) {
              eventButton.click();
            }
            window.requestAnimationFrame(() => {
              setEventMode('attendance');
              sync();
            });
          });
          nav.insertBefore(attendanceButton, aiButton);
        }

        if (!eventButton.dataset.v2SplitBound) {
          eventButton.dataset.v2SplitBound = 'true';
          eventButton.addEventListener('click', () => {
            window.sessionStorage.setItem('vip-event-page-mode', 'live');
            document.documentElement.dataset.v2EventMode = 'live';
            window.requestAnimationFrame(() => {
              setEventMode('live');
              sync();
            });
          });
        }

        const eventPage = document.querySelector('[class*="eventPage"]');
        if (eventPage) {
          const liveModeButton = findEventModeButton('실시간 이벤트');
          const attendanceModeButton = findEventModeButton('출석 이벤트');
          const attendanceActive = Boolean(attendanceModeButton?.className?.includes('segmentActive'));
          const liveActive = Boolean(liveModeButton?.className?.includes('segmentActive'));
          const stored = window.sessionStorage.getItem('vip-event-page-mode');
          const mode = attendanceActive ? 'attendance' : liveActive ? 'live' : stored === 'attendance' ? 'attendance' : 'live';
          document.documentElement.dataset.v2EventMode = mode;
          attendanceButton.classList.toggle('v2SplitActive', mode === 'attendance');
          eventButton.classList.toggle('v2SplitEventActive', mode === 'live');

          const heading = eventPage.querySelector('[class*="pageHeading"]');
          const kicker = heading?.querySelector('[class*="kicker"]');
          const title = heading?.querySelector('h1');
          if (mode === 'attendance') {
            if (kicker) kicker.textContent = 'DAILY CHECK-IN';
            if (title) title.textContent = '출석';
          } else {
            if (kicker) kicker.textContent = 'EVENT';
            if (title) title.textContent = '이벤트';
          }
        } else {
          attendanceButton.classList.remove('v2SplitActive');
          eventButton.classList.remove('v2SplitEventActive');
        }
      } finally {
        syncing = false;
      }
    };

    const observer = new MutationObserver(() => window.requestAnimationFrame(sync));
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    sync();
    const timer = window.setInterval(sync, 800);

    return () => {
      observer.disconnect();
      window.clearInterval(timer);
      delete document.documentElement.dataset.v2EventMode;
    };
  }, []);

  return null;
}
