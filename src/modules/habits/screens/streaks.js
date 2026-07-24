/** Streakoverzicht (briefing 8.5, 18). */
import { el } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { todayISO, addDays, parseISODate } from "../../../core/dateUtils.js";
import { loadHabitData } from "../storage.js";
import { computeStreaks, calendarDayStatus } from "../model.js";
import { screenHeader } from "./shared.js";

export default async function renderHabitStreaks(container, params) {
  const db = getDb();
  const { habit, schedules, entries } = await loadHabitData(db, params.id);
  if (!habit) {
    container.appendChild(el("div", { class: "empty-state", text: "Deze habit bestaat niet (meer)." }));
    return;
  }

  const today = todayISO();
  const { current, longest } = computeStreaks(schedules, entries, today);

  container.appendChild(screenHeader({ title: `${habit.name} · streaks`, backTo: `#/habits/${habit.id}` }));

  container.appendChild(
    el("div", { class: "stat-row" }, [
      el("div", { class: "stat" }, [el("div", { class: "value", text: String(current) }), el("div", { class: "label", text: "Huidige streak" })]),
      el("div", { class: "stat" }, [el("div", { class: "value", text: String(longest) }), el("div", { class: "label", text: "Langste streak" })]),
    ])
  );

  container.appendChild(el("h2", { class: "section", text: "Laatste 14 dagen" }));
  const grid = el("div", { class: "calendar-grid" });
  for (let i = 13; i >= 0; i -= 1) {
    const iso = addDays(today, -i);
    const status = calendarDayStatus(schedules, entries, iso, today);
    grid.appendChild(el("div", { class: `calendar-cell ${status}${iso === today ? " today" : ""}`, text: String(parseISODate(iso).getDate()) }));
  }
  container.appendChild(grid);
}
