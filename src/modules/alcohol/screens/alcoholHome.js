/** Alcohol-hoofdscherm (briefing 14.2, 18). */
import { el, clearNode } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { todayISO } from "../../../core/dateUtils.js";
import { listDays, listSchedules, getModuleStart } from "../storage.js";
import { getLimitForDate } from "../model.js";
import { missingDates } from "../analysis.js";
import { screenHeader, statusPillClass, formatLimit } from "./shared.js";

export default async function renderAlcoholHome(container) {
  const db = getDb();
  const today = todayISO();
  clearNode(container);
  container.appendChild(screenHeader({ title: "Alcohol", backTo: "#/" }));

  const schedules = await listSchedules(db);
  if (schedules.length === 0) {
    container.appendChild(
      el("div", { class: "empty-state" }, [
        el("p", { text: "Stel eerst voor alle zeven weekdagen een limiet in. Nul betekent een geplande alcoholvrije dag. Je bepaalt zelf de waarden; er zijn geen standaardlimieten." }),
        el("a", { class: "btn primary", href: "#/alcohol/schedule", text: "Weekschema instellen" }),
      ])
    );
    return;
  }

  const days = await listDays(db);
  const moduleStart = await getModuleStart(db);
  const todayRecord = days.find((d) => d.date === today);
  const limit = getLimitForDate(schedules, today);
  const missing = missingDates(days, moduleStart, today).filter((d) => d !== today);

  container.appendChild(
    el("a", { class: "card tappable", href: "#/alcohol/day" }, [
      el("div", { class: "row" }, [
        el("div", { class: "info" }, [el("div", { class: "name", text: "Vandaag" }), el("div", { class: "meta", text: `Limiet: ${formatLimit(limit)}` })]),
        todayRecord
          ? el("span", { class: statusPillClass(todayRecord.status), text: todayRecord.status })
          : el("span", { class: "status-pill", text: "Niet geregistreerd" }),
      ]),
      todayRecord ? el("div", { class: "meta", style: "margin-top:6px;", text: `${todayRecord.total} glazen geregistreerd${todayRecord.wildcard ? " · wildcard" : ""}` }) : null,
    ])
  );

  if (missing.length > 0) {
    container.appendChild(
      el("a", { class: "card tappable", href: "#/alcohol/missing" }, [
        el("div", { class: "row" }, [el("div", { class: "info" }, [el("div", { class: "name", text: `${missing.length} ontbrekende dag(en)` }), el("div", { class: "meta", text: `Oudste: ${missing[0]}` })])]),
      ])
    );
  }

  container.appendChild(el("h2", { class: "section", text: "Overzicht" }));
  const list = el("div", { class: "card" });
  const links = [
    ["Kalender", "#/alcohol/calendar"],
    ["Analyseoverzicht", "#/alcohol/analysis"],
    ["Periodevergelijkingen", "#/alcohol/comparisons"],
    ["Wildcardoverzicht", "#/alcohol/wildcards"],
    ["Impactweergave", "#/alcohol/impact"],
    ["Weekdagschema", "#/alcohol/schedule"],
  ];
  for (const [label, href] of links) {
    list.appendChild(el("a", { class: "list-row", href, text: label }));
  }
  container.appendChild(list);
}
