/** Habitlijst: beheer (bewerken/verwijderen), briefing 8.7 / 18. */
import { el, clearNode } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { listHabits, deleteHabit } from "../storage.js";
import { confirmDialog } from "../../../core/ui/confirm.js";
import { showToast } from "../../../core/ui/toast.js";
import { screenHeader } from "./shared.js";

export default async function renderHabitList(container) {
  const db = getDb();

  async function refresh() {
    clearNode(container);
    container.appendChild(screenHeader({ title: "Habitlijst", backTo: "#/habits" }));

    const habits = (await listHabits(db)).filter((h) => h.active).sort((a, b) => a.name.localeCompare(b.name));

    if (habits.length === 0) {
      container.appendChild(el("p", { class: "empty-state", text: "Nog geen habits." }));
    } else {
      const list = el("div", { class: "card" });
      for (const h of habits) {
        list.appendChild(
          el("div", { class: "list-row" }, [
            el("a", { href: `#/habits/${h.id}/edit`, text: h.name }),
            el("button", {
              class: "del",
              type: "button",
              text: "verwijder",
              onClick: async () => {
                const ok = await confirmDialog({
                  title: "Habit verwijderen",
                  body: `"${h.name}" wordt verwijderd, inclusief de volledige geschiedenis en streaks. Dit kan niet ongedaan worden gemaakt.`,
                  confirmLabel: "Verwijderen",
                  danger: true,
                });
                if (!ok) return;
                await deleteHabit(db, h.id);
                showToast("Habit verwijderd");
                refresh();
              },
            }),
          ])
        );
      }
      container.appendChild(list);
    }

    container.appendChild(el("a", { class: "btn primary", href: "#/habits/new", text: "+ Nieuwe habit", style: "margin-top:14px; display:block;" }));
  }

  await refresh();
}
