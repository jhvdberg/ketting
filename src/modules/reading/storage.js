/**
 * IndexedDB-toegang voor de Lezen-module. Enige bestand dat de object
 * stores rechtstreeks aanraakt (briefing 4.3).
 */

import { getAll, get, put, putAll, bulkReplace } from "../../core/db.js";
import { generateId } from "../../core/id.js";
import { nowTimestamp } from "../../core/dateUtils.js";
import { textDedupeKey } from "./model.js";

export const STORE_DEFS = [
  { name: "readingTexts", keyPath: "id" },
  { name: "readingLog", keyPath: "date" },
];

export const listTexts = (db) => getAll(db, "readingTexts");
export const getText = (db, id) => get(db, "readingTexts", id);
export const listLog = (db) => getAll(db, "readingLog");
export const getLogEntry = (db, date) => get(db, "readingLog", date);

/** Wijst een tekst toe aan vandaag: logt de datum en werkt de rotatiestatus van de tekst bij. */
export async function markShownToday(db, textId, date) {
  const text = await getText(db, textId);
  if (text) {
    await put(db, "readingTexts", { ...text, lastShownDate: date, timesShown: (text.timesShown || 0) + 1 });
  }
  await put(db, "readingLog", { date, textId });
}

/**
 * Voegt geïmporteerde tekstentries toe aan de bibliotheek. Additief: bestaande
 * teksten blijven staan, entries die op bron+referentie al aanwezig zijn
 * worden overgeslagen (voorkomt duplicaten bij een herhaalde import van
 * hetzelfde pakket).
 * @returns {Promise<{added: number, skipped: number}>}
 */
export async function importTexts(db, entries) {
  const existing = await listTexts(db);
  const existingKeys = new Set(existing.map(textDedupeKey));
  const now = nowTimestamp();
  let nextOrder = existing.length;
  const toAdd = [];
  let skipped = 0;
  for (const entry of entries) {
    const key = textDedupeKey(entry);
    if (existingKeys.has(key)) {
      skipped += 1;
      continue;
    }
    existingKeys.add(key);
    toAdd.push({
      id: generateId(),
      order: nextOrder,
      tradition: entry.tradition ?? null,
      school: entry.school ?? null,
      author: entry.author ?? null,
      source: entry.source,
      translator: entry.translator ?? null,
      editionYear: entry.editionYear ?? null,
      reference: entry.reference ?? null,
      title: entry.title ?? null,
      text: entry.text,
      quote: entry.quote ?? null,
      primaryTheme: entry.primaryTheme ?? null,
      themes: Array.isArray(entry.themes) ? entry.themes : [],
      wordCount: entry.wordCount ?? null,
      lastShownDate: null,
      timesShown: 0,
      addedAt: now,
    });
    nextOrder += 1;
  }
  if (toAdd.length > 0) await putAll(db, "readingTexts", toAdd);
  return { added: toAdd.length, skipped };
}

export async function exportAll(db) {
  const [texts, log] = await Promise.all([listTexts(db), listLog(db)]);
  return { texts, log };
}

export function replaceAll(db, data) {
  return bulkReplace(db, { readingTexts: data.texts, readingLog: data.log });
}
