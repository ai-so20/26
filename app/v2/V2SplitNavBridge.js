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

function withoutReactActiveClass(className = '') {
  return String(className)
    .split(/\s+/)
    .filter(Boolean)
    .filter((name) => !/navActive/i.test(name))
    .join(' ');
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
          attendanceButton.className = withoutReactActiveClass(eventButton.className);
          attendanceButton.dataset.v2SplitAttendance = 'true';
          attendanceButton.addEventListener('click', () => {
            if (!document.querySelector('[class*="eventPage"]')) eventButton.click();
            try { window.sessionStorage.setItem('vip-event-page-mode', 'attendance'); } catch {}
            document.documentElement.dataset.v2SplitPage = 'attendance';
            eventButton.classList.remove('v2SplitNavActive');
            attendanceButton.classList.add('v2SplitNavActive');
            window.requestAnimationFrame(() => {
              activateMode('attendance');
              sync();
            });
          });
          nav.insertBefore(attendanceButton, aiButton);
        }

        const clearSplitActive = () => {
          eventButton.classList.remove('v2SplitNavActive');
          attendanceButton.classList.remove('v2SplitNavActive');
          delete document.documentElement.dataset.v2SplitPage;
        };

        if (!eventButton.dataset.v2SplitBound) {
          eventButton.dataset.v2SplitBound = 'true';
          eventButton.addEventListener('click', () => {
            let requestedMode = 'live';
            try {
              const pending = window.sessionStorage.getItem('vip-event-shortcut-mode');
              if (pending === 'attendance') requestedMode = 'attendance';
              window.sessionStorage.removeItem('vip-event-shortcut-mode');
              window.sessionStorage.setItem('vip-event-page-mode', requestedMode);
            } catch {}
            document.documentElement.dataset.v2SplitPage = requestedMode;
            eventButton.classList.toggle('v2SplitNavActive', requestedMode === 'live');
            attendanceButton.classList.toggle('v2SplitNavActive', requestedMode === 'attendance');
            window.requestAnimationFrame(() => {
              activateMode(requestedMode);
              sync();
            });
          });
        }

        if (!aiButton.dataset.v2SplitClearBound) {
          aiButton.dataset.v2SplitClearBound = 'true';
          aiButton.addEventListener('click', clearSplitActive, { capture: true });
        }
        if (!rewardButton.dataset.v2SplitClearBound) {
          rewardButton.dataset.v2SplitClearBound = 'true';
          rewardButton.addEventListener('click', clearSplitActive, { capture: true });
        }

        const aiActive = /navActive/i.test(aiButton.className);
        const rewardActive = /navActive/i.test(rewardButton.className);
        const eventPage = document.querySelector('[class*="eventPage"]');

        if (aiActive || rewardActive || !eventPage) {
          clearSplitActive();
        } else {
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
        }

        document.querySelectorAll('[class*="rewardQuickLinks"] button').forEach((button) => {
          const value = text(button);
          if (!value.includes('출석') || button.dataset.v2SplitAttendanceShortcut) return;
          button.dataset.v2SplitAttendanceShortcut = 'true';
          button.addEventListener('click', () => {
            try {
              window.sessionStorage.setItem('vip-event-page-mode', 'attendance');
              window.sessionStorage.setItem('vip-event-shortcut-mode', 'attendance');
            } catch {}
          }, { capture: true });
        });
      } finally {
        syncing = false;
      }
    };

    const observer = new MutationObserver(() => window.requestAnimationFrame(sync));
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    sync();
    const timer = window.setInterval(sync, 400);

    return () => {
      observer.disconnect();
      window.clearInterval(timer);
      delete document.documentElement.dataset.v2SplitPage;
    };
  }, []);

  return null;
}
