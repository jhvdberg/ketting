/** Oefening toevoegen en bewerken (briefing 6.2, 6.3). */
import { el } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { navigate } from "../../../core/router.js";
import { nowTimestamp } from "../../../core/dateUtils.js";
import { generateId } from "../../../core/id.js";
import { getExercise, saveExercise } from "../storage.js";
import { MUSCLE_GROUPS } from "../model.js";
import { showToast } from "../../../core/ui/toast.js";
import { screenHeader } from "./shared.js";

export default async function renderExerciseEditor(container, params) {
  const db = getDb();
  const isEdit = !!params.id;
  let exercise = null;
  if (isEdit) {
    exercise = await getExercise(db, params.id);
    if (!exercise) {
      container.appendChild(el("div", { class: "empty-state", text: "Deze oefening bestaat niet (meer)." }));
      return;
    }
  }

  container.appendChild(screenHeader({ title: isEdit ? "Oefening bewerken" : "Nieuwe oefening", backTo: "#/gym/exercises" }));

  const nameInput = el("input", { type: "text", placeholder: "Bijv. Bankdrukken" });
  nameInput.value = exercise ? exercise.name : "";
  const errorEl = el("p", { class: "field-error" });

  container.appendChild(el("label", { text: "Naam" }));
  container.appendChild(nameInput);

  container.appendChild(el("label", { text: "Spiergroep" }));
  let selectedGroup = exercise ? exercise.muscleGroup : null;
  const groupPick = el("div", { class: "daypick", style: "flex-wrap:wrap; gap:8px;" });
  MUSCLE_GROUPS.forEach((group) => {
    const btn = el("button", { type: "button", text: group, class: selectedGroup === group ? "sel" : "", style: "flex:0 0 auto; padding:9px 12px;" });
    btn.addEventListener("click", () => {
      selectedGroup = group;
      groupPick.querySelectorAll("button").forEach((b) => b.classList.toggle("sel", b === btn));
    });
    groupPick.appendChild(btn);
  });
  container.appendChild(groupPick);
  container.appendChild(errorEl);

  container.appendChild(
    el("button", {
      class: "btn primary",
      type: "button",
      text: isEdit ? "Opslaan" : "Oefening toevoegen",
      style: "margin-top:18px;",
      onClick: async () => {
        const name = nameInput.value.trim();
        if (!name) {
          errorEl.textContent = "Geef de oefening een naam.";
          return;
        }
        if (!selectedGroup) {
          errorEl.textContent = "Kies een spiergroep.";
          return;
        }
        errorEl.textContent = "";
        const now = nowTimestamp();
        if (isEdit) {
          await saveExercise(db, { ...exercise, name, muscleGroup: selectedGroup, updatedAt: now });
          showToast("Opgeslagen");
        } else {
          await saveExercise(db, { id: generateId(), name, muscleGroup: selectedGroup, active: true, createdAt: now, updatedAt: now });
          showToast("Oefening toegevoegd");
        }
        navigate("/gym/exercises");
      },
    })
  );
}
