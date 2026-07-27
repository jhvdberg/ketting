/** Leesscherm: toont/kiest de tekst van een dag (roterend, zie model.js), met navigatie tussen dagen. */
import { el, clearNode } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { navigate } from "../../../core/router.js";
import { todayISO, addDays, compareISO, parseISODate, isValidISODate } from "../../../core/dateUtils.js";
import { screenHeader } from "../../../core/ui/header.js";
import { listTexts, getLogEntry, markShownToday, getSelectedTraditions } from "../storage.js";
import { selectTodaysText, filterTextsByTraditions } from "../model.js";

const MONTHS_LONG = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];

function estimateMinutes(wordCount) {
  if (!wordCount) return null;
  return Math.max(1, Math.round(wordCount / 200));
}

function dayLabel(viewDate, today) {
  if (viewDate === today) return "Vandaag";
  if (viewDate === addDays(today, -1)) return "Gisteren";
  if (viewDate === addDays(today, 1)) return "Morgen";
  const d = parseISODate(viewDate);
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

export default async function renderReadingHome(container, params) {
  const db = getDb();
  const today = todayISO();
  const viewDate = params && params.date && isValidISODate(params.date) ? params.date : today;
  const maxDate = addDays(today, 1); // "morgen" is de enige toegestane blik vooruit (voorlopige preview, zie hieronder)
  clearNode(container);

  container.appendChild(
    screenHeader({
      title: "Lezen",
      backTo: "#/",
      action: el("a", { class: "icon-btn", href: "#/lezen/bibliotheek", "aria-label": "Bibliotheek", text: "📚" }),
    })
  );

  const texts = await listTexts(db);
  if (texts.length === 0) {
    container.appendChild(
      el("div", { class: "empty-state" }, [
        el("p", { text: "Nog geen teksten in je bibliotheek." }),
        el("a", { class: "btn primary", href: "#/lezen/bibliotheek", text: "Teksten importeren" }),
      ])
    );
    return;
  }

  if (compareISO(viewDate, maxDate) > 0) {
    navigate(`/lezen/${maxDate}`);
    return;
  }

  container.appendChild(
    el("div", { class: "row", style: "justify-content:space-between; align-items:center; margin:10px 0;" }, [
      el("a", { class: "icon-btn", href: `#/lezen/${addDays(viewDate, -1)}`, "aria-label": "Vorige dag", text: "‹" }),
      el("span", { class: "hint", text: dayLabel(viewDate, today) }),
      compareISO(viewDate, maxDate) < 0
        ? el("a", { class: "icon-btn", href: `#/lezen/${addDays(viewDate, 1)}`, "aria-label": "Volgende dag", text: "›" })
        : el("span", { class: "icon-btn", style: "visibility:hidden;", text: "›" }),
    ])
  );

  let text = null;
  let isPreview = false;

  if (viewDate === today) {
    const existingEntry = await getLogEntry(db, today);
    text = existingEntry ? texts.find((t) => t.id === existingEntry.textId) : null;
    if (!text) {
      const filtered = filterTextsByTraditions(texts, await getSelectedTraditions(db));
      if (filtered.length === 0) {
        renderFilterEmptyState(container);
        return;
      }
      const chosen = selectTodaysText(filtered);
      await markShownToday(db, chosen.id, today);
      text = chosen;
    }
  } else if (compareISO(viewDate, today) < 0) {
    // Verleden: alleen tonen wat daadwerkelijk gelogd is, nooit met terugwerkende kracht alsnog toewijzen.
    const entry = await getLogEntry(db, viewDate);
    text = entry ? texts.find((t) => t.id === entry.textId) : null;
    if (!text) {
      container.appendChild(el("div", { class: "empty-state" }, [el("p", { text: "Op deze dag is geen tekst geregistreerd." })]));
      return;
    }
  } else {
    // viewDate === maxDate ("morgen"): voorlopige, niet-opgeslagen preview.
    const filtered = filterTextsByTraditions(texts, await getSelectedTraditions(db));
    if (filtered.length === 0) {
      renderFilterEmptyState(container);
      return;
    }
    text = selectTodaysText(filtered);
    isPreview = true;
  }

  if (isPreview) {
    container.appendChild(el("p", { class: "hint", style: "font-style:italic;", text: "Voorlopige tekst voor morgen — kan nog wijzigen totdat je hem echt opent." }));
  }

  const minutes = estimateMinutes(text.wordCount);
  const metaParts = [text.author, text.source, text.reference].filter(Boolean);
  container.appendChild(
    el("div", { class: "card" }, [
      el("h2", { style: "margin-bottom:4px;", text: text.title || text.source }),
      el("p", { class: "hint", text: metaParts.join(" — ") + (minutes ? ` · ~${minutes} min` : "") }),
      text.themes && text.themes.length ? el("p", { class: "hint", style: "margin-top:6px;", text: text.themes.join(" · ") }) : null,
    ])
  );

  if (text.quote) {
    container.appendChild(
      el("div", { class: "card", style: "border-left:3px solid var(--amber); font-style:italic;" }, [el("p", { text: `“${text.quote}”` })])
    );
  }

  const body = el("div", { class: "card" });
  for (const paragraph of text.text.split(/\n\n+/)) {
    if (paragraph.trim() === "") continue;
    body.appendChild(el("p", { style: "margin-bottom:12px; white-space:pre-line;", text: paragraph }));
  }
  container.appendChild(body);

  if (text.translator || text.editionYear) {
    container.appendChild(
      el("p", { class: "hint", text: [text.translator ? `Vertaling: ${text.translator}` : null, text.editionYear ? `${text.editionYear}` : null].filter(Boolean).join(" · ") })
    );
  }
}

function renderFilterEmptyState(container) {
  container.appendChild(
    el("div", { class: "empty-state" }, [
      el("p", { text: "Geen teksten beschikbaar voor de gekozen filters." }),
      el("a", { class: "btn primary", href: "#/lezen/bibliotheek", text: "Filter aanpassen" }),
    ])
  );
}
