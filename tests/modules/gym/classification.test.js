import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyRatio,
  classifyMuscleGroup,
  classifyWorkout,
  classifyCompletedWorkout,
  relevantPreviousWorkouts,
  INSUFFICIENT_HISTORY,
  HEAVY_PERSISTENCE_MIN_RATIO,
} from "../../../src/modules/gym/classification.js";

test("classifyRatio: grenzen exact op 0,75 en 1,25 (6.21)", () => {
  assert.equal(classifyRatio(0.74), "Light");
  assert.equal(classifyRatio(0.75), "Medium");
  assert.equal(classifyRatio(1.25), "Medium");
  assert.equal(classifyRatio(1.250001), "Heavy");
});

test("classifyMuscleGroup: minder dan drie relevante eerdere workouts geeft Onvoldoende historie", () => {
  const result = classifyMuscleGroup(1000, [{ id: "a", volume: 900, classification: "Medium" }], 10);
  assert.equal(result.baseClassification, INSUFFICIENT_HISTORY);
  assert.equal(result.finalClassification, INSUFFICIENT_HISTORY);
  assert.equal(result.ratio, null);
});

test("classifyMuscleGroup: gewone ratioberekening met drie eerdere workouts", () => {
  const previous = [
    { id: "a", volume: 1000, classification: "Medium" },
    { id: "b", volume: 1000, classification: "Medium" },
    { id: "c", volume: 1000, classification: "Medium" },
  ];
  const result = classifyMuscleGroup(1300, previous, 10); // ratio = 1300/1000 = 1.3 -> Heavy
  assert.equal(result.average, 1000);
  assert.equal(result.ratio, 1.3);
  assert.equal(result.baseClassification, "Heavy");
  assert.equal(result.finalClassification, "Heavy");
  assert.equal(result.heavyPersistenceApplied, false);
});

test("Heavy-persistentie: blijft Heavy bij >=90% van de vorige Heavy-workout, ook zonder genoeg historie", () => {
  // Maar één eerdere workout beschikbaar (dus normaal 'Onvoldoende historie'), maar die was Heavy.
  const previous = [{ id: "prev", volume: 1000, classification: "Heavy" }];
  const result = classifyMuscleGroup(900, previous, 8); // 900 >= 90% van 1000
  assert.equal(result.heavyPersistenceApplied, true);
  assert.equal(result.finalClassification, "Heavy");
  assert.equal(result.previousHeavyWorkoutId, "prev");
  assert.ok(result.effectiveRatio >= HEAVY_PERSISTENCE_MIN_RATIO);
});

test("Heavy-persistentie activeert niet onder de 90%-grens", () => {
  const previous = [{ id: "prev", volume: 1000, classification: "Heavy" }];
  const result = classifyMuscleGroup(800, previous, 8); // 800 < 90% van 1000
  assert.equal(result.heavyPersistenceApplied, false);
  assert.equal(result.finalClassification, INSUFFICIENT_HISTORY);
});

test("Heavy-persistentie overschrijft ook een lagere berekende ratio (effectieve ratio >= 1.250001)", () => {
  const previous = [
    { id: "a", volume: 1000, classification: "Heavy" }, // meest recent: Heavy
    { id: "b", volume: 2000, classification: "Medium" },
    { id: "c", volume: 2000, classification: "Medium" },
  ];
  // gewone ratio: gemiddelde = (1000+2000+2000)/3 = 1666.7, huidige 950 -> ratio ~0.57 (Light)
  const result = classifyMuscleGroup(950, previous, 5);
  assert.equal(result.baseClassification, "Light");
  assert.equal(result.heavyPersistenceApplied, true); // 950 >= 90% van 1000 (de meest recente, Heavy)
  assert.equal(result.finalClassification, "Heavy");
  assert.equal(result.effectiveRatio, Math.max(result.ratio, HEAVY_PERSISTENCE_MIN_RATIO));
});

test("classifyWorkout: gewogen ratio met classificatiedekking bij gedeeltelijke historie", () => {
  const groupResults = {
    Chest: { finalClassification: "Heavy", effectiveRatio: 1.4, setCount: 6 },
    Legs: { finalClassification: INSUFFICIENT_HISTORY, effectiveRatio: null, setCount: 4 },
  };
  const result = classifyWorkout(groupResults);
  assert.equal(result.classifiableSetCount, 6);
  assert.equal(result.totalWeightedSetCount, 10);
  assert.equal(result.classificationCoverage, "6 van 10 gewogen sets meegenomen");
  assert.ok(Math.abs(result.weightedRatio - 1.4) < 1e-9);
  assert.equal(result.finalClassification, "Heavy");
});

test("classifyWorkout: Onvoldoende historie als geen enkele spiergroep classificeerbaar is", () => {
  const groupResults = { Chest: { finalClassification: INSUFFICIENT_HISTORY, effectiveRatio: null, setCount: 6 } };
  const result = classifyWorkout(groupResults);
  assert.equal(result.finalClassification, INSUFFICIENT_HISTORY);
  assert.equal(result.classificationCoverage, "0 van 6 gewogen sets meegenomen");
});

test("relevantPreviousWorkouts filtert op spiergroep en behoudt volgorde", () => {
  const prior = [
    { id: "w2", muscleGroupVolumes: { Chest: 500 }, groupClassifications: { Chest: { finalClassification: "Medium" } } },
    { id: "w1", muscleGroupVolumes: { Legs: 800 }, groupClassifications: {} },
  ];
  const result = relevantPreviousWorkouts(prior, "Chest");
  assert.deepEqual(result, [{ id: "w2", volume: 500, classification: "Medium" }]);
});

test("classifyCompletedWorkout: Core telt niet mee in de spiergroepresultaten (6.20/6.21)", () => {
  const exercises = [
    { exerciseId: "e1", muscleGroup: "Chest", sets: [{ weight: 50, reps: 10 }] },
    { exerciseId: "e2", muscleGroup: "Core", sets: [{ weight: null, reps: 20 }] },
  ];
  const result = classifyCompletedWorkout(exercises, []);
  assert.deepEqual(Object.keys(result.groupResults), ["Chest"]);
  assert.equal(result.groupResults.Chest.finalClassification, INSUFFICIENT_HISTORY); // geen historie
  assert.equal(result.workoutVolume, 500);
});
