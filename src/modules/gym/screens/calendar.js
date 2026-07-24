/** Gymkalender (briefing 6.23): per dag uitsluitend de classificatie. */
import { el, clearNode } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { navigate } from "../../../core/router.js";
import { todayISO, weekdayMon0 } from "../../../core/dateUtils.js";
import { listAllCompletedWorkouts } from "../storage.js";
import { screenHeader, MONTHS_LONG, classificationPillClass, classificationColor } from "./shared.js";

const WEEKDAY_SHORT = ["ma", "di", "wo", "do", "vr", "za", "zo"];

function monthKey(iso) {
  return iso.slice(0, 7);
}
function shiftMonth(monthKeyStr, delta) {
  const [y, m] = monthKeyStr.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function renderGymCalendar(container, params) {
  const db = getDb();
  clearNode(container);
  container.appendChild(screenHeader({ title: "Gymkalender", backTo: "#/gym" }));

  const today = todayISO();
  const completed = await listAllCompletedWorkouts(db);
  const earliestMonth = completed.length ? monthKey(completed.reduce((min, w) => (w.completedDate < min ? w.completedDate : min), completed[0].completedDate)) : monthKey(today);
  const currentMonth = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : monthKey(today);

  const [y, m] = currentMonth.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const startWeekday = weekdayMon0(`${currentMonth}-01`);
  const canGoBack = currentMonth > earliestMonth;
  const canGoForward = currentMonth < monthKey(today);

  container.appendChild(
    el("div", { class: "calendar-header" }, [
      el("button", { class: "icon-btn", type: "button", text: "‹", "aria-label": "Vorige maand", disabled: !canGoBack, onClick: () => navigate(`/gym/calendar/${shiftMonth(currentMonth, -1)}`) }),
      el("div", { class: "label", text: `${MONTHS_LONG[m - 1]} ${y}` }),
      el("button", { class: "icon-btn", type: "button", text: "›", "aria-label": "Volgende maand", disabled: !canGoForward, onClick: () => navigate(`/gym/calendar/${shiftMonth(currentMonth, 1)}`) }),
    ])
  );

  const weekdaysRow = el("div", { class: "calendar-weekdays" });
  WEEKDAY_SHORT.forEach((d) => weekdaysRow.appendChild(el("span", { text: d })));
  container.appendChild(weekdaysRow);

  const byDate = new Map();
  for (const w of completed) {
    if (!byDate.has(w.completedDate)) byDate.set(w.completedDate, []);
    byDate.get(w.completedDate).push(w);
  }

  const grid = el("div", { class: "calendar-grid" });
  for (let i = 0; i < startWeekday; i += 1) grid.appendChild(el("div", { class: "calendar-cell empty" }));
  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = `${currentMonth}-${String(day).padStart(2, "0")}`;
    const workoutsOnDay = byDate.get(iso) || [];
    const cell = el("div", { class: "calendar-cell" + (iso === today ? " today" : "") + (workoutsOnDay.length ? "" : " unplanned") });
    cell.appendChild(el("div", { text: String(day) }));
    if (workoutsOnDay.length) {
      const dots = el("div", { style: "display:flex; gap:2px; margin-top:2px;" });
      for (const w of workoutsOnDay) {
        dots.appendChild(el("span", { style: `width:6px;height:6px;border-radius:50%;background:${classificationColor(w.totalClassification)};display:inline-block;` }));
      }
      cell.appendChild(dots);
    }
    grid.appendChild(cell);
  }
  container.appendChild(grid);

  const monthDates = [...byDate.keys()].filter((d) => d.startsWith(currentMonth)).sort();
  if (monthDates.length) {
    container.appendChild(el("h2", { class: "section", text: "Workouts deze maand" }));
    const list = el("div", { class: "card" });
    for (const date of monthDates) {
      for (const w of byDate.get(date)) {
        list.appendChild(
          el("a", { class: "list-row", href: `#/gym/history/${w.id}` }, [
            el("span", { text: `${date} · ${w.workoutName}` }),
            el("span", { class: classificationPillClass(w.totalClassification), text: w.totalClassification }),
          ])
        );
      }
    }
    container.appendChild(list);
  }
}
