import { test } from "node:test";
import assert from "node:assert/strict";
import { registerModule } from "../../src/core/moduleRegistry.js";
import { buildExport, validateImportShape } from "../../src/core/exportImport.js";
import { EXPORT_FORMAT, EXPORT_FORMAT_VERSION, CORE_SCHEMA_VERSION } from "../../src/core/version.js";

// Een minimale nepmodule, zodat export/import onafhankelijk van Habits en
// zonder echte IndexedDB getest kan worden.
const fakeModule = {
  id: "fake",
  name: "Fake",
  schemaVersion: 1,
  order: 99,
  available: true,
  async exportData() {
    return { items: ["a"] };
  },
  importValidate(data) {
    if (!data || !Array.isArray(data.items)) return { valid: false, errors: ["'items' ontbreekt of is ongeldig."] };
    return { valid: true, errors: [] };
  },
};
registerModule(fakeModule);

function validBackup(overrides = {}) {
  return {
    format: EXPORT_FORMAT,
    exportVersion: EXPORT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: "0.0.0-test",
    core: { schemaVersion: CORE_SCHEMA_VERSION, data: {} },
    modules: { fake: { schemaVersion: 1, data: { items: [] } } },
    ...overrides,
  };
}

test("buildExport bevat het juiste hoofdformaat en moduledata", async () => {
  const json = await buildExport(null);
  assert.equal(json.format, EXPORT_FORMAT);
  assert.equal(json.exportVersion, EXPORT_FORMAT_VERSION);
  assert.equal(json.core.schemaVersion, CORE_SCHEMA_VERSION);
  assert.deepEqual(json.modules.fake, { schemaVersion: 1, data: { items: ["a"] } });
});

test("validateImportShape accepteert een geldige back-up", () => {
  const result = validateImportShape(validBackup());
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validateImportShape weigert een onbekend bestandsformaat", () => {
  const result = validateImportShape(validBackup({ format: "iets-anders" }));
  assert.equal(result.valid, false);
});

test("validateImportShape weigert een nieuwere exportversie dan deze app ondersteunt (11.4/19.6)", () => {
  const result = validateImportShape(validBackup({ exportVersion: EXPORT_FORMAT_VERSION + 1 }));
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /nieuwer/);
});

test("validateImportShape weigert een nieuwere moduleschemaversie dan deze app ondersteunt", () => {
  const result = validateImportShape(validBackup({ modules: { fake: { schemaVersion: 2, data: { items: [] } } } }));
  assert.equal(result.valid, false);
});

test("validateImportShape geeft de modulefout van importValidate door", () => {
  const result = validateImportShape(validBackup({ modules: { fake: { schemaVersion: 1, data: { items: "geen-lijst" } } } }));
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /Fake/);
});

test("validateImportShape weigert een corrupt bestand zonder verplichte onderdelen, zonder te crashen", () => {
  assert.equal(validateImportShape(null).valid, false);
  assert.equal(validateImportShape({}).valid, false);
  assert.equal(validateImportShape({ format: EXPORT_FORMAT }).valid, false);
});
