/** Dagscherm (briefing 8.3, 18): afvinken en retroactief corrigeren. */
import { el, clearNode } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { navigate } from "../../../core/router.js";
import { todayISO, addDays, isValidISODate, parseISODate, nowTimestamp } from "../../../core/dateUtils.js";
import { loadHabitsWithData, setEntryDone } from "../storage.js";
import { isScheduled, isDone, scheduleForDate, scheduleLabel } from "../model.js";
import { showToast } from "../../../core/ui/toast.js";
import { screenHeader, WEEKDAY_LONG, MONTHS_LONG } from "./_shared.js";

function formatDateLong(iso) {
  const d = parseISODate(iso);
  return `${WEEKDAY_LONG[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

export default async function renderDayScreen(container, params) {
  const db = getDb();
  const today = todayISO();
  const date = params.date && isValidISODate(params.date) ? params.date : today;

  async function refresh() {
    clearNode(container);
    container.appendChild(screenHeader({ title: date === today ? "Vandaag" : "Dagoverzicht", backTo: "#/habits" }));

    container.appendChild(
      el("div", { class: "row", style: "justify-content:space-between; margin-bottom:14px;" }, [
        el("button", { class: "icon-btn", type: "button", "aria-label": "Vorige dag", text: "‹", onClick: () => navigate(`/habits/day/${addDays(date, -1)}`) }),
        el("div", { class: "subtitle", text: formatDateLong(date) }),
        el("button", { class: "icon-btn", type: "button", "aria-label": "Volgende dag", text: "›", disabled: date >= today, onClick: () => navigate(`/habits/day/${addDays(date, 1)}`) }),
      ])
    );

    const habitsWithData = await loadHabitsWithData(db);
    const scheduled = habitsWithData.filter(({ habit, schedules }) => habit.active && isScheduled(schedules, date));

    if (scheduled.length === 0) {
      container.appendChild(el("p", { class: "empty-state", text: "Geen habits gepland op deze dag." }));
      return;
    }

    for (const { habit, schedules, entries } of scheduled) {
      const done = isDone(entries, date);
      const schedule = scheduleForDate(schedules, date);
      const card = el("div", { class: "card" + (done ? " done" : "") }, [
        el("div", { class: "row" }, [
          el("div", { class: "info" }, [
            el("div", { class: "name", text: habit.name }),
            el("div", { class: "meta", text: schedule ? scheduleLabel(schedule.days) : "" }),
          ]),
          el("button", {
            class: "check" + (done ? " on" : ""),
            type: "button",
            "aria-label": `${habit.name} ${done ? "gedaan" : "afvinken"}`,
            disabled: date > today,
            text: "✓",
            onClick: async () => {
              await setEntryDone(db, habit.id, date, !done, nowTimestamp());
              showToast(!done ? "Afgevinkt" : "Uitgevinkt");
              refresh();
            },
          }),
        ]),
      ]);
      container.appendChild(card);
    }
  }

  await refresh();
}
