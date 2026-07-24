/** Wildcardoverzicht (briefing 7.10) — neutrale toon, geen oordeel. */
import { el, clearNode } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { todayISO } from "../../../core/dateUtils.js";
import { listDays, listSchedules, getModuleStart } from "../storage.js";
import { periodStats, lastClosedWeeksRange, currentMonthRange, wildcardDatesInRange } from "../analysis.js";
import { screenHeader } from "./shared.js";

function row(days, schedules, label, range) {
  const stats = periodStats(days, schedules, range.start, range.end);
  return el("div", { class: "list-row" }, [el("span", { text: label }), el("span", { class: "hint", text: `${stats.wildcardDays} dagen · ${stats.wildcardGlasses} glazen` })]);
}

export default async function renderWildcardOverview(container) {
  const db = getDb();
  clearNode(container);
  container.appendChild(screenHeader({ title: "Wildcardoverzicht", backTo: "#/alcohol" }));

  const today = todayISO();
  const [days, schedules, moduleStart] = await Promise.all([listDays(db), listSchedules(db), getModuleStart(db)]);
  if (!moduleStart) {
    container.appendChild(el("p", { class: "empty-state", text: "Nog geen data beschikbaar." }));
    return;
  }

  const list = el("div", { class: "card" });
  list.appendChild(row(days, schedules, "Laatste 4 afgesloten weken", lastClosedWeeksRange(4, today)));
  list.appendChild(row(days, schedules, "Laatste 8 afgesloten weken", lastClosedWeeksRange(8, today)));
  list.appendChild(row(days, schedules, "Laatste 12 afgesloten weken", lastClosedWeeksRange(12, today)));
  list.appendChild(row(days, schedules, "Deze kalendermaand", currentMonthRange(today)));
  list.appendChild(row(days, schedules, "Volledige historie", { start: moduleStart, end: today }));
  container.appendChild(list);

  const dates = wildcardDatesInRange(days, moduleStart, today).sort().reverse();
  container.appendChild(el("h2", { class: "section", text: "Datums" }));
  if (dates.length === 0) {
    container.appendChild(el("p", { class: "empty-state", text: "Nog geen wildcards gebruikt." }));
  } else {
    const dateList = el("div", { class: "card" });
    for (const date of dates) dateList.appendChild(el("a", { class: "list-row", href: `#/alcohol/day/${date}`, text: date }));
    container.appendChild(dateList);
  }
}
