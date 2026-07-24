import { test } from "node:test";
import assert from "node:assert/strict";
import { DAY_STATUS } from "../../../src/modules/alcohol/model.js";
import {
  unifiedDayStatus,
  missingDates,
  isConfirmedFreeDay,
  periodStats,
  buildDiffs,
  getAvailableComparisons,
} from "../../../src/modules/alcohol/analysis.js";

const SCHEDULE = [{ id: "s1", days: [2, 2, 2, 2, 2, 2, 2], effectiveFrom: "2024-01-01" }];

function record(date, total, overrides = {}) {
  return { date, solo: total, together: 0, social: 0, total, wildcard: false, appliedLimit: 2, status: total <= 2 ? DAY_STATUS.WITHIN_LIMIT : DAY_STATUS.EXCEEDED, ...overrides };
}

test("drie dagtoestanden: geen record, totaal nul, totaal > 0 (7.3, 7.7)", () => {
  const byDate = new Map([
    ["2024-01-02", record("2024-01-02", 0)],
    ["2024-01-03", record("2024-01-03", 2)],
  ]);
  assert.equal(unifiedDayStatus(byDate, "2024-01-01", "2024-01-05"), DAY_STATUS.NOT_ASSESSED); // geen record, verstreken
  assert.equal(unifiedDayStatus(byDate, "2024-01-02", "2024-01-05"), DAY_STATUS.WITHIN_LIMIT);
  assert.equal(isConfirmedFreeDay(byDate.get("2024-01-02")), true);
  assert.equal(isConfirmedFreeDay(byDate.get("2024-01-03")), false);
  assert.equal(unifiedDayStatus(byDate, "2024-01-10", "2024-01-05"), null); // toekomst
});

test("missingDates: alleen verstreken dagen zonder registratie, oudste eerst (7.9)", () => {
  const records = [record("2024-01-01", 1), record("2024-01-03", 1)];
  const missing = missingDates(records, "2024-01-01", "2024-01-04");
  assert.deepEqual(missing, ["2024-01-02", "2024-01-04"]);
});

test("periodStats: wildcard negeert de limiet voor naleving maar telt mee in totalen; ontbrekende dagen tellen nergens in mee (7.9, 7.10, 7.11)", () => {
  const records = [
    record("2024-01-01", 1), // binnen limiet
    record("2024-01-02", 5, { wildcard: true, status: DAY_STATUS.WILDCARD }), // wildcard
    record("2024-01-03", 4), // overschrijding
    // 2024-01-04 ontbreekt
  ];
  const stats = periodStats(records, SCHEDULE, "2024-01-01", "2024-01-04");

  assert.equal(stats.calendarDays, 4);
  assert.equal(stats.registeredDays, 3);
  assert.equal(stats.missingDays, 1);
  assert.equal(stats.totalGlasses, 10); // 1 + 5 + 4, wildcard telt mee in het totaal
  assert.equal(stats.wildcardDays, 1);
  assert.equal(stats.wildcardGlasses, 5);
  assert.equal(stats.withinDays, 1);
  assert.equal(stats.exceededDays, 1);
  assert.equal(stats.complianceRate, 0.5); // 1 / (1 + 1), wildcard en ontbrekende dag uitgesloten
  assert.equal(stats.registrationRate, 0.75); // 3 van de 4 kalenderdagen
  // beoordeeld gebruik/limiet sluiten de wildcarddag uit (7.12)
  assert.equal(stats.assessedUsage, 5); // 1 + 4
  assert.equal(stats.assessedLimit, 4); // 2 + 2
  assert.equal(stats.usageVsAssessedLimit, 1.25);
});

test("buildDiffs: geen procentuele verandering wanneer de referentiewaarde 0 is (7.17)", () => {
  const recent = { totalGlasses: 10 };
  const referenceZero = { totalGlasses: 0 };
  const referenceFive = { totalGlasses: 5 };
  assert.deepEqual(buildDiffs(recent, referenceZero).totalGlasses, { recent: 10, reference: 0, absoluteDiff: 10, percentChange: null });
  assert.deepEqual(buildDiffs(recent, referenceFive).totalGlasses, { recent: 10, reference: 5, absoluteDiff: 5, percentChange: 1 });
});

test("getAvailableComparisons toont een vergelijking pas als de referentieperiode niet vóór de modulestart ligt (7.15)", () => {
  const today = "2024-01-22"; // maandag
  const moduleStartDate = "2024-01-08"; // maandag, 2 weken eerder
  const { weeks } = getAvailableComparisons([], SCHEDULE, moduleStartDate, today);
  const ids = weeks.map((w) => w.id);
  assert.ok(ids.includes("week-vs-prev")); // referentieweek begint precies op moduleStartDate
  assert.ok(!ids.includes("week-vs-4weeks-ago")); // referentieweek ligt vóór moduleStartDate
});

test("retroactieve wijziging werkt direct door: niets wordt gecachet (19.4)", () => {
  let records = [record("2024-01-01", 1)];
  const before = periodStats(records, SCHEDULE, "2024-01-01", "2024-01-01");
  assert.equal(before.totalGlasses, 1);
  assert.equal(before.exceededDays, 0);

  records = [record("2024-01-01", 5)];
  const after = periodStats(records, SCHEDULE, "2024-01-01", "2024-01-01");
  assert.equal(after.totalGlasses, 5);
  assert.equal(after.exceededDays, 1);
});
