/**
 * Integratietests voor de belangrijkste gebruikersstromen (briefing
 * hoofdstuk 20, slotzin), tegen een echte (in-memory nagebootste)
 * IndexedDB in plaats van losse pure functies met kant-en-klare data. Dit
 * dekt precies het soort fout dat de unit tests missen: de opslaglaag
 * (storage.js), indexqueries en de export/import-rondweg door een verse
 * database, zoals bij een herinstallatie op een nieuw toestel.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakeIndexedDB } from "../helpers/fakeIndexedDB.js";

globalThis.indexedDB = createFakeIndexedDB();

const { openDatabase } = await import("../../src/core/db.js");
const { DB_NAME, DB_VERSION } = await import("../../src/core/version.js");
const { CORE_META_STORE_DEF } = await import("../../src/core/schemaState.js");
const { registerModule, getAllStoreDefs } = await import("../../src/core/moduleRegistry.js");
const { buildExport, applyImport } = await import("../../src/core/exportImport.js");

const { habitsModule } = await import("../../src/modules/habits/index.js");
const habitsStorage = await import("../../src/modules/habits/storage.js");
const { computeStreaks } = await import("../../src/modules/habits/model.js");

const { gymModule } = await import("../../src/modules/gym/index.js");
const gymStorage = await import("../../src/modules/gym/storage.js");
const { exercisesFromTemplate } = await import("../../src/modules/gym/model.js");
const { classifyCompletedWorkout, INSUFFICIENT_HISTORY } = await import("../../src/modules/gym/classification.js");

const { alcoholModule } = await import("../../src/modules/alcohol/index.js");
const alcoholStorage = await import("../../src/modules/alcohol/storage.js");
const { getLimitForDate, computeDayStatus, DAY_STATUS } = await import("../../src/modules/alcohol/model.js");

registerModule(gymModule);
registerModule(alcoholModule);
registerModule(habitsModule);

let dbCounter = 0;
async function freshDb() {
  dbCounter += 1;
  const stores = [...getAllStoreDefs(), CORE_META_STORE_DEF];
  return openDatabase({ name: `${DB_NAME}-integration-${dbCounter}`, version: DB_VERSION, stores });
}

test("Habits: schema en registraties overleven een echte opslag/laad-cyclus, streak klopt", async () => {
  const db = await freshDb();
  await habitsStorage.saveHabit(db, { id: "h1", name: "Wandelen" });
  await habitsStorage.replaceSchedulesForHabit(db, "h1", [
    { id: "s1", habitId: "h1", days: [0, 2, 4], effectiveFrom: "2024-01-01" }, // ma/wo/vr
  ]);
  await habitsStorage.setEntryDone(db, "h1", "2024-01-01", true, "2024-01-01T08:00:00.000Z");
  await habitsStorage.setEntryDone(db, "h1", "2024-01-03", true, "2024-01-03T08:00:00.000Z");
  await habitsStorage.setEntryDone(db, "h1", "2024-01-05", true, "2024-01-05T08:00:00.000Z");

  const { habit, schedules, entries } = await habitsStorage.loadHabitData(db, "h1");
  assert.equal(habit.name, "Wandelen");
  const { current, longest } = computeStreaks(schedules, entries, "2024-01-05");
  assert.equal(current, 3);
  assert.equal(longest, 3);

  // Uitvinken (11.x-achtig gedrag): setEntryDone(..., false, ...) verwijdert de registratie weer.
  await habitsStorage.setEntryDone(db, "h1", "2024-01-05", false, null);
  const after = await habitsStorage.loadHabitData(db, "h1");
  assert.equal(after.entries.length, 2);
});

test("Gym: template naar geplande workout naar voltooide workout, terug te vinden via de cyclusindex", async () => {
  const db = await freshDb();
  await gymStorage.saveExercise(db, { id: "ex1", name: "Squat", muscleGroup: "Legs", active: true });
  await gymStorage.saveTemplate(db, {
    id: "t1",
    name: "Leg day",
    exercises: [{ exerciseId: "ex1", order: 0, sets: [{ weight: 100, reps: 5 }] }],
  });
  await gymStorage.saveCycle(db, {
    id: "c1",
    name: "Cyclus 1",
    startDate: "2024-01-01",
    workoutsPerWeek: 3,
    weeksPerCycle: 4,
    status: "Actief",
  });

  const template = await gymStorage.getTemplate(db, "t1");
  const plannedExercises = exercisesFromTemplate(template); // geen live koppeling (6.4)
  await gymStorage.savePlannedWorkout(db, {
    id: "pw1",
    cycleId: "c1",
    weekIndex: 0,
    position: 0,
    name: "Leg day",
    exercises: plannedExercises,
    completed: false,
  });

  // Template achteraf wijzigen mag de al geplande workout niet beïnvloeden (6.4).
  await gymStorage.saveTemplate(db, { ...template, exercises: [{ exerciseId: "ex1", order: 0, sets: [{ weight: 999, reps: 1 }] }] });
  const stillPlanned = await gymStorage.getPlannedWorkout(db, "pw1");
  assert.equal(stillPlanned.exercises[0].sets[0].weight, 100);

  const resolved = await gymStorage.resolveExercises(db, stillPlanned.exercises);
  const classification = classifyCompletedWorkout(resolved, []);
  assert.equal(classification.groupResults.Legs.finalClassification, INSUFFICIENT_HISTORY);

  await gymStorage.saveCompletedWorkout(db, {
    id: "cw1",
    cycleId: "c1",
    plannedWorkoutId: "pw1",
    completedAt: "2024-01-01T18:00:00.000Z",
    exercises: resolved,
    ...classification,
  });

  const forCycle = await gymStorage.listCompletedForCycle(db, "c1"); // index-query (by_cycleId)
  assert.equal(forCycle.length, 1);
  assert.equal(forCycle[0].id, "cw1");
  const forOtherCycle = await gymStorage.listCompletedForCycle(db, "does-not-exist");
  assert.deepEqual(forOtherCycle, []);
});

test("Alcohol: een latere schemawijziging herberekent eerder opgeslagen dagen niet (7.6/19.4)", async () => {
  const db = await freshDb();
  await alcoholStorage.saveScheduleVersion(db, { id: "a1", days: [2, 2, 2, 2, 2, 2, 2], effectiveFrom: "2024-01-01" });

  const limitOnJan3 = getLimitForDate(await alcoholStorage.listSchedules(db), "2024-01-03");
  assert.equal(limitOnJan3, 2);
  await alcoholStorage.saveDay(db, {
    date: "2024-01-03",
    solo: 1,
    together: 1,
    social: 0,
    total: 2,
    wildcard: false,
    appliedLimit: limitOnJan3,
    status: computeDayStatus(2, limitOnJan3, false),
  });

  // Vanaf 10 januari gaat de limiet omlaag naar 0.
  await alcoholStorage.saveScheduleVersion(db, { id: "a2", days: [0, 0, 0, 0, 0, 0, 0], effectiveFrom: "2024-01-10" });

  const schedulesNow = await alcoholStorage.listSchedules(db);
  assert.equal(getLimitForDate(schedulesNow, "2024-01-03"), 2, "historische limiet blijft ongewijzigd");
  assert.equal(getLimitForDate(schedulesNow, "2024-01-10"), 0, "nieuwe limiet geldt vanaf de ingangsdatum");

  const savedDay = await alcoholStorage.getDay(db, "2024-01-03");
  assert.equal(savedDay.appliedLimit, 2, "de opgeslagen snapshot wordt nooit stilzwijgend herschreven");
  assert.equal(savedDay.status, DAY_STATUS.WITHIN_LIMIT);
});

test("Export/import: een volledige back-up op een vers toestel herstelt data uit alle drie de modules (11.3/19.6)", async () => {
  const sourceDb = await freshDb();
  await habitsStorage.saveHabit(sourceDb, { id: "h1", name: "Wandelen" });
  await habitsStorage.replaceSchedulesForHabit(sourceDb, "h1", [{ id: "s1", habitId: "h1", days: [0, 2, 4], effectiveFrom: "2024-01-01" }]);
  await habitsStorage.setEntryDone(sourceDb, "h1", "2024-01-01", true, "2024-01-01T08:00:00.000Z");

  await gymStorage.saveExercise(sourceDb, { id: "ex1", name: "Squat", muscleGroup: "Legs", active: true });
  await gymStorage.saveCycle(sourceDb, { id: "c1", name: "Cyclus 1", startDate: "2024-01-01", workoutsPerWeek: 3, weeksPerCycle: 4, status: "Actief" });

  await alcoholStorage.saveScheduleVersion(sourceDb, { id: "a1", days: [2, 2, 2, 2, 2, 2, 2], effectiveFrom: "2024-01-01" });
  await alcoholStorage.saveDay(sourceDb, { date: "2024-01-01", solo: 0, together: 1, social: 0, total: 1, wildcard: false, appliedLimit: 2, status: DAY_STATUS.WITHIN_LIMIT });

  const backup = await buildExport(sourceDb);

  // Nieuw, leeg toestel: zelfde scenario als een herinstallatie na het
  // verwijderen van het startschermicoon (zie de iOS-storage-kwestie).
  const targetDb = await freshDb();
  await applyImport(targetDb, backup);

  const restoredHabit = await habitsStorage.loadHabitData(targetDb, "h1");
  assert.equal(restoredHabit.habit.name, "Wandelen");
  assert.equal(restoredHabit.entries.length, 1);

  const restoredExercise = await gymStorage.getExercise(targetDb, "ex1");
  assert.equal(restoredExercise.name, "Squat");
  const restoredCycle = await gymStorage.getCycle(targetDb, "c1");
  assert.equal(restoredCycle.name, "Cyclus 1");

  const restoredDay = await alcoholStorage.getDay(targetDb, "2024-01-01");
  assert.equal(restoredDay.total, 1);
  const restoredSchedules = await alcoholStorage.listSchedules(targetDb);
  assert.equal(getLimitForDate(restoredSchedules, "2024-01-01"), 2);
});

test("Een corrupte database (versie klopt, store ontbreekt) herstelt zichzelf zonder bestaande data te verliezen", async () => {
  const name = `${DB_NAME}-integration-repair`;
  const stores = [...getAllStoreDefs(), CORE_META_STORE_DEF];

  // Eerste, normale opstart: data wegschrijven.
  const db1 = await openDatabase({ name, version: DB_VERSION, stores });
  await habitsStorage.saveHabit(db1, { id: "h1", name: "Belangrijke data" });
  db1.close();

  // Corruptie nabootsen: dezelfde situatie als op de iPhone van vandaag
  // (versie klopt al, één store ontbreekt door een afgebroken upgrade).
  await new Promise((resolve, reject) => {
    const req = globalThis.indexedDB.open(name, DB_VERSION + 1);
    req.onsuccess = () => {
      req.result.deleteObjectStore("habitEntries");
      req.result.close();
      resolve();
    };
    req.onerror = () => reject(req.error);
  });

  // db.js's openDatabase() moet dit zelf herstellen (zie src/core/db.js).
  const db2 = await openDatabase({ name, version: DB_VERSION, stores });
  assert.equal(db2.objectStoreNames.contains("habitEntries"), true);
  const restored = await habitsStorage.listHabits(db2);
  assert.equal(restored.length, 1);
  assert.equal(restored[0].name, "Belangrijke data");
});
