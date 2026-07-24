/** Daginvoer / Dagdetails (briefing 7.2, 7.4, 7.9, 7.13, 15): bewust één scherm, zie fase-2-plan. */
import { el, clearNode } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { navigate } from "../../../core/router.js";
import { todayISO, nowTimestamp, isValidISODate, isAfter } from "../../../core/dateUtils.js";
import { listDays, getDay, saveDay, deleteDay, listSchedules, getModuleStart } from "../storage.js";
import { getLimitForDate, computeDayStatus, isValidCount, dayTotal } from "../model.js";
import { ALCOHOL_SCHEMA_VERSION } from "../migrations.js";
import { missingDates } from "../analysis.js";
import { confirmDialog } from "../../../core/ui/confirm.js";
import { showToast } from "../../../core/ui/toast.js";
import { screenHeader, statusPillClass } from "./shared.js";

const WEEKDAY_LONG = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"];
const MONTHS_LONG = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

function formatDateLong(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${WEEKDAY_LONG[(date.getDay() + 6) % 7]} ${d} ${MONTHS_LONG[m - 1]} ${y}`;
}

export default async function renderDayEntry(container, params) {
  const db = getDb();
  const today = todayISO();
  const date = params.date && isValidISODate(params.date) ? params.date : today;

  const schedules = await listSchedules(db);
  if (schedules.length === 0) {
    clearNode(container);
    container.appendChild(screenHeader({ title: "Alcohol", backTo: "#/alcohol" }));
    container.appendChild(
      el("div", { class: "empty-state" }, [
        el("p", { text: "Stel eerst je weekschema in voordat je dagen kan registreren." }),
        el("a", { class: "btn primary", href: "#/alcohol/schedule", text: "Weekschema instellen" }),
      ])
    );
    return;
  }

  if (isAfter(date, today)) {
    clearNode(container);
    container.appendChild(screenHeader({ title: "Alcohol", backTo: "#/alcohol" }));
    container.appendChild(el("p", { class: "empty-state", text: "Een toekomstige datum kan niet worden geregistreerd." }));
    return;
  }

  const existing = await getDay(db, date);
  const limit = getLimitForDate(schedules, date);

  container.appendChild(screenHeader({ title: date === today ? "Vandaag" : "Dagdetails", subtitle: formatDateLong(date), backTo: "#/alcohol" }));

  const soloInput = el("input", { type: "text", inputmode: "numeric", placeholder: "0" });
  soloInput.value = existing ? String(existing.solo) : "";
  const togetherInput = el("input", { type: "text", inputmode: "numeric", placeholder: "0" });
  togetherInput.value = existing ? String(existing.together) : "";
  const socialInput = el("input", { type: "text", inputmode: "numeric", placeholder: "0" });
  socialInput.value = existing ? String(existing.social) : "";
  let wildcard = existing ? existing.wildcard : false;

  container.appendChild(el("label", { text: "Thuis solo" }));
  container.appendChild(soloInput);
  container.appendChild(el("label", { text: "Thuis samen" }));
  container.appendChild(togetherInput);
  container.appendChild(el("label", { text: "Sociale context" }));
  container.appendChild(socialInput);

  const wildcardBtn = el("button", { type: "button", class: wildcard ? "btn primary" : "btn ghost", style: "margin-top:14px;", text: wildcard ? "Wildcard actief" : "Wildcard activeren" });
  wildcardBtn.addEventListener("click", () => {
    wildcard = !wildcard;
    wildcardBtn.className = wildcard ? "btn primary" : "btn ghost";
    wildcardBtn.textContent = wildcard ? "Wildcard actief" : "Wildcard activeren";
  });
  container.appendChild(wildcardBtn);
  container.appendChild(el("p", { class: "hint", text: `Geldende daglimiet: ${limit}. Een wildcard negeert de limiet voor de naleving, maar de glazen tellen wel mee in het totaalgebruik.` }));

  const errorEl = el("p", { class: "field-error" });
  container.appendChild(errorEl);

  if (existing) {
    container.appendChild(
      el("div", { class: "row", style: "margin-top:10px;" }, [
        el("span", { text: `Totaal: ${existing.total}` }),
        el("span", { class: statusPillClass(existing.status), text: existing.status }),
      ])
    );
  }

  container.appendChild(
    el("button", {
      class: "btn primary",
      type: "button",
      text: existing ? "Opslaan" : "Registreren",
      style: "margin-top:16px;",
      onClick: async () => {
        const solo = Number(soloInput.value || 0);
        const together = Number(togetherInput.value || 0);
        const social = Number(socialInput.value || 0);
        if (![solo, together, social].every(isValidCount)) {
          errorEl.textContent = "Vul geldige gehele getallen van minimaal 0 in.";
          return;
        }
        errorEl.textContent = "";
        const total = dayTotal({ solo, together, social });
        const status = computeDayStatus(total, limit, wildcard);
        const now = nowTimestamp();
        await saveDay(db, {
          date,
          solo,
          together,
          social,
          total,
          wildcard,
          appliedLimit: limit,
          status,
          createdAt: existing ? existing.createdAt : now,
          updatedAt: now,
          schemaVersion: ALCOHOL_SCHEMA_VERSION,
        });
        showToast("Opgeslagen");

        const days = await listDays(db);
        const moduleStart = await getModuleStart(db);
        const remaining = missingDates(days, moduleStart, today);
        if (remaining.length > 0) {
          navigate(`/alcohol/day/${remaining[0]}`);
        } else {
          navigate("/alcohol");
        }
      },
    })
  );

  if (existing) {
    container.appendChild(
      el("button", {
        class: "btn danger",
        type: "button",
        text: "Record verwijderen",
        style: "margin-top:10px;",
        onClick: async () => {
          const ok = await confirmDialog({
            title: "Record verwijderen",
            body: `De registratie van ${date} wordt definitief verwijderd. Deze dag telt daarna weer als niet beoordeeld.`,
            confirmLabel: "Verwijderen",
            danger: true,
          });
          if (!ok) return;
          await deleteDay(db, date);
          showToast("Verwijderd");
          navigate("/alcohol");
        },
      })
    );
  }
}
