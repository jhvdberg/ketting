/** Impactweergave (briefing 7.19-7.22) — vaste, regelgebaseerde placeholdercontent. */
import { el, clearNode } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { navigate } from "../../../core/router.js";
import { todayISO, isValidISODate, addDays, isBefore } from "../../../core/dateUtils.js";
import { listDays } from "../storage.js";
import { resolveDirectImpact, computeSevenDayContext, resolveContextImpact, placeholderText, IMPACT_CONTENT_VERSION } from "../impactContent.js";
import { screenHeader } from "./shared.js";

export default async function renderImpactView(container, params) {
  const db = getDb();
  clearNode(container);
  const today = todayISO();
  const days = await listDays(db);

  // "Afgesloten kalenderdag" = strikt vóór vandaag (7.22).
  let date = params.date && isValidISODate(params.date) ? params.date : null;
  if (!date) {
    const closedRegistered = days.filter((d) => d.date < today).sort((a, b) => (a.date < b.date ? 1 : -1));
    date = closedRegistered.length ? closedRegistered[0].date : null;
  }

  container.appendChild(screenHeader({ title: "Impactweergave", backTo: "#/alcohol" }));

  if (!date) {
    container.appendChild(el("p", { class: "empty-state", text: "Nog geen afgesloten, geregistreerde dag beschikbaar." }));
    return;
  }

  const record = days.find((d) => d.date === date);
  if (!record || date >= today) {
    container.appendChild(el("p", { class: "empty-state", text: "Deze dag is nog niet afgesloten of geregistreerd." }));
    return;
  }

  const directKey = resolveDirectImpact(record.total);
  const context = computeSevenDayContext(days, date);
  const contextKey = resolveContextImpact(context);

  container.appendChild(
    el("div", { class: "row", style: "justify-content:space-between; margin-bottom:10px;" }, [
      el("button", { class: "icon-btn", type: "button", "aria-label": "Vorige dag", text: "‹", onClick: () => navigate(`/alcohol/impact/${addDays(date, -1)}`) }),
      el("div", { class: "subtitle", text: date }),
      el("button", { class: "icon-btn", type: "button", "aria-label": "Volgende dag", text: "›", disabled: !isBefore(addDays(date, 1), today), onClick: () => navigate(`/alcohol/impact/${addDays(date, 1)}`) }),
    ])
  );

  container.appendChild(el("h2", { class: "section", text: "Directe impact" }));
  container.appendChild(
    el("div", { class: "card" }, [el("p", { text: placeholderText(directKey) }), el("p", { class: "hint", text: `Gebaseerd op ${record.total} glazen op ${date}.` })])
  );

  container.appendChild(el("h2", { class: "section", text: "Zevendaagse context" }));
  container.appendChild(
    el("div", { class: "card" }, [
      el("p", { text: placeholderText(contextKey) }),
      el("p", {
        class: "hint",
        text: `${context.totalGlasses} glazen in 7 dagen · ${context.registeredDays} geregistreerd, ${context.missingDays} ontbrekend · ${context.drinkingDays} drinkdagen · ${context.confirmedFreeDays} alcoholvrij · ${context.consecutiveDrinkingDays} opeenvolgende drinkdagen · ${context.exceedances} overschrijdingen · ${context.wildcards} wildcards.`,
      }),
    ])
  );

  container.appendChild(
    el("p", { class: "hint", style: "margin-top:10px;", text: `Contentversie ${IMPACT_CONTENT_VERSION}. Teksten zijn tijdelijke placeholders totdat de definitieve, regelgebaseerde content wordt aangeleverd.` })
  );
}
