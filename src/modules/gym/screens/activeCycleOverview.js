/** Actieve-cyclusoverzicht (briefing 5.3, 6.17, 18). */
import { el, clearNode } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { navigate } from "../../../core/router.js";
import { todayISO, nowTimestamp } from "../../../core/dateUtils.js";
import { listCycles, listPlannedWorkoutsForCycle, listAllCompletedWorkouts, listClosedWeeksForCycle, getActiveSession, saveActiveSession } from "../storage.js";
import { findActiveCycle, getActiveCycleWeekSummary, isSlotCompletedThisIteration, summarizeMissed } from "../cycleModel.js";
import { confirmDialog } from "../../../core/ui/confirm.js";
import { screenHeader } from "./shared.js";

export default async function renderActiveCycleOverview(container) {
  const db = getDb();
  const today = todayISO();
  clearNode(container);
  container.appendChild(screenHeader({ title: "Actieve cyclus", backTo: "#/gym" }));

  const cycles = await listCycles(db);
  const activeCycle = findActiveCycle(cycles, today);
  if (!activeCycle) {
    container.appendChild(
      el("div", { class: "empty-state" }, [
        el("p", { text: "Geen actieve cyclus." }),
        el("a", { class: "btn primary", href: "#/gym/cycles/new", text: "Cyclus aanmaken" }),
      ])
    );
    return;
  }

  const [plannedWorkouts, completedWorkouts, closedWeeks, activeSession] = await Promise.all([
    listPlannedWorkoutsForCycle(db, activeCycle.id),
    listAllCompletedWorkouts(db),
    listClosedWeeksForCycle(db, activeCycle.id),
    getActiveSession(db),
  ]);
  const completedForCycle = completedWorkouts.filter((w) => w.cycleId === activeCycle.id);
  const week = getActiveCycleWeekSummary(activeCycle, plannedWorkouts, completedForCycle, today);

  container.appendChild(el("h1", { text: activeCycle.name, style: "font-size:20px; margin-bottom:10px;" }));
  container.appendChild(
    el("div", { class: "stat-row" }, [
      el("div", { class: "stat" }, [el("div", { class: "value", text: `${week.weekNumberDisplay}/${week.totalWeeks}` }), el("div", { class: "label", text: "Cyclusweek" })]),
      el("div", { class: "stat" }, [el("div", { class: "value", text: String(week.completed) }), el("div", { class: "label", text: "Voltooid" })]),
      el("div", { class: "stat" }, [el("div", { class: "value", text: String(week.remaining) }), el("div", { class: "label", text: "Resterend" })]),
    ])
  );

  const totalMissed = closedWeeks.reduce((s, w) => s + w.missedCount, 0);
  const last4 = summarizeMissed(closedWeeks, 4);
  const last8 = summarizeMissed(closedWeeks, 8);
  const last12 = summarizeMissed(closedWeeks, 12);
  container.appendChild(
    el("p", {
      class: "hint",
      text: `Gemist sinds start: ${totalMissed} · laatste ${last4.weeksUsed} weken: ${last4.missed} · laatste ${last8.weeksUsed} weken: ${last8.missed} · laatste ${last12.weeksUsed} weken: ${last12.missed}`,
    })
  );

  container.appendChild(el("h2", { class: "section", text: `Week ${week.weekNumberDisplay}` }));
  const slots = plannedWorkouts.filter((w) => w.weekIndex === week.weekIndex).sort((a, b) => a.position - b.position);
  if (slots.length === 0) {
    container.appendChild(el("p", { class: "empty-state", text: "Geen workouts gepland deze week." }));
  }
  for (const slot of slots) {
    const done = isSlotCompletedThisIteration(slot.id, week.absoluteWeekNumber, completedForCycle);
    const card = el("div", { class: "card" + (done ? " done" : "") }, [
      el("div", { class: "row" }, [
        el("div", { class: "info" }, [el("div", { class: "name", text: slot.name }), el("div", { class: "meta", text: `${slot.exercises.length} oefeningen${done ? " · voltooid" : ""}` })]),
      ]),
    ]);
    if (!done) {
      const isThisActive = activeSession && activeSession.plannedWorkoutId === slot.id;
      card.appendChild(
        el("button", {
          class: "btn primary",
          type: "button",
          text: isThisActive ? "Hervat" : "Start workout",
          style: "margin-top:10px;",
          onClick: async () => {
            if (isThisActive) {
              navigate("/gym/workout/active");
              return;
            }
            if (activeSession) {
              const ok = await confirmDialog({
                title: "Er is al een actieve workout",
                body: "Er kan maar één workout tegelijk actief zijn. Ga naar de actieve workout om die te hervatten of eerst te annuleren.",
                confirmLabel: "Naar actieve workout",
              });
              if (ok) navigate("/gym/workout/active");
              return;
            }
            await saveActiveSession(db, { plannedWorkoutId: slot.id, startedAt: nowTimestamp(), lastChangedAt: nowTimestamp(), checkedSets: {}, confirmationShown: false });
            navigate("/gym/workout/active");
          },
        })
      );
    }
    container.appendChild(card);
  }

  container.appendChild(el("a", { class: "btn ghost", href: `#/gym/cycles/${activeCycle.id}/edit`, text: "Cyclus bewerken", style: "margin-top:14px; display:block;" }));
}
