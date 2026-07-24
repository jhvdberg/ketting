/**
 * IndexedDB-toegang voor de Habits-module. Dit is het enige bestand in de
 * module dat de object stores rechtstreeks aanraakt (briefing 4.3): overige
 * modules en de core lezen of schrijven nooit rechtstreeks in deze stores.
 */

import { getAll, getAllByIndex, get, put, bulkReplace } from "../../core/db.js";

export const STORE_DEFS = [
  { name: "habits", keyPath: "id" },
  { name: "habitSchedules", keyPath: "id", indexes: [{ name: "by_habitId", keyPath: "habitId" }] },
  { name: "habitEntries", keyPath: "id", indexes: [{ name: "by_habitId", keyPath: "habitId" }] },
];

export function listHabits(db) {
  return getAll(db, "habits");
}

export function saveHabit(db, habit) {
  return put(db, "habits", habit);
}

/** Habit + volledige schema- en registratiehistorie voor één habit. */
export async function loadHabitData(db, habitId) {
  const [habit, schedules, entries] = await Promise.all([
    get(db, "habits", habitId),
    getAllByIndex(db, "habitSchedules", "by_habitId", habitId),
    getAllByIndex(db, "habitEntries", "by_habitId", habitId),
  ]);
  return { habit, schedules, entries };
}

/** Alle habits met hun schema- en registratiehistorie, voor overzichtsschermen. */
export async function loadHabitsWithData(db) {
  const [habits, schedules, entries] = await Promise.all([
    getAll(db, "habits"),
    getAll(db, "habitSchedules"),
    getAll(db, "habitEntries"),
  ]);
  return habits.map((habit) => ({
    habit,
    schedules: schedules.filter((s) => s.habitId === habit.id),
    entries: entries.filter((e) => e.habitId === habit.id),
  }));
}

/** Vervangt de volledige schemaversie-set van één habit atomair. */
export async function replaceSchedulesForHabit(db, habitId, newVersionsForHabit) {
  const all = await getAll(db, "habitSchedules");
  const others = all.filter((s) => s.habitId !== habitId);
  await bulkReplace(db, { habitSchedules: [...others, ...newVersionsForHabit] });
}

export async function setEntryDone(db, habitId, dateISO, done, recordedAt) {
  const id = `${habitId}:${dateISO}`;
  const all = await getAll(db, "habitEntries");
  const others = all.filter((e) => e.id !== id);
  const next = done ? [...others, { id, habitId, date: dateISO, recordedAt }] : others;
  await bulkReplace(db, { habitEntries: next });
}

/** Verwijdert een habit inclusief al zijn schemaversies en registraties (8.7). */
export async function deleteHabit(db, habitId) {
  const [habits, schedules, entries] = await Promise.all([
    getAll(db, "habits"),
    getAll(db, "habitSchedules"),
    getAll(db, "habitEntries"),
  ]);
  await bulkReplace(db, {
    habits: habits.filter((h) => h.id !== habitId),
    habitSchedules: schedules.filter((s) => s.habitId !== habitId),
    habitEntries: entries.filter((e) => e.habitId !== habitId),
  });
}

export async function exportAll(db) {
  const [habits, schedules, entries] = await Promise.all([
    getAll(db, "habits"),
    getAll(db, "habitSchedules"),
    getAll(db, "habitEntries"),
  ]);
  return { habits, schedules, entries };
}

/** Vervangt de volledige moduledata atomair (gebruikt bij live schemamigraties). */
export function replaceAll(db, data) {
  return bulkReplace(db, {
    habits: data.habits,
    habitSchedules: data.schedules,
    habitEntries: data.entries,
  });
}
