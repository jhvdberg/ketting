import { test } from "node:test";
import assert from "node:assert/strict";
import { migrateReadingData, emptyReadingData, READING_SCHEMA_VERSION } from "../../../src/modules/reading/migrations.js";

test("migreren van de huidige versie naar zichzelf laat de data ongewijzigd", () => {
  const data = { texts: [{ id: "t1" }], log: [] };
  const result = migrateReadingData(data, READING_SCHEMA_VERSION, READING_SCHEMA_VERSION);
  assert.deepEqual(result, data);
});

test("een onbekende, nieuwere schemaversie dan de app ondersteunt wordt geweigerd (12.2/17)", () => {
  assert.throws(() => migrateReadingData(emptyReadingData(), READING_SCHEMA_VERSION + 1, READING_SCHEMA_VERSION), /nieuwere schemaversie/);
});

test("een schemaversie zonder gedefinieerd migratiepad geeft een duidelijke fout", () => {
  assert.throws(() => migrateReadingData(emptyReadingData(), 0, READING_SCHEMA_VERSION), /Geen migratiepad/);
});
