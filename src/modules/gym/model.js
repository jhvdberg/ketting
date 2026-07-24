/**
 * Gym-domeinlogica: spiergroepen, sets/volume, diepe kopieën (briefing
 * hoofdstuk 6). Puur en DOM-vrij zodat dit via `node --test` te testen is.
 *
 * Volumefuncties werken op een "opgeloste" oefeningsvorm
 * `{ exerciseId, muscleGroup, sets: [{weight, reps}] }` — de aanroeper
 * (storage/screens) voegt `muscleGroup` toe door de oefening-ID op te
 * zoeken in de oefeningendatabase of, voor voltooide workouts, direct uit
 * de bevroren snapshot te lezen.
 */

export const MUSCLE_GROUPS = ["Chest", "Biceps", "Triceps", "Upper back", "Lower back", "Shoulders", "Glutes", "Legs", "Core"];
export const WEIGHTED_MUSCLE_GROUPS = MUSCLE_GROUPS.filter((g) => g !== "Core");

export function isCoreGroup(muscleGroup) {
  return muscleGroup === "Core";
}

export function isValidMuscleGroup(muscleGroup) {
  return MUSCLE_GROUPS.includes(muscleGroup);
}

export function isValidSet(set, muscleGroup) {
  if (!set || typeof set !== "object") return false;
  if (!Number.isInteger(set.reps) || set.reps < 0) return false;
  if (isCoreGroup(muscleGroup)) return set.weight == null;
  return typeof set.weight === "number" && Number.isFinite(set.weight) && set.weight >= 0;
}

export function setVolume(set, muscleGroup) {
  if (isCoreGroup(muscleGroup)) return null;
  return set.weight * set.reps;
}

/** @param {{muscleGroup: string, sets: Array<{weight: number|null, reps: number}>}} exercise */
export function exerciseVolume(exercise) {
  if (isCoreGroup(exercise.muscleGroup)) return null;
  return exercise.sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
}

/** @param {Array<{muscleGroup: string, sets: Array}>} exercises */
export function muscleGroupVolumes(exercises) {
  const totals = {};
  for (const ex of exercises) {
    if (isCoreGroup(ex.muscleGroup)) continue;
    totals[ex.muscleGroup] = (totals[ex.muscleGroup] || 0) + exerciseVolume(ex);
  }
  return totals;
}

export function workoutVolume(exercises) {
  return exercises.reduce((sum, ex) => sum + (isCoreGroup(ex.muscleGroup) ? 0 : exerciseVolume(ex)), 0);
}

/** Aantal geplande sets per (gewogen) spiergroep, voor de gewogen classificatie (6.21). */
export function setCountsByGroup(exercises) {
  const counts = {};
  for (const ex of exercises) {
    if (isCoreGroup(ex.muscleGroup)) continue;
    counts[ex.muscleGroup] = (counts[ex.muscleGroup] || 0) + ex.sets.length;
  }
  return counts;
}

function copySets(sets) {
  return sets.map((s) => ({ weight: s.weight, reps: s.reps }));
}

/** Diepe kopie: templateoefeningen → geplande-workoutoefeningen (6.4, geen live koppeling). */
export function exercisesFromTemplate(template) {
  return [...template.exercises]
    .sort((a, b) => a.order - b.order)
    .map((ex, idx) => ({ exerciseId: ex.exerciseId, order: idx, sets: copySets(ex.sets) }));
}

/** Diepe kopie: geplande workout → geplande workout (kopiëren naar andere week/cyclus, 6.13). */
export function exercisesFromPlannedWorkout(plannedWorkout) {
  return [...plannedWorkout.exercises]
    .sort((a, b) => a.order - b.order)
    .map((ex, idx) => ({ exerciseId: ex.exerciseId, order: idx, sets: copySets(ex.sets) }));
}

/** Diepe kopie: geplande workout → nieuw template (6.13, overschrijft nooit een bestaand template). */
export function templateExercisesFromPlannedWorkout(plannedWorkout) {
  return exercisesFromPlannedWorkout(plannedWorkout);
}
