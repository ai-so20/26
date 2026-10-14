import { periodReturn } from '/domain/process.mjs';
const money = new Intl.NumberFormat('ko-KR');
const form = document.querySelector('#plan-form');
function render(event) {
  event?.preventDefault();
  const error = document.querySelector('#error');
  error.textContent = '';
  try {
    const capital = Number(form.elements.capital.value);
    const days = Number(form.elements.duration.value);
    const thirtyDayReturn = Number(form.elements.return.value);
    if (!Number.isSafeInteger(capital) || capital <= 0 || capital > 1e12) throw Error('기준 금액은 1원~1조원 사이의 정수로 입력해주세요.');
    if (!Number.isInteger(days) || days < 1 || days > 30) throw Error('진행기간은 1~30일의 정수로 입력해주세요.');
    const rate = periodReturn(thirtyDayReturn, days * 1440);
    const target = Math.round(capital * (1 + rate));
    document.querySelector('#target').textContent = money.format(target) + '원';
    document.querySelector('#period-rate').textContent = '+' + (rate * 100).toFixed(2) + '%';
    document.querySelector('#profit').textContent = '+' + money.format(target - capital) + '원';
  } catch (e) {
    error.textContent = e.message;
    for (const id of ['target', 'period-rate', 'profit']) document.getElementById(id).textContent = '—';
  }
}
form.addEventListener('submit', render);
render();
