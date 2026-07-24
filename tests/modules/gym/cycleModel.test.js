import { test } from "node:test";
import assert from "node:assert/strict";
import {
  nextMonday,
  getElapsedWeeks,
  getCurrentCycleWeekIndex,
  getEffectiveCycleStatus,
  reconcileCycles,
  computeMissedForClosedWeek,
  findClosedWeeksNeedingRecord,
  summarizeMissed,
  CYCLE_STATUS,
} from "../../../src/modules/gym/cycleModel.js";

test("nextMonday geeft altijd de eerstvolgende maandag, ook vanaf een maandag zelf (6.8)", () => {
  assert.equal(nextMonday("2024-01-01"), "2024-01-08"); // 1 jan 2024 is zelf al een maandag
  assert.equal(nextMonday("2024-01-03"), "2024-01-08"); // woensdag
  assert.equal(nextMonday("2024-01-07"), "2024-01-08"); // zondag
});

test("cyclusweek schuift elke maandag automatisch op en herhaalt na de laatste week (6.9)", () => {
  const cycle = { startDate: "2024-01-08", weeksPerCycle: 2 };
  assert.equal(getCurrentCycleWeekIndex(cycle, "2024-01-08"), 0);
  assert.equal(getCurrentCycleWeekIndex(cycle, "2024-01-14"), 0); // nog dezelfde week
  assert.equal(getCurrentCycleWeekIndex(cycle, "2024-01-15"), 1); // week 2
  assert.equal(getCurrentCycleWeekIndex(cycle, "2024-01-22"), 0); // herhaling: weer week 1
  assert.equal(getElapsedWeeks(cycle, "2024-01-01"), null); // nog niet begonnen
});

test("getEffectiveCycleStatus: Gepland wordt Actief zodra de startdatum bereikt is", () => {
  const cycle = { status: CYCLE_STATUS.PLANNED, startDate: "2024-01-08" };
  assert.equal(getEffectiveCycleStatus(cycle, "2024-01-07"), CYCLE_STATUS.PLANNED);
  assert.equal(getEffectiveCycleStatus(cycle, "2024-01-08"), CYCLE_STATUS.ACTIVE);
});

test("getEffectiveCycleStatus: Vervanging ingepland wordt Gearchiveerd zodra de vervangcyclus begint (6.12)", () => {
  const cycle = { status: CYCLE_STATUS.REPLACEMENT_PLANNED, replacedByCycleId: "new" };
  assert.equal(getEffectiveCycleStatus(cycle, "2024-01-05", "2024-01-08"), CYCLE_STATUS.REPLACEMENT_PLANNED);
  assert.equal(getEffectiveCycleStatus(cycle, "2024-01-08", "2024-01-08"), CYCLE_STATUS.ARCHIVED);
});

test("reconcileCycles werkt Gepland→Actief en de vervang-overgang in één keer bij", () => {
  const cycles = [
    { id: "old", status: CYCLE_STATUS.REPLACEMENT_PLANNED, replacedByCycleId: "new" },
    { id: "new", status: CYCLE_STATUS.PLANNED, startDate: "2024-01-08" },
    { id: "unrelated", status: CYCLE_STATUS.ACTIVE },
  ];
  const changes = reconcileCycles(cycles, "2024-01-08");
  const byId = Object.fromEntries(changes.map((c) => [c.id, c]));
  assert.equal(byId.new.status, CYCLE_STATUS.ACTIVE);
  assert.equal(byId.old.status, CYCLE_STATUS.ARCHIVED);
  assert.equal(byId.old.endDate, "2024-01-07");
  assert.equal(byId.unrelated, undefined); // niet gewijzigd, dus niet in de resultatenlijst
});

test("computeMissedForClosedWeek: gemist = gepland - voltooid (6.19)", () => {
  const slots = [{ id: "s1" }, { id: "s2" }, { id: "s3" }];
  const result = computeMissedForClosedWeek(slots, new Set(["s1", "s2"]));
  assert.deepEqual(result, { planned: 3, completed: 2, missed: 1 });
});

test("findClosedWeeksNeedingRecord houdt herhaalde iteraties van dezelfde structurele week apart", () => {
  const cycle = { id: "c1", startDate: "2024-01-08", weeksPerCycle: 2, endDate: null };
  const plannedWorkoutsForCycle = [
    { id: "w0", weekIndex: 0 },
    { id: "w1", weekIndex: 1 },
  ];
  // w0 is twee keer voltooid: in iteratie 0 (week 1) én iteratie 2 (opnieuw week 1 na de herhaling).
  const completedWorkoutsForCycle = [
    { plannedWorkoutId: "w0", absoluteWeekNumber: 0 },
    { plannedWorkoutId: "w0", absoluteWeekNumber: 2 },
  ];
  // 2024-01-29 ligt 21 dagen na de start: 3 volledig afgesloten weken (0, 1, 2), week 3 loopt nog.
  const records = findClosedWeeksNeedingRecord(cycle, plannedWorkoutsForCycle, completedWorkoutsForCycle, new Set(), "2024-01-29");

  assert.equal(records.length, 3); // de lopende week (3) krijgt nog geen record
  const byAbsWeek = Object.fromEntries(records.map((r) => [r.absoluteWeekNumber, r]));

  assert.equal(byAbsWeek[0].weekIndex, 0);
  assert.equal(byAbsWeek[0].missedCount, 0); // w0 voltooid in deze iteratie

  assert.equal(byAbsWeek[1].weekIndex, 1);
  assert.equal(byAbsWeek[1].missedCount, 1); // w1 niet voltooid

  assert.equal(byAbsWeek[2].weekIndex, 0); // herhaling: opnieuw structurele week 1
  assert.equal(byAbsWeek[2].missedCount, 0); // w0 ook in déze iteratie voltooid, los van iteratie 0
});

test("een reeds bestaand weekrecord wordt niet opnieuw gegenereerd (idempotent)", () => {
  const cycle = { id: "c1", startDate: "2024-01-08", weeksPerCycle: 1, endDate: null };
  const records = findClosedWeeksNeedingRecord(cycle, [], [], new Set(["c1:0"]), "2024-01-15");
  assert.equal(records.length, 0);
});

test("summarizeMissed gebruikt het werkelijk beschikbare aantal weken als dat minder is dan gevraagd (5.4)", () => {
  const closedWeeks = [
    { absoluteWeekNumber: 0, missedCount: 1 },
    { absoluteWeekNumber: 1, missedCount: 0 },
    { absoluteWeekNumber: 2, missedCount: 2 },
  ];
  assert.deepEqual(summarizeMissed(closedWeeks, 2), { missed: 2, weeksUsed: 2 });
  assert.deepEqual(summarizeMissed(closedWeeks, 10), { missed: 3, weeksUsed: 3 });
});
