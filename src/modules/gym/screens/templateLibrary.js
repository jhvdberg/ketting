/** Workoutbibliotheek (briefing 6.4 niveau 1, 15, 18). */
import { el, clearNode } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { listTemplates, deleteTemplate } from "../storage.js";
import { confirmDialog } from "../../../core/ui/confirm.js";
import { showToast } from "../../../core/ui/toast.js";
import { screenHeader } from "./shared.js";

export default async function renderTemplateLibrary(container) {
  const db = getDb();

  async function refresh() {
    clearNode(container);
    container.appendChild(screenHeader({ title: "Workoutbibliotheek", backTo: "#/gym" }));

    const templates = (await listTemplates(db)).sort((a, b) => a.name.localeCompare(b.name));
    if (templates.length === 0) {
      container.appendChild(el("p", { class: "empty-state", text: "Nog geen templates." }));
    } else {
      const list = el("div", { class: "card" });
      for (const t of templates) {
        list.appendChild(
          el("div", { class: "list-row" }, [
            el("a", { href: `#/gym/templates/${t.id}/edit`, text: `${t.name} (${t.exercises.length} oefeningen)` }),
            el("button", {
              class: "del",
              type: "button",
              text: "verwijder",
              onClick: async () => {
                const ok = await confirmDialog({
                  title: "Template verwijderen",
                  body: `"${t.name}" wordt verwijderd uit de bibliotheek. Geplande en voltooide workouts die hiervan zijn afgeleid blijven onveranderd, want dat zijn onafhankelijke kopieën.`,
                  confirmLabel: "Verwijderen",
                  danger: true,
                });
                if (!ok) return;
                await deleteTemplate(db, t.id);
                showToast("Template verwijderd");
                refresh();
              },
            }),
          ])
        );
      }
      container.appendChild(list);
    }

    container.appendChild(el("a", { class: "btn primary", href: "#/gym/templates/new", text: "+ Nieuw template", style: "margin-top:14px; display:block;" }));
  }

  await refresh();
}
