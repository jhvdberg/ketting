/**
 * Moduledescriptor voor Habits (briefing 4.4). Dit is het enige aanspreekpunt
 * dat de core en Home gebruiken; alle domeinkennis blijft binnen de module.
 */

import { isValidISODate } from "../../core/dateUtils.js";
import { el } from "../../core/ui/dom.js";
import { STORE_DEFS, loadHabitsWithData, exportAll, replaceAll } from "./storage.js";
import { HABITS_SCHEMA_VERSION, migrateHabitsData, emptyHabitsData } from "./migrations.js";
import { isValidDaysArray, todayPlan, weekSummary } from "./model.js";

function importValidate(data) {
  const errors = [];
  if (!data || typeof data !== "object") return { valid: false, errors: ["Habits-data ontbreekt of is ongeldig."] };
  const { habits, schedules, entries } = data;
  if (!Array.isArray(habits)) errors.push("'habits' moet een lijst zijn.");
  if (!Array.isArray(schedules)) errors.push("'schedules' moet een lijst zijn.");
  if (!Array.isArray(entries)) errors.push("'entries' moet een lijst zijn.");
  if (errors.length) return { valid: false, errors };

  const habitIds = new Set();
  for (const h of habits) {
    if (!h || typeof h.id !== "string" || !h.id) {
      errors.push("Een habit mist een geldig id.");
      continue;
    }
    if (habitIds.has(h.id)) {
      errors.push(`Dubbel habit-id: ${h.id}.`);
      continue;
    }
    habitIds.add(h.id);
    if (typeof h.name !== "string" || !h.name.trim()) errors.push(`Habit ${h.id} heeft geen geldige naam.`);
  }
  for (const s of schedules) {
    if (!s || typeof s.id !== "string" || !s.id) {
      errors.push("Een schemaversie mist een geldig id.");
      continue;
    }
    if (!habitIds.has(s.habitId)) {
      errors.push(`Schemaversie ${s.id} verwijst naar een onbekende habit (${s.habitId}).`);
      continue;
    }
    if (!isValidDaysArray(s.days)) errors.push(`Schemaversie ${s.id} heeft ongeldige weekdagen.`);
    if (!isValidISODate(s.effectiveFrom)) errors.push(`Schemaversie ${s.id} heeft een ongeldige ingangsdatum.`);
  }
  for (const e of entries) {
    if (!e || typeof e.id !== "string" || !e.id) {
      errors.push("Een registratie mist een geldig id.");
      continue;
    }
    if (!habitIds.has(e.habitId)) {
      errors.push(`Registratie ${e.id} verwijst naar een onbekende habit (${e.habitId}).`);
      continue;
    }
    if (!isValidISODate(e.date)) errors.push(`Registratie ${e.id} heeft een ongeldige datum.`);
  }
  return { valid: errors.length === 0, errors };
}

export const habitsModule = {
  id: "habits",
  name: "Habits",
  icon: "✓",
  route: "#/habits",
  schemaVersion: HABITS_SCHEMA_VERSION,
  order: 3,
  available: true,
  stores: STORE_DEFS,

  async init(_db) {
    // Geen zaaidata: een lege Habits-module toont het lege-toestandscherm (14.4).
  },

  async exportData(db) {
    return exportAll(db);
  },

  importValidate,
  emptyExportData: emptyHabitsData,
  migrateExportData: (data, fromVersion, toVersion) => migrateHabitsData(data, fromVersion, toVersion),

  prepareImportRecords(data) {
    return {
      habits: data.habits,
      habitSchedules: data.schedules,
      habitEntries: data.entries,
    };
  },

  /** Migreert de actieve IndexedDB-data in-place naar de huidige schemaversie (12.2). */
  async migrateLiveData(db, fromVersion, toVersion) {
    const current = await exportAll(db);
    const migrated = migrateHabitsData(current, fromVersion, toVersion);
    await replaceAll(db, migrated);
  },

  /** Rendert het "Vandaag"-blok van Habits op Home (5.3). Home kent zelf geen Habits-logica. */
  async renderHomeToday(container, db, todayISO) {
    const habitsWithData = await loadHabitsWithData(db);
    const { planned, completed } = todayPlan(habitsWithData, todayISO);
    const status = planned.length === 0 ? "Niets gepland vandaag" : `${completed.length} van ${planned.length} voltooid`;
    container.appendChild(
      el("a", { class: "card tappable", href: "#/habits" }, [
        el("div", { class: "row" }, [
          el("div", { class: "info" }, [el("div", { class: "name", text: "Habits" }), el("div", { class: "meta", text: status })]),
        ]),
      ])
    );
  },

  /** Rendert het "Deze week"-blok van Habits op Home (5.4). */
  async renderHomeWeek(container, db, todayISO) {
    const habitsWithData = await loadHabitsWithData(db);
    const { totalPlanned, totalCompleted, percentage } = weekSummary(habitsWithData, todayISO);
    const status = totalPlanned === 0 ? "Nog niets gepland deze week" : `${totalCompleted} van ${totalPlanned} voltooid (${percentage}%)`;
    container.appendChild(
      el("div", { class: "card" }, [
        el("div", { class: "row" }, [
          el("div", { class: "info" }, [el("div", { class: "name", text: "Habits" }), el("div", { class: "meta", text: status })]),
        ]),
      ])
    );
  },

  /** Korte status voor de tegel in "Alle modules" (5.5). */
  async getTileStatus(db, todayISO) {
    const habitsWithData = await loadHabitsWithData(db);
    const { planned, completed } = todayPlan(habitsWithData, todayISO);
    return planned.length === 0 ? "Niets gepland vandaag" : `${completed.length} van ${planned.length} voltooid`;
  },
};
