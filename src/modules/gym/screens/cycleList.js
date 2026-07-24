/** Cyclusoverzicht (briefing 18). */
import { el, clearNode } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { todayISO } from "../../../core/dateUtils.js";
import { listCycles } from "../storage.js";
import { withEffectiveStatuses, CYCLE_STATUS } from "../cycleModel.js";
import { screenHeader } from "./shared.js";

export default async function renderCycleList(container) {
  const db = getDb();
  clearNode(container);
  container.appendChild(screenHeader({ title: "Cycli", backTo: "#/gym" }));

  const today = todayISO();
  const cycles = withEffectiveStatuses(await listCycles(db), today).filter((c) => c.effectiveStatus !== CYCLE_STATUS.ARCHIVED);

  if (cycles.length === 0) {
    container.appendChild(el("p", { class: "empty-state", text: "Nog geen cycli." }));
  } else {
    const list = el("div", { class: "card" });
    for (const c of cycles.sort((a, b) => (a.startDate || "").localeCompare(b.startDate || ""))) {
      const href = c.effectiveStatus === CYCLE_STATUS.ACTIVE || c.effectiveStatus === CYCLE_STATUS.REPLACEMENT_PLANNED ? "#/gym/cycles/active" : `#/gym/cycles/${c.id}/edit`;
      list.appendChild(el("a", { class: "list-row", href }, [el("span", { text: c.name }), el("span", { class: "status-pill", text: c.effectiveStatus })]));
    }
    container.appendChild(list);
  }

  container.appendChild(
    el("div", { class: "btn-row" }, [
      el("a", { class: "btn ghost", href: "#/gym/cycles/archived", text: "Gearchiveerd" }),
      el("a", { class: "btn primary", href: "#/gym/cycles/new", text: "+ Nieuwe cyclus" }),
    ])
  );
}
