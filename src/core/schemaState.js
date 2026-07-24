/**
 * Bijhouden van de daadwerkelijk opgeslagen schemaversie per module
 * (briefing 12.1 / 12.2), los van de IndexedDB structurele versie.
 */

import { get, put } from "./db.js";

export const CORE_META_STORE = "core_meta";
export const CORE_META_STORE_DEF = { name: CORE_META_STORE, keyPath: "id" };
const RECORD_ID = "schemaVersions";

export async function loadSchemaState(db) {
  const record = await get(db, CORE_META_STORE, RECORD_ID);
  return record ? record.versions : {};
}

export async function saveSchemaState(db, versions) {
  await put(db, CORE_META_STORE, { id: RECORD_ID, versions });
}
