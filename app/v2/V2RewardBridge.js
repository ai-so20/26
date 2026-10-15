'use client';

import { useEffect } from 'react';

export default function V2RewardBridge() {
  useEffect(() => {
    const handleClick = (event) => {
      const button = event.target?.closest?.('button');
      if (!button) return;
      if (!['상품 지급', '상품지급센터'].includes(String(button.textContent || '').trim())) return;

      event.preventDefault();
      event.stopPropagation();
      try {
        window.sessionStorage.setItem('vip-active-tab', 'private');
      } catch {}
      window.location.assign('/v2/reward');
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  return null;
}
