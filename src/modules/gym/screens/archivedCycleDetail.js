/** Gearchiveerde cyclusdetails: alleen-lezen, kan als basis gekopieerd worden (briefing 6.12). */
import { el, clearNode } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { navigate } from "../../../core/router.js";
import { nowTimestamp } from "../../../core/dateUtils.js";
import { generateId } from "../../../core/id.js";
import { getCycle, listPlannedWorkoutsForCycle, saveCycle, savePlannedWorkout } from "../storage.js";
import { exercisesFromPlannedWorkout } from "../model.js";
import { CYCLE_STATUS } from "../cycleModel.js";
import { showToast } from "../../../core/ui/toast.js";
import { screenHeader } from "./shared.js";

export default async function renderArchivedCycleDetail(container, params) {
  const db = getDb();
  clearNode(container);
  const cycle = await getCycle(db, params.id);
  if (!cycle) {
    container.appendChild(el("div", { class: "empty-state", text: "Deze cyclus bestaat niet (meer)." }));
    return;
  }
  container.appendChild(screenHeader({ title: cycle.name, subtitle: `${cycle.startDate || "?"} t/m ${cycle.endDate || "?"}`, backTo: "#/gym/cycles/archived" }));

  const plannedWorkouts = await listPlannedWorkoutsForCycle(db, cycle.id);
  for (let weekIndex = 0; weekIndex < cycle.weeksPerCycle; weekIndex += 1) {
    const weekCard = el("div", { class: "card" }, [el("div", { class: "name", text: `Week ${weekIndex + 1}` })]);
    const slots = plannedWorkouts.filter((w) => w.weekIndex === weekIndex).sort((a, b) => a.position - b.position);
    if (slots.length === 0) weekCard.appendChild(el("p", { class: "hint", text: "Geen workouts." }));
    for (const slot of slots) {
      weekCard.appendChild(el("div", { class: "meta", text: `${slot.name} (${slot.exercises.length} oefeningen)` }));
    }
    container.appendChild(weekCard);
  }

  container.appendChild(
    el("button", {
      class: "btn primary",
      type: "button",
      text: "Kopiëren als basis voor nieuwe cyclus",
      style: "margin-top:14px;",
      onClick: async () => {
        const now = nowTimestamp();
        const newId = generateId();
        await saveCycle(db, {
          id: newId, name: `${cycle.name} (kopie)`, createdAt: now, startDate: null,
          weeksPerCycle: cycle.weeksPerCycle, workoutsPerWeek: cycle.workoutsPerWeek,
          status: CYCLE_STATUS.CONCEPT, endDate: null, replacesCycleId: null, replacedByCycleId: null,
        });
        for (const slot of plannedWorkouts) {
          await savePlannedWorkout(db, {
            id: generateId(), cycleId: newId, weekIndex: slot.weekIndex, position: slot.position,
            name: slot.name, exercises: exercisesFromPlannedWorkout(slot), createdAt: now, updatedAt: now,
          });
        }
        showToast("Nieuwe conceptcyclus aangemaakt");
        navigate(`/gym/cycles/${newId}/edit`);
      },
    })
  );
}
