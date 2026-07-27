import { test } from "node:test";
import assert from "node:assert/strict";
import {
  selectTodaysText,
  extractImportTexts,
  isValidImportEntry,
  textDedupeKey,
  weekReadCount,
} from "../../../src/modules/reading/model.js";

test("selectTodaysText kiest bij een verse bibliotheek de laagste importvolgorde (order)", () => {
  const texts = [
    { id: "b", order: 1, lastShownDate: null },
    { id: "a", order: 0, lastShownDate: null },
  ];
  assert.equal(selectTodaysText(texts).id, "a");
});

test("selectTodaysText kiest de tekst die het langst geleden getoond is", () => {
  const texts = [
    { id: "recent", order: 0, lastShownDate: "2026-01-05" },
    { id: "oud", order: 1, lastShownDate: "2026-01-01" },
    { id: "ooit-nooit-getoond-maar-later-toegevoegd", order: 2, lastShownDate: null },
  ];
  // Nog nooit getoond wint altijd van ooit al getoond, ongeacht de datum.
  assert.equal(selectTodaysText(texts).id, "ooit-nooit-getoond-maar-later-toegevoegd");
});

test("selectTodaysText roteert door en stopt nooit: na alles tonen begint het weer bij de langst-niet-getoonde", () => {
  const texts = [
    { id: "a", order: 0, lastShownDate: "2026-01-03" },
    { id: "b", order: 1, lastShownDate: "2026-01-01" },
    { id: "c", order: 2, lastShownDate: "2026-01-02" },
  ];
  assert.equal(selectTodaysText(texts).id, "b");
});

test("extractImportTexts accepteert zowel een kale array als { texts: [...] }", () => {
  const entry = { source: "Boek", text: "Tekst" };
  assert.deepEqual(extractImportTexts([entry]), [entry]);
  assert.deepEqual(extractImportTexts({ metadata: {}, texts: [entry] }), [entry]);
  assert.equal(extractImportTexts({ metadata: {} }), null);
  assert.equal(extractImportTexts("geen json-structuur"), null);
});

test("isValidImportEntry vereist alleen source en text, de rest is optionele metadata", () => {
  assert.equal(isValidImportEntry({ source: "Boek", text: "Inhoud" }), true);
  assert.equal(isValidImportEntry({ source: "Boek", text: "Inhoud", author: "Iemand", themes: ["wisdom"] }), true);
  assert.equal(isValidImportEntry({ source: "", text: "Inhoud" }), false);
  assert.equal(isValidImportEntry({ source: "Boek", text: "" }), false);
  assert.equal(isValidImportEntry({ text: "Inhoud" }), false);
  assert.equal(isValidImportEntry(null), false);
});

test("textDedupeKey herkent dezelfde bron+referentie als duplicaat, ongeacht overige velden", () => {
  const a = { source: "Meditations", reference: "Book 2", text: "..." };
  const b = { source: "Meditations", reference: "Book 2", text: "een andere vertaling van hetzelfde" };
  const c = { source: "Meditations", reference: "Book 3", text: "..." };
  assert.equal(textDedupeKey(a), textDedupeKey(b));
  assert.notEqual(textDedupeKey(a), textDedupeKey(c));
});

test("weekReadCount telt alleen logdatums binnen de opgegeven week tot en met vandaag", () => {
  const logDates = ["2026-01-01", "2026-01-02", "2026-01-06", "2025-12-31"];
  assert.equal(weekReadCount(logDates, "2026-01-01", "2026-01-02"), 2);
});
