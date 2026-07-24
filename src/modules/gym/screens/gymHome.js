/** Gym-hoofdscherm (briefing 14.1, 18). */
import { el, clearNode } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { todayISO } from "../../../core/dateUtils.js";
import { listCycles, listAllPlannedWorkouts, listAllCompletedWorkouts, getActiveSession } from "../storage.js";
import { findActiveCycle, getActiveCycleWeekSummary } from "../cycleModel.js";
import { WEIGHTED_MUSCLE_GROUPS } from "../model.js";
import { screenHeader } from "./shared.js";

export default async function renderGymHome(container) {
  const db = getDb();
  const today = todayISO();
  clearNode(container);
  container.appendChild(screenHeader({ title: "Gym", backTo: "#/" }));

  const [cycles, plannedWorkouts, completedWorkouts, activeSession] = await Promise.all([
    listCycles(db),
    listAllPlannedWorkouts(db),
    listAllCompletedWorkouts(db),
    getActiveSession(db),
  ]);
  const activeCycle = findActiveCycle(cycles, today);

  if (activeSession) {
    const plannedWorkout = plannedWorkouts.find((w) => w.id === activeSession.plannedWorkoutId);
    const totalSets = plannedWorkout ? plannedWorkout.exercises.reduce((s, ex) => s + ex.sets.length, 0) : 0;
    const checked = Object.keys(activeSession.checkedSets || {}).length;
    container.appendChild(
      el("a", { class: "card tappable done", href: "#/gym/workout/active" }, [
        el("div", { class: "row" }, [
          el("div", { class: "info" }, [
            el("div", { class: "name", text: plannedWorkout ? plannedWorkout.name : "Actieve workout" }),
            el("div", { class: "meta", text: `${checked} van ${totalSets} sets afgevinkt · tik om te hervatten` }),
          ]),
        ]),
      ])
    );
  }

  if (activeCycle) {
    const plannedForCycle = plannedWorkouts.filter((w) => w.cycleId === activeCycle.id);
    const completedForCycle = completedWorkouts.filter((w) => w.cycleId === activeCycle.id);
    const week = getActiveCycleWeekSummary(activeCycle, plannedForCycle, completedForCycle, today);
    container.appendChild(
      el("a", { class: "card tappable", href: "#/gym/cycles/active" }, [
        el("div", { class: "row" }, [
          el("div", { class: "info" }, [
            el("div", { class: "name", text: activeCycle.name }),
            el("div", { class: "meta", text: `Week ${week.weekNumberDisplay} van ${week.totalWeeks} · ${week.completed} van ${week.planned} voltooid` }),
          ]),
        ]),
      ])
    );
  } else {
    container.appendChild(
      el("div", { class: "empty-state" }, [
        el("p", { text: "Nog geen actieve cyclus." }),
        el("a", { class: "btn primary", href: "#/gym/cycles/new", text: "Cyclus aanmaken" }),
      ])
    );
  }

  container.appendChild(el("h2", { class: "section", text: "Beheer" }));
  const list = el("div", { class: "card" });
  const links = [
    ["Oefeningen", "#/gym/exercises"],
    ["Workoutbibliotheek", "#/gym/templates"],
    ["Cycli", "#/gym/cycles"],
    ["Gymkalender", "#/gym/calendar"],
    ["Gearchiveerde cycli", "#/gym/cycles/archived"],
  ];
  for (const [label, href] of links) {
    list.appendChild(el("a", { class: "list-row", href, text: label }));
  }
  container.appendChild(list);

  container.appendChild(el("h2", { class: "section", text: "Spiergroepgrafieken" }));
  const chartList = el("div", { class: "card" });
  for (const group of WEIGHTED_MUSCLE_GROUPS) {
    chartList.appendChild(el("a", { class: "list-row", href: `#/gym/muscle-groups/${encodeURIComponent(group)}/chart`, text: group }));
  }
  container.appendChild(chartList);
}
