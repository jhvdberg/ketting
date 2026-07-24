/** Habits-hoofdscherm (briefing 18): vandaag + overzicht van alle habits. */
import { el, clearNode } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { todayISO, nowTimestamp } from "../../../core/dateUtils.js";
import { loadHabitsWithData, setEntryDone } from "../storage.js";
import { isScheduled, isDone, scheduleForDate, scheduleLabel, computeStreaks } from "../model.js";
import { showToast } from "../../../core/ui/toast.js";
import { screenHeader } from "./_shared.js";

export default async function renderHabitsHome(container) {
  const db = getDb();
  const today = todayISO();

  async function refresh() {
    clearNode(container);
    container.appendChild(
      screenHeader({
        title: "Habits",
        backTo: "#/",
        action: el("a", { class: "icon-btn", href: "#/habits/list", "aria-label": "Beheer habits", text: "⚙" }),
      })
    );

    const habitsWithData = await loadHabitsWithData(db);
    const active = habitsWithData.filter(({ habit }) => habit.active);

    if (active.length === 0) {
      container.appendChild(
        el("div", { class: "empty-state" }, [
          el("p", { text: "Nog geen habits." }),
          el("a", { class: "btn primary", href: "#/habits/new", text: "Eerste habit toevoegen" }),
        ])
      );
      return;
    }

    container.appendChild(el("h2", { class: "section", text: "Vandaag" }));
    const scheduledToday = active.filter(({ schedules }) => isScheduled(schedules, today));
    if (scheduledToday.length === 0) {
      container.appendChild(el("p", { class: "empty-state", text: "Geen habits gepland vandaag." }));
    }
    for (const { habit, schedules, entries } of scheduledToday) {
      const done = isDone(entries, today);
      const schedule = scheduleForDate(schedules, today);
      container.appendChild(
        el("div", { class: "card" + (done ? " done" : "") }, [
          el("div", { class: "row" }, [
            el("div", { class: "info" }, [
              el("div", { class: "name", text: habit.name }),
              el("div", { class: "meta", text: schedule ? scheduleLabel(schedule.days) : "" }),
            ]),
            el("button", {
              class: "check" + (done ? " on" : ""),
              type: "button",
              "aria-label": `${habit.name} ${done ? "gedaan" : "afvinken"}`,
              text: "✓",
              onClick: async () => {
                await setEntryDone(db, habit.id, today, !done, nowTimestamp());
                showToast(!done ? "Afgevinkt" : "Uitgevinkt");
                refresh();
              },
            }),
          ]),
        ])
      );
    }

    container.appendChild(el("h2", { class: "section", text: "Alle habits" }));
    for (const { habit, schedules, entries } of active) {
      const schedule = scheduleForDate(schedules, today);
      const { current } = computeStreaks(schedules, entries, today);
      container.appendChild(
        el("a", { class: "card tappable", href: `#/habits/${habit.id}` }, [
          el("div", { class: "row" }, [
            el("div", { class: "info" }, [
              el("div", { class: "name", text: habit.name }),
              el("div", { class: "meta", text: schedule ? scheduleLabel(schedule.days) : "geen schema" }),
            ]),
            el("span", { class: "status-pill" + (current > 0 ? " good" : ""), text: current > 0 ? `${current} op rij` : "geen streak" }),
          ]),
        ])
      );
    }

    container.appendChild(
      el("div", { class: "btn-row" }, [
        el("a", { class: "btn ghost", href: "#/habits/day", text: "Dagscherm" }),
        el("a", { class: "btn primary", href: "#/habits/new", text: "+ Habit" }),
      ])
    );
  }

  await refresh();
}
