import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toISODate,
  isValidISODate,
  parseISODate,
  weekdayMon0,
  addDays,
  startOfWeek,
  endOfWeek,
  compareISO,
  isBefore,
  isAfter,
  eachDay,
} from "../../src/core/dateUtils.js";

test("isValidISODate accepteert alleen echte kalenderdatums", () => {
  assert.equal(isValidISODate("2024-01-01"), true);
  assert.equal(isValidISODate("2024-02-30"), false); // bestaat niet
  assert.equal(isValidISODate("2024-1-1"), false);
  assert.equal(isValidISODate("niet-een-datum"), false);
  assert.equal(isValidISODate(null), false);
});

test("parseISODate/toISODate zijn stabiel en tijdzone-onafhankelijk", () => {
  const iso = "2026-07-24";
  const date = parseISODate(iso);
  assert.equal(toISODate(date), iso);
  // 24 juli 2026 is een vrijdag; weekdayMon0 (ma=0..zo=6) moet 4 zijn.
  assert.equal(weekdayMon0(iso), 4);
});

test("weekdayMon0: maandag = 0", () => {
  // 1 januari 2024 is een maandag.
  assert.equal(weekdayMon0("2024-01-01"), 0);
  assert.equal(weekdayMon0("2024-01-07"), 6); // zondag
});

test("addDays gaat correct over maandgrenzen", () => {
  assert.equal(addDays("2024-01-31", 1), "2024-02-01");
  assert.equal(addDays("2024-03-01", -1), "2024-02-29"); // 2024 is een schrikkeljaar
});

test("startOfWeek/endOfWeek: trainingsweek loopt maandag t/m zondag", () => {
  // 3 januari 2024 is een woensdag.
  assert.equal(startOfWeek("2024-01-03"), "2024-01-01");
  assert.equal(endOfWeek("2024-01-03"), "2024-01-07");
  // Een maandag zelf is ook al de start van de week.
  assert.equal(startOfWeek("2024-01-01"), "2024-01-01");
  // Een zondag hoort nog bij de week die op maandag begon.
  assert.equal(startOfWeek("2024-01-07"), "2024-01-01");
});

test("compareISO/isBefore/isAfter", () => {
  assert.equal(compareISO("2024-01-01", "2024-01-02"), -1);
  assert.equal(compareISO("2024-01-02", "2024-01-01"), 1);
  assert.equal(compareISO("2024-01-01", "2024-01-01"), 0);
  assert.equal(isBefore("2024-01-01", "2024-01-02"), true);
  assert.equal(isAfter("2024-01-02", "2024-01-01"), true);
});

test("eachDay geeft alle datums inclusief begin en eind", () => {
  const days = eachDay("2024-01-01", "2024-01-03");
  assert.deepEqual(days, ["2024-01-01", "2024-01-02", "2024-01-03"]);
});
