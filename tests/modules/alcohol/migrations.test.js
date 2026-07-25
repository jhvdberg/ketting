import { test } from "node:test";
import assert from "node:assert/strict";
import { migrateAlcoholData, emptyAlcoholData, ALCOHOL_SCHEMA_VERSION } from "../../../src/modules/alcohol/migrations.js";

test("migreren van de huidige versie naar zichzelf laat de data ongewijzigd", () => {
  const data = { days: [{ date: "2026-01-01" }], schedules: [] };
  const result = migrateAlcoholData(data, ALCOHOL_SCHEMA_VERSION, ALCOHOL_SCHEMA_VERSION);
  assert.deepEqual(result, data);
});

test("een onbekende, nieuwere schemaversie dan de app ondersteunt wordt geweigerd (12.2/17)", () => {
  assert.throws(() => migrateAlcoholData(emptyAlcoholData(), ALCOHOL_SCHEMA_VERSION + 1, ALCOHOL_SCHEMA_VERSION), /nieuwere schemaversie/);
});

test("een schemaversie zonder gedefinieerd migratiepad geeft een duidelijke fout", () => {
  assert.throws(() => migrateAlcoholData(emptyAlcoholData(), 0, ALCOHOL_SCHEMA_VERSION), /Geen migratiepad/);
});
