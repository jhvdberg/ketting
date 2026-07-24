/**
 * Schemaversie en migraties voor de Habits-module (briefing 4.3 / 12.1).
 *
 * Werkt op de platte exportvorm ({ habits, schedules, entries }), zodat
 * dezelfde migratiestappen herbruikt worden voor zowel het bijwerken van de
 * actieve IndexedDB-data als het importeren van een oudere back-up.
 */

export const HABITS_SCHEMA_VERSION = 1;

/** Sleutel = bronversie, waarde = functie die naar bronversie + 1 migreert. */
const MIGRATIONS = {
  // Nog geen eerdere schemaversies: hier komen toekomstige migratiestappen.
};

export function emptyHabitsData() {
  return { habits: [], schedules: [], entries: [] };
}

export function migrateHabitsData(data, fromVersion, toVersion = HABITS_SCHEMA_VERSION) {
  if (fromVersion > toVersion) {
    throw new Error(
      `Onbekende, nieuwere schemaversie voor Habits (${fromVersion}). Werk eerst de app bij voordat je deze back-up importeert.`
    );
  }
  let migrated = data;
  let version = fromVersion;
  while (version < toVersion) {
    const step = MIGRATIONS[version];
    if (!step) {
      throw new Error(`Geen migratiepad gevonden van Habits-schemaversie ${version} naar ${version + 1}.`);
    }
    migrated = step(migrated);
    version += 1;
  }
  return migrated;
}
