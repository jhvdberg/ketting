/**
 * IndexedDB-toegang voor de Gym-module. Enige bestand dat de object stores
 * rechtstreeks aanraakt (briefing 4.3).
 */

import { getAll, getAllByIndex, get, put, putAll, del, bulkReplace } from "../../core/db.js";

export const STORE_DEFS = [
  { name: "gymExercises", keyPath: "id" },
  { name: "gymTemplates", keyPath: "id" },
  { name: "gymPlannedWorkouts", keyPath: "id", indexes: [{ name: "by_cycleId", keyPath: "cycleId" }] },
  { name: "gymActiveSession", keyPath: "id" },
  { name: "gymCompletedWorkouts", keyPath: "id", indexes: [{ name: "by_cycleId", keyPath: "cycleId" }] },
  { name: "gymCycles", keyPath: "id" },
  { name: "gymClosedWeeks", keyPath: "id", indexes: [{ name: "by_cycleId", keyPath: "cycleId" }] },
];

const ACTIVE_SESSION_ID = "current";

// --- oefeningen ---
export const listExercises = (db) => getAll(db, "gymExercises");
export const getExercise = (db, id) => get(db, "gymExercises", id);
export const saveExercise = (db, exercise) => put(db, "gymExercises", exercise);

export async function isExerciseUsedInTemplates(db, exerciseId) {
  const templates = await listTemplates(db);
  return templates.some((t) => t.exercises.some((ex) => ex.exerciseId === exerciseId));
}

/** Voegt naam/spiergroep toe aan lichte oefeningverwijzingen ({exerciseId, order, sets}) voor weergave. */
export async function resolveExercises(db, exerciseRefs) {
  const exercises = await listExercises(db);
  const byId = new Map(exercises.map((e) => [e.id, e]));
  return exerciseRefs.map((ref) => {
    const found = byId.get(ref.exerciseId);
    return { ...ref, exerciseName: found ? found.name : "(verwijderde oefening)", muscleGroup: found ? found.muscleGroup : null };
  });
}

// --- workouttemplates ---
export const listTemplates = (db) => getAll(db, "gymTemplates");
export const getTemplate = (db, id) => get(db, "gymTemplates", id);
export const saveTemplate = (db, template) => put(db, "gymTemplates", template);
export const deleteTemplate = (db, id) => del(db, "gymTemplates", id);

// --- geplande workouts (blueprints per cyclusweek) ---
export const listAllPlannedWorkouts = (db) => getAll(db, "gymPlannedWorkouts");
export const listPlannedWorkoutsForCycle = (db, cycleId) => getAllByIndex(db, "gymPlannedWorkouts", "by_cycleId", cycleId);
export const getPlannedWorkout = (db, id) => get(db, "gymPlannedWorkouts", id);
export const savePlannedWorkout = (db, workout) => put(db, "gymPlannedWorkouts", workout);
export const deletePlannedWorkout = (db, id) => del(db, "gymPlannedWorkouts", id);

// --- actieve sessie (hoogstens één) ---
export const getActiveSession = (db) => get(db, "gymActiveSession", ACTIVE_SESSION_ID);
export const saveActiveSession = (db, session) => put(db, "gymActiveSession", { ...session, id: ACTIVE_SESSION_ID });
export const clearActiveSession = (db) => del(db, "gymActiveSession", ACTIVE_SESSION_ID);

// --- voltooide workouts (onveranderlijke snapshots) ---
export const listAllCompletedWorkouts = (db) => getAll(db, "gymCompletedWorkouts");
export const listCompletedForCycle = (db, cycleId) => getAllByIndex(db, "gymCompletedWorkouts", "by_cycleId", cycleId);
export const getCompletedWorkout = (db, id) => get(db, "gymCompletedWorkouts", id);
export const saveCompletedWorkout = (db, workout) => put(db, "gymCompletedWorkouts", workout);

// --- cycli ---
export const listCycles = (db) => getAll(db, "gymCycles");
export const getCycle = (db, id) => get(db, "gymCycles", id);
export const saveCycle = (db, cycle) => put(db, "gymCycles", cycle);
export const deleteCycle = (db, id) => del(db, "gymCycles", id);
export const putCycles = (db, cycles) => putAll(db, "gymCycles", cycles);

// --- afgesloten weken ---
export const listAllClosedWeeks = (db) => getAll(db, "gymClosedWeeks");
export const listClosedWeeksForCycle = (db, cycleId) => getAllByIndex(db, "gymClosedWeeks", "by_cycleId", cycleId);
export const putClosedWeeks = (db, weeks) => putAll(db, "gymClosedWeeks", weeks);

export async function exportAll(db) {
  const [exercises, templates, plannedWorkouts, completedWorkouts, cycles, closedWeeks] = await Promise.all([
    listExercises(db),
    listTemplates(db),
    listAllPlannedWorkouts(db),
    listAllCompletedWorkouts(db),
    listCycles(db),
    listAllClosedWeeks(db),
  ]);
  return { exercises, templates, plannedWorkouts, completedWorkouts, cycles, closedWeeks };
}

export function replaceAll(db, data) {
  return bulkReplace(db, {
    gymExercises: data.exercises,
    gymTemplates: data.templates,
    gymPlannedWorkouts: data.plannedWorkouts,
    gymCompletedWorkouts: data.completedWorkouts,
    gymCycles: data.cycles,
    gymClosedWeeks: data.closedWeeks,
  });
}
