/** Weekdagschema (briefing 7.5, 7.6, 14.2). */
import { el } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { navigate } from "../../../core/router.js";
import { todayISO } from "../../../core/dateUtils.js";
import { generateId } from "../../../core/id.js";
import { listSchedules, saveScheduleVersion } from "../storage.js";
import { scheduleForDate, isValidCount, WEEKDAY_LABELS } from "../model.js";
import { showToast } from "../../../core/ui/toast.js";
import { screenHeader } from "./shared.js";

export default async function renderSchedule(container) {
  const db = getDb();
  const today = todayISO();
  const schedules = await listSchedules(db);
  const isFirstTime = schedules.length === 0;
  const current = scheduleForDate(schedules, today);

  container.appendChild(screenHeader({ title: "Weekdagschema", backTo: "#/alcohol" }));

  if (isFirstTime) {
    container.appendChild(
      el("p", { class: "hint" }, [
        "Stel voor iedere dag het maximumaantal glazen in. Een waarde van 0 betekent een geplande alcoholvrije dag. Je kan deze waarden later altijd aanpassen.",
      ])
    );
  } else {
    container.appendChild(
      el("p", { class: "hint", text: "Een wijziging geldt vanaf vandaag. Eerdere dagen blijven beoordeeld volgens het schema dat toen gold." })
    );
  }

  const inputs = WEEKDAY_LABELS.map((_, idx) => {
    const input = el("input", { type: "text", inputmode: "numeric", placeholder: "0" });
    input.value = current ? String(current.days[idx]) : "";
    return input;
  });

  WEEKDAY_LABELS.forEach((label, idx) => {
    container.appendChild(el("label", { text: label.charAt(0).toUpperCase() + label.slice(1) }));
    container.appendChild(inputs[idx]);
  });

  const errorEl = el("p", { class: "field-error" });
  container.appendChild(errorEl);

  container.appendChild(
    el("button", {
      class: "btn primary",
      type: "button",
      text: isFirstTime ? "Schema opslaan" : "Opslaan",
      style: "margin-top:14px;",
      onClick: async () => {
        const days = inputs.map((input) => Number(input.value));
        if (!days.every(isValidCount)) {
          errorEl.textContent = "Vul voor elke dag een geheel getal van minimaal 0 in.";
          return;
        }
        errorEl.textContent = "";
        await saveScheduleVersion(db, { id: generateId(), days, effectiveFrom: today });
        showToast("Schema opgeslagen");
        navigate("/alcohol");
      },
    })
  );
}
