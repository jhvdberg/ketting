/**
 * Home (briefing 5): Vandaag, Deze week, Alle modules. Werkt uitsluitend via
 * de moduleregistratie — bevat zelf geen Gym-, Alcohol- of Habits-kennis
 * (briefing 4.3 / 19.1).
 */
import { el, clearNode } from "../core/ui/dom.js";
import { getDb } from "../core/context.js";
import { getModules } from "../core/moduleRegistry.js";
import { todayISO } from "../core/dateUtils.js";

export default async function renderHome(container) {
  const db = getDb();
  const today = todayISO();
  clearNode(container);

  container.appendChild(
    el("div", { class: "app-header" }, [
      el("div", { class: "title-group" }, [el("h1", { text: "Ketting" })]),
      el("a", { class: "icon-btn", href: "#/settings", "aria-label": "Instellingen", text: "⚙" }),
    ])
  );

  const modules = getModules();
  if (modules.length === 0) {
    container.appendChild(el("p", { class: "empty-state", text: "Geen modules ingeschakeld. Zet er een aan in Instellingen." }));
    return;
  }

  container.appendChild(el("h2", { class: "section", text: "Vandaag" }));
  for (const mod of modules) {
    await mod.renderHomeToday(container, db, today);
  }

  container.appendChild(el("h2", { class: "section", text: "Deze week" }));
  for (const mod of modules) {
    await mod.renderHomeWeek(container, db, today);
  }

  container.appendChild(el("h2", { class: "section", text: "Alle modules" }));
  const grid = el("div", { class: "tile-grid" });
  for (const mod of modules) {
    const status = await mod.getTileStatus(db, today);
    grid.appendChild(
      el("a", { class: "tile", href: mod.route }, [
        el("div", { class: "tile-icon", text: mod.icon }),
        el("div", { class: "tile-name", text: mod.name }),
        el("div", { class: "tile-status", text: status }),
      ])
    );
  }
  container.appendChild(grid);
}
