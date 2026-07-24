/**
 * Moduledescriptor voor Gym (briefing 4.4).
 */

import { el } from "../../core/ui/dom.js";
import { todayISO } from "../../core/dateUtils.js";
import {
  STORE_DEFS,
  listCycles,
  putCycles,
  listAllPlannedWorkouts,
  listAllCompletedWorkouts,
  listAllClosedWeeks,
  putClosedWeeks,
  getActiveSession,
  exportAll,
  replaceAll,
} from "./storage.js";
import { GYM_SCHEMA_VERSION, migrateGymData, emptyGymData } from "./migrations.js";
import { isValidMuscleGroup } from "./model.js";
import {
  reconcileCycles,
  findClosedWeeksNeedingRecord,
  findActiveCycle,
  getActiveCycleWeekSummary,
  summarizeMissed,
  CYCLE_STATUS,
} from "./cycleModel.js";

function validateExerciseRefs(exercises, exerciseIds, errors, context) {
  if (!Array.isArray(exercises)) {
    errors.push(`${context}: 'exercises' moet een lijst zijn.`);
    return;
  }
  for (const ex of exercises) {
    if (!ex || typeof ex.exerciseId !== "string" || !exerciseIds.has(ex.exerciseId)) {
      errors.push(`${context}: verwijst naar een onbekende oefening (${ex && ex.exerciseId}).`);
      continue;
    }
    if (!Array.isArray(ex.sets)) {
      errors.push(`${context}: oefening ${ex.exerciseId} heeft geen geldige sets.`);
    }
  }
}

function importValidate(data) {
  const errors = [];
  if (!data || typeof data !== "object") return { valid: false, errors: ["Gym-data ontbreekt of is ongeldig."] };
  const { exercises, templates, plannedWorkouts, completedWorkouts, cycles, closedWeeks } = data;
  for (const [key, value] of Object.entries({ exercises, templates, plannedWorkouts, completedWorkouts, cycles, closedWeeks })) {
    if (!Array.isArray(value)) errors.push(`'${key}' moet een lijst zijn.`);
  }
  if (errors.length) return { valid: false, errors };

  const exerciseIds = new Set();
  for (const ex of exercises) {
    if (!ex || typeof ex.id !== "string" || !ex.id) {
      errors.push("Een oefening mist een geldig id.");
      continue;
    }
    if (exerciseIds.has(ex.id)) {
      errors.push(`Dubbel oefening-id: ${ex.id}.`);
      continue;
    }
    exerciseIds.add(ex.id);
    if (typeof ex.name !== "string" || !ex.name.trim()) errors.push(`Oefening ${ex.id} heeft geen geldige naam.`);
    if (!isValidMuscleGroup(ex.muscleGroup)) errors.push(`Oefening ${ex.id} heeft geen geldige spiergroep.`);
  }

  const cycleIds = new Set();
  for (const c of cycles) {
    if (!c || typeof c.id !== "string" || !c.id) {
      errors.push("Een cyclus mist een geldig id.");
      continue;
    }
    cycleIds.add(c.id);
    if (!Object.values(CYCLE_STATUS).includes(c.status)) errors.push(`Cyclus ${c.id} heeft geen geldige status.`);
  }

  const templateIds = new Set();
  for (const t of templates) {
    if (!t || typeof t.id !== "string" || !t.id) {
      errors.push("Een template mist een geldig id.");
      continue;
    }
    templateIds.add(t.id);
    validateExerciseRefs(t.exercises, exerciseIds, errors, `Template ${t.id}`);
  }

  const plannedIds = new Set();
  for (const w of plannedWorkouts) {
    if (!w || typeof w.id !== "string" || !w.id) {
      errors.push("Een geplande workout mist een geldig id.");
      continue;
    }
    plannedIds.add(w.id);
    if (!cycleIds.has(w.cycleId)) errors.push(`Geplande workout ${w.id} verwijst naar een onbekende cyclus (${w.cycleId}).`);
    validateExerciseRefs(w.exercises, exerciseIds, errors, `Geplande workout ${w.id}`);
  }

  for (const cw of completedWorkouts) {
    if (!cw || typeof cw.id !== "string" || !cw.id) {
      errors.push("Een voltooide workout mist een geldig id.");
      continue;
    }
    if (!cycleIds.has(cw.cycleId)) errors.push(`Voltooide workout ${cw.id} verwijst naar een onbekende cyclus (${cw.cycleId}).`);
    if (!Array.isArray(cw.exercises)) errors.push(`Voltooide workout ${cw.id} heeft geen geldige oefeningensnapshot.`);
  }

  for (const week of closedWeeks) {
    if (!week || typeof week.id !== "string" || !week.id) {
      errors.push("Een afgesloten week mist een geldig id.");
      continue;
    }
    if (!cycleIds.has(week.cycleId)) errors.push(`Afgesloten week ${week.id} verwijst naar een onbekende cyclus (${week.cycleId}).`);
  }

  return { valid: errors.length === 0, errors };
}

