/** Spiergroepgrafiek volume (briefing 6.24): weektotalen, ontbrekende weken doorgetrokken. */
import { el, clearNode } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { todayISO, weekKey, addDays } from "../../../core/dateUtils.js";
import { listAllCompletedWorkouts } from "../storage.js";
import { renderLineChart } from "../charts.js";
import { WEIGHTED_MUSCLE_GROUPS } from "../model.js";
import { screenHeader } from "./shared.js";

export default async function renderMuscleGroupChart(container, params) {
  const db = getDb();
  clearNode(container);
  const group = decodeURIComponent(params.group);
  if (!WEIGHTED_MUSCLE_GROUPS.includes(group)) {
    container.appendChild(el("div", { class: "empty-state", text: "Onbekende spiergroep." }));
    return;
  }
  container.appendChild(screenHeader({ title: `${group} · weekvolume`, backTo: "#/gym" }));

  const completed = await listAllCompletedWorkouts(db);
  const volumesByWeek = new Map();
  for (const w of completed) {
    const vol = w.muscleGroupVolumes ? w.muscleGroupVolumes[group] : null;
    if (vol == null) continue;
    const wk = weekKey(w.completedDate);
    volumesByWeek.set(wk, (volumesByWeek.get(wk) || 0) + vol);
  }

  const sortedWeeks = [...volumesByWeek.keys()].sort();
  if (sortedWeeks.length === 0) {
    container.appendChild(el("p", { class: "empty-state", text: `Nog geen workouts met ${group}.` }));
    return;
  }

  const lastWeek = weekKey(todayISO());
  const allWeeks = [];
  for (let wk = sortedWeeks[0]; wk <= lastWeek; wk = addDays(wk, 7)) {
    allWeeks.push(wk);
  }

  let lastKnown = null;
  const points = allWeeks.map((wk) => {
    if (volumesByWeek.has(wk)) {
      lastKnown = volumesByWeek.get(wk);
      return { x: wk, y: lastKnown, missing: false };
    }
    return { x: wk, y: lastKnown ?? 0, missing: true };
  });

  container.appendChild(renderLineChart(points));
  container.appendChild(el("p", { class: "hint", style: "margin-top:8px;", text: "Grijze punten: geen training die week. De lijn loopt visueel door, maar dit telt niet mee in berekeningen." }));
}
