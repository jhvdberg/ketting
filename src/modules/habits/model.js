/**
 * Habits-domeinlogica (briefing hoofdstuk 8). Volledig puur en DOM-vrij, zodat
 * dit bestand zonder browser via `node --test` te testen is (briefing 3.3 /
 * CLAUDE.md).
 */

import {
  weekdayMon0,
  isSameOrBefore,
  isBefore,
  isAfter,
  startOfWeek,
  endOfWeek,
  eachDay,
  compareISO,
} from "../../core/dateUtils.js";

export const WEEKDAY_LABELS = ["ma", "di", "wo", "do", "vr", "za", "zo"];

export function isValidDaysArray(days) {
  return (
    Array.isArray(days) &&
    days.length > 0 &&
    days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) &&
    new Set(days).size === days.length
  );
}

export function scheduleLabel(days) {
  if (!days || days.length === 7) return "elke dag";
  return [...days].sort((a, b) => a - b).map((d) => WEEKDAY_LABELS[d]).join(" ");
}

/**
 * De schemaversie die op een bepaalde datum werkelijk gold: de laatste
 * versie met effectiveFrom <= datum. Eerdere dagen blijven zo beoordeeld
 * volgens het schema dat toen gold, ook na latere wijzigingen (8.4).
 */
export function scheduleForDate(schedules, dateISO) {
  let result = null;
  for (const s of schedules) {
    if (isSameOrBefore(s.effectiveFrom, dateISO)) {
      if (!result || isAfter(s.effectiveFrom, result.effectiveFrom)) result = s;
    }
  }
  return result;
}

export function isScheduled(schedules, dateISO) {
  const schedule = scheduleForDate(schedules, dateISO);
  if (!schedule) return false;
  return schedule.days.includes(weekdayMon0(dateISO));
}

export function isDone(entries, dateISO) {
  return entries.some((e) => e.date === dateISO);
}

/**
 * Voegt een nieuwe schemaversie toe. Een tweede wijziging op dezelfde
 * ingangsdatum overschrijft de eerdere versie van die datum in plaats van
 * te stapelen (voorkomt dubbele versies bij meerdere edits op één dag).
 */
export function upsertScheduleVersion(schedules, version) {
  const filtered = schedules.filter((s) => s.effectiveFrom !== version.effectiveFrom);
  return [...filtered, version].sort((a, b) => compareISO(a.effectiveFrom, b.effectiveFrom));
}

/**
 * Streaks (8.5): alleen aaneengesloten geplande momenten die zijn voltooid.
 * Niet-geplande dagen onderbreken niets. Vandaag-nog-niet-gedaan breekt de
 * lopende streak niet, maar telt ook nog niet mee voor de langste streak.
 */
export function computeStreaks(schedules, entries, todayISO) {
  if (!schedules.length) return { current: 0, longest: 0 };
  const earliest = schedules.reduce(
    (min, s) => (isBefore(s.effectiveFrom, min) ? s.effectiveFrom : min),
    schedules[0].effectiveFrom
  );
  if (isAfter(earliest, todayISO)) return { current: 0, longest: 0 };
  const scheduledDates = eachDay(earliest, todayISO).filter((d) => isScheduled(schedules, d));

  let longest = 0;
  let running = 0;
  for (const d of scheduledDates) {
    if (d === todayISO && !isDone(entries, d)) break;
    if (isDone(entries, d)) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
  }

  let current = 0;
  for (let i = scheduledDates.length - 1; i >= 0; i -= 1) {
    const d = scheduledDates[i];
    if (d === todayISO && !isDone(entries, d)) continue;
    if (isDone(entries, d)) {
      current += 1;
    } else {
      break;
    }
  }

  return { current, longest };
}

/** Kalenderstatus van één dag (8.6): 'done' | 'not_done' | 'unplanned' | 'future'. */
export function calendarDayStatus(schedules, entries, dateISO, todayISO) {
  if (!isScheduled(schedules, dateISO)) return "unplanned";
  if (isAfter(dateISO, todayISO)) return "future";
  return isDone(entries, dateISO) ? "done" : "not_done";
}

/** Voortgang van de huidige week tot en met vandaag (5.4), per habit. */
export function weekProgress(schedules, entries, todayISO) {
  const weekStart = startOfWeek(todayISO);
  const weekEnd = endOfWeek(todayISO);
  const cutoff = isBefore(todayISO, weekEnd) ? todayISO : weekEnd;
  let planned = 0;
  let completed = 0;
  for (const d of eachDay(weekStart, cutoff)) {
    if (isScheduled(schedules, d)) {
      planned += 1;
      if (isDone(entries, d)) completed += 1;
    }
  }
  return { planned, completed };
}

/**
 * @param {Array<{habit: object, schedules: object[], entries: object[]}>} habitsWithData
 */
export function todayPlan(habitsWithData, todayISO) {
  const planned = [];
  const completed = [];
  for (const { habit, schedules, entries } of habitsWithData) {
    if (!habit.active) continue;
    if (isScheduled(schedules, todayISO)) {
      planned.push(habit);
      if (isDone(entries, todayISO)) completed.push(habit);
    }
  }
  return { planned, completed };
}

export function weekSummary(habitsWithData, todayISO) {
  let totalPlanned = 0;
  let totalCompleted = 0;
  for (const { habit, schedules, entries } of habitsWithData) {
    if (!habit.active) continue;
    const { planned, completed } = weekProgress(schedules, entries, todayISO);
    totalPlanned += planned;
    totalCompleted += completed;
  }
  const percentage = totalPlanned === 0 ? null : Math.round((totalCompleted / totalPlanned) * 100);
  return { totalPlanned, totalCompleted, percentage };
}
