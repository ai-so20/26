'use client';

import { useEffect } from 'react';

function text(node) {
  return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
}

function findPrimaryNav() {
  return [...document.querySelectorAll('nav')].find((nav) => {
    const value = text(nav);
    return value.includes('이벤트') && value.includes('AI프로세스') && value.includes('상품지급센터');
  }) || null;
}

function findButton(root, label) {
  return [...(root?.querySelectorAll('button') || [])].find((button) => text(button) === label) || null;
}

function findModeButton(label) {
  return [...document.querySelectorAll('button')].find((button) => text(button).includes(label)) || null;
}

function activateMode(mode) {
  const label = mode === 'attendance' ? '출석 이벤트' : '실시간 이벤트';
  const button = findModeButton(label);
  if (button) button.click();
  document.documentElement.dataset.v2SplitPage = mode;
  try { window.sessionStorage.setItem('vip-event-page-mode', mode); } catch {}
}

export default function V2SplitNavBridge() {
  useEffect(() => {
    let syncing = false;

    const sync = () => {
      if (syncing) return;
      syncing = true;
      try {
        const nav = findPrimaryNav();
        if (!nav) return;

        const eventButton = findButton(nav, '이벤트') || findButton(nav, '실시간');
        const aiButton = findButton(nav, 'AI프로세스');
        const rewardButton = findButton(nav, '상품지급센터');
        if (!eventButton || !aiButton || !rewardButton) return;

        nav.classList.add('v2SplitTopNav');
        eventButton.textContent = '실시간';
        eventButton.dataset.v2SplitLive = 'true';

        let attendanceButton = nav.querySelector('[data-v2-split-attendance="true"]');
        if (!attendanceButton) {
          attendanceButton = document.createElement('button');
          attendanceButton.type = 'button';
          attendanceButton.textContent = '출석';
          attendanceButton.className = eventButton.className;
          attendanceButton.dataset.v2SplitAttendance = 'true';
          attendanceButton.addEventListener('click', () => {
            const eventPage = document.querySelector('[class*="eventPage"]');
            if (!eventPage) eventButton.click();
            window.requestAnimationFrame(() => {
              activateMode('attendance');
              sync();
            });
          });
          nav.insertBefore(attendanceButton, aiButton);
        }

        if (!eventButton.dataset.v2SplitBound) {
          eventButton.dataset.v2SplitBound = 'true';
          eventButton.addEventListener('click', () => {
            window.requestAnimationFrame(() => {
              activateMode('live');
              sync();
            });
          });
        }

        const eventPage = document.querySelector('[class*="eventPage"]');
        if (eventPage) {
          const attendanceMode = findModeButton('출석 이벤트');
          const liveMode = findModeButton('실시간 이벤트');
          const attendanceActive = Boolean(attendanceMode?.className?.includes('segmentActive'));
          const liveActive = Boolean(liveMode?.className?.includes('segmentActive'));
          let mode = attendanceActive ? 'attendance' : liveActive ? 'live' : null;
          if (!mode) {
            try { mode = window.sessionStorage.getItem('vip-event-page-mode'); } catch {}
          }
          if (mode !== 'attendance') mode = 'live';
          document.documentElement.dataset.v2SplitPage = mode;

          eventButton.classList.toggle('v2SplitNavActive', mode === 'live');
          attendanceButton.classList.toggle('v2SplitNavActive', mode === 'attendance');

          const heading = eventPage.querySelector('[class*="pageHeading"]');
          const kicker = heading?.querySelector('[class*="kicker"]');
          const title = heading?.querySelector('h1');
          if (mode === 'attendance') {
            if (kicker) kicker.textContent = 'DAILY CHECK-IN';
            if (title) title.textContent = '출석';
          } else {
            if (kicker) kicker.textContent = 'LIVE EVENT';
            if (title) title.textContent = '실시간';
          }
        } else {
          eventButton.classList.remove('v2SplitNavActive');
          attendanceButton.classList.remove('v2SplitNavActive');
        }

        document.querySelectorAll('[class*="rewardQuickLinks"] button').forEach((button) => {
          const value = text(button);
          if (!value.includes('출석') || button.dataset.v2SplitAttendanceShortcut) return;
          button.dataset.v2SplitAttendanceShortcut = 'true';
          button.addEventListener('click', () => {
            try { window.sessionStorage.setItem('vip-event-page-mode', 'attendance'); } catch {}
          }, { capture: true });
        });
      } finally {
        syncing = false;
      }
    };

    const observer = new MutationObserver(() => window.requestAnimationFrame(sync));
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    sync();
    const timer = window.setInterval(sync, 700);

    return () => {
      observer.disconnect();
      window.clearInterval(timer);
      delete document.documentElement.dataset.v2SplitPage;
    };
  }, []);

  return null;
}
