import { test } from "node:test";
import assert from "node:assert/strict";
import {
  exerciseVolume,
  muscleGroupVolumes,
  workoutVolume,
  setCountsByGroup,
  isValidSet,
  isCoreGroup,
  exercisesFromTemplate,
  exercisesFromPlannedWorkout,
  groupExercisesForPicker,
} from "../../../src/modules/gym/model.js";

test("exerciseVolume berekent gewicht × herhalingen, Core geeft null (6.20)", () => {
  assert.equal(exerciseVolume({ muscleGroup: "Chest", sets: [{ weight: 100, reps: 5 }, { weight: 100, reps: 5 }] }), 1000);
  assert.equal(exerciseVolume({ muscleGroup: "Core", sets: [{ weight: null, reps: 20 }] }), null);
});

test("muscleGroupVolumes telt op per spiergroep en sluit Core uit", () => {
  const exercises = [
    { muscleGroup: "Chest", sets: [{ weight: 50, reps: 10 }] },
    { muscleGroup: "Chest", sets: [{ weight: 60, reps: 5 }] },
    { muscleGroup: "Core", sets: [{ weight: null, reps: 30 }] },
  ];
  assert.deepEqual(muscleGroupVolumes(exercises), { Chest: 800 });
});

test("workoutVolume sluit Core uit van het totaal", () => {
  const exercises = [
    { muscleGroup: "Legs", sets: [{ weight: 100, reps: 10 }] },
    { muscleGroup: "Core", sets: [{ weight: null, reps: 20 }] },
  ];
  assert.equal(workoutVolume(exercises), 1000);
});

test("setCountsByGroup telt sets per gewogen spiergroep, Core telt niet mee", () => {
  const exercises = [
    { muscleGroup: "Chest", sets: [{ weight: 50, reps: 10 }, { weight: 50, reps: 8 }] },
    { muscleGroup: "Core", sets: [{ weight: null, reps: 20 }] },
  ];
  assert.deepEqual(setCountsByGroup(exercises), { Chest: 2 });
});

test("isValidSet: Core vereist geen gewicht, andere groepen wel een niet-negatief gewicht", () => {
  assert.equal(isValidSet({ weight: null, reps: 10 }, "Core"), true);
  assert.equal(isValidSet({ weight: 5, reps: 10 }, "Core"), false);
  assert.equal(isValidSet({ weight: 20, reps: 10 }, "Chest"), true);
  assert.equal(isValidSet({ weight: -1, reps: 10 }, "Chest"), false);
  assert.equal(isValidSet({ weight: 20, reps: -1 }, "Chest"), false);
});

test("isCoreGroup", () => {
  assert.equal(isCoreGroup("Core"), true);
  assert.equal(isCoreGroup("Chest"), false);
});

test("exercisesFromTemplate maakt een diepe kopie zonder live koppeling (6.4)", () => {
  const template = { exercises: [{ exerciseId: "e1", order: 0, sets: [{ weight: 40, reps: 10 }] }] };
  const copy = exercisesFromTemplate(template);
  copy[0].sets[0].weight = 999;
  assert.equal(template.exercises[0].sets[0].weight, 40);
});

test("exercisesFromPlannedWorkout maakt een diepe kopie (6.13)", () => {
  const plannedWorkout = { exercises: [{ exerciseId: "e1", order: 0, sets: [{ weight: 40, reps: 10 }] }] };
  const copy = exercisesFromPlannedWorkout(plannedWorkout);
  copy[0].sets.push({ weight: 50, reps: 5 });
  assert.equal(plannedWorkout.exercises[0].sets.length, 1);
});

test("groupExercisesForPicker groepeert per spiergroep in de vaste volgorde en sorteert op gebruik", () => {
  const exercises = [
    { id: "squat", name: "Squat", muscleGroup: "Legs" },
    { id: "lunge", name: "Lunge", muscleGroup: "Legs" },
    { id: "curl", name: "Curl", muscleGroup: "Biceps" },
    { id: "bench", name: "Bankdrukken", muscleGroup: "Chest" },
  ];
  const completedWorkouts = [
    { exercises: [{ exerciseId: "lunge" }, { exerciseId: "squat" }] },
    { exercises: [{ exerciseId: "lunge" }] },
  ];
  const groups = groupExercisesForPicker(exercises, completedWorkouts);
  // Volgorde van groepen volgt MUSCLE_GROUPS (Chest vóór Biceps vóór Legs), niet de invoervolgorde.
  assert.deepEqual(groups.map((g) => g.muscleGroup), ["Chest", "Biceps", "Legs"]);
  // Binnen Legs: Lunge (2x gebruikt) vóór Squat (1x gebruikt).
  assert.deepEqual(groups.find((g) => g.muscleGroup === "Legs").exercises.map((e) => e.id), ["lunge", "squat"]);
});

test("groupExercisesForPicker sorteert alfabetisch bij gelijke (of geen) gebruiksfrequentie", () => {
  const exercises = [
    { id: "b", name: "Biceps curl", muscleGroup: "Biceps" },
    { id: "a", name: "Alternerende curl", muscleGroup: "Biceps" },
  ];
  const groups = groupExercisesForPicker(exercises, []);
  assert.deepEqual(groups[0].exercises.map((e) => e.id), ["a", "b"]);
});
