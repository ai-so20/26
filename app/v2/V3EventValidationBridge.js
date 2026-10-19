'use client';

import { useEffect } from 'react';

function isNumberEventInput(input) {
  if (!(input instanceof HTMLInputElement) || input.type !== 'number') return false;
  return input.min === '1' && input.max === '10' && Boolean(input.closest('[class*="gameArea"]'));
}

function normalizeNumberInput(input) {
  const raw = String(input.value || '').trim();
  if (!raw) {
    input.setCustomValidity('1부터 10까지 숫자 하나를 선택해주세요.');
    return false;
  }
  const value = Number(raw);
  const valid = Number.isInteger(value) && value >= 1 && value <= 10;
  input.setCustomValidity(valid ? '' : '1부터 10까지 숫자 하나를 선택해주세요.');
  return valid;
}

export default function V3EventValidationBridge() {
  useEffect(() => {
    const onInput = (event) => {
      const input = event.target;
      if (isNumberEventInput(input)) normalizeNumberInput(input);
    };

    const onClick = (event) => {
      const button = event.target instanceof Element ? event.target.closest('button') : null;
      const area = button?.closest('[class*="gameArea"]');
      const input = area?.querySelector('input[type="number"][min="1"][max="10"]');
      if (!button || !isNumberEventInput(input)) return;
      if (!/제출/.test(String(button.textContent || ''))) return;
      if (normalizeNumberInput(input)) return;
      event.preventDefault();
      event.stopPropagation();
      input.reportValidity();
      input.focus();
    };

    document.addEventListener('input', onInput, true);
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('input', onInput, true);
      document.removeEventListener('click', onClick, true);
    };
  }, []);

  return null;
}
