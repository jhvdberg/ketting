/** Vandaag-scherm: toont/kiest de tekst van vandaag (roterend, zie model.js). */
import { el, clearNode } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { todayISO } from "../../../core/dateUtils.js";
import { screenHeader } from "../../../core/ui/header.js";
import { listTexts, getLogEntry, markShownToday } from "../storage.js";
import { selectTodaysText } from "../model.js";

function estimateMinutes(wordCount) {
  if (!wordCount) return null;
  return Math.max(1, Math.round(wordCount / 200));
}

export default async function renderReadingHome(container) {
  const db = getDb();
  const today = todayISO();
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

  const existingEntry = await getLogEntry(db, today);
  let text;
  if (existingEntry) {
    text = texts.find((t) => t.id === existingEntry.textId);
  } else {
    const chosen = selectTodaysText(texts);
    await markShownToday(db, chosen.id, today);
    text = chosen;
  }

  if (!text) {
    // De gelogde tekst bestaat niet meer (bv. verwijderd); kies opnieuw voor vandaag.
    const chosen = selectTodaysText(texts);
    await markShownToday(db, chosen.id, today);
    text = chosen;
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
