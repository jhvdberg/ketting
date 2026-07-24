/**
 * Alcohol-analyses (briefing 7.8-7.18). Puur en DOM-vrij.
 *
 * Er wordt niets als afgeleide/berekende statistiek gecachet: elk scherm
 * roept deze functies telkens opnieuw aan over de ruwe dagrecords. Een
 * wijziging of retroactieve correctie werkt daardoor altijd automatisch
 * door in alle afhankelijke cijfers (7.4/19.4), zonder aparte
 * herberekeningsstap.
 */

import { eachDay, addDays, startOfWeek, isSameOrAfter } from "../../core/dateUtils.js";
import { DAY_STATUS, getLimitForDate } from "./model.js";

// --- basisclassificaties per dag (7.7, 7.8) ---

export function isConfirmedFreeDay(record) {
  return !!record && record.total === 0;
}

export function isAchievedPlannedFreeDay(record, limit) {
  return !!record && limit === 0 && record.total === 0 && !record.wildcard;
}

export function isMissedPlannedFreeDay(record, limit) {
  return !!record && limit === 0 && record.total > 0 && !record.wildcard;
}

/** Status inclusief 'Niet beoordeeld' voor verstreken dagen zonder record (7.7, 7.9). */
export function unifiedDayStatus(recordsByDate, date, today) {
  const record = recordsByDate.get(date);
  if (record) return record.status;
  if (date > today) return null;
  return DAY_STATUS.NOT_ASSESSED;
}

/** Verstreken dagen zonder registratie sinds het begin van de module, oudste eerst (7.9). */
export function missingDates(records, moduleStartDate, today) {
  if (!moduleStartDate || moduleStartDate > today) return [];
  const registered = new Set(records.map((r) => r.date));
  return eachDay(moduleStartDate, today).filter((d) => !registered.has(d));
}

// --- statistieken over een willekeurige periode (7.11, 7.12, 7.14) ---

/**
 * Berekent alle in 7.14 genoemde inzichten over [fromDate, toDate]
 * (inclusief). Wordt hergebruikt voor de volledige-historie-analyse, "deze
 * week"/"deze maand"-voortgang (7.16) en periodevergelijkingen (7.15).
 */
export function periodStats(records, schedules, fromDate, toDate) {
  const byDate = new Map(records.map((r) => [r.date, r]));
  let totalGlasses = 0;
  let solo = 0;
  let together = 0;
  let social = 0;
  let drinkingDays = 0;
  let confirmedFreeDays = 0;
  let achievedFreeDays = 0;
  let missedFreeDays = 0;
  let withinDays = 0;
  let exceededDays = 0;
  let wildcardDays = 0;
  let wildcardGlasses = 0;
  let missingDays = 0;
  let registeredDays = 0;
  let calendarDays = 0;
  let assessedUsage = 0;
  let assessedLimit = 0;

  for (const d of fromDate > toDate ? [] : eachDay(fromDate, toDate)) {
    calendarDays += 1;
    const record = byDate.get(d);
    if (!record) {
      missingDays += 1;
      continue;
    }
    registeredDays += 1;
    totalGlasses += record.total;
    solo += record.solo;
    together += record.together;
    social += record.social;
    if (record.total > 0) drinkingDays += 1;
    if (record.total === 0) confirmedFreeDays += 1;

    const limit = getLimitForDate(schedules, d);
    if (isAchievedPlannedFreeDay(record, limit)) achievedFreeDays += 1;
    if (isMissedPlannedFreeDay(record, limit)) missedFreeDays += 1;

    if (record.wildcard) {
      wildcardDays += 1;
      wildcardGlasses += record.total;
      continue;
    }
    assessedUsage += record.total;
    assessedLimit += record.appliedLimit;
    if (record.status === DAY_STATUS.WITHIN_LIMIT) withinDays += 1;
    else if (record.status === DAY_STATUS.EXCEEDED) exceededDays += 1;
  }

  const complianceDenom = withinDays + exceededDays;

  return {
    fromDate,
    toDate,
    totalGlasses,
    avgPerCalendarDay: calendarDays ? totalGlasses / calendarDays : null,
    avgPerRegisteredDay: registeredDays ? totalGlasses / registeredDays : null,
    avgPerDrinkingDay: drinkingDays ? totalGlasses / drinkingDays : null,
    drinkingDays,
    confirmedFreeDays,
    achievedFreeDays,
    missedFreeDays,
    withinDays,
    exceededDays,
    wildcardDays,
    wildcardGlasses,
    missingDays,
    registeredDays,
    calendarDays,
    registrationRate: calendarDays ? registeredDays / calendarDays : null,
    complianceRate: complianceDenom ? withinDays / complianceDenom : null,
    solo,
    together,
    social,
    soloShare: totalGlasses ? solo / totalGlasses : null,
    togetherShare: totalGlasses ? together / totalGlasses : null,
    socialShare: totalGlasses ? social / totalGlasses : null,
    assessedUsage,
    assessedLimit,
    usageVsAssessedLimit: assessedLimit ? assessedUsage / assessedLimit : null,
  };
}

