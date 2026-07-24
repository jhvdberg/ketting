/** Analyseoverzicht (briefing 7.14). */
import { el, clearNode } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { todayISO } from "../../../core/dateUtils.js";
import { listDays, listSchedules, getModuleStart } from "../storage.js";
import { fullHistoryAnalysis } from "../analysis.js";
import { screenHeader, formatPercent, round1 } from "./shared.js";

function stat(label, value) {
  return el("div", { class: "list-row" }, [el("span", { text: label }), el("span", { class: "hint", text: String(value) })]);
}

export default async function renderAnalysisOverview(container) {
  const db = getDb();
  clearNode(container);
  container.appendChild(screenHeader({ title: "Analyseoverzicht", backTo: "#/alcohol" }));

  const today = todayISO();
  const [days, schedules, moduleStart] = await Promise.all([listDays(db), listSchedules(db), getModuleStart(db)]);
  if (!moduleStart) {
    container.appendChild(el("p", { class: "empty-state", text: "Nog geen data beschikbaar." }));
    return;
  }
  const a = fullHistoryAnalysis(days, schedules, moduleStart, today);

  const list = el("div", { class: "card" });
  list.appendChild(stat("Totaal glazen", a.totalGlasses));
  list.appendChild(stat("Gem. per kalenderdag", round1(a.avgPerCalendarDay)));
  list.appendChild(stat("Gem. per geregistreerde dag", round1(a.avgPerRegisteredDay)));
  list.appendChild(stat("Gem. per drinkdag", round1(a.avgPerDrinkingDay)));
  list.appendChild(stat("Drinkdagen", a.drinkingDays));
  list.appendChild(stat("Bevestigd alcoholvrije dagen", a.confirmedFreeDays));
  list.appendChild(stat("Behaalde geplande vrije dagen", a.achievedFreeDays));
  list.appendChild(stat("Gemiste geplande vrije dagen", a.missedFreeDays));
  list.appendChild(stat("Dagen binnen limiet", a.withinDays));
  list.appendChild(stat("Overschrijdingen", a.exceededDays));
  list.appendChild(stat("Wildcarddagen", a.wildcardDays));
  list.appendChild(stat("Niet-geregistreerde dagen", a.missingDays));
  list.appendChild(stat("Registratiegraad", formatPercent(a.registrationRate)));
  list.appendChild(stat("Nalevingspercentage", formatPercent(a.complianceRate)));
  container.appendChild(list);

  container.appendChild(el("h2", { class: "section", text: "Context" }));
  const ctxList = el("div", { class: "card" });
  ctxList.appendChild(stat("Thuis solo", `${a.solo} (${formatPercent(a.soloShare)})`));
  ctxList.appendChild(stat("Thuis samen", `${a.together} (${formatPercent(a.togetherShare)})`));
  ctxList.appendChild(stat("Sociale context", `${a.social} (${formatPercent(a.socialShare)})`));
  container.appendChild(ctxList);

  container.appendChild(el("h2", { class: "section", text: "Gebruik t.o.v. limiet" }));
  const limitList = el("div", { class: "card" });
  limitList.appendChild(stat("Beoordeeld gebruik", a.assessedUsage));
  limitList.appendChild(stat("Beoordeelde limiet", a.assessedLimit));
  limitList.appendChild(stat("Gebruik t.o.v. beoordeelde limiet", formatPercent(a.usageVsAssessedLimit)));
  container.appendChild(limitList);
}
