/**
 * Moduledescriptor voor Alcohol (briefing 4.4).
 */

import { el } from "../../core/ui/dom.js";
import { isValidISODate, startOfWeek } from "../../core/dateUtils.js";
import { STORE_DEFS, listDays, listSchedules, getModuleStart, exportAll, replaceAll } from "./storage.js";
import { ALCOHOL_SCHEMA_VERSION, migrateAlcoholData, emptyAlcoholData } from "./migrations.js";
import { isValidCount, isValidScheduleDays, DAY_STATUS, getLimitForDate } from "./model.js";
import { missingDates, periodStats } from "./analysis.js";

function importValidate(data) {
  const errors = [];
  if (!data || typeof data !== "object") return { valid: false, errors: ["Alcohol-data ontbreekt of is ongeldig."] };
  const { days, schedules } = data;
  if (!Array.isArray(days)) errors.push("'days' moet een lijst zijn.");
  if (!Array.isArray(schedules)) errors.push("'schedules' moet een lijst zijn.");
  if (errors.length) return { valid: false, errors };

  const seenDates = new Set();
  for (const d of days) {
    if (!d || !isValidISODate(d.date)) {
      errors.push("Een dagrecord heeft geen geldige datum.");
      continue;
    }
    if (seenDates.has(d.date)) {
      errors.push(`Dubbel dagrecord voor ${d.date}.`);
      continue;
    }
    seenDates.add(d.date);
    if (![d.solo, d.together, d.social].every(isValidCount)) errors.push(`Dagrecord ${d.date} heeft ongeldige aantallen.`);
    if (typeof d.wildcard !== "boolean") errors.push(`Dagrecord ${d.date} heeft geen geldige wildcardstatus.`);
    if (!isValidCount(d.appliedLimit)) errors.push(`Dagrecord ${d.date} heeft geen geldige toegepaste limiet.`);
    if (!Object.values(DAY_STATUS).includes(d.status)) errors.push(`Dagrecord ${d.date} heeft geen geldige status.`);
  }
  for (const s of schedules) {
    if (!s || typeof s.id !== "string" || !s.id) {
      errors.push("Een schemaversie mist een geldig id.");
      continue;
    }
    if (!isValidISODate(s.effectiveFrom)) errors.push(`Schemaversie ${s.id} heeft een ongeldige ingangsdatum.`);
    if (!isValidScheduleDays(s.days)) errors.push(`Schemaversie ${s.id} heeft ongeldige daglimieten.`);
  }
  return { valid: errors.length === 0, errors };
}

export const alcoholModule = {
  id: "alcohol",
  name: "Alcohol",
  icon: "🍷",
  route: "#/alcohol",
  schemaVersion: ALCOHOL_SCHEMA_VERSION,
  order: 2,
  available: true,
  stores: STORE_DEFS,

  async init(_db) {
    // Geen datumgedreven boekhouding nodig: alle statistieken worden live
    // uit de ruwe dagrecords berekend, nooit gecachet (analysis.js).
  },

  async exportData(db) {
    return exportAll(db);
  },

  importValidate,
  emptyExportData: emptyAlcoholData,
  migrateExportData: (data, fromVersion, toVersion) => migrateAlcoholData(data, fromVersion, toVersion),

  prepareImportRecords(data) {
    return { alcoholDays: data.days, alcoholSchedules: data.schedules };
  },

  async migrateLiveData(db, fromVersion, toVersion) {
    const current = await exportAll(db);
    const migrated = migrateAlcoholData(current, fromVersion, toVersion);
    await replaceAll(db, migrated);
  },

  async renderHomeToday(container, db, today) {
    const schedules = await listSchedules(db);
    if (schedules.length === 0) {
      container.appendChild(
        el("a", { class: "card tappable", href: "#/alcohol/schedule" }, [
          el("div", { class: "row" }, [el("div", { class: "info" }, [el("div", { class: "name", text: "Alcohol" }), el("div", { class: "meta", text: "Stel eerst je weekschema in" })])]),
        ])
      );
      return;
    }
    const days = await listDays(db);
    const moduleStart = await getModuleStart(db);
    const todayRecord = days.find((d) => d.date === today);
    const limit = getLimitForDate(schedules, today);
    const missing = missingDates(days, moduleStart, today).filter((d) => d !== today);

    const card = el("a", { class: "card tappable", href: "#/alcohol/day" }, [
      el("div", { class: "row" }, [
        el("div", { class: "info" }, [
          el("div", { class: "name", text: "Alcohol" }),
          el("div", { class: "meta", text: `Limiet vandaag: ${limit} · ${todayRecord ? `${todayRecord.total} geregistreerd · ${todayRecord.status}` : "Nog niet geregistreerd"}` }),
        ]),
      ]),
    ]);
    container.appendChild(card);
    if (missing.length > 0) {
      container.appendChild(
        el("a", { class: "card tappable", href: `#/alcohol/day/${missing[0]}` }, [
          el("div", { class: "row" }, [el("div", { class: "info" }, [el("div", { class: "name", text: `${missing.length} ontbrekende dag(en)` }), el("div", { class: "meta", text: `Oudste: ${missing[0]}` })])]),
        ])
      );
    }
  },

  async renderHomeWeek(container, db, today) {
    const schedules = await listSchedules(db);
    if (schedules.length === 0) return;
    const days = await listDays(db);
    const stats = periodStats(days, schedules, startOfWeek(today), today);
    container.appendChild(
      el("div", { class: "card" }, [
        el("div", { class: "row" }, [
          el("div", { class: "info" }, [
            el("div", { class: "name", text: "Alcohol" }),
            el("div", { class: "meta", text: `${stats.totalGlasses} glazen · ${stats.withinDays} binnen limiet · ${stats.exceededDays} overschrijdingen · ${stats.wildcardDays} wildcards · ${stats.confirmedFreeDays} alcoholvrij` }),
          ]),
        ]),
        stats.missingDays > 0 ? el("div", { class: "meta", style: "margin-top:6px;", text: `${stats.missingDays} dag(en) nog niet geregistreerd` }) : null,
      ])
    );
  },

  async getTileStatus(db, today) {
    const schedules = await listSchedules(db);
    if (schedules.length === 0) return "Nog geen weekschema ingesteld";
    const days = await listDays(db);
    const todayRecord = days.find((d) => d.date === today);
    if (!todayRecord) return "Vandaag nog niet geregistreerd";
    return `${todayRecord.total} glazen · ${todayRecord.status}`;
  },
};
