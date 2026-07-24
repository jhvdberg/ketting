/** Alcoholkalender (briefing 7.13). */
import { el, clearNode } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { navigate } from "../../../core/router.js";
import { todayISO, weekdayMon0, isAfter } from "../../../core/dateUtils.js";
import { listDays, getModuleStart } from "../storage.js";
import { screenHeader, MONTHS_LONG, statusColor } from "./shared.js";

const WEEKDAY_SHORT = ["ma", "di", "wo", "do", "vr", "za", "zo"];

function monthKey(iso) {
  return iso.slice(0, 7);
}
function shiftMonth(monthKeyStr, delta) {
  const [y, m] = monthKeyStr.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function renderAlcoholCalendar(container, params) {
  const db = getDb();
  clearNode(container);
  container.appendChild(screenHeader({ title: "Alcoholkalender", backTo: "#/alcohol" }));

  const today = todayISO();
  const days = await listDays(db);
  const moduleStart = await getModuleStart(db);
  const earliestMonth = moduleStart ? monthKey(moduleStart) : monthKey(today);
  const currentMonth = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : monthKey(today);

  const [y, m] = currentMonth.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const startWeekday = weekdayMon0(`${currentMonth}-01`);
  const canGoBack = currentMonth > earliestMonth;
  const canGoForward = currentMonth < monthKey(today);

  container.appendChild(
    el("div", { class: "calendar-header" }, [
      el("button", { class: "icon-btn", type: "button", text: "‹", "aria-label": "Vorige maand", disabled: !canGoBack, onClick: () => navigate(`/alcohol/calendar/${shiftMonth(currentMonth, -1)}`) }),
      el("div", { class: "label", text: `${MONTHS_LONG[m - 1]} ${y}` }),
      el("button", { class: "icon-btn", type: "button", text: "›", "aria-label": "Volgende maand", disabled: !canGoForward, onClick: () => navigate(`/alcohol/calendar/${shiftMonth(currentMonth, 1)}`) }),
    ])
  );

  const weekdaysRow = el("div", { class: "calendar-weekdays" });
  WEEKDAY_SHORT.forEach((d) => weekdaysRow.appendChild(el("span", { text: d })));
  container.appendChild(weekdaysRow);

  const byDate = new Map(days.map((d) => [d.date, d]));
  const grid = el("div", { class: "calendar-grid" });
  for (let i = 0; i < startWeekday; i += 1) grid.appendChild(el("div", { class: "calendar-cell empty" }));
  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = `${currentMonth}-${String(day).padStart(2, "0")}`;
    const record = byDate.get(iso);
    const future = isAfter(iso, today);
    const baseStyle = "flex-direction:column; text-decoration:none; gap:1px;";
    const cell = el("a", {
      href: future ? "#" : `#/alcohol/day/${iso}`,
      class: "calendar-cell" + (iso === today ? " today" : "") + (!record && !future ? " unplanned" : "") + (future ? " future" : ""),
      style: record ? `${baseStyle} background:${statusColor(record.status)}22; border-color:${statusColor(record.status)};` : baseStyle,
    });
    cell.appendChild(el("div", { text: String(day) }));
    if (record) cell.appendChild(el("div", { style: "font-size:10px;", text: `${record.total}${record.wildcard ? " ★" : ""}` }));
    grid.appendChild(cell);
  }
  container.appendChild(grid);
}
