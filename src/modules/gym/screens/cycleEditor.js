/** Cyclus aanmaken en bewerken, incl. weekbeheer (briefing 6.6-6.13). */
import { el, clearNode } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { navigate } from "../../../core/router.js";
import { todayISO, nowTimestamp } from "../../../core/dateUtils.js";
import { generateId } from "../../../core/id.js";
import {
  getCycle,
  saveCycle,
  deleteCycle,
  listPlannedWorkoutsForCycle,
  savePlannedWorkout,
  deletePlannedWorkout,
  listTemplates,
  listAllCompletedWorkouts,
  getActiveSession,
} from "../storage.js";
import { exercisesFromTemplate, exercisesFromPlannedWorkout } from "../model.js";
import {
  CYCLE_STATUS,
  nextMonday,
  getEffectiveCycleStatus,
  getCurrentCycleWeekIndex,
  getElapsedWeeks,
  isSlotCompletedThisIteration,
} from "../cycleModel.js";
import { confirmDialog } from "../../../core/ui/confirm.js";
import { showToast } from "../../../core/ui/toast.js";
import { screenHeader } from "./shared.js";

export default async function renderCycleEditor(container, params) {
  const db = getDb();
  const isEdit = !!params.id;
  const today = todayISO();
  let showReplaceForm = false;

  let cycle = null;
  if (isEdit) {
    cycle = await getCycle(db, params.id);
    if (!cycle) {
      container.appendChild(el("div", { class: "empty-state", text: "Deze cyclus bestaat niet (meer)." }));
      return;
    }
  }

  async function refresh() {
    clearNode(container);
    container.appendChild(screenHeader({ title: isEdit ? "Cyclus bewerken" : "Nieuwe cyclus", backTo: "#/gym/cycles" }));

    const effectiveStatus = cycle ? getEffectiveCycleStatus(cycle, today, null) : null;
    const locked = !!cycle && cycle.status !== CYCLE_STATUS.CONCEPT;

    const nameInput = el("input", { type: "text", placeholder: "Bijv. Push/Pull/Legs" });
    nameInput.value = cycle ? cycle.name : "";
    const weeksInput = el("input", { type: "text", inputmode: "numeric", placeholder: "Bijv. 4" });
    weeksInput.value = cycle ? String(cycle.weeksPerCycle) : "";
    weeksInput.disabled = locked;
    const perWeekInput = el("input", { type: "text", inputmode: "numeric", placeholder: "Bijv. 3" });
    perWeekInput.value = cycle ? String(cycle.workoutsPerWeek) : "";
    perWeekInput.disabled = locked;
    const errorEl = el("p", { class: "field-error" });

    container.appendChild(el("label", { text: "Naam" }));
    container.appendChild(nameInput);
    container.appendChild(el("label", { text: "Aantal weken per cyclus" }));
    container.appendChild(weeksInput);
    container.appendChild(el("label", { text: "Workouts per week (indicatief)" }));
    container.appendChild(perWeekInput);
    if (locked) container.appendChild(el("p", { class: "hint", text: "Aantal weken en workouts per week zijn vergrendeld zodra de cyclus is ingepland of actief is." }));
    container.appendChild(errorEl);

    container.appendChild(
      el("button", {
        class: "btn primary",
        type: "button",
        text: isEdit ? "Opslaan" : "Cyclus aanmaken",
        style: "margin-top:14px;",
        onClick: async () => {
          const name = nameInput.value.trim();
          const weeksPerCycle = Number(weeksInput.value);
          const workoutsPerWeek = Number(perWeekInput.value);
          if (!name) {
            errorEl.textContent = "Geef de cyclus een naam.";
            return;
          }
          if (!Number.isInteger(weeksPerCycle) || weeksPerCycle < 1) {
            errorEl.textContent = "Aantal weken per cyclus moet een geheel getal van minimaal 1 zijn.";
            return;
          }
          if (!Number.isInteger(workoutsPerWeek) || workoutsPerWeek < 0) {
            errorEl.textContent = "Workouts per week moet een geheel getal van minimaal 0 zijn.";
            return;
          }
          errorEl.textContent = "";
          if (isEdit) {
            await saveCycle(db, {
              ...cycle,
              name,
              weeksPerCycle: locked ? cycle.weeksPerCycle : weeksPerCycle,
              workoutsPerWeek: locked ? cycle.workoutsPerWeek : workoutsPerWeek,
            });
            showToast("Opgeslagen");
            cycle = await getCycle(db, cycle.id);
            refresh();
          } else {
            const id = generateId();
            const now = nowTimestamp();
            await saveCycle(db, {
              id,
              name,
              createdAt: now,
              startDate: null,
              weeksPerCycle,
              workoutsPerWeek,
              status: CYCLE_STATUS.CONCEPT,
              endDate: null,
              replacesCycleId: null,
              replacedByCycleId: null,
            });
            navigate(`/gym/cycles/${id}/edit`);
          }
        },
      })
    );

    if (!cycle) return;

    // --- status-acties ---
    if (cycle.status === CYCLE_STATUS.CONCEPT) {
      container.appendChild(
        el("button", {
          class: "btn ghost",
          type: "button",
          text: "Cyclus inplannen (start eerstvolgende maandag)",
          style: "margin-top:12px;",
          onClick: async () => {
            const startDate = nextMonday(today);
            await saveCycle(db, { ...cycle, status: CYCLE_STATUS.PLANNED, startDate });
            showToast(`Ingepland vanaf ${startDate}`);
            cycle = await getCycle(db, cycle.id);
            refresh();
          },
        })
      );
    } else if (cycle.status === CYCLE_STATUS.PLANNED && cycle.replacesCycleId) {
      container.appendChild(
        el("button", {
          class: "btn danger",
          type: "button",
          text: "Vervanging annuleren",
          style: "margin-top:12px;",
          onClick: async () => {
            const ok = await confirmDialog({
              title: "Vervanging annuleren",
              body: "Deze nog niet gestarte vervangcyclus wordt verwijderd. De oorspronkelijke cyclus loopt gewoon door.",
              confirmLabel: "Ja, annuleren",
              cancelLabel: "Terug",
              danger: true,
            });
            if (!ok) return;
            const original = await getCycle(db, cycle.replacesCycleId);
            if (original) await saveCycle(db, { ...original, status: CYCLE_STATUS.ACTIVE, replacedByCycleId: null });
            await deleteCycle(db, cycle.id);
            showToast("Vervanging geannuleerd");
            navigate("/gym/cycles");
          },
        })
      );
    } else if (effectiveStatus === CYCLE_STATUS.ACTIVE) {
      container.appendChild(el("h2", { class: "section", text: "Cyclus beheren" }));
      if (showReplaceForm) {
        const rName = el("input", { type: "text", placeholder: "Naam vervangcyclus" });
        const rWeeks = el("input", { type: "text", inputmode: "numeric", placeholder: "Weken" });
        const rPerWeek = el("input", { type: "text", inputmode: "numeric", placeholder: "Workouts per week" });
        const rError = el("p", { class: "field-error" });
        container.appendChild(el("div", { class: "card" }, [
          el("label", { text: "Naam vervangcyclus" }),
          rName,
          el("label", { text: "Aantal weken" }),
          rWeeks,
          el("label", { text: "Workouts per week" }),
          rPerWeek,
          rError,
          el("div", { class: "btn-row" }, [
            el("button", { class: "btn ghost", type: "button", text: "Annuleren", onClick: () => { showReplaceForm = false; refresh(); } }),
            el("button", {
              class: "btn primary",
              type: "button",
              text: "Inplannen",
              onClick: async () => {
                const name = rName.value.trim();
                const weeksPerCycle = Number(rWeeks.value);
                const workoutsPerWeek = Number(rPerWeek.value);
                if (!name || !Number.isInteger(weeksPerCycle) || weeksPerCycle < 1 || !Number.isInteger(workoutsPerWeek) || workoutsPerWeek < 0) {
                  rError.textContent = "Vul een geldige naam, weken en workouts per week in.";
                  return;
                }
                const now = nowTimestamp();
                const startDate = nextMonday(today);
                const newId = generateId();
                await saveCycle(db, {
                  id: newId, name, createdAt: now, startDate, weeksPerCycle, workoutsPerWeek,
                  status: CYCLE_STATUS.PLANNED, endDate: null, replacesCycleId: cycle.id, replacedByCycleId: null,
                });
                await saveCycle(db, { ...cycle, status: CYCLE_STATUS.REPLACEMENT_PLANNED, replacedByCycleId: newId });
                showToast(`Vervangcyclus ingepland vanaf ${startDate}`);
                navigate(`/gym/cycles/${newId}/edit`);
              },
            }),
          ]),
        ]));
      } else {
        container.appendChild(
          el("div", { class: "btn-row" }, [
            el("button", { class: "btn ghost", type: "button", text: "Vervangcyclus inplannen", onClick: () => { showReplaceForm = true; refresh(); } }),
            el("button", {
              class: "btn danger",
              type: "button",
              text: "Cyclus stoppen",
              onClick: async () => {
                const ok = await confirmDialog({
                  title: "Cyclus stoppen",
                  body: `"${cycle.name}" wordt gestopt en gearchiveerd. Voltooide workouts en historie blijven bewaard.`,
                  confirmLabel: "Stoppen",
                  danger: true,
                });
                if (!ok) return;
                await saveCycle(db, { ...cycle, status: CYCLE_STATUS.STOPPED, endDate: today });
                showToast("Cyclus gestopt");
                navigate("/gym/cycles");
              },
            }),
          ])
        );
      }
    } else if (effectiveStatus === CYCLE_STATUS.REPLACEMENT_PLANNED) {
      container.appendChild(el("p", { class: "hint", style: "margin-top:12px;", text: "Er staat al een vervangcyclus ingepland. De huidige week verandert daardoor niet." }));
    }

    // --- weekbeheer ---
    container.appendChild(el("h2", { class: "section", text: "Weken" }));
    const [plannedWorkouts, templates, completedWorkouts, activeSession] = await Promise.all([
      listPlannedWorkoutsForCycle(db, cycle.id),
      listTemplates(db),
      listAllCompletedWorkouts(db),
      getActiveSession(db),
    ]);
    const completedForCycle = completedWorkouts.filter((w) => w.cycleId === cycle.id);
    const isRunning = effectiveStatus === CYCLE_STATUS.ACTIVE || effectiveStatus === CYCLE_STATUS.REPLACEMENT_PLANNED;
    const currentWeekIndex = isRunning ? getCurrentCycleWeekIndex(cycle, today) : null;
    const currentAbsoluteWeek = isRunning ? getElapsedWeeks(cycle, today) : null;

    async function nextPosition(weekIndex) {
      const fresh = await listPlannedWorkoutsForCycle(db, cycle.id);
      const inWeek = fresh.filter((w) => w.weekIndex === weekIndex);
      return inWeek.length ? Math.max(...inWeek.map((w) => w.position)) + 1 : 0;
    }
    async function addSlot(weekIndex, name, exercisesCopy) {
      const now = nowTimestamp();
      await savePlannedWorkout(db, {
        id: generateId(), cycleId: cycle.id, weekIndex, position: await nextPosition(weekIndex),
        name, exercises: exercisesCopy, createdAt: now, updatedAt: now,
      });
      showToast("Workout toegevoegd");
      refresh();
    }
    async function removeSlot(slot) {
      const ok = await confirmDialog({
        title: "Geplande workout verwijderen",
        body: `"${slot.name}" wordt uit deze cyclusweek verwijderd. Voltooide workouts die hiervan zijn afgeleid, blijven bewaard.`,
        confirmLabel: "Verwijderen",
        danger: true,
      });
      if (!ok) return;
      await deletePlannedWorkout(db, slot.id);
      showToast("Verwijderd");
      refresh();
    }
    async function duplicateInWeek(slot) {
      const now = nowTimestamp();
      await savePlannedWorkout(db, {
        id: generateId(), cycleId: cycle.id, weekIndex: slot.weekIndex, position: await nextPosition(slot.weekIndex),
        name: `${slot.name} (kopie)`, exercises: exercisesFromPlannedWorkout(slot), createdAt: now, updatedAt: now,
      });
      showToast("Gekopieerd");
      refresh();
    }
    async function reorder(slot, delta, slotsInWeek) {
      const idx = slotsInWeek.findIndex((s) => s.id === slot.id);
      const swapWith = slotsInWeek[idx + delta];
      if (!swapWith) return;
      await savePlannedWorkout(db, { ...slot, position: swapWith.position });
      await savePlannedWorkout(db, { ...swapWith, position: slot.position });
      refresh();
    }

    for (let weekIndex = 0; weekIndex < cycle.weeksPerCycle; weekIndex += 1) {
      const weekCard = el("div", { class: "card" });
      weekCard.appendChild(
        el("div", { class: "row" }, [
          el("div", { class: "info" }, [el("div", { class: "name", text: `Week ${weekIndex + 1}` })]),
          weekIndex === currentWeekIndex ? el("span", { class: "status-pill neutral", text: "huidige week" }) : null,
        ])
      );
      const slots = plannedWorkouts.filter((w) => w.weekIndex === weekIndex).sort((a, b) => a.position - b.position);
      for (const slot of slots) {
        const isCurrentWeek = weekIndex === currentWeekIndex;
        const doneNow = isCurrentWeek && isSlotCompletedThisIteration(slot.id, currentAbsoluteWeek, completedForCycle);
        const isActiveSlot = !!activeSession && activeSession.plannedWorkoutId === slot.id;
        const locked = doneNow || isActiveSlot;
        const suffix = doneNow ? " ✓" : isActiveSlot ? " (actief)" : "";
        const row = el("div", { class: "list-row" });
        row.appendChild(el("a", { href: locked ? "#" : `#/gym/workouts/${slot.id}/edit`, text: `${slot.name} (${slot.exercises.length} oef.)${suffix}` }));
        if (!locked) {
          const actions = el("div", { style: "display:flex; gap:6px;" });
          actions.appendChild(el("button", { class: "icon-btn", type: "button", "aria-label": "Naar boven", text: "↑", onClick: () => reorder(slot, -1, slots) }));
          actions.appendChild(el("button", { class: "icon-btn", type: "button", "aria-label": "Naar beneden", text: "↓", onClick: () => reorder(slot, 1, slots) }));
          actions.appendChild(el("button", { class: "icon-btn", type: "button", "aria-label": "Kopieer binnen week", text: "⧉", onClick: () => duplicateInWeek(slot) }));
          actions.appendChild(el("button", { class: "del", type: "button", text: "verwijder", onClick: () => removeSlot(slot) }));
          row.appendChild(actions);
        }
        weekCard.appendChild(row);
      }

      const addRow = el("div", { style: "margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;" });
      const templateSelect = el("select", {});
      templateSelect.appendChild(el("option", { value: "", text: "Van template..." }));
      for (const t of templates) templateSelect.appendChild(el("option", { value: t.id, text: t.name }));
      addRow.appendChild(templateSelect);
      addRow.appendChild(
        el("button", {
          class: "btn ghost small",
          type: "button",
          text: "Toevoegen",
          onClick: () => {
            if (!templateSelect.value) return;
            const template = templates.find((t) => t.id === templateSelect.value);
            addSlot(weekIndex, template.name, exercisesFromTemplate(template));
          },
        })
      );
      addRow.appendChild(el("button", { class: "btn ghost small", type: "button", text: "+ Lege workout", onClick: () => addSlot(weekIndex, "Nieuwe workout", []) }));
      weekCard.appendChild(addRow);
      container.appendChild(weekCard);
    }
  }

  await refresh();
}
