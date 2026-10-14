// Pure calculation only. No database, auth, scheduler or React dependencies.
export const POLICY = Object.freeze({
  intervalMinutes: 3,
  minMinutes: 60,
  maxMinutes: 43200,
  profitProbability: 0.85,
  thirtyDayReturnMin: 8,
  thirtyDayReturnMax: 12,
  dailyReturnMin: 0.25,
  dailyReturnMax: 0.30,
});

function nonnegative(value, name) {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(name);
  return value;
}
function money(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(name);
  return value;
}
function timestamp(value) {
  const result = new Date(value).getTime();
  if (!Number.isFinite(result)) throw new RangeError('Invalid time');
  return result;
}
function randomUnit(random) {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('Random must be in [0,1)');
  return value;
}
function boundedTarget(min, max, random) {
  return min + (max - min) * randomUnit(random);
}
export function validateDuration(minutes) {
  if (!Number.isInteger(minutes) || minutes < POLICY.minMinutes || minutes > POLICY.maxMinutes) {
    throw new RangeError('Duration must be 60..43200 whole minutes');
  }
  return minutes;
}

// Return ratios use 8 = +800%, 0.25 = +25%. UI converts percent inputs.
export function periodReturn(thirtyDayReturn, durationMinutes) {
  nonnegative(thirtyDayReturn, 'thirtyDayReturn');
  validateDuration(durationMinutes);
  return Math.expm1(Math.log1p(thirtyDayReturn) * durationMinutes / POLICY.maxMinutes);
}
export function createPlan({ capital, startedAt, durationMinutes = null, manualReturn = null }, random = Math.random) {
  money(capital, 'capital');
  if (capital === 0) throw new RangeError('Initial capital must be positive');
  const start = timestamp(startedAt);
  if (durationMinutes === null) {
    if (manualReturn !== null) throw new RangeError('Indefinite plan needs a daily target instead of period return');
    const dailyReturn = boundedTarget(POLICY.dailyReturnMin, POLICY.dailyReturnMax, random);
    return Object.freeze({ capital, startedAt: new Date(start).toISOString(), endsAt: null,
      durationMinutes: null, thirtyDayReturn: null, targetReturn: null, targetAmount: null,
      dailyReturn, targetSource: 'indefinite_daily', intervalMinutes: 3 });
  }
  validateDuration(durationMinutes);
  const thirtyDayReturn = manualReturn === null
    ? boundedTarget(POLICY.thirtyDayReturnMin, POLICY.thirtyDayReturnMax, random) : null;
  const targetReturn = manualReturn === null
    ? periodReturn(thirtyDayReturn, durationMinutes) : nonnegative(manualReturn, 'manualReturn');
  const targetAmount = Math.round(capital * (1 + targetReturn));
  money(targetAmount, 'targetAmount');
  return Object.freeze({ capital, startedAt: new Date(start).toISOString(),
    endsAt: new Date(start + durationMinutes * 60000).toISOString(), durationMinutes,
    thirtyDayReturn, targetReturn, targetAmount, dailyReturn: null,
    targetSource: manualReturn === null ? 'thirty_day_compound' : 'admin_override', intervalMinutes: 3 });
}

export function currentValue(capital, cumulativePnl) {
  money(capital, 'capital');
  if (!Number.isSafeInteger(cumulativePnl)) throw new RangeError('cumulativePnl');
  return money(capital + cumulativePnl, 'valuation');
}
export function chooseDirection(random = Math.random) {
  return randomUnit(random) < POLICY.profitProbability ? 'profit' : 'loss';
}

// Timing hint for a later server engine. Not a payout algorithm.
export function trackingHint(plan, valuation, now) {
  money(valuation, 'valuation');
  const time = timestamp(now);
  if (time < timestamp(plan.startedAt)) throw new RangeError('PROCESS has not started');
  if (plan.endsAt === null) {
    return { expired: false, remainingMinutes: null,
      equivalentNetTickReturn: Math.expm1(Math.log1p(plan.dailyReturn) / 480) };
  }
  const remainingMs = timestamp(plan.endsAt) - time;
  if (remainingMs <= 0) return { expired: true, remainingMinutes: 0, equivalentNetTickReturn: null };
  const steps = Math.max(1, Math.ceil(remainingMs / 180000));
  return { expired: false, remainingMinutes: remainingMs / 60000,
    equivalentNetTickReturn: valuation === 0 ? null : Math.expm1(Math.log(plan.targetAmount / valuation) / steps) };
}

// Public and privileged records must be persisted/read through separate access paths.
// No top-up, target settlement or artificial final payout occurs on termination.
export function finishProcess({ valuation, targetAmount = null, reason, endedAt, actorId }) {
  money(valuation, 'valuation');
  if (targetAmount !== null) money(targetAmount, 'targetAmount');
  if (!['manual', 'expired'].includes(reason)) throw new RangeError('reason');
  if (typeof actorId !== 'string' || !actorId) throw new RangeError('actorId');
  const end = new Date(timestamp(endedAt)).toISOString();
  return {
    publicRecord: { status: 'complete', finalValuation: valuation, endedAt: end },
    adminAudit: { reason, actorId, endedAt: end, targetAmount, finalValuation: valuation,
      targetMinusActual: targetAmount === null ? null : targetAmount - valuation },
    settlementDelta: 0,
  };
}
