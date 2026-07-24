/** Oefeningsgrafiek maximumgewicht (briefing 6.24). */
import { el, clearNode } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { getExercise, listAllCompletedWorkouts } from "../storage.js";
import { renderLineChart } from "../charts.js";
import { screenHeader } from "./shared.js";

export default async function renderExerciseChart(container, params) {
  const db = getDb();
  clearNode(container);
  const exercise = await getExercise(db, params.id);
  if (!exercise) {
    container.appendChild(el("div", { class: "empty-state", text: "Deze oefening bestaat niet (meer)." }));
    return;
  }
  container.appendChild(screenHeader({ title: `${exercise.name} · max. gewicht`, backTo: "#/gym/exercises" }));

  if (exercise.muscleGroup === "Core") {
    container.appendChild(el("p", { class: "empty-state", text: "Core-oefeningen hebben geen maximumgewichtgrafiek." }));
    return;
  }

  const completed = (await listAllCompletedWorkouts(db)).sort((a, b) => a.completedDate.localeCompare(b.completedDate));
  const points = [];
  for (const w of completed) {
    // Historische oefening-ID zodat hernoemen of verwijderen de grafiek niet breekt.
    const snapshot = w.exercises.find((e) => e.exerciseId === exercise.id);
    if (!snapshot) continue;
    const maxWeight = Math.max(...snapshot.sets.map((s) => s.weight ?? 0));
    points.push({ x: w.completedDate, y: maxWeight });
  }

  if (points.length === 0) {
    container.appendChild(el("p", { class: "empty-state", text: "Nog geen voltooide workouts met deze oefening." }));
    return;
  }
  container.appendChild(renderLineChart(points));
}
