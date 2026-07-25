/** Workouttemplate toevoegen en bewerken (briefing 6.4 niveau 1, 6.5). */
import { el } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { navigate } from "../../../core/router.js";
import { nowTimestamp } from "../../../core/dateUtils.js";
import { generateId } from "../../../core/id.js";
import { getTemplate, saveTemplate, listExercises } from "../storage.js";
import { isCoreGroup, isValidSet } from "../model.js";
import { showToast } from "../../../core/ui/toast.js";
import { screenHeader, parseWeightInput } from "./shared.js";

export default async function renderTemplateEditor(container, params) {
  const db = getDb();
  const isEdit = !!params.id;
  const allExercises = (await listExercises(db)).filter((e) => e.active).sort((a, b) => a.name.localeCompare(b.name));
  const exerciseById = new Map(allExercises.map((e) => [e.id, e]));

  let template = null;
  let exercises = [];
  if (isEdit) {
    template = await getTemplate(db, params.id);
    if (!template) {
      container.appendChild(el("div", { class: "empty-state", text: "Dit template bestaat niet (meer)." }));
      return;
    }
    exercises = template.exercises.map((ex) => ({ exerciseId: ex.exerciseId, sets: ex.sets.map((s) => ({ ...s })) }));
  }

  if (allExercises.length === 0) {
    container.appendChild(screenHeader({ title: isEdit ? "Template bewerken" : "Nieuw template", backTo: "#/gym/templates" }));
    container.appendChild(
      el("div", { class: "empty-state" }, [
        el("p", { text: "Maak eerst minimaal één oefening aan." }),
        el("a", { class: "btn primary", href: "#/gym/exercises/new", text: "Oefening toevoegen" }),
      ])
    );
    return;
  }

  container.appendChild(screenHeader({ title: isEdit ? "Template bewerken" : "Nieuw template", backTo: "#/gym/templates" }));

  const nameInput = el("input", { type: "text", placeholder: "Bijv. Push-dag A" });
  nameInput.value = template ? template.name : "";
  const errorEl = el("p", { class: "field-error" });
  container.appendChild(el("label", { text: "Naam" }));
  container.appendChild(nameInput);

  const exercisesContainer = el("div", { style: "margin-top:14px;" });
  container.appendChild(exercisesContainer);

  function renderExercises() {
    exercisesContainer.innerHTML = "";
    exercises.forEach((ex, exIdx) => {
      const info = exerciseById.get(ex.exerciseId);
      const isCore = !!info && isCoreGroup(info.muscleGroup);
      const card = el("div", { class: "card" });
      card.appendChild(
        el("div", { class: "row" }, [
          el("div", { class: "info" }, [
            el("div", { class: "name", text: info ? info.name : "(verwijderde oefening)" }),
            el("div", { class: "meta", text: info ? info.muscleGroup : "" }),
          ]),
          el("button", { class: "icon-btn", type: "button", "aria-label": "Naar boven", text: "↑", disabled: exIdx === 0, onClick: () => { [exercises[exIdx - 1], exercises[exIdx]] = [exercises[exIdx], exercises[exIdx - 1]]; renderExercises(); } }),
          el("button", { class: "icon-btn", type: "button", "aria-label": "Naar beneden", text: "↓", disabled: exIdx === exercises.length - 1, onClick: () => { [exercises[exIdx + 1], exercises[exIdx]] = [exercises[exIdx], exercises[exIdx + 1]]; renderExercises(); } }),
          el("button", { class: "icon-btn", type: "button", "aria-label": "Oefening verwijderen", text: "✕", onClick: () => { exercises.splice(exIdx, 1); renderExercises(); } }),
        ])
      );

      ex.sets.forEach((set, setIdx) => {
        const row = el("div", { class: "row", style: "margin-top:8px;" }, [el("span", { class: "meta", text: `Set ${setIdx + 1}` })]);
        if (!isCore) {
          const weightInput = el("input", { type: "text", inputmode: "decimal", placeholder: "kg", style: "width:80px;" });
          weightInput.value = set.weight ?? "";
          weightInput.addEventListener("input", () => {
            set.weight = parseWeightInput(weightInput.value);
          });
          row.appendChild(weightInput);
        }
        const repsInput = el("input", { type: "text", inputmode: "numeric", placeholder: "reps", style: "width:70px;" });
        repsInput.value = set.reps ?? "";
        repsInput.addEventListener("input", () => {
          set.reps = repsInput.value === "" ? null : Number(repsInput.value);
        });
        row.appendChild(repsInput);
        row.appendChild(el("button", { class: "icon-btn", type: "button", "aria-label": "Set verwijderen", text: "✕", onClick: () => { ex.sets.splice(setIdx, 1); renderExercises(); } }));
        card.appendChild(row);
      });

      card.appendChild(
        el("button", {
          class: "btn ghost small",
          type: "button",
          text: "+ Set",
          style: "margin-top:8px;",
          onClick: () => {
            ex.sets.push({ weight: isCore ? null : 0, reps: 0 });
            renderExercises();
          },
        })
      );
      exercisesContainer.appendChild(card);
    });
  }
  renderExercises();

  const addExerciseSelect = el("select", {});
  addExerciseSelect.appendChild(el("option", { value: "", text: "Kies een oefening..." }));
  for (const ex of allExercises) {
    addExerciseSelect.appendChild(el("option", { value: ex.id, text: `${ex.name} (${ex.muscleGroup})` }));
  }
  container.appendChild(el("label", { text: "Oefening toevoegen" }));
  container.appendChild(addExerciseSelect);
  container.appendChild(
    el("button", {
      class: "btn ghost",
      type: "button",
      text: "Toevoegen",
      style: "margin-top:8px;",
      onClick: () => {
        if (!addExerciseSelect.value) return;
        const info = exerciseById.get(addExerciseSelect.value);
        exercises.push({ exerciseId: addExerciseSelect.value, sets: [{ weight: isCoreGroup(info.muscleGroup) ? null : 0, reps: 0 }] });
        addExerciseSelect.value = "";
        renderExercises();
      },
    })
  );

  container.appendChild(errorEl);
  container.appendChild(
    el("button", {
      class: "btn primary",
      type: "button",
      text: isEdit ? "Opslaan" : "Template opslaan",
      style: "margin-top:18px;",
      onClick: async () => {
        const trimmedName = nameInput.value.trim();
        if (!trimmedName) {
          errorEl.textContent = "Geef het template een naam.";
          return;
        }
        if (exercises.length === 0) {
          errorEl.textContent = "Voeg minimaal één oefening toe.";
          return;
        }
        for (const ex of exercises) {
          const info = exerciseById.get(ex.exerciseId);
          if (ex.sets.length === 0) {
            errorEl.textContent = `${info ? info.name : "Oefening"} heeft geen sets.`;
            return;
          }
          for (const set of ex.sets) {
            if (!isValidSet(set, info ? info.muscleGroup : null)) {
              errorEl.textContent = `Ongeldige set bij ${info ? info.name : "oefening"}.`;
              return;
            }
          }
        }
        errorEl.textContent = "";
        const now = nowTimestamp();
        const orderedExercises = exercises.map((ex, idx) => ({ exerciseId: ex.exerciseId, order: idx, sets: ex.sets.map((s) => ({ ...s })) }));
        if (isEdit) {
          await saveTemplate(db, { ...template, name: trimmedName, exercises: orderedExercises, updatedAt: now });
          showToast("Opgeslagen");
        } else {
          await saveTemplate(db, { id: generateId(), name: trimmedName, exercises: orderedExercises, createdAt: now, updatedAt: now });
          showToast("Template opgeslagen");
        }
        navigate("/gym/templates");
      },
    })
  );
}
