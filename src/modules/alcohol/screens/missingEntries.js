/** Ontbrekende registraties (briefing 7.9, 18). */
import { el } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { todayISO } from "../../../core/dateUtils.js";
import { listDays, getModuleStart } from "../storage.js";
import { missingDates } from "../analysis.js";
import { screenHeader } from "./shared.js";

export default async function renderMissingEntries(container) {
  const db = getDb();
  const today = todayISO();
  const [days, moduleStart] = await Promise.all([listDays(db), getModuleStart(db)]);
  const missing = missingDates(days, moduleStart, today);

  container.appendChild(screenHeader({ title: "Ontbrekende registraties", backTo: "#/alcohol" }));

  if (missing.length === 0) {
    container.appendChild(el("p", { class: "empty-state", text: "Geen ontbrekende dagen. Alles is geregistreerd." }));
    return;
  }

  container.appendChild(el("p", { class: "hint", text: `${missing.length} dag(en) nog niet geregistreerd, oudste eerst.` }));
  const list = el("div", { class: "card" });
  for (const date of missing) {
    list.appendChild(el("a", { class: "list-row", href: `#/alcohol/day/${date}`, text: date }));
  }
  container.appendChild(list);
}
