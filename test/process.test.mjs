import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlan, periodReturn, chooseDirection, currentValue, trackingHint, finishProcess } from '../src/domain/process.mjs';
const base = { capital: 1_000_000, startedAt: '2026-10-14T00:00:00Z', durationMinutes: 43200 };
test('30-day plan yields capital-inclusive 9x..13x range and persists draw', () => {
  assert.equal(createPlan(base, () => 0).targetAmount, 9_000_000);
  assert.equal(createPlan(base, () => 0.5).targetAmount, 11_000_000);
  assert.ok(createPlan(base, () => 0.999999).targetAmount <= 13_000_000);
});
test('short duration compounds to original 30-day target', () => {
  const oneDay = periodReturn(8, 1440);
  assert.ok(Math.abs((1 + oneDay) ** 30 - 9) < 1e-10);
  assert.ok(periodReturn(8, 60) < oneDay);
});
test('manual return overrides random default without drawing', () => {
  const plan = createPlan({ ...base, durationMinutes: 60, manualReturn: 0.1 }, () => { throw Error('unused'); });
  assert.equal(plan.targetAmount, 1_100_000);
  assert.equal(plan.thirtyDayReturn, null);
});
test('duration bounds reject old 90-day and sub-hour plans', () => {
  for (const durationMinutes of [59, 43201, 129600, 60.5]) {
    assert.throws(() => createPlan({ ...base, durationMinutes }));
  }
});
test('indefinite target is separate daily 25..30%, with no end', () => {
  const plan = createPlan({ ...base, durationMinutes: null }, () => 0.5);
  assert.equal(plan.dailyReturn, 0.275);
  assert.equal(plan.endsAt, null);
  const hint = trackingHint(plan, 1_000_000, base.startedAt);
  assert.ok(Math.abs((1 + hint.equivalentNetTickReturn) ** 480 - 1.275) < 1e-10);
});
test('85/15 direction threshold and invalid RNG', () => {
  assert.equal(chooseDirection(() => 0.8499), 'profit');
  assert.equal(chooseDirection(() => 0.85), 'loss');
  for (const v of [1, -0.1, NaN]) assert.throws(() => chooseDirection(() => v));
});
test('valuation includes cumulative losses and rejects negative totals', () => {
  assert.equal(currentValue(1_000_000, -100_000), 900_000);
  assert.throws(() => currentValue(1, -2));
});
test('expiry never issues target-filling payout; public record has no gap', () => {
  for (const reason of ['manual', 'expired']) {
    for (const valuation of [9_000_000, 12_000_000]) {
      const result = finishProcess({ valuation, targetAmount: 11_000_000, reason, endedAt: base.startedAt, actorId: 'server' });
      assert.equal(result.publicRecord.finalValuation, valuation);
      assert.equal(result.settlementDelta, 0);
      assert.equal(result.adminAudit.targetMinusActual, 11_000_000 - valuation);
      assert.ok(!('targetMinusActual' in result.publicRecord));
      assert.ok(!('targetAmount' in result.publicRecord));
    }
  }
});
test('tracking hint stops at expiry and handles zero valuation', () => {
  const plan = createPlan(base, () => 0.5);
  assert.equal(trackingHint(plan, 1_000_000, plan.endsAt).expired, true);
  assert.equal(trackingHint(plan, 0, base.startedAt).equivalentNetTickReturn, null);
});
