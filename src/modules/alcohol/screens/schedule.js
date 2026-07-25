/** Weekdagschema (briefing 7.5, 7.6, 14.2). Dropdowns 0-5 / geen maximum / handmatig, op verzoek van de gebruiker. */
import { el } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { navigate } from "../../../core/router.js";
import { todayISO } from "../../../core/dateUtils.js";
import { generateId } from "../../../core/id.js";
import { listSchedules, saveScheduleVersion } from "../storage.js";
import { scheduleForDate, isValidLimitValue, WEEKDAY_LABELS, NO_LIMIT } from "../model.js";
import { showToast } from "../../../core/ui/toast.js";
import { screenHeader } from "./shared.js";

const PRESETS = [0, 1, 2, 3, 4, 5];

function selectValueFor(limit) {
  if (limit === NO_LIMIT) return "none";
  if (PRESETS.includes(limit)) return String(limit);
  return "custom";
}

export default async function renderSchedule(container) {
  const db = getDb();
  const today = todayISO();
  const schedules = await listSchedules(db);
  const isFirstTime = schedules.length === 0;
  const current = scheduleForDate(schedules, today);

  container.appendChild(screenHeader({ title: "Weekdagschema", backTo: "#/alcohol" }));

  if (isFirstTime) {
    container.appendChild(
      el("p", {
        class: "hint",
        text: "Stel voor iedere dag het maximumaantal glazen in. 0 betekent een geplande alcoholvrije dag, 'Geen maximum' betekent dat er die dag geen limiet geldt. Je kan deze waarden later altijd aanpassen.",
      })
    );
  } else {
    container.appendChild(
      el("p", { class: "hint", text: "Een wijziging geldt vanaf vandaag. Eerdere dagen blijven beoordeeld volgens het schema dat toen gold." })
    );
  }

  const values = WEEKDAY_LABELS.map((_, idx) => (current ? current.days[idx] : 2));
  const errorEl = el("p", { class: "field-error" });

  WEEKDAY_LABELS.forEach((label, idx) => {
    container.appendChild(el("label", { text: label.charAt(0).toUpperCase() + label.slice(1) }));

    const select = el("select", {});
    select.appendChild(el("option", { value: "0", text: "0 (alcoholvrij)" }));
    for (const n of [1, 2, 3, 4, 5]) select.appendChild(el("option", { value: String(n), text: String(n) }));
    select.appendChild(el("option", { value: "none", text: "Geen maximum" }));
    select.appendChild(el("option", { value: "custom", text: "Anders..." }));
    select.value = selectValueFor(values[idx]);

    const isCustom = select.value === "custom";
    const customInput = el("input", { type: "text", inputmode: "numeric", placeholder: "Aantal", style: `margin-top:8px;${isCustom ? "" : " display:none;"}` });
    customInput.value = isCustom ? String(values[idx]) : "";

    select.addEventListener("change", () => {
      if (select.value === "none") {
        values[idx] = NO_LIMIT;
        customInput.style.display = "none";
      } else if (select.value === "custom") {
        customInput.style.display = "block";
        customInput.focus();
      } else {
        values[idx] = Number(select.value);
        customInput.style.display = "none";
      }
    });
    customInput.addEventListener("input", () => {
      values[idx] = Number(customInput.value);
    });

    container.appendChild(select);
    container.appendChild(customInput);
  });

  container.appendChild(errorEl);

  container.appendChild(
    el("button", {
      class: "btn primary",
      type: "button",
      text: isFirstTime ? "Schema opslaan" : "Opslaan",
      style: "margin-top:14px;",
      onClick: async () => {
        if (!values.every(isValidLimitValue)) {
          errorEl.textContent = "Kies voor elke dag een geldige waarde (0 of hoger, of geen maximum).";
          return;
        }
        errorEl.textContent = "";
        await saveScheduleVersion(db, { id: generateId(), days: [...values], effectiveFrom: today });
        showToast("Opgeslagen");
        navigate("/alcohol");
      },
    })
  );
}
