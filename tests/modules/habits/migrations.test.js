import { test } from "node:test";
import assert from "node:assert/strict";
import { migrateHabitsData, emptyHabitsData, HABITS_SCHEMA_VERSION } from "../../../src/modules/habits/migrations.js";

test("migreren van de huidige versie naar zichzelf laat de data ongewijzigd", () => {
  const data = { habits: [{ id: "h1" }], schedules: [], entries: [] };
  const result = migrateHabitsData(data, HABITS_SCHEMA_VERSION, HABITS_SCHEMA_VERSION);
  assert.deepEqual(result, data);
});

test("een onbekende, nieuwere schemaversie dan de app ondersteunt wordt geweigerd (12.2/17)", () => {
  assert.throws(() => migrateHabitsData(emptyHabitsData(), HABITS_SCHEMA_VERSION + 1, HABITS_SCHEMA_VERSION), /nieuwere schemaversie/);
});

test("een schemaversie zonder gedefinieerd migratiepad geeft een duidelijke fout", () => {
  assert.throws(() => migrateHabitsData(emptyHabitsData(), 0, HABITS_SCHEMA_VERSION), /Geen migratiepad/);
});
