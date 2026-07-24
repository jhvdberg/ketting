import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeDayStatus,
  scheduleForDate,
  getLimitForDate,
  dayTotal,
  isValidCount,
  isValidScheduleDays,
  upsertScheduleVersion,
  getModuleStartDate,
  DAY_STATUS,
} from "../../../src/modules/alcohol/model.js";

test("computeDayStatus: binnen limiet, overschreden, wildcard (7.7)", () => {
  assert.equal(computeDayStatus(2, 3, false), DAY_STATUS.WITHIN_LIMIT);
  assert.equal(computeDayStatus(4, 3, false), DAY_STATUS.EXCEEDED);
  assert.equal(computeDayStatus(10, 0, true), DAY_STATUS.WILDCARD); // wildcard negeert de limiet
});

test("historische limieten: een nieuw schema verandert eerdere dagen niet (7.6)", () => {
  const schedules = [
    { id: "s1", days: [2, 2, 2, 2, 2, 3, 3], effectiveFrom: "2026-01-01" },
    { id: "s2", days: [0, 0, 0, 0, 0, 1, 1], effectiveFrom: "2026-03-01" },
  ];
  // 15 januari (donderdag, index 3) valt onder het eerste schema.
  assert.equal(getLimitForDate(schedules, "2026-01-15"), 2);
  // Na 1 maart geldt het nieuwe schema, ook voor dezelfde weekdag (16 maart 2026 is een maandag).
  assert.equal(getLimitForDate(schedules, "2026-03-16"), 0);
  // Vóór het eerste schema bestond nog geen limiet.
  assert.equal(getLimitForDate(schedules, "2025-12-31"), null);
  assert.equal(scheduleForDate(schedules, "2026-01-15").id, "s1");
});

test("dayTotal telt de drie contexten op", () => {
  assert.equal(dayTotal({ solo: 1, together: 2, social: 3 }), 6);
});

test("isValidCount / isValidScheduleDays", () => {
  assert.equal(isValidCount(0), true);
  assert.equal(isValidCount(-1), false);
  assert.equal(isValidCount(1.5), false);
  assert.equal(isValidScheduleDays([0, 1, 2, 3, 4, 5, 6]), true);
  assert.equal(isValidScheduleDays([0, 1, 2]), false);
  assert.equal(isValidScheduleDays([0, 1, 2, 3, 4, 5, -1]), false);
});

test("upsertScheduleVersion overschrijft een versie met dezelfde ingangsdatum", () => {
  const base = [{ id: "s1", days: [1, 1, 1, 1, 1, 1, 1], effectiveFrom: "2026-01-01" }];
  const next = upsertScheduleVersion(base, { id: "s2", days: [0, 0, 0, 0, 0, 0, 0], effectiveFrom: "2026-01-01" });
  assert.equal(next.length, 1);
  assert.equal(next[0].id, "s2");
});

test("getModuleStartDate is de vroegste schema- of registratiedatum", () => {
  const schedules = [{ id: "s1", days: [1, 1, 1, 1, 1, 1, 1], effectiveFrom: "2026-02-01" }];
  const days = [{ date: "2026-01-10" }];
  assert.equal(getModuleStartDate(schedules, days), "2026-01-10");
  assert.equal(getModuleStartDate([], []), null);
});
