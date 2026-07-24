/**
 * IndexedDB-toegang voor de Alcoholmodule. Enige bestand dat de object
 * stores rechtstreeks aanraakt (briefing 4.3).
 */

import { getAll, get, put, del, bulkReplace } from "../../core/db.js";
import { upsertScheduleVersion, getModuleStartDate } from "./model.js";

export const STORE_DEFS = [
  { name: "alcoholDays", keyPath: "date" },
  { name: "alcoholSchedules", keyPath: "id" },
];

export const listDays = (db) => getAll(db, "alcoholDays");
export const getDay = (db, date) => get(db, "alcoholDays", date);
export const saveDay = (db, record) => put(db, "alcoholDays", record);
export const deleteDay = (db, date) => del(db, "alcoholDays", date);

export const listSchedules = (db) => getAll(db, "alcoholSchedules");

export async function saveScheduleVersion(db, version) {
  const existing = await listSchedules(db);
  const next = upsertScheduleVersion(existing, version);
  await bulkReplace(db, { alcoholSchedules: next });
}

export async function getModuleStart(db) {
  const [schedules, days] = await Promise.all([listSchedules(db), listDays(db)]);
  return getModuleStartDate(schedules, days);
}

export async function exportAll(db) {
  const [days, schedules] = await Promise.all([listDays(db), listSchedules(db)]);
  return { days, schedules };
}

export function replaceAll(db, data) {
  return bulkReplace(db, { alcoholDays: data.days, alcoholSchedules: data.schedules });
}
