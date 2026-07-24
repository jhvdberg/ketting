/** Habit toevoegen en bewerken (briefing 8.2, 8.4, 8.7). */
import { el } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { navigate } from "../../../core/router.js";
import { todayISO, nowTimestamp } from "../../../core/dateUtils.js";
import { generateId } from "../../../core/id.js";
import { loadHabitData, saveHabit, replaceSchedulesForHabit } from "../storage.js";
import { isValidDaysArray, scheduleForDate, upsertScheduleVersion, WEEKDAY_LABELS } from "../model.js";
import { showToast } from "../../../core/ui/toast.js";
import { screenHeader } from "./shared.js";

function sameDays(a, b) {
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.length === sb.length && sa.every((v, i) => v === sb[i]);
}

export default async function renderHabitEditor(container, params) {
  const db = getDb();
  const isEdit = !!params.id;
  const today = todayISO();

  let habit = null;
  let schedules = [];
  if (isEdit) {
    const data = await loadHabitData(db, params.id);
    if (!data.habit) {
      container.appendChild(el("div", { class: "empty-state", text: "Deze habit bestaat niet (meer)." }));
      return;
    }
    habit = data.habit;
    schedules = data.schedules;
  }

  const currentSchedule = isEdit ? scheduleForDate(schedules, today) : null;
  let selectedDays = currentSchedule ? [...currentSchedule.days] : [];

  container.appendChild(screenHeader({ title: isEdit ? "Habit bewerken" : "Nieuwe habit", backTo: isEdit ? `#/habits/${habit.id}` : "#/habits" }));

  const nameInput = el("input", { type: "text", placeholder: "Bijv. Lezen" });
  nameInput.value = habit ? habit.name : "";
  const descInput = el("textarea", { placeholder: "Optioneel, bijv. Minimaal 30 minuten" });
  descInput.value = habit ? habit.description || "" : "";
  const errorEl = el("p", { class: "field-error" });

  container.appendChild(el("label", { text: "Naam" }));
  container.appendChild(nameInput);
  container.appendChild(el("label", { text: "Beschrijving" }));
  container.appendChild(descInput);

  container.appendChild(el("label", { text: "Op welke dagen?" }));
  const daypick = el("div", { class: "daypick" });
  WEEKDAY_LABELS.forEach((label, idx) => {
    const btn = el("button", { type: "button", text: label, class: selectedDays.includes(idx) ? "sel" : "" });
    btn.addEventListener("click", () => {
      if (selectedDays.includes(idx)) selectedDays = selectedDays.filter((d) => d !== idx);
      else selectedDays.push(idx);
      btn.classList.toggle("sel");
    });
    daypick.appendChild(btn);
  });
  container.appendChild(daypick);
  container.appendChild(errorEl);

  if (isEdit && currentSchedule) {
    container.appendChild(
      el("p", { class: "hint", text: "Een wijziging van de dagen geldt vanaf vandaag. Eerdere dagen blijven beoordeeld volgens het schema dat toen gold." })
    );
  }

  container.appendChild(
    el("button", {
      class: "btn primary",
      type: "button",
      text: isEdit ? "Opslaan" : "Habit toevoegen",
      style: "margin-top:18px;",
      onClick: async () => {
        const name = nameInput.value.trim();
        if (!name) {
          errorEl.textContent = "Geef de habit een naam.";
          return;
        }
        if (!isValidDaysArray(selectedDays)) {
          errorEl.textContent = "Kies minimaal één dag.";
          return;
        }
        errorEl.textContent = "";
        const description = descInput.value.trim();
        const now = nowTimestamp();
        const sortedDays = [...selectedDays].sort((a, b) => a - b);

        if (isEdit) {
          await saveHabit(db, { ...habit, name, description, updatedAt: now });
          if (!currentSchedule || !sameDays(currentSchedule.days, sortedDays)) {
            const newSchedules = upsertScheduleVersion(schedules, {
              id: generateId(),
              habitId: habit.id,
              days: sortedDays,
              effectiveFrom: today,
            });
            await replaceSchedulesForHabit(db, habit.id, newSchedules);
          }
          showToast("Opgeslagen");
          navigate(`/habits/${habit.id}`);
        } else {
          const id = generateId();
          await saveHabit(db, { id, name, description, active: true, createdAt: now, updatedAt: now });
          await replaceSchedulesForHabit(db, id, [{ id: generateId(), habitId: id, days: sortedDays, effectiveFrom: today }]);
          showToast("Habit toegevoegd");
          navigate(`/habits/${id}`);
        }
      },
    })
  );
}
