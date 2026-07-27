/**
 * IndexedDB-toegang voor de Lezen-module. Enige bestand dat de object
 * stores rechtstreeks aanraakt (briefing 4.3).
 */

import { getAll, get, put, putAll, bulkReplace } from "../../core/db.js";
import { generateId } from "../../core/id.js";
import { nowTimestamp } from "../../core/dateUtils.js";
import { textDedupeKey, extractImportTexts, isValidImportEntry } from "./model.js";
import { logError } from "../../core/errors.js";

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

/**
 * Vult een lege bibliotheek automatisch met het meegeleverde startbestand
 * (`seed-texts.json`, naast dit bestand). Doet niets zodra er al teksten
 * zijn — dit is dus geen doorlopende sync, alleen een eenmalige vulling bij
 * de eerste keer opstarten (of na "alles verwijderen"). Een netwerk-/
 * parsefout mag het opstarten van de app nooit blokkeren, dus die wordt
 * hier zelf afgevangen in plaats van doorgegooid.
 */
export async function seedFromBundledFileIfEmpty(db) {
  const existing = await listTexts(db);
  if (existing.length > 0) return { added: 0, skipped: 0 };
  try {
    const res = await fetch(new URL("./seed-texts.json", import.meta.url));
    if (!res.ok) return { added: 0, skipped: 0 };
    const json = await res.json();
    const entries = extractImportTexts(json) || [];
    return await importTexts(db, entries.filter(isValidImportEntry));
  } catch (err) {
    logError("reading-seed", err);
    return { added: 0, skipped: 0 };
  }
}

export async function exportAll(db) {
  const [texts, log] = await Promise.all([listTexts(db), listLog(db)]);
  return { texts, log };
}

export function replaceAll(db, data) {
  return bulkReplace(db, { readingTexts: data.texts, readingLog: data.log });
}
