/** Periodevergelijkingen (briefing 7.15-7.18). */
import { el, clearNode } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { todayISO } from "../../../core/dateUtils.js";
import { listDays, listSchedules, getModuleStart } from "../storage.js";
import { getAvailableComparisons, periodStats, currentWeekRange, currentMonthRange } from "../analysis.js";
import { screenHeader, formatPercent, formatDiff, round1 } from "./shared.js";

const COMPARISON_METRICS = [
  ["totalGlasses", "Totaal glazen"],
  ["withinDays", "Dagen binnen limiet"],
  ["exceededDays", "Overschrijdingen"],
  ["wildcardDays", "Wildcarddagen"],
  ["noLimitDays", "Dagen zonder maximum"],
  ["confirmedFreeDays", "Alcoholvrije dagen"],
  ["assessedUsage", "Beoordeeld gebruik"],
  ["assessedLimit", "Beoordeelde limiet"],
];

function periodSummaryLine(stats) {
  return `${stats.totalGlasses} glazen · ${stats.withinDays} binnen limiet · ${stats.exceededDays} overschrijdingen · ${stats.wildcardDays} wildcards · ${stats.missingDays} ontbrekend · registratiegraad ${formatPercent(stats.registrationRate)}`;
}

function renderComparisonCard(comparison) {
  const card = el("div", { class: "card" }, [
    el("div", { class: "name", text: comparison.label }),
    el("p", {
      class: "hint",
      text: `Ontbrekende dagen: ${comparison.recentStats.missingDays} (recent) / ${comparison.referenceStats.missingDays} (referentie) · registratiegraad ${formatPercent(comparison.recentStats.registrationRate)} / ${formatPercent(comparison.referenceStats.registrationRate)}`,
    }),
  ]);
  for (const [key, label] of COMPARISON_METRICS) {
    const diff = comparison.diffs[key];
    if (!diff) continue;
    card.appendChild(
      el("div", { class: "list-row" }, [el("span", { text: label }), el("span", { class: "hint", text: `${round1(diff.recent)} vs ${round1(diff.reference)} · ${formatDiff(diff)}` })])
    );
  }
  return card;
}

export default async function renderPeriodComparisons(container) {
  const db = getDb();
  clearNode(container);
  container.appendChild(screenHeader({ title: "Periodevergelijkingen", backTo: "#/alcohol" }));

  const today = todayISO();
  const [days, schedules, moduleStart] = await Promise.all([listDays(db), listSchedules(db), getModuleStart(db)]);
  if (!moduleStart) {
    container.appendChild(el("p", { class: "empty-state", text: "Nog geen data beschikbaar." }));
    return;
  }

  container.appendChild(el("h2", { class: "section", text: "Actuele periode (tot en met vandaag)" }));
  const weekNow = currentWeekRange(today);
  const monthNow = currentMonthRange(today);
  const weekStats = periodStats(days, schedules, weekNow.start, weekNow.end);
  const monthStats = periodStats(days, schedules, monthNow.start, monthNow.end);
  container.appendChild(el("div", { class: "card" }, [el("div", { class: "name", text: "Deze week" }), el("div", { class: "meta", text: periodSummaryLine(weekStats) })]));
  container.appendChild(el("div", { class: "card" }, [el("div", { class: "name", text: "Deze maand" }), el("div", { class: "meta", text: periodSummaryLine(monthStats) })]));

  const { weeks, months, years } = getAvailableComparisons(days, schedules, moduleStart, today);

  container.appendChild(el("h2", { class: "section", text: "Weken" }));
  if (weeks.length === 0) container.appendChild(el("p", { class: "empty-state", text: "Nog onvoldoende historie voor weekvergelijkingen." }));
  weeks.forEach((c) => container.appendChild(renderComparisonCard(c)));

  container.appendChild(el("h2", { class: "section", text: "Maanden" }));
  if (months.length === 0) container.appendChild(el("p", { class: "empty-state", text: "Nog onvoldoende historie voor maandvergelijkingen." }));
  months.forEach((c) => container.appendChild(renderComparisonCard(c)));

  container.appendChild(el("h2", { class: "section", text: "Jaar" }));
  if (years.length === 0) container.appendChild(el("p", { class: "empty-state", text: "Nog onvoldoende historie voor een jaarvergelijking." }));
  years.forEach((c) => container.appendChild(renderComparisonCard(c)));
}
