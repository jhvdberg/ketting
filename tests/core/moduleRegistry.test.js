import { test } from "node:test";
import assert from "node:assert/strict";

// node --test heeft geen localStorage; modulePrefs.js (waar moduleRegistry.js
// van afhangt voor de aan/uit-voorkeur) heeft die nodig.
const store = new Map();
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};

const { registerModule, getModules, getAllModules } = await import("../../src/core/moduleRegistry.js");
const { setModuleEnabled } = await import("../../src/core/modulePrefs.js");

registerModule({ id: "test-a", name: "Test A", order: 1, available: true });
registerModule({ id: "test-b", name: "Test B", order: 2, available: true });
registerModule({ id: "test-c", name: "Test C (nog niet gebouwd)", order: 3, available: false });

test("getAllModules bevat alle beschikbare modules, ongeacht de aan/uit-voorkeur van de gebruiker", () => {
  setModuleEnabled("test-a", false);
  const all = getAllModules().map((m) => m.id);
  assert.deepEqual(all, ["test-a", "test-b"]);
  setModuleEnabled("test-a", true);
});

test("getModules sluit een uitgezette module uit, getAllModules niet", () => {
  setModuleEnabled("test-b", false);
  assert.deepEqual(getModules().map((m) => m.id), ["test-a"]);
  assert.deepEqual(getAllModules().map((m) => m.id), ["test-a", "test-b"]);
  setModuleEnabled("test-b", true);
});

test("een module met available:false wordt door beide functies uitgesloten", () => {
  assert.equal(getModules().some((m) => m.id === "test-c"), false);
  assert.equal(getAllModules().some((m) => m.id === "test-c"), false);
});
