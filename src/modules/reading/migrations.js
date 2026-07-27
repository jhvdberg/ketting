/**
 * Schemaversie en migraties voor de Lezen-module (briefing 4.3 / 12.1),
 * zelfde patroon als Habits/Gym/Alcohol.
 */

export const READING_SCHEMA_VERSION = 1;

/** Sleutel = bronversie, waarde = functie die naar bronversie + 1 migreert. */
const MIGRATIONS = {
  // Nog geen eerdere schemaversies: hier komen toekomstige migratiestappen.
};

export function emptyReadingData() {
  return { texts: [], log: [] };
}

export function migrateReadingData(data, fromVersion, toVersion = READING_SCHEMA_VERSION) {
  if (fromVersion > toVersion) {
    throw new Error(
      `Onbekende, nieuwere schemaversie voor Lezen (${fromVersion}). Werk eerst de app bij voordat je deze back-up importeert.`
    );
  }
  let migrated = data;
  let version = fromVersion;
  while (version < toVersion) {
    const step = MIGRATIONS[version];
    if (!step) {
      throw new Error(`Geen migratiepad gevonden van Lezen-schemaversie ${version} naar ${version + 1}.`);
    }
    migrated = step(migrated);
    version += 1;
  }
  return migrated;
}
