/** Actieve workout: uitvoeren, autosave, hervatten, annuleren, voltooien (briefing 6.14-6.19). */
import { el, clearNode } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { navigate } from "../../../core/router.js";
import { nowTimestamp, todayISO } from "../../../core/dateUtils.js";
import { generateId } from "../../../core/id.js";
import {
  getActiveSession,
  saveActiveSession,
  clearActiveSession,
  getPlannedWorkout,
  listExercises,
  getCycle,
  listAllCompletedWorkouts,
  saveCompletedWorkout,
} from "../storage.js";
import { isCoreGroup } from "../model.js";
import { getElapsedWeeks } from "../cycleModel.js";
import { classifyCompletedWorkout } from "../classification.js";
import { confirmDialog } from "../../../core/ui/confirm.js";
import { showToast } from "../../../core/ui/toast.js";
import { screenHeader, formatWeight } from "./shared.js";

export default async function renderActiveWorkout(container) {
  const db = getDb();

  async function refresh() {
    clearNode(container);
    const session = await getActiveSession(db);
    if (!session) {
      container.appendChild(screenHeader({ title: "Actieve workout", backTo: "#/gym" }));
      container.appendChild(el("p", { class: "empty-state", text: "Er is geen actieve workout." }));
      return;
    }
    const plannedWorkout = await getPlannedWorkout(db, session.plannedWorkoutId);
    if (!plannedWorkout) {
      await clearActiveSession(db);
      container.appendChild(screenHeader({ title: "Actieve workout", backTo: "#/gym" }));
      container.appendChild(el("p", { class: "empty-state", text: "De workout achter deze sessie bestaat niet meer." }));
      return;
    }
    const byId = new Map((await listExercises(db)).map((e) => [e.id, e]));

    container.appendChild(screenHeader({ title: plannedWorkout.name, backTo: "#/gym" }));

    let totalSets = 0;
    plannedWorkout.exercises.forEach((ex) => {
      totalSets += ex.sets.length;
    });
    const checkedCount = Object.keys(session.checkedSets || {}).length;
    container.appendChild(el("p", { class: "hint", text: `${checkedCount} van ${totalSets} sets afgevinkt` }));

    plannedWorkout.exercises.forEach((ex, exIdx) => {
      const info = byId.get(ex.exerciseId);
      const isCore = info && isCoreGroup(info.muscleGroup);
      const allExDone = ex.sets.every((_, setIdx) => session.checkedSets[`${exIdx}-${setIdx}`]);
      const card = el("div", { class: "card" + (allExDone ? " done" : "") });
      card.appendChild(el("div", { class: "name", text: info ? info.name : "(verwijderde oefening)" }));
      if (info) card.appendChild(el("div", { class: "meta", text: info.muscleGroup }));

      ex.sets.forEach((set, setIdx) => {
        const key = `${exIdx}-${setIdx}`;
        const checked = !!session.checkedSets[key];
        card.appendChild(
          el("div", { class: "row", style: "margin-top:8px;" }, [
            el("span", { class: "meta", text: `Set ${setIdx + 1}${isCore ? "" : ` · ${formatWeight(set.weight)}`} · ${set.reps} reps` }),
            el("button", {
              class: "check" + (checked ? " on" : ""),
              type: "button",
              "aria-label": `Set ${setIdx + 1} ${checked ? "gedaan" : "afvinken"}`,
              text: "✓",
              onClick: async () => {
                const wasComplete = checkedCount === totalSets;
                const nextChecked = { ...session.checkedSets };
                if (checked) delete nextChecked[key];
                else nextChecked[key] = true;
                const nowComplete = Object.keys(nextChecked).length === totalSets;
                session.checkedSets = nextChecked;
                session.lastChangedAt = nowTimestamp();
                session.confirmationShown = nowComplete;
                await saveActiveSession(db, session);
                await refresh();
                if (nowComplete && !wasComplete) await showCompletionConfirmation();
              },
            }),
          ])
        );
      });
      container.appendChild(card);
    });

    container.appendChild(
      el("button", {
        class: "btn danger",
        type: "button",
        text: "Workout annuleren",
        style: "margin-top:14px;",
        onClick: async () => {
          const ok = await confirmDialog({
            title: "Workout annuleren",
            body: "De voortgang van deze sessie gaat verloren. De geplande workout blijft bestaan en kan later opnieuw vanaf nul gestart worden. Dit telt niet als voltooid.",
            confirmLabel: "Ja, annuleren",
            cancelLabel: "Terug naar workout",
            danger: true,
          });
          if (!ok) return;
          await clearActiveSession(db);
          showToast("Workout geannuleerd");
          navigate("/gym");
        },
      })
    );

    if (totalSets > 0 && checkedCount === totalSets) {
      container.appendChild(
        el("button", { class: "btn primary", type: "button", text: "Workout voltooien", style: "margin-top:10px;", onClick: () => completeWorkout(plannedWorkout, session) })
      );
    }
  }

  async function showCompletionConfirmation() {
    const session = await getActiveSession(db);
    if (!session) return;
    const plannedWorkout = await getPlannedWorkout(db, session.plannedWorkoutId);
    if (!plannedWorkout) return;
    const ok = await confirmDialog({
      title: "Workout voltooien?",
      body: "Alle sets zijn afgevinkt. Wil je deze workout definitief voltooien, of nog even terug naar de workout?",
      confirmLabel: "Workout voltooien",
      cancelLabel: "Terug naar workout",
    });
    if (ok) await completeWorkout(plannedWorkout, session);
  }

  async function completeWorkout(plannedWorkout, session) {
    const now = nowTimestamp();
    const today = todayISO();
    const byId = new Map((await listExercises(db)).map((e) => [e.id, e]));

    const resolvedExercises = plannedWorkout.exercises.map((ex) => {
      const info = byId.get(ex.exerciseId);
      return {
        exerciseId: ex.exerciseId,
        exerciseName: info ? info.name : "(verwijderde oefening)",
        muscleGroup: info ? info.muscleGroup : "Core",
        sets: ex.sets,
      };
    });

    const allCompletedDesc = (await listAllCompletedWorkouts(db)).sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
    const classification = classifyCompletedWorkout(resolvedExercises, allCompletedDesc);

    let cycleName = "";
    let cycleWeek = null;
    let absoluteWeekNumber = null;
    const cycle = plannedWorkout.cycleId ? await getCycle(db, plannedWorkout.cycleId) : null;
    if (cycle) {
      cycleName = cycle.name;
      cycleWeek = plannedWorkout.weekIndex;
      absoluteWeekNumber = getElapsedWeeks(cycle, today);
    }

    const exercisesSnapshot = resolvedExercises.map((ex) => {
      const core = isCoreGroup(ex.muscleGroup);
      return {
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        muscleGroup: ex.muscleGroup,
        sets: ex.sets.map((s) => ({ weight: s.weight, reps: s.reps, setVolume: core ? null : s.weight * s.reps })),
        exerciseVolume: core ? null : ex.sets.reduce((sum, s) => sum + s.weight * s.reps, 0),
      };
    });

    const completedWorkout = {
      id: generateId(),
      plannedWorkoutId: plannedWorkout.id,
      startedAt: session.startedAt,
      completedAt: now,
      completedDate: today,
      cycleId: plannedWorkout.cycleId,
      cycleName,
      cycleWeek,
      absoluteWeekNumber,
      positionInWeek: plannedWorkout.position,
      workoutName: plannedWorkout.name,
      exercises: exercisesSnapshot,
      muscleGroupVolumes: classification.muscleGroupVolumes,
      workoutVolume: classification.workoutVolume,
      groupClassifications: classification.groupResults,
      totalClassification: classification.workoutResult.finalClassification,
      classifiableSetCount: classification.workoutResult.classifiableSetCount,
      totalWeightedSetCount: classification.workoutResult.totalWeightedSetCount,
      classificationCoverage: classification.workoutResult.classificationCoverage,
      formulaVersion: classification.workoutResult.formulaVersion,
      schemaVersion: 1,
    };

    await saveCompletedWorkout(db, completedWorkout);
    await clearActiveSession(db);
    showToast("Workout voltooid");
    navigate(`/gym/history/${completedWorkout.id}`);
  }

  await refresh();
}