async function reconcileAndCloseWeeks(db) {
  const today = todayISO();
  const cycles = await listCycles(db);
  const changes = reconcileCycles(cycles, today);
  if (changes.length) await putCycles(db, changes);
  const currentCycles = changes.length ? await listCycles(db) : cycles;

  const [plannedWorkouts, completedWorkouts, existingClosedWeeks] = await Promise.all([
    listAllPlannedWorkouts(db),
    listAllCompletedWorkouts(db),
    listAllClosedWeeks(db),
  ]);
  const existingIds = new Set(existingClosedWeeks.map((w) => w.id));
  const newRecords = [];
  for (const cycle of currentCycles) {
    const plannedForCycle = plannedWorkouts.filter((w) => w.cycleId === cycle.id);
    const completedForCycle = completedWorkouts.filter((w) => w.cycleId === cycle.id);
    newRecords.push(...findClosedWeeksNeedingRecord(cycle, plannedForCycle, completedForCycle, existingIds, today));
  }
  if (newRecords.length) await putClosedWeeks(db, newRecords);
}

function infoRow(label, value) {
  return el("div", { class: "row" }, [el("div", { class: "info" }, [el("div", { class: "name", text: label }), el("div", { class: "meta", text: value })])]);
}

export const gymModule = {
  id: "gym",
  name: "Gym",
  icon: "🏋",
  route: "#/gym",
  schemaVersion: GYM_SCHEMA_VERSION,
  order: 1,
  available: true,
  stores: STORE_DEFS,

  async init(db) {
    await reconcileAndCloseWeeks(db);
  },

  async exportData(db) {
    return exportAll(db);
  },

  importValidate,
  emptyExportData: emptyGymData,
  migrateExportData: (data, fromVersion, toVersion) => migrateGymData(data, fromVersion, toVersion),

  prepareImportRecords(data) {
    return {
      gymExercises: data.exercises,
      gymTemplates: data.templates,
      gymPlannedWorkouts: data.plannedWorkouts,
      gymCompletedWorkouts: data.completedWorkouts,
      gymCycles: data.cycles,
      gymClosedWeeks: data.closedWeeks,
    };
  },

  async migrateLiveData(db, fromVersion, toVersion) {
    const current = await exportAll(db);
    const migrated = migrateGymData(current, fromVersion, toVersion);
    await replaceAll(db, migrated);
  },

  async renderHomeToday(container, db, today) {
    const [cycles, plannedWorkouts, completedWorkouts, activeSession] = await Promise.all([
      listCycles(db),
      listAllPlannedWorkouts(db),
      listAllCompletedWorkouts(db),
      getActiveSession(db),
    ]);
    const activeCycle = findActiveCycle(cycles, today);

    if (!activeCycle) {
      container.appendChild(
        el("a", { class: "card tappable", href: "#/gym" }, [infoRow("Gym", "Nog geen actieve cyclus")])
      );
      return;
    }

    const plannedForCycle = plannedWorkouts.filter((w) => w.cycleId === activeCycle.id);
    const completedForCycle = completedWorkouts.filter((w) => w.cycleId === activeCycle.id);
    const week = getActiveCycleWeekSummary(activeCycle, plannedForCycle, completedForCycle, today);

    const card = el("a", { class: "card tappable", href: "#/gym/cycles/active" }, [
      infoRow(activeCycle.name, `Week ${week.weekNumberDisplay} van ${week.totalWeeks} · ${week.completed} van ${week.planned} voltooid`),
    ]);
    if (week.remainingNames.length > 0) {
      card.appendChild(el("div", { class: "meta", style: "margin-top:6px;", text: `Nog te doen: ${week.remainingNames.join(", ")}` }));
    }
    container.appendChild(card);

    if (activeSession) {
      const plannedWorkout = plannedWorkouts.find((w) => w.id === activeSession.plannedWorkoutId);
      const totalSets = plannedWorkout ? plannedWorkout.exercises.reduce((s, ex) => s + ex.sets.length, 0) : 0;
      const checked = Object.keys(activeSession.checkedSets || {}).length;
      container.appendChild(
        el("a", { class: "card tappable", href: "#/gym/workout/active" }, [
          infoRow(plannedWorkout ? plannedWorkout.name : "Actieve workout", `${checked} van ${totalSets} sets afgevinkt · tik om te hervatten`),
        ])
      );
    }
  },

  async renderHomeWeek(container, db, today) {
    const [cycles, plannedWorkouts, completedWorkouts, closedWeeks] = await Promise.all([
      listCycles(db),
      listAllPlannedWorkouts(db),
      listAllCompletedWorkouts(db),
      listAllClosedWeeks(db),
    ]);
    const activeCycle = findActiveCycle(cycles, today);
    if (!activeCycle) {
      container.appendChild(el("div", { class: "card" }, [infoRow("Gym", "Nog geen actieve cyclus")]));
      return;
    }
    const plannedForCycle = plannedWorkouts.filter((w) => w.cycleId === activeCycle.id);
    const completedForCycle = completedWorkouts.filter((w) => w.cycleId === activeCycle.id);
    const week = getActiveCycleWeekSummary(activeCycle, plannedForCycle, completedForCycle, today);
    const closedForCycle = closedWeeks.filter((w) => w.cycleId === activeCycle.id);
    const totalMissed = closedForCycle.reduce((s, w) => s + w.missedCount, 0);
    const last4 = summarizeMissed(closedForCycle, 4);
    const last8 = summarizeMissed(closedForCycle, 8);
    const last12 = summarizeMissed(closedForCycle, 12);

    container.appendChild(
      el("div", { class: "card" }, [
        infoRow(activeCycle.name, `Week ${week.weekNumberDisplay} van ${week.totalWeeks} · ${week.completed} voltooid, ${week.remaining} resterend`),
        el("div", { class: "meta", style: "margin-top:6px;", text: `Gemist sinds start: ${totalMissed}` }),
        el("div", {
          class: "meta",
          text: `Laatste ${last4.weeksUsed} weken: ${last4.missed} gemist · laatste ${last8.weeksUsed} weken: ${last8.missed} gemist · laatste ${last12.weeksUsed} weken: ${last12.missed} gemist`,
        }),
      ])
    );
  },

  async getTileStatus(db, today) {
    const cycles = await listCycles(db);
    const activeCycle = findActiveCycle(cycles, today);
    if (!activeCycle) return "Nog geen actieve cyclus";
    const [plannedWorkouts, completedWorkouts] = await Promise.all([listAllPlannedWorkouts(db), listAllCompletedWorkouts(db)]);
    const plannedForCycle = plannedWorkouts.filter((w) => w.cycleId === activeCycle.id);
    const completedForCycle = completedWorkouts.filter((w) => w.cycleId === activeCycle.id);
    const week = getActiveCycleWeekSummary(activeCycle, plannedForCycle, completedForCycle, today);
    return `${week.completed} van ${week.planned} workouts voltooid`;
  },
};
