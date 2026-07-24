/** Gearchiveerde cycli (briefing 6.12, 18). */
import { el, clearNode } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { todayISO } from "../../../core/dateUtils.js";
import { listCycles } from "../storage.js";
import { withEffectiveStatuses, CYCLE_STATUS } from "../cycleModel.js";
import { screenHeader } from "./shared.js";

export default async function renderArchivedCycles(container) {
  const db = getDb();
  clearNode(container);
  container.appendChild(screenHeader({ title: "Gearchiveerde cycli", backTo: "#/gym" }));

  const today = todayISO();
  const cycles = withEffectiveStatuses(await listCycles(db), today).filter((c) => c.effectiveStatus === CYCLE_STATUS.ARCHIVED);
  if (cycles.length === 0) {
    container.appendChild(el("p", { class: "empty-state", text: "Nog geen gearchiveerde cycli." }));
    return;
  }
  const list = el("div", { class: "card" });
  for (const c of cycles.sort((a, b) => (b.endDate || "").localeCompare(a.endDate || ""))) {
    list.appendChild(
      el("a", { class: "list-row", href: `#/gym/cycles/archived/${c.id}` }, [el("span", { text: c.name }), el("span", { class: "hint", text: c.endDate ? `tot ${c.endDate}` : "" })])
    );
  }
  container.appendChild(list);
}
