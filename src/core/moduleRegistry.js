/**
 * Moduleregister (core, briefing 4.4).
 *
 * Bevat geen kennis van individuele modules. Elke module registreert
 * zichzelf met een vaste descriptor. Home en Instellingen werken uitsluitend
 * via deze registratie, zodat een nieuwe module als tegel verschijnt zonder
 * dat de core-logica wordt aangepast (briefing 19.1).
 */

import { isModuleEnabled } from "./modulePrefs.js";

const modules = [];

/**
 * @typedef {object} ModuleDescriptor
 * @property {string} id
 * @property {string} name
 * @property {string} icon
 * @property {string} route            hoofdroute, bv. "#/habits"
 * @property {number} schemaVersion
 * @property {Array<{name: string, keyPath: string, indexes?: Array}>} stores
 * @property {(db: IDBDatabase) => Promise<void>} init
 * @property {(db: IDBDatabase) => Promise<any>} exportData
 * @property {(data: any) => {valid: boolean, errors: string[]}} importValidate
 * @property {(db: IDBDatabase, data: any) => Promise<any>} prepareImportRecords  geeft {storeName: records[]} terug voor bulkReplace
 * @property {(db: IDBDatabase, today: string) => Promise<{today: any, week: any, tile: {label: string, status: string}}>} homeSummary
 * @property {boolean} [available]
 * @property {number} order
 */

/** @param {ModuleDescriptor} mod */
export function registerModule(mod) {
  if (modules.some((m) => m.id === mod.id)) {
    throw new Error(`Module '${mod.id}' is al geregistreerd.`);
  }
  modules.push(mod);
  modules.sort((a, b) => a.order - b.order);
}

/** Modules die nu getoond/genavigeerd mogen worden: gebouwd én door de gebruiker aangezet. */
export function getModules() {
  return modules.filter((m) => m.available !== false && isModuleEnabled(m.id));
}

/**
 * Alle gebouwde modules, ongeacht de aan/uit-voorkeur van de gebruiker.
 * Gebruikt voor dingen die altijd moeten doorlopen los van die voorkeur:
 * schemamigraties, module-init, de store-definities voor de database, en
 * de instellingenlijst waar je een module juist weer aanzet.
 */
export function getAllModules() {
  return modules.filter((m) => m.available !== false);
}

export function getModule(id) {
  return modules.find((m) => m.id === id);
}

export function getAllStoreDefs() {
  return modules.flatMap((m) => m.stores || []);
}
