/**
 * Alcohol-domeinlogica: weekschema, daglimiet, dagtotaal en dagstatus
 * (briefing 7.2, 7.5-7.7). Puur en DOM-vrij zodat dit via `node --test`
 * te testen is.
 */

import { isSameOrBefore, isAfter, weekdayMon0 } from "../../core/dateUtils.js";

export const WEEKDAY_LABELS = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"];

export const DAY_STATUS = {
  NOT_ASSESSED: "Niet beoordeeld",
  WITHIN_LIMIT: "Binnen limiet",
  EXCEEDED: "Limiet overschreden",
  WILDCARD: "Wildcard gebruikt",
  NO_LIMIT: "Geen limiet",
};

/**
 * Sentinelwaarde in een schema-dag voor "geen maximum" (op verzoek van de
 * gebruiker toegevoegd, niet in de oorspronkelijke briefing). Losstaand van
 * `null`, dat gereserveerd blijft voor "er gold nog geen schema op deze
 * datum" (zie getLimitForDate). -1 is JSON/IndexedDB-veilig, in
 * tegenstelling tot bv. Infinity.
 */
export const NO_LIMIT = -1;

export function isValidCount(n) {
  return Number.isInteger(n) && n >= 0;
}

export function isValidLimitValue(n) {
  return n === NO_LIMIT || isValidCount(n);
}

export function isValidScheduleDays(days) {
  return Array.isArray(days) && days.length === 7 && days.every(isValidLimitValue);
}

export function dayTotal(record) {
  return record.solo + record.together + record.social;
}

/**
 * De schemaversie die op een bepaalde datum werkelijk gold: de laatste
 * versie met effectiveFrom <= datum. Een latere wijziging herberekent
 * eerdere dagen nooit (7.6).
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

/** Daglimiet die op deze datum gold, of null als er nog geen schema bestond. */
export function getLimitForDate(schedules, dateISO) {
  const schedule = scheduleForDate(schedules, dateISO);
  if (!schedule) return null;
  return schedule.days[weekdayMon0(dateISO)];
}

/** Dagstatus op basis van totaal, geldende limiet en wildcard (7.7, + geen-maximum). */
export function computeDayStatus(total, limit, wildcard) {
  if (wildcard) return DAY_STATUS.WILDCARD;
  if (limit == null) return DAY_STATUS.NOT_ASSESSED;
  if (limit === NO_LIMIT) return DAY_STATUS.NO_LIMIT;
  return total <= limit ? DAY_STATUS.WITHIN_LIMIT : DAY_STATUS.EXCEEDED;
}

/**
 * Voegt een nieuwe schemaversie toe. Een tweede wijziging op dezelfde
 * ingangsdatum overschrijft de eerdere versie van die datum in plaats van
 * te stapelen (zelfde patroon als Habits).
 */
export function upsertScheduleVersion(schedules, version) {
  const filtered = schedules.filter((s) => s.effectiveFrom !== version.effectiveFrom);
  return [...filtered, version].sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : 1));
}

/** Vroegste datum waarop de module echt in gebruik is (voor vergelijkingsbeschikbaarheid, 7.15). */
export function getModuleStartDate(schedules, days) {
  const dates = [...schedules.map((s) => s.effectiveFrom), ...days.map((d) => d.date)];
  return dates.length ? dates.reduce((min, d) => (d < min ? d : min)) : null;
}
