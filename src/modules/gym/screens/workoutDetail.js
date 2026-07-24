/** Historische workoutdetails: volledige onveranderlijke snapshot (briefing 6.23, 6.25). */
import { el, clearNode } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { getCompletedWorkout } from "../storage.js";
import { screenHeader, classificationPillClass, formatWeight } from "./shared.js";

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

export default async function renderWorkoutDetail(container, params) {
  const db = getDb();
  clearNode(container);
  const workout = await getCompletedWorkout(db, params.id);
  if (!workout) {
    container.appendChild(el("div", { class: "empty-state", text: "Deze workout bestaat niet (meer)." }));
    return;
  }

  const subtitleParts = [workout.completedDate];
  if (workout.cycleName) subtitleParts.push(`${workout.cycleName}${workout.cycleWeek != null ? ` · week ${workout.cycleWeek + 1}` : ""}`);
  container.appendChild(screenHeader({ title: workout.workoutName, subtitle: subtitleParts.join(" · "), backTo: "#/gym/calendar" }));

  container.appendChild(
    el("div", { class: "card" }, [
      el("div", { class: "row" }, [
        el("div", { class: "info" }, [el("div", { class: "name", text: "Totale classificatie" }), el("div", { class: "meta", text: workout.classificationCoverage })]),
        el("span", { class: classificationPillClass(workout.totalClassification), text: workout.totalClassification }),
      ]),
    ])
  );

  for (const ex of workout.exercises) {
    const card = el("div", { class: "card" }, [
      el("div", { class: "row" }, [
        el("div", { class: "info" }, [
          el("div", { class: "name", text: ex.exerciseName }),
          el("div", { class: "meta", text: ex.muscleGroup + (ex.exerciseVolume != null ? ` · volume ${ex.exerciseVolume}` : "") }),
        ]),
        ex.muscleGroup !== "Core" ? el("a", { class: "btn ghost small", href: `#/gym/exercises/${ex.exerciseId}/chart`, text: "grafiek" }) : null,
      ]),
    ]);
    ex.sets.forEach((s, idx) => {
      card.appendChild(el("div", { class: "meta", text: `Set ${idx + 1}: ${ex.muscleGroup === "Core" ? "" : `${formatWeight(s.weight)} · `}${s.reps} reps` }));
    });
    container.appendChild(card);
  }

  container.appendChild(el("h2", { class: "section", text: "Spiergroepvolume" }));
  const groupList = el("div", { class: "card" });
  for (const [group, vol] of Object.entries(workout.muscleGroupVolumes)) {
    const cls = workout.groupClassifications[group];
    groupList.appendChild(
      el("div", { class: "list-row" }, [el("span", { text: `${group}: ${vol}` }), el("span", { class: classificationPillClass(cls.finalClassification), text: cls.finalClassification })])
    );
  }
  container.appendChild(groupList);

  container.appendChild(
    el("p", { class: "hint", text: `Workoutvolume: ${workout.workoutVolume} · gestart ${formatTime(workout.startedAt)} · voltooid ${formatTime(workout.completedAt)}` })
  );
}
