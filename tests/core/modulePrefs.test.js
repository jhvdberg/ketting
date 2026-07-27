import { test } from "node:test";
import assert from "node:assert/strict";

// node --test heeft geen localStorage (browser-only API); minimale in-memory
// nabootsing zodat deze verder pure logica toch getest kan worden.
const store = new Map();
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};

const { isModuleEnabled, setModuleEnabled } = await import("../../src/core/modulePrefs.js");

test("modules zijn standaard aangezet", () => {
  assert.equal(isModuleEnabled("een-onbekende-module"), true);
});

test("setModuleEnabled(id, false) zet een module uit, true zet hem weer aan", () => {
  assert.equal(isModuleEnabled("gym"), true);
  setModuleEnabled("gym", false);
  assert.equal(isModuleEnabled("gym"), false);
  setModuleEnabled("gym", true);
  assert.equal(isModuleEnabled("gym"), true);
});

test("uitzetten van de ene module laat een andere module onaangeroerd", () => {
  setModuleEnabled("alcohol", false);
  assert.equal(isModuleEnabled("alcohol"), false);
  assert.equal(isModuleEnabled("habits"), true);
  setModuleEnabled("alcohol", true);
});