export function fullHistoryAnalysis(records, schedules, moduleStartDate, today) {
  if (!moduleStartDate) return null;
  return periodStats(records, schedules, moduleStartDate, today);
}

export function wildcardDatesInRange(records, fromDate, toDate) {
  return records.filter((r) => r.wildcard && r.date >= fromDate && r.date <= toDate).map((r) => r.date);
}

// --- week/maand/jaar-periodegrenzen (7.15) ---

/** De n-de meest recente, volledig afgesloten kalenderweek (n=1 = de laatste afgesloten week). */
export function nthClosedWeek(n, today) {
  const start = addDays(startOfWeek(today), -7 * n);
  return { start, end: addDays(start, 6) };
}

export function lastClosedWeeksRange(n, today) {
  return { start: nthClosedWeek(n, today).start, end: nthClosedWeek(1, today).end };
}

export function priorClosedWeeksRange(n, today) {
  return { start: nthClosedWeek(2 * n, today).start, end: nthClosedWeek(n + 1, today).end };
}

function monthKeyOf(dateISO) {
  return dateISO.slice(0, 7);
}

export function shiftMonthKey(monthKey, delta) {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthRangeFromKey(monthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return { start: `${monthKey}-01`, end: `${monthKey}-${String(lastDay).padStart(2, "0")}` };
}

/** De n-de meest recente, volledig afgesloten kalendermaand (n=1 = vorige maand). */
export function nthClosedMonth(n, today) {
  return monthRangeFromKey(shiftMonthKey(monthKeyOf(today), -n));
}

export function lastClosedMonthsRange(n, today) {
  return { start: nthClosedMonth(n, today).start, end: nthClosedMonth(1, today).end };
}

export function priorClosedMonthsRange(n, today) {
  return { start: nthClosedMonth(2 * n, today).start, end: nthClosedMonth(n + 1, today).end };
}

export function closedYearRange(n, today) {
  const year = Number(today.slice(0, 4)) - n;
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

/** Huidige, nog lopende week/maand tot en met vandaag (7.16). */
export function currentWeekRange(today) {
  return { start: startOfWeek(today), end: today };
}

export function currentMonthRange(today) {
  return { start: `${monthKeyOf(today)}-01`, end: today };
}

// --- automatisch gegenereerde vergelijkingsdefinities (7.15) ---

export function buildComparisonDefs(today) {
  return {
    weeks: [
      { id: "week-vs-prev", label: "Laatste week t.o.v. week ervoor", recentRange: nthClosedWeek(1, today), referenceRange: nthClosedWeek(2, today) },
      { id: "week-vs-4weeks-ago", label: "Laatste week t.o.v. 4 weken eerder", recentRange: nthClosedWeek(1, today), referenceRange: nthClosedWeek(5, today) },
      { id: "4weeks-vs-prior", label: "Laatste 4 weken t.o.v. de 4 weken daarvoor", recentRange: lastClosedWeeksRange(4, today), referenceRange: priorClosedWeeksRange(4, today) },
      { id: "8weeks-vs-prior", label: "Laatste 8 weken t.o.v. de 8 weken daarvoor", recentRange: lastClosedWeeksRange(8, today), referenceRange: priorClosedWeeksRange(8, today) },
      { id: "12weeks-vs-prior", label: "Laatste 12 weken t.o.v. de 12 weken daarvoor", recentRange: lastClosedWeeksRange(12, today), referenceRange: priorClosedWeeksRange(12, today) },
    ],
    months: [
      { id: "month-vs-prev", label: "Laatste maand t.o.v. maand ervoor", recentRange: nthClosedMonth(1, today), referenceRange: nthClosedMonth(2, today) },
      { id: "month-vs-2ago", label: "Laatste maand t.o.v. twee maanden eerder", recentRange: nthClosedMonth(1, today), referenceRange: nthClosedMonth(3, today) },
      { id: "month-vs-3ago", label: "Laatste maand t.o.v. drie maanden eerder", recentRange: nthClosedMonth(1, today), referenceRange: nthClosedMonth(4, today) },
      {
        id: "month-vs-avg3",
        label: "Laatste maand t.o.v. gemiddelde van de 3 voorafgaande maanden",
        recentRange: nthClosedMonth(1, today),
        referenceRanges: [nthClosedMonth(2, today), nthClosedMonth(3, today), nthClosedMonth(4, today)],
        type: "average",
      },
      { id: "3months-vs-prior", label: "Laatste 3 maanden t.o.v. de 3 maanden daarvoor", recentRange: lastClosedMonthsRange(3, today), referenceRange: priorClosedMonthsRange(3, today) },
      { id: "6months-vs-prior", label: "Laatste 6 maanden t.o.v. de 6 maanden daarvoor", recentRange: lastClosedMonthsRange(6, today), referenceRange: priorClosedMonthsRange(6, today) },
      { id: "12months-vs-prior", label: "Laatste 12 maanden t.o.v. de 12 maanden daarvoor", recentRange: lastClosedMonthsRange(12, today), referenceRange: priorClosedMonthsRange(12, today) },
    ],
    years: [{ id: "year-vs-prev", label: "Laatste jaar t.o.v. het jaar daarvoor", recentRange: closedYearRange(1, today), referenceRange: closedYearRange(2, today) }],
  };
}

function averageStats(statsList) {
  const keys = Object.keys(statsList[0]).filter((k) => typeof statsList[0][k] === "number");
  const avg = {};
  for (const key of keys) {
    const values = statsList.map((s) => s[key]).filter((v) => typeof v === "number");
    avg[key] = values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null;
  }
  return avg;
}

/** Absoluut verschil + procentuele verandering per metric; geen percentage bij referentie 0 (7.17). */
export function buildDiffs(recentStats, referenceStats) {
  const diffs = {};
  for (const key of Object.keys(recentStats)) {
    const r = recentStats[key];
    const ref = referenceStats[key];
    if (typeof r !== "number" || typeof ref !== "number") continue;
    diffs[key] = { recent: r, reference: ref, absoluteDiff: r - ref, percentChange: ref === 0 ? null : (r - ref) / ref };
  }
  return diffs;
}

/** Een vergelijking is pas beschikbaar zodra de (oudste) referentieperiode niet vóór het moduleverleden begint (7.15). */
export function isComparisonAvailable(def, moduleStartDate) {
  if (!moduleStartDate) return false;
  const refStarts = def.type === "average" ? def.referenceRanges.map((r) => r.start) : [def.referenceRange.start];
  return refStarts.every((s) => isSameOrAfter(s, moduleStartDate));
}

export function resolveComparison(def, records, schedules) {
  const recentStats = periodStats(records, schedules, def.recentRange.start, def.recentRange.end);
  const referenceStats =
    def.type === "average"
      ? averageStats(def.referenceRanges.map((r) => periodStats(records, schedules, r.start, r.end)))
      : periodStats(records, schedules, def.referenceRange.start, def.referenceRange.end);
  return { id: def.id, label: def.label, recentRange: def.recentRange, recentStats, referenceStats, diffs: buildDiffs(recentStats, referenceStats) };
}

/** Alle vergelijkingen die al genoeg historie hebben, opgelost (7.15-7.18). */
export function getAvailableComparisons(records, schedules, moduleStartDate, today) {
  const defs = buildComparisonDefs(today);
  const resolve = (list) => list.filter((def) => isComparisonAvailable(def, moduleStartDate)).map((def) => resolveComparison(def, records, schedules));
  return { weeks: resolve(defs.weeks), months: resolve(defs.months), years: resolve(defs.years) };
}
