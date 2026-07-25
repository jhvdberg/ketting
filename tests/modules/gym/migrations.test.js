import { test } from "node:test";
import assert from "node:assert/strict";
import { migrateGymData, emptyGymData, GYM_SCHEMA_VERSION } from "../../../src/modules/gym/migrations.js";

test("migreren van de huidige versie naar zichzelf laat de data ongewijzigd", () => {
  const data = { exercises: [{ id: "e1" }], templates: [], plannedWorkouts: [], completedWorkouts: [], cycles: [], closedWeeks: [] };
  const result = migrateGymData(data, GYM_SCHEMA_VERSION, GYM_SCHEMA_VERSION);
  assert.deepEqual(result, data);
});

test("een onbekende, nieuwere schemaversie dan de app ondersteunt wordt geweigerd (12.2/17)", () => {
  assert.throws(() => migrateGymData(emptyGymData(), GYM_SCHEMA_VERSION + 1, GYM_SCHEMA_VERSION), /nieuwere schemaversie/);
});

test("een schemaversie zonder gedefinieerd migratiepad geeft een duidelijke fout", () => {
  assert.throws(() => migrateGymData(emptyGymData(), 0, GYM_SCHEMA_VERSION), /Geen migratiepad/);
});
