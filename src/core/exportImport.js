/**
 * Export en import (core, briefing hoofdstuk 10 en 11).
 *
 * Werkt uitsluitend via de moduleregistratie: core kent geen Gym-, Alcohol-
 * of Habits-specifieke velden. Import vervangt bestaande data pas nadat de
 * volledige back-up gevalideerd (en zo nodig gemigreerd) is, in één
 * atomaire IndexedDB-transactie over alle betrokken stores (11.3).
 */

import { getModules } from "./moduleRegistry.js";
import { bulkReplace } from "./db.js";
import { APP_VERSION, CORE_SCHEMA_VERSION, EXPORT_FORMAT, EXPORT_FORMAT_VERSION } from "./version.js";
import { nowTimestamp, pad2 } from "./dateUtils.js";
import { AppError } from "./errors.js";

export async function buildExport(db) {
  const modulesData = {};
  for (const mod of getModules()) {
    modulesData[mod.id] = {
      schemaVersion: mod.schemaVersion,
      data: await mod.exportData(db),
    };
  }
  return {
    format: EXPORT_FORMAT,
    exportVersion: EXPORT_FORMAT_VERSION,
    exportedAt: nowTimestamp(),
    appVersion: APP_VERSION,
    core: {
      schemaVersion: CORE_SCHEMA_VERSION,
      data: {},
    },
    modules: modulesData,
  };
}

export function exportFileName(date = new Date()) {
  return `personal-tracker-backup-${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}.json`;
}

export function parseImportFile(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new AppError("Dit bestand is geen geldig JSON-bestand en kan niet worden geïmporteerd.", { cause: err });
  }
}

export function validateImportShape(json) {
  const errors = [];
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    return { valid: false, errors: ["Bestand bevat geen geldig back-up-object."] };
  }
  if (json.format !== EXPORT_FORMAT) {
    errors.push(`Onbekend bestandsformaat (verwacht '${EXPORT_FORMAT}').`);
  }
  if (typeof json.exportVersion !== "number") {
    errors.push("Exportversie ontbreekt of is ongeldig.");
  } else if (json.exportVersion > EXPORT_FORMAT_VERSION) {
    errors.push(
      `Deze back-up gebruikt exportversie ${json.exportVersion}, nieuwer dan wat deze app-versie ondersteunt (${EXPORT_FORMAT_VERSION}). Werk eerst de app bij.`
    );
  }
  if (!json.core || typeof json.core.schemaVersion !== "number") {
    errors.push("Coregegevens ontbreken of zijn ongeldig.");
  } else if (json.core.schemaVersion > CORE_SCHEMA_VERSION) {
    errors.push(
      `De coreschemaversie in de back-up (${json.core.schemaVersion}) is nieuwer dan wat deze app-versie ondersteunt (${CORE_SCHEMA_VERSION}).`
    );
  }
  if (!json.modules || typeof json.modules !== "object" || Array.isArray(json.modules)) {
    errors.push("Moduledata ontbreekt of is ongeldig.");
    return { valid: errors.length === 0, errors };
  }
  for (const mod of getModules()) {
    const entry = json.modules[mod.id];
    if (!entry) continue; // module kan ontbreken in een oudere back-up; module start dan leeg
    if (typeof entry.schemaVersion !== "number") {
      errors.push(`Schemaversie van module '${mod.name}' ontbreekt of is ongeldig.`);
      continue;
    }
    if (entry.schemaVersion > mod.schemaVersion) {
      errors.push(
        `Module '${mod.name}' in de back-up gebruikt schemaversie ${entry.schemaVersion}, nieuwer dan wat deze app-versie ondersteunt (${mod.schemaVersion}). Werk eerst de app bij.`
      );
      continue;
    }
    const result = mod.importValidate(entry.data);
    if (!result.valid) {
      errors.push(...result.errors.map((e) => `${mod.name}: ${e}`));
    }
  }
  return { valid: errors.length === 0, errors };
}

/** Bereidt de gemigreerde records per store voor, zonder iets te schrijven. */
export async function prepareImportRecords(json) {
  const dataByStore = {};
  for (const mod of getModules()) {
    const entry = json.modules[mod.id];
    const moduleData = entry ? entry.data : mod.emptyExportData();
    const fromVersion = entry ? entry.schemaVersion : mod.schemaVersion;
    const migrated =
      fromVersion < mod.schemaVersion ? await mod.migrateExportData(moduleData, fromVersion, mod.schemaVersion) : moduleData;
    Object.assign(dataByStore, mod.prepareImportRecords(migrated));
  }
  return dataByStore;
}

/**
 * Voert de volledige veilige importflow uit (11.3): valideren, migreren,
 * pas daarna atomair vervangen. Herladen van de app is de
 * verantwoordelijkheid van de aanroeper, na een succesvolle resolve.
 */
export async function applyImport(db, json) {
  const { valid, errors } = validateImportShape(json);
  if (!valid) {
    throw new AppError(`Import geweigerd:\n${errors.join("\n")}`);
  }
  const dataByStore = await prepareImportRecords(json);
  await bulkReplace(db, dataByStore);
}
