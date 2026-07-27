/**
 * Moduledescriptor voor Lezen (briefing 4.4-achtig; deze module staat niet
 * in de oorspronkelijke briefing, zie docs/implementatiekeuzes.md).
 */

import { el } from "../../core/ui/dom.js";
import { isValidISODate, startOfWeek } from "../../core/dateUtils.js";
import { STORE_DEFS, listTexts, listLog, exportAll, replaceAll, seedFromBundledFileIfEmpty } from "./storage.js";
import { READING_SCHEMA_VERSION, migrateReadingData, emptyReadingData } from "./migrations.js";
import { weekReadCount } from "./model.js";

function importValidate(data) {
  const errors = [];
  if (!data || typeof data !== "object") return { valid: false, errors: ["Lezen-data ontbreekt of is ongeldig."] };
  const { texts, log, traditions } = data;
  if (!Array.isArray(texts)) errors.push("'texts' moet een lijst zijn.");
  if (!Array.isArray(log)) errors.push("'log' moet een lijst zijn.");
  if (traditions !== undefined && !Array.isArray(traditions)) errors.push("'traditions' moet een lijst zijn.");
  if (errors.length) return { valid: false, errors };

  const textIds = new Set();
  for (const t of texts) {
    if (!t || typeof t.id !== "string" || !t.id) {
      errors.push("Een tekst mist een geldig id.");
      continue;
    }
    if (textIds.has(t.id)) {
      errors.push(`Dubbel tekst-id: ${t.id}.`);
      continue;
    }
    textIds.add(t.id);
    if (typeof t.source !== "string" || !t.source.trim()) errors.push(`Tekst ${t.id} heeft geen geldige bron.`);
    if (typeof t.text !== "string" || !t.text.trim()) errors.push(`Tekst ${t.id} heeft geen geldige inhoud.`);
  }
  for (const l of log) {
    if (!l || !isValidISODate(l.date)) {
      errors.push("Een logregel heeft geen geldige datum.");
      continue;
    }
    if (!textIds.has(l.textId)) errors.push(`Logregel ${l.date} verwijst naar een onbekende tekst (${l.textId}).`);
  }
  return { valid: errors.length === 0, errors };
}

export const readingModule = {
  id: "reading",
  name: "Lezen",
  icon: "📖",
  route: "#/lezen",
  schemaVersion: READING_SCHEMA_VERSION,
  order: 4,
  available: true,
  stores: STORE_DEFS,

  async init(db) {
    // Vult een lege bibliotheek automatisch met het meegeleverde
    // startbestand (seed-texts.json) — geen handmatige import nodig.
    // Verder geen datumgedreven boekhouding: de tekst van vandaag wordt
    // pas gekozen en vastgelegd zodra het scherm daadwerkelijk geopend wordt.
    await seedFromBundledFileIfEmpty(db);
  },

  async exportData(db) {
    return exportAll(db);
  },

  importValidate,
  emptyExportData: emptyReadingData,
  migrateExportData: (data, fromVersion, toVersion) => migrateReadingData(data, fromVersion, toVersion),

  prepareImportRecords(data) {
    return {
      readingTexts: data.texts,
      readingLog: data.log,
      readingSettings: data.traditions && data.traditions.length ? [{ id: "filters", traditions: data.traditions }] : [],
    };
  },

  async migrateLiveData(db, fromVersion, toVersion) {
    const current = await exportAll(db);
    const migrated = migrateReadingData(current, fromVersion, toVersion);
    await replaceAll(db, migrated);
  },

  /** Rendert het "Vandaag"-blok op Home (5.3). Wijst zelf nooit een tekst toe: dat gebeurt pas op het moduleschermzelf (readingHome.js), zodat Home puur lezend blijft. */
  async renderHomeToday(container, db, todayISO) {
    const [texts, log] = await Promise.all([listTexts(db), listLog(db)]);
    if (texts.length === 0) {
      container.appendChild(
        el("a", { class: "card tappable", href: "#/lezen/bibliotheek" }, [
          el("div", { class: "row" }, [el("div", { class: "info" }, [el("div", { class: "name", text: "Lezen" }), el("div", { class: "meta", text: "Nog geen teksten in de bibliotheek" })])]),
        ])
      );
      return;
    }
    const todayEntry = log.find((l) => l.date === todayISO);
    const todayText = todayEntry ? texts.find((t) => t.id === todayEntry.textId) : null;
    const meta = todayText ? `${todayText.title || todayText.source} — ${todayText.source}` : "Tik om je tekst van vandaag te bekijken";
    container.appendChild(
      el("a", { class: "card tappable", href: "#/lezen" }, [
        el("div", { class: "row" }, [el("div", { class: "info" }, [el("div", { class: "name", text: "Lezen" }), el("div", { class: "meta", text: meta })])]),
      ])
    );
  },

  /** Rendert het "Deze week"-blok op Home (5.4). */
  async renderHomeWeek(container, db, todayISO) {
    const [texts, log] = await Promise.all([listTexts(db), listLog(db)]);
    if (texts.length === 0) return;
    const count = weekReadCount(log.map((l) => l.date), startOfWeek(todayISO), todayISO);
    container.appendChild(
      el("div", { class: "card" }, [
        el("div", { class: "row" }, [el("div", { class: "info" }, [el("div", { class: "name", text: "Lezen" }), el("div", { class: "meta", text: `${count} tekst(en) gelezen deze week` })])]),
      ])
    );
  },

  /** Korte status voor de tegel in "Alle modules" (5.5). */
  async getTileStatus(db, todayISO) {
    const texts = await listTexts(db);
    if (texts.length === 0) return "Nog geen teksten in de bibliotheek";
    const log = await listLog(db);
    return log.some((l) => l.date === todayISO) ? "Vandaag gelezen" : "Nog niet gelezen vandaag";
  },
};
