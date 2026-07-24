import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isScheduled,
  scheduleForDate,
  computeStreaks,
  weekProgress,
  calendarDayStatus,
  isValidDaysArray,
  upsertScheduleVersion,
} from "../../../src/modules/habits/model.js";

const MON_WED_FRI = [0, 2, 4];
const DAILY = [0, 1, 2, 3, 4, 5, 6];

function entry(habitId, date) {
  return { id: `${habitId}:${date}`, habitId, date };
}

test("isScheduled respecteert historische schemaversies (8.4)", () => {
  const schedules = [
    { id: "s1", habitId: "h1", days: MON_WED_FRI, effectiveFrom: "2024-01-01" },
    { id: "s2", habitId: "h1", days: DAILY, effectiveFrom: "2024-02-01" },
  ];
  // Voor de wijziging: alleen ma/wo/vr.
  assert.equal(isScheduled(schedules, "2024-01-10"), true); // woensdag
  assert.equal(isScheduled(schedules, "2024-01-11"), false); // donderdag
  // Na de wijziging: elke dag, ook een eerder niet-geplande dag zoals donderdag.
  assert.equal(isScheduled(schedules, "2024-02-08"), true); // donderdag
  // Vóór de eerste schemaversie bestond er nog geen planning.
  assert.equal(isScheduled(schedules, "2023-12-31"), false);
});

test("scheduleForDate kiest altijd de laatst geldende versie voor die datum", () => {
  const schedules = [
    { id: "s1", habitId: "h1", days: MON_WED_FRI, effectiveFrom: "2024-01-01" },
    { id: "s2", habitId: "h1", days: DAILY, effectiveFrom: "2024-02-01" },
  ];
  assert.equal(scheduleForDate(schedules, "2024-01-15").id, "s1");
  assert.equal(scheduleForDate(schedules, "2024-02-01").id, "s2");
  assert.equal(scheduleForDate(schedules, "2024-03-01").id, "s2");
});

test("streak-voorbeeld uit 8.5: ma/wo/vr alle drie voltooid geeft streak 3, di/do tellen niet mee", () => {
  const schedules = [{ id: "s1", habitId: "h1", days: MON_WED_FRI, effectiveFrom: "2024-01-01" }];
  const entries = [entry("h1", "2024-01-01"), entry("h1", "2024-01-03"), entry("h1", "2024-01-05")];
  const { current, longest } = computeStreaks(schedules, entries, "2024-01-05");
  assert.equal(current, 3);
  assert.equal(longest, 3);
});

test("vandaag nog niet voltooid breekt de lopende streak niet", () => {
  const schedules = [{ id: "s1", habitId: "h1", days: MON_WED_FRI, effectiveFrom: "2024-01-01" }];
  const entries = [entry("h1", "2024-01-01"), entry("h1", "2024-01-03")]; // vrijdag (today) nog niet gedaan
  const { current, longest } = computeStreaks(schedules, entries, "2024-01-05");
  assert.equal(current, 2);
  assert.equal(longest, 2);
});

test("een gemist gepland moment in het verleden breekt de streak", () => {
  const schedules = [{ id: "s1", habitId: "h1", days: MON_WED_FRI, effectiveFrom: "2024-01-01" }];
  // Ma 01 gedaan, Wo 03 gemist, Vr 05 gedaan, volgende Ma 08 (vandaag) gedaan.
  const entries = [entry("h1", "2024-01-01"), entry("h1", "2024-01-05"), entry("h1", "2024-01-08")];
  const { current, longest } = computeStreaks(schedules, entries, "2024-01-08");
  assert.equal(current, 2); // Vr + Ma
  assert.equal(longest, 2);
});

test("retroactieve correctie herberekent de streak volledig (19.5)", () => {
  const schedules = [{ id: "s1", habitId: "h1", days: MON_WED_FRI, effectiveFrom: "2024-01-01" }];
  let entries = [entry("h1", "2024-01-01"), entry("h1", "2024-01-05")]; // Wo 03 nog niet ingevuld
  let result = computeStreaks(schedules, entries, "2024-01-05");
  assert.equal(result.current, 1); // Wo telt als gemist tussen Ma en Vr -> streak breekt, alleen Vr telt

  // Retroactief Wo 03 alsnog invullen.
  entries = [...entries, entry("h1", "2024-01-03")];
  result = computeStreaks(schedules, entries, "2024-01-05");
  assert.equal(result.current, 3);
  assert.equal(result.longest, 3);
});

test("weekProgress telt alleen tot en met vandaag, niet de rest van de week (5.4)", () => {
  const schedules = [{ id: "s1", habitId: "h1", days: MON_WED_FRI, effectiveFrom: "2024-01-01" }];
  const entries = [entry("h1", "2024-01-01")]; // alleen maandag gedaan
  // Vandaag = woensdag 2024-01-03: geplande dagen tot nu = ma + wo = 2, vrijdag telt nog niet.
  const { planned, completed } = weekProgress(schedules, entries, "2024-01-03");
  assert.equal(planned, 2);
  assert.equal(completed, 1);
});

test("calendarDayStatus onderscheidt de vier categorieën uit 8.6", () => {
  const schedules = [{ id: "s1", habitId: "h1", days: MON_WED_FRI, effectiveFrom: "2024-01-01" }];
  const entries = [entry("h1", "2024-01-01")];
  const today = "2024-01-03";
  assert.equal(calendarDayStatus(schedules, entries, "2024-01-01", today), "done");
  assert.equal(calendarDayStatus(schedules, entries, "2024-01-03", today), "not_done"); // gepland, vandaag nog niet gedaan
  assert.equal(calendarDayStatus(schedules, entries, "2024-01-02", today), "unplanned"); // dinsdag
  assert.equal(calendarDayStatus(schedules, entries, "2024-01-05", today), "future"); // vrijdag, nog niet geweest
});

test("isValidDaysArray weigert lege, dubbele of ongeldige dagen", () => {
  assert.equal(isValidDaysArray([0, 2, 4]), true);
  assert.equal(isValidDaysArray([]), false);
  assert.equal(isValidDaysArray([0, 0]), false);
  assert.equal(isValidDaysArray([7]), false);
  assert.equal(isValidDaysArray("ma"), false);
});

test("upsertScheduleVersion overschrijft een versie met dezelfde ingangsdatum in plaats van te stapelen", () => {
  const base = [{ id: "s1", habitId: "h1", days: MON_WED_FRI, effectiveFrom: "2024-01-01" }];
  const next = upsertScheduleVersion(base, { id: "s2", habitId: "h1", days: DAILY, effectiveFrom: "2024-01-01" });
  assert.equal(next.length, 1);
  assert.equal(next[0].id, "s2");
});
