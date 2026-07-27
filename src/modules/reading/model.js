/**
 * Lezen-domeinlogica: welke tekst hoort bij vandaag, en de vorm van een
 * geïmporteerd tekstenpakket. Puur en DOM-vrij zodat dit via `node --test`
 * te testen is.
 */

import { compareISO } from "../../core/dateUtils.js";

/**
 * Kiest de tekst voor vandaag uit de bibliotheek: de tekst die het langst
 * geleden (of nooit) getoond is. Bij gelijke stand (meestal: nog nooit
 * getoond) wint de laagste `order`, zodat een verse bibliotheek in
 * importvolgorde begint en daarna vanzelf op "langst niet gelezen" roteert.
 * Geen harde stop of lege staat zodra alles ooit getoond is: het rouleert
 * gewoon door.
 *
 * @param {Array<{id: string, order: number, lastShownDate: string|null}>} texts
 */
export function selectTodaysText(texts) {
  if (texts.length === 0) return null;
  const sorted = [...texts].sort((a, b) => {
    if (a.lastShownDate == null && b.lastShownDate == null) return a.order - b.order;
    if (a.lastShownDate == null) return -1;
    if (b.lastShownDate == null) return 1;
    const byDate = compareISO(a.lastShownDate, b.lastShownDate);
    return byDate !== 0 ? byDate : a.order - b.order;
  });
  return sorted[0];
}

/** Haalt de lijst met tekstentries uit een geïmporteerd bestand: accepteert zowel een kale array als `{ texts: [...] }`. */
export function extractImportTexts(json) {
  if (Array.isArray(json)) return json;
  if (json && typeof json === "object" && Array.isArray(json.texts)) return json.texts;
  return null;
}

/** Enige harde eisen aan een tekstentry: waar hij vandaan komt en de tekst zelf. Overige velden zijn optionele metadata. */
export function isValidImportEntry(entry) {
  return (
    !!entry &&
    typeof entry === "object" &&
    typeof entry.source === "string" &&
    entry.source.trim() !== "" &&
    typeof entry.text === "string" &&
    entry.text.trim() !== ""
  );
}

/** Natuurlijke sleutel om duplicaten te herkennen bij een herhaalde import van (deels) hetzelfde pakket. */
export function textDedupeKey(entry) {
  return `${entry.source}::${entry.reference || entry.title || entry.text.slice(0, 80)}`;
}

/** Aantal dagen deze week waarvoor al een tekst is toegewezen (5.4-achtig, geen "gemist"-concept zoals Habits). */
export function weekReadCount(logDates, weekStartISO, todayISO) {
  return logDates.filter((d) => compareISO(d, weekStartISO) >= 0 && compareISO(d, todayISO) <= 0).length;
}
