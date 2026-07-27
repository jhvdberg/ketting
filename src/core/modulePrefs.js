/**
 * Gebruikersvoorkeur "module aan/uit" (Instellingen). Een kleine
 * interfacevoorkeur, dus bewust in localStorage in plaats van IndexedDB
 * (briefing/CLAUDE.md: IndexedDB voor data, localStorage voor kleine
 * voorkeuren). Uitzetten verbergt een module alleen uit Home en blokkeert
 * de routes; het raakt nooit de opgeslagen data van die module aan, en
 * schemamigraties/init blijven ook voor een uitgezette module gewoon
 * doorlopen zodat de data bij het weer aanzetten nog klopt.
 */

const STORAGE_KEY = "ketting-disabled-modules";

function readDisabledIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function isModuleEnabled(moduleId) {
  return !readDisabledIds().has(moduleId);
}

export function setModuleEnabled(moduleId, enabled) {
  const disabled = readDisabledIds();
  if (enabled) disabled.delete(moduleId);
  else disabled.add(moduleId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...disabled]));
}
