/** Habitdetails (briefing 18). */
import { el } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { navigate } from "../../../core/router.js";
import { todayISO } from "../../../core/dateUtils.js";
import { loadHabitData, deleteHabit } from "../storage.js";
import { scheduleForDate, scheduleLabel, computeStreaks } from "../model.js";
import { confirmDialog } from "../../../core/ui/confirm.js";
import { showToast } from "../../../core/ui/toast.js";
import { screenHeader } from "./shared.js";

export default async function renderHabitDetail(container, params) {
  const db = getDb();
  const { habit, schedules, entries } = await loadHabitData(db, params.id);
  if (!habit) {
    container.appendChild(el("div", { class: "empty-state", text: "Deze habit bestaat niet (meer)." }));
    return;
  }

  const today = todayISO();
  const currentSchedule = scheduleForDate(schedules, today);
  const { current, longest } = computeStreaks(schedules, entries, today);

  container.appendChild(screenHeader({ title: habit.name, backTo: "#/habits" }));
  if (habit.description) container.appendChild(el("p", { class: "hint", text: habit.description }));

  container.appendChild(
    el("div", { class: "stat-row", style: "margin-top:14px;" }, [
      el("div", { class: "stat" }, [el("div", { class: "value", text: String(current) }), el("div", { class: "label", text: "Huidige streak" })]),
      el("div", { class: "stat" }, [el("div", { class: "value", text: String(longest) }), el("div", { class: "label", text: "Langste streak" })]),
    ])
  );

  container.appendChild(el("h2", { class: "section", text: "Schema" }));
  container.appendChild(
    el("p", {
      class: "hint",
      text: currentSchedule ? `Gepland: ${scheduleLabel(currentSchedule.days)} (sinds ${currentSchedule.effectiveFrom})` : "Nog geen schema.",
    })
  );

  container.appendChild(
    el("div", { class: "btn-row" }, [
      el("a", { class: "btn ghost", href: `#/habits/${habit.id}/calendar`, text: "Kalender" }),
      el("a", { class: "btn ghost", href: `#/habits/${habit.id}/streaks`, text: "Streaks" }),
    ])
  );
  container.appendChild(
    el("div", { class: "btn-row" }, [
      el("a", { class: "btn", href: `#/habits/${habit.id}/edit`, text: "Bewerken" }),
      el("button", {
        class: "btn danger",
        type: "button",
        text: "Verwijderen",
        onClick: async () => {
          const ok = await confirmDialog({
            title: "Habit verwijderen",
            body: `"${habit.name}" wordt verwijderd, inclusief de volledige geschiedenis en streaks. Dit kan niet ongedaan worden gemaakt.`,
            confirmLabel: "Verwijderen",
            danger: true,
          });
          if (!ok) return;
          await deleteHabit(db, habit.id);
          showToast("Habit verwijderd");
          navigate("/habits");
        },
      }),
    ])
  );
}
