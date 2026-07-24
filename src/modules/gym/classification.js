/**
 * Light/Medium/Heavy-classificatie (briefing 6.21). Puur en DOM-vrij.
 *
 * Heavy-persistentie heeft maar één voorgaande relevante workout nodig (de
 * meest recente), los van de drie-workouts-eis voor de gewone
 * ratioberekening. Daardoor kan Heavy-persistentie ook een spiergroep met
 * "Onvoldoende historie" alsnog definitief Heavy maken — dat volgt uit de
 * briefingtekst, die de twee regels onafhankelijk van elkaar beschrijft.
 */

import { muscleGroupVolumes, setCountsByGroup, workoutVolume } from "./model.js";

export const CLASSIFICATION_FORMULA_VERSION = 1;
export const HEAVY_PERSISTENCE_MIN_RATIO = 1.250001;
export const HEAVY_PERSISTENCE_THRESHOLD = 0.9;
export const INSUFFICIENT_HISTORY = "Onvoldoende historie";

export function classifyRatio(ratio) {
  if (ratio < 0.75) return "Light";
  if (ratio <= 1.25) return "Medium";
  return "Heavy";
}

/**
 * @param {Array<{id, completedAt, muscleGroupVolumes, groupClassifications}>} priorCompletedWorkoutsDesc
 *   Voltooide workouts vóór de te classificeren workout, meest recent eerst.
 */
export function relevantPreviousWorkouts(priorCompletedWorkoutsDesc, muscleGroup) {
  return priorCompletedWorkoutsDesc
    .filter((w) => w.muscleGroupVolumes && Object.prototype.hasOwnProperty.call(w.muscleGroupVolumes, muscleGroup))
    .map((w) => ({
      id: w.id,
      volume: w.muscleGroupVolumes[muscleGroup],
      classification: w.groupClassifications?.[muscleGroup]?.finalClassification ?? null,
    }));
}

/**
 * @param {number} currentVolume
 * @param {Array<{id: string, volume: number, classification: string|null}>} previousRelevant meest recent eerst
 * @param {number} setCount
 */
export function classifyMuscleGroup(currentVolume, previousRelevant, setCount) {
  const mostRecent = previousRelevant[0] || null;
  const historyForRatio = previousRelevant.slice(0, 3);
  const hasEnoughHistory = historyForRatio.length === 3;

  let ratio = null;
  let average = null;
  let baseClassification = INSUFFICIENT_HISTORY;
  if (hasEnoughHistory) {
    average = historyForRatio.reduce((sum, w) => sum + w.volume, 0) / 3;
    ratio = average === 0 ? Infinity : currentVolume / average;
    baseClassification = classifyRatio(ratio);
  }

  const heavyPersistenceApplied =
    !!mostRecent && mostRecent.classification === "Heavy" && currentVolume >= HEAVY_PERSISTENCE_THRESHOLD * mostRecent.volume;

  const finalClassification = heavyPersistenceApplied ? "Heavy" : baseClassification;
  const effectiveRatio = heavyPersistenceApplied ? Math.max(ratio ?? -Infinity, HEAVY_PERSISTENCE_MIN_RATIO) : ratio;

  return {
    currentVolume,
    historyWorkoutIds: historyForRatio.map((w) => w.id),
    historyVolumes: historyForRatio.map((w) => w.volume),
    average,
    ratio,
    effectiveRatio,
    setCount,
    baseClassification,
    finalClassification,
    heavyPersistenceApplied,
    previousHeavyWorkoutId: heavyPersistenceApplied ? mostRecent.id : null,
    previousHeavyVolume: heavyPersistenceApplied ? mostRecent.volume : null,
  };
}

/** @param {Record<string, ReturnType<typeof classifyMuscleGroup>>} groupResults */
export function classifyWorkout(groupResults) {
  const all = Object.values(groupResults);
  const classifiable = all.filter((r) => r.finalClassification !== INSUFFICIENT_HISTORY);
  const totalWeightedSetCount = all.reduce((sum, r) => sum + r.setCount, 0);
  const classifiableSetCount = classifiable.reduce((sum, r) => sum + r.setCount, 0);

  if (classifiable.length === 0) {
    return {
      weightedRatio: null,
      classifiableSetCount: 0,
      totalWeightedSetCount,
      classificationCoverage: `0 van ${totalWeightedSetCount} gewogen sets meegenomen`,
      finalClassification: INSUFFICIENT_HISTORY,
      formulaVersion: CLASSIFICATION_FORMULA_VERSION,
    };
  }

  const weightedRatio = classifiable.reduce((sum, r) => sum + r.effectiveRatio * r.setCount, 0) / classifiableSetCount;
  return {
    weightedRatio,
    classifiableSetCount,
    totalWeightedSetCount,
    classificationCoverage: `${classifiableSetCount} van ${totalWeightedSetCount} gewogen sets meegenomen`,
    finalClassification: classifyRatio(weightedRatio),
    formulaVersion: CLASSIFICATION_FORMULA_VERSION,
  };
}

/**
 * Classificeert een (nog te voltooien of net voltooide) workout volledig.
 * @param {Array<{exerciseId: string, muscleGroup: string, sets: Array}>} exercises opgeloste oefeningen
 * @param {Array} priorCompletedWorkoutsDesc voltooide workouts vóór deze, meest recent eerst
 */
export function classifyCompletedWorkout(exercises, priorCompletedWorkoutsDesc) {
  const mgVolumes = muscleGroupVolumes(exercises);
  const setCounts = setCountsByGroup(exercises);
  const groupResults = {};
  for (const group of Object.keys(mgVolumes)) {
    const previousRelevant = relevantPreviousWorkouts(priorCompletedWorkoutsDesc, group);
    groupResults[group] = classifyMuscleGroup(mgVolumes[group], previousRelevant, setCounts[group]);
  }
  return {
    groupResults,
    workoutResult: classifyWorkout(groupResults),
    muscleGroupVolumes: mgVolumes,
    workoutVolume: workoutVolume(exercises),
  };
}
