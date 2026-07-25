/** Geplande workout bewerken (briefing 6.4 niveau 2, 6.5, 6.11, 6.13, 6.22). */
import { el } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { navigate } from "../../../core/router.js";
import { todayISO, nowTimestamp } from "../../../core/dateUtils.js";
import { generateId } from "../../../core/id.js";
import {
  getPlannedWorkout,
  savePlannedWorkout,
  listPlannedWorkoutsForCycle,
  listExercises,
  getCycle,
  listCycles,
  listCompletedForCycle,
  listAllCompletedWorkouts,
  getActiveSession,
  saveTemplate,
} from "../storage.js";
import { isCoreGroup, isValidSet, exercisesFromPlannedWorkout, groupExercisesForPicker } from "../model.js";
import { classifyCompletedWorkout } from "../classification.js";
import {
  CYCLE_STATUS,
  getEffectiveCycleStatus,
  getCurrentCycleWeekIndex,
  getElapsedWeeks,
  isSlotCompletedThisIteration,
} from "../cycleModel.js";
import { showToast } from "../../../core/ui/toast.js";
import { screenHeader, classificationPillClass, parseWeightInput } from "./shared.js";

export default async function renderPlannedWorkoutEditor(container, params) {
  const db = getDb();
  const today = todayISO();

  const plannedWorkout = await getPlannedWorkout(db, params.id);
  if (!plannedWorkout) {
    container.appendChild(el("div", { class: "empty-state", text: "Deze geplande workout bestaat niet (meer)." }));
    return;
  }
  const cycle = await getCycle(db, plannedWorkout.cycleId);
  const backTo = cycle ? `#/gym/cycles/${cycle.id}/edit` : "#/gym/cycles";

  const activeSession = await getActiveSession(db);
  const isActive = !!activeSession && activeSession.plannedWorkoutId === plannedWorkout.id;
  let isDoneThisIteration = false;
  if (cycle) {
    const effectiveStatus = getEffectiveCycleStatus(cycle, today, null);
    if ((effectiveStatus === CYCLE_STATUS.ACTIVE || effectiveStatus === CYCLE_STATUS.REPLACEMENT_PLANNED) && getCurrentCycleWeekIndex(cycle, today) === plannedWorkout.weekIndex) {
      const absoluteWeek = getElapsedWeeks(cycle, today);
      const completedForCycle = await listCompletedForCycle(db, cycle.id);
      isDoneThisIteration = isSlotCompletedThisIteration(plannedWorkout.id, absoluteWeek, completedForCycle);
    }
  }
  const locked = isActive || isDoneThisIteration;

  const allExercises = (await listExercises(db)).filter((e) => e.active).sort((a, b) => a.name.localeCompare(b.name));
  const exerciseById = new Map((await listExercises(db)).map((e) => [e.id, e]));
  const exerciseGroups = groupExercisesForPicker(allExercises, await listAllCompletedWorkouts(db));

  container.appendChild(screenHeader({ title: "Geplande workout", backTo }));

  if (locked) {
    container.appendChild(
      el("p", { class: "hint", text: isActive ? "Deze workout is nu actief. Voltooi of annuleer die eerst voordat je hem hier kan bewerken." : "Deze workout is deze week al voltooid en kan niet meer worden bewerkt." })
    );
  }

  const nameInput = el("input", { type: "text", placeholder: "Naam" });
  nameInput.value = plannedWorkout.name;
  nameInput.disabled = locked;
  const errorEl = el("p", { class: "field-error" });
  container.appendChild(el("label", { text: "Naam" }));
  container.appendChild(nameInput);

  let exercises = plannedWorkout.exercises.map((ex) => ({ exerciseId: ex.exerciseId, sets: ex.sets.map((s) => ({ ...s })) }));

  const exercisesContainer = el("div", { style: "margin-top:14px;" });
  container.appendChild(exercisesContainer);
  const classificationContainer = el("div", { style: "margin-top:14px;" });

  async function renderClassificationPreview() {
    classificationContainer.innerHTML = "";
    const resolved = exercises
      .map((ex) => {
        const info = exerciseById.get(ex.exerciseId);
        return info ? { exerciseId: ex.exerciseId, muscleGroup: info.muscleGroup, sets: ex.sets } : null;
      })
      .filter(Boolean);
    if (resolved.length === 0) return;
    const allCompleted = (await listAllCompletedWorkouts(db)).sort((a, b) => (a.completedAt < b.completedAt ? 1 : -1));
    const result = classifyCompletedWorkout(resolved, allCompleted);
    classificationContainer.appendChild(el("h2", { class: "section", text: "Verwachte classificatie" }));
    for (const [group, r] of Object.entries(result.groupResults)) {
      classificationContainer.appendChild(
        el("div", { class: "list-row" }, [
          el("span", { text: `${group}: ${r.currentVolume} kg·reps` }),
          el("span", { class: classificationPillClass(r.finalClassification), text: r.finalClassification }),
        ])
      );
    }
    classificationContainer.appendChild(
      el("p", { class: "hint", style: "margin-top:8px;", text: `Hele workout: ${result.workoutResult.finalClassification} (${result.workoutResult.classificationCoverage})` })
    );
  }

  function renderExercises() {
    exercisesContainer.innerHTML = "";
    exercises.forEach((ex, exIdx) => {
      const info = exerciseById.get(ex.exerciseId);
      const isCore = !!info && isCoreGroup(info.muscleGroup);
      const card = el("div", { class: "card" });
      const headerRow = el("div", { class: "row" }, [
        el("div", { class: "info" }, [el("div", { class: "name", text: info ? info.name : "(verwijderde oefening)" }), el("div", { class: "meta", text: info ? info.muscleGroup : "" })]),
      ]);
      if (!locked) {
        headerRow.appendChild(el("button", { class: "icon-btn", type: "button", "aria-label": "Naar boven", text: "↑", disabled: exIdx === 0, onClick: () => { [exercises[exIdx - 1], exercises[exIdx]] = [exercises[exIdx], exercises[exIdx - 1]]; renderExercises(); renderClassificationPreview(); } }));
        headerRow.appendChild(el("button", { class: "icon-btn", type: "button", "aria-label": "Naar beneden", text: "↓", disabled: exIdx === exercises.length - 1, onClick: () => { [exercises[exIdx + 1], exercises[exIdx]] = [exercises[exIdx], exercises[exIdx + 1]]; renderExercises(); renderClassificationPreview(); } }));
        headerRow.appendChild(el("button", { class: "icon-btn", type: "button", "aria-label": "Oefening verwijderen", text: "✕", onClick: () => { exercises.splice(exIdx, 1); renderExercises(); renderClassificationPreview(); } }));
      }
      card.appendChild(headerRow);

      ex.sets.forEach((set, setIdx) => {
        const row = el("div", { class: "row", style: "margin-top:8px;" }, [el("span", { class: "meta", text: `Set ${setIdx + 1}` })]);
        if (!isCore) {
          const weightInput = el("input", { type: "text", inputmode: "decimal", placeholder: "kg", style: "width:80px;", disabled: locked });
          weightInput.value = set.weight ?? "";
          weightInput.addEventListener("input", () => {
            set.weight = parseWeightInput(weightInput.value);
            renderClassificationPreview();
          });
          row.appendChild(weightInput);
        }
        const repsInput = el("input", { type: "text", inputmode: "numeric", placeholder: "reps", style: "width:70px;", disabled: locked });
        repsInput.value = set.reps ?? "";
        repsInput.addEventListener("input", () => {
          set.reps = repsInput.value === "" ? null : Number(repsInput.value);
        });
        row.appendChild(repsInput);
        if (!locked) row.appendChild(el("button", { class: "icon-btn", type: "button", "aria-label": "Set verwijderen", text: "✕", onClick: () => { ex.sets.splice(setIdx, 1); renderExercises(); renderClassificationPreview(); } }));
        card.appendChild(row);
      });

      if (!locked) {
        card.appendChild(el("button", { class: "btn ghost small", type: "button", text: "+ Set", style: "margin-top:8px;", onClick: () => { ex.sets.push({ weight: isCore ? null : 0, reps: 0 }); renderExercises(); renderClassificationPreview(); } }));
      }
      exercisesContainer.appendChild(card);
    });
  }
  renderExercises();
  renderClassificationPreview();

  if (!locked) {
    const addExerciseSelect = el("select", {});
    addExerciseSelect.appendChild(el("option", { value: "", text: "Kies een oefening..." }));
    for (const group of exerciseGroups) {
      const optgroup = el("optgroup", { label: group.muscleGroup });
      for (const ex of group.exercises) {
        optgroup.appendChild(el("option", { value: ex.id, text: ex.name }));
      }
      addExerciseSelect.appendChild(optgroup);
    }
    container.appendChild(el("label", { text: "Oefening toevoegen" }));
    container.appendChild(addExerciseSelect);
    container.appendChild(
      el("button", {
        class: "btn ghost",
        type: "button",
        text: "Toevoegen",
        style: "margin-top:8px;",
        onClick: () => {
          if (!addExerciseSelect.value) return;
          const info = exerciseById.get(addExerciseSelect.value);
          exercises.push({ exerciseId: addExerciseSelect.value, sets: [{ weight: isCoreGroup(info.muscleGroup) ? null : 0, reps: 0 }] });
          addExerciseSelect.value = "";
          renderExercises();
          renderClassificationPreview();
        },
      })
    );

    container.appendChild(errorEl);
    container.appendChild(
      el("button", {
        class: "btn primary",
        type: "button",
        text: "Opslaan",
        style: "margin-top:18px;",
        onClick: async () => {
          const name = nameInput.value.trim();
          if (!name) {
            errorEl.textContent = "Geef de workout een naam.";
            return;
          }
          for (const ex of exercises) {
            const info = exerciseById.get(ex.exerciseId);
            for (const set of ex.sets) {
              if (!isValidSet(set, info ? info.muscleGroup : null)) {
                errorEl.textContent = `Ongeldige set bij ${info ? info.name : "oefening"}.`;
                return;
              }
            }
          }
          errorEl.textContent = "";
          const orderedExercises = exercises.map((ex, idx) => ({ exerciseId: ex.exerciseId, order: idx, sets: ex.sets.map((s) => ({ ...s })) }));
          await savePlannedWorkout(db, { ...plannedWorkout, name, exercises: orderedExercises, updatedAt: nowTimestamp() });
          showToast("Opgeslagen");
          navigate(backTo.replace("#", ""));
        },
      })
    );
  }
  container.appendChild(classificationContainer);

  // --- kopiëren naar... (6.13) ---
  container.appendChild(el("h2", { class: "section", text: "Kopiëren" }));
  const allCycles = (await listCycles(db)).filter((c) => c.status !== CYCLE_STATUS.ARCHIVED);
  const destSelect = el("select", {});
  destSelect.appendChild(el("option", { value: "week", text: "Naar een andere week in deze cyclus" }));
  destSelect.appendChild(el("option", { value: "cycle", text: "Naar een andere cyclus" }));
  destSelect.appendChild(el("option", { value: "library", text: "Naar de workoutbibliotheek (nieuw template)" }));
  const weekSelect = el("select", {});
  const cycleSelect = el("select", {});
  for (const c of allCycles) cycleSelect.appendChild(el("option", { value: c.id, text: c.name }));

  function refreshWeekOptions(targetCycle) {
    weekSelect.innerHTML = "";
    for (let i = 0; i < targetCycle.weeksPerCycle; i += 1) weekSelect.appendChild(el("option", { value: String(i), text: `Week ${i + 1}` }));
  }
  if (cycle) refreshWeekOptions(cycle);
  cycleSelect.addEventListener("change", () => {
    const target = allCycles.find((c) => c.id === cycleSelect.value);
    if (target) refreshWeekOptions(target);
  });

  const destWrap = el("div", { style: "margin-top:8px; display:flex; gap:8px; flex-wrap:wrap; align-items:center;" }, [destSelect, weekSelect]);
  container.appendChild(destWrap);
  destSelect.addEventListener("change", () => {
    destWrap.innerHTML = "";
    destWrap.appendChild(destSelect);
    if (destSelect.value === "week") destWrap.appendChild(weekSelect);
    if (destSelect.value === "cycle") {
      destWrap.appendChild(cycleSelect);
      destWrap.appendChild(weekSelect);
    }
  });

  container.appendChild(
    el("button", {
      class: "btn ghost",
      type: "button",
      text: "Kopiëren",
      style: "margin-top:8px;",
      onClick: async () => {
        const now = nowTimestamp();
        const copiedExercises = exercisesFromPlannedWorkout({ exercises: exercises.map((ex, idx) => ({ exerciseId: ex.exerciseId, order: idx, sets: ex.sets })) });
        if (destSelect.value === "library") {
          await saveTemplate(db, { id: generateId(), name: nameInput.value.trim() || plannedWorkout.name, exercises: copiedExercises, createdAt: now, updatedAt: now });
          showToast("Opgeslagen als nieuw template");
          return;
        }
        const targetCycleId = destSelect.value === "cycle" ? cycleSelect.value : plannedWorkout.cycleId;
        const targetWeekIndex = Number(weekSelect.value || 0);
        const inWeek = (await listPlannedWorkoutsForCycle(db, targetCycleId)).filter((w) => w.weekIndex === targetWeekIndex);
        const position = inWeek.length ? Math.max(...inWeek.map((w) => w.position)) + 1 : 0;
        await savePlannedWorkout(db, {
          id: generateId(), cycleId: targetCycleId, weekIndex: targetWeekIndex, position,
          name: nameInput.value.trim() || plannedWorkout.name, exercises: copiedExercises, createdAt: now, updatedAt: now,
        });
        showToast("Gekopieerd");
      },
    })
  );
}
