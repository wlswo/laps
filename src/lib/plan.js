// The app's scheduling math (LapsCore: ReadingCost, DailyPlanner, PlanSimulator, PlanAdvisor, PaceCalculator),
// ported line for line so the site shows the numbers the app would. A page in read k costs speedRatio^k of a
// first-read page, never less than a quarter. Each study day spends an equal share of what is left.

export const FASTEST_COST_PER_PAGE = 0.25;
export const HEAVY_PAGES_PER_DAY = 80;
export const DEFAULT_SPEED_RATIO = 0.6;

/**
 * @typedef {{ pages: number, reads: number, ratio: number, days: number, rest: number[], start: Date }} Plan
 * `days`: calendar days from today to the day after the finish date (the app's `endDay`), so the finish date is
 * today + days - 1. `rest`: weekdays off, 0 = Sunday … 6 = Saturday.
 */

export function costPerPage(plan, k) {
  return Math.max(Math.pow(plan.ratio, k), FASTEST_COST_PER_PAGE);
}

function total(plan) {
  return plan.pages * plan.reads;
}

function passIndex(plan, x) {
  return Math.min(plan.reads - 1, Math.max(0, Math.floor(x / plan.pages)));
}

export function cost(plan, start, end) {
  let x = Math.max(0, start);
  const target = Math.min(total(plan), end);
  let sum = 0;
  while (x < target) {
    const k = passIndex(plan, x);
    const passEnd = Math.min(target, (k + 1) * plan.pages);
    sum += (passEnd - x) * costPerPage(plan, k);
    x = passEnd;
  }
  return sum;
}

function advance(plan, start, budget) {
  let x = Math.max(0, start);
  let left = budget;
  const all = total(plan);
  while (left > 1e-12 && x < all) {
    const k = passIndex(plan, x);
    const passEnd = (k + 1) * plan.pages;
    const price = costPerPage(plan, k);
    const need = (passEnd - x) * price;
    if (left >= need) {
      left -= need;
      x = passEnd;
    } else {
      x += left / price;
      left = 0;
    }
  }
  return Math.min(x, all);
}

/** Calendar day `i` from today (0 = today) is a rest day. */
export function isRest(plan, i) {
  const weekday = (plan.start.getDay() + i) % 7;
  return plan.rest.includes(weekday);
}

/** Study days in [from, plan.days). */
export function studyDaysLeft(plan, from) {
  let count = 0;
  for (let i = from; i < plan.days; i++) if (!isRest(plan, i)) count++;
  return count;
}

/** Today's target from `position` on calendar day `i`: remaining cost ÷ remaining study days, rounded up. */
export function dayEnd(plan, position, i) {
  const all = total(plan);
  const days = studyDaysLeft(plan, i);
  const budget = cost(plan, position, all) / days;
  const raw = advance(plan, position, budget);
  return Math.min(all, Math.max(Math.ceil(raw - 1e-9), position + 1));
}

/** Every study day from calendar day `from`, reading exactly the target: [{ i, from, to }]. */
export function simulate(plan, position = 0, from = 0) {
  const days = [];
  let x = position;
  for (let i = from; i < plan.days && x < total(plan); i++) {
    if (isRest(plan, i)) continue;
    const to = dayEnd(plan, x, i);
    days.push({ i, from: x, to });
    x = to;
  }
  return days;
}

export function baselineBudget(plan, position = 0, from = 0) {
  const days = studyDaysLeft(plan, from);
  return days > 0 ? cost(plan, position, total(plan)) / days : 0;
}

/** The add-book preview: one row per read, the heaviest day, and whether it all fits. */
export function preview(plan) {
  const planned = simulate(plan);
  const p = plan.pages;
  const budget = baselineBudget(plan);
  const reads = [];
  for (let read = 1; read <= plan.reads; read++) {
    const starts = planned.find((d) => d.to > (read - 1) * p);
    const ends = planned.find((d) => d.to >= read * p);
    if (!starts || !ends) continue;
    const pages = planned.filter((d) => Math.floor(d.from / p) + 1 === read).map((d) => d.to - d.from);
    reads.push({
      read,
      days: pages.length,
      startDay: starts.i,
      finishDay: ends.i,
      pagesPerDay: Math.ceil(budget / costPerPage(plan, read - 1) - 1e-9),
    });
  }
  const peak = planned.reduce((m, d) => Math.max(m, d.to - d.from), 0);
  const heaviest = reads.reduce((m, r) => Math.max(m, r.pagesPerDay), 0);
  return {
    reads,
    firstDay: planned.length ? planned[0].to - planned[0].from : 0,
    peak,
    heaviest,
    finishesInTime: (planned.length ? planned[planned.length - 1].to : 0) >= total(plan),
    planned,
  };
}

export function isHeavy(result) {
  return Math.max(result.peak, result.heaviest) > HEAVY_PAGES_PER_DAY;
}

/** The largest read count below the current one that keeps every day under the heavy line, or null. */
export function suggestion(plan) {
  if (!isHeavy(preview(plan))) return null;
  for (let reads = plan.reads - 1; reads >= 1; reads--) {
    const result = preview({ ...plan, reads });
    if (!isHeavy(result)) return { reads, peak: Math.max(result.peak, result.heaviest) };
  }
  return null;
}

/**
 * Pace a week into the plan (study day `at`), `shift` days off the plan: positive behind, negative ahead.
 * Returns the pages-a-day difference against the plan (the app's "+3 pages a day") and both schedules from there.
 */
export function pace(plan, at, shift) {
  const planned = simulate(plan);
  if (planned.length <= at) return null;
  const today = planned[at].i;
  const index = Math.min(Math.max(at - shift, 0), planned.length - 1);
  const position = shift < 0 && at - shift >= planned.length ? total(plan) - 1 : planned[index].from;
  const budget = cost(plan, position, total(plan)) / studyDaysLeft(plan, today);
  const baseline = baselineBudget(plan);
  const pageCost = costPerPage(plan, passIndex(plan, position));
  const difference = (budget - baseline) / pageCost;
  return {
    pagesPerDay: Math.abs(difference) < 1 ? 0 : Math.round(difference),
    // The same comparison in pages a day at the current read's speed: what the plan asked, what it asks now.
    planPages: baseline / pageCost,
    nowPages: budget / pageCost,
    missed: Math.max(0, shift),
    today,
    onPlan: planned.filter((d) => d.i >= today),
    replanned: simulate(plan, position, today),
    done: planned.slice(0, at).map((d, n) => ({ i: d.i, read: n < at - Math.max(0, shift) })),
  };
}
