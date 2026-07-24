/** Oefeningenlijst (briefing 6.3, 15, 18). */
import { el, clearNode } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { nowTimestamp } from "../../../core/dateUtils.js";
import { listExercises, saveExercise, isExerciseUsedInTemplates } from "../storage.js";
import { confirmDialog } from "../../../core/ui/confirm.js";
import { showToast } from "../../../core/ui/toast.js";
import { screenHeader } from "./shared.js";

export default async function renderExerciseList(container) {
  const db = getDb();

  async function refresh() {
    clearNode(container);
    container.appendChild(screenHeader({ title: "Oefeningen", backTo: "#/gym" }));

    const exercises = (await listExercises(db)).filter((e) => e.active).sort((a, b) => a.name.localeCompare(b.name));
    if (exercises.length === 0) {
      container.appendChild(el("p", { class: "empty-state", text: "Nog geen oefeningen." }));
    } else {
      const list = el("div", { class: "card" });
      for (const ex of exercises) {
        list.appendChild(
          el("div", { class: "list-row" }, [
            el("a", { href: `#/gym/exercises/${ex.id}/edit`, text: `${ex.name} · ${ex.muscleGroup}` }),
            ex.muscleGroup !== "Core" ? el("a", { class: "btn ghost small", href: `#/gym/exercises/${ex.id}/chart`, text: "grafiek" }) : null,
            el("button", {
              class: "del",
              type: "button",
              text: "verwijder",
              onClick: async () => {
                const usedInTemplates = await isExerciseUsedInTemplates(db, ex.id);
                const ok = await confirmDialog({
                  title: "Oefening verwijderen",
                  body: usedInTemplates
                    ? `"${ex.name}" wordt uit de oefeningenlijst verwijderd. Deze oefening wordt nog gebruikt in één of meer templates; die en alle historische workouts blijven onveranderd leesbaar.`
                    : `"${ex.name}" wordt uit de oefeningenlijst verwijderd. Historische workouts waarin deze oefening voorkwam, blijven onveranderd leesbaar.`,
                  confirmLabel: "Verwijderen",
                  danger: true,
                });
                if (!ok) return;
                await saveExercise(db, { ...ex, active: false, updatedAt: nowTimestamp() });
                showToast("Oefening verwijderd");
                refresh();
              },
            }),
          ])
        );
      }
      container.appendChild(list);
    }

    container.appendChild(el("a", { class: "btn primary", href: "#/gym/exercises/new", text: "+ Nieuwe oefening", style: "margin-top:14px; display:block;" }));
  }

  await refresh();
}
