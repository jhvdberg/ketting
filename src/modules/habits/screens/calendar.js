/** Habitkalender (briefing 8.6, 18): maandkalender over de volledige looptijd. */
import { el } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { navigate } from "../../../core/router.js";
import { todayISO, weekdayMon0 } from "../../../core/dateUtils.js";
import { loadHabitData } from "../storage.js";
import { calendarDayStatus } from "../model.js";
import { screenHeader, MONTHS_LONG } from "./_shared.js";

const WEEKDAY_SHORT = ["ma", "di", "wo", "do", "vr", "za", "zo"];

function monthKey(iso) {
  return iso.slice(0, 7);
}
function shiftMonth(monthKeyStr, delta) {
  const [y, m] = monthKeyStr.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function renderHabitCalendar(container, params) {
  const db = getDb();
  const { habit, schedules, entries } = await loadHabitData(db, params.id);
  if (!habit) {
    container.appendChild(el("div", { class: "empty-state", text: "Deze habit bestaat niet (meer)." }));
    return;
  }

  const today = todayISO();
  const currentMonth = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : monthKey(today);
  const earliestMonth = monthKey(habit.createdAt ? habit.createdAt.slice(0, 10) : today);

  container.appendChild(screenHeader({ title: `${habit.name} · kalender`, backTo: `#/habits/${habit.id}` }));

  const [y, m] = currentMonth.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const startWeekday = weekdayMon0(`${currentMonth}-01`);
  const canGoBack = currentMonth > earliestMonth;
  const canGoForward = currentMonth < monthKey(today);

  container.appendChild(
    el("div", { class: "calendar-header" }, [
      el("button", {
        class: "icon-btn",
        type: "button",
        text: "‹",
        "aria-label": "Vorige maand",
        disabled: !canGoBack,
        onClick: () => navigate(`/habits/${habit.id}/calendar/${shiftMonth(currentMonth, -1)}`),
      }),
      el("div", { class: "label", text: `${MONTHS_LONG[m - 1]} ${y}` }),
      el("button", {
        class: "icon-btn",
        type: "button",
        text: "›",
        "aria-label": "Volgende maand",
        disabled: !canGoForward,
        onClick: () => navigate(`/habits/${habit.id}/calendar/${shiftMonth(currentMonth, 1)}`),
      }),
    ])
  );

  const weekdaysRow = el("div", { class: "calendar-weekdays" });
  WEEKDAY_SHORT.forEach((d) => weekdaysRow.appendChild(el("span", { text: d })));
  container.appendChild(weekdaysRow);

  const grid = el("div", { class: "calendar-grid" });
  for (let i = 0; i < startWeekday; i += 1) grid.appendChild(el("div", { class: "calendar-cell empty" }));
  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = `${currentMonth}-${String(day).padStart(2, "0")}`;
    const status = calendarDayStatus(schedules, entries, iso, today);
    grid.appendChild(el("div", { class: `calendar-cell ${status}${iso === today ? " today" : ""}`, text: String(day) }));
  }
  container.appendChild(grid);
}
