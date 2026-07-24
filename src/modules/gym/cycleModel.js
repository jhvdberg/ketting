/**
 * Cyclus- en weeklogica (briefing 6.6-6.13, 6.19). Puur en DOM-vrij.
 *
 * Een statische PWA heeft geen achtergrondproces dat elke maandag de
 * cyclusweek laat opschuiven. Daarom wordt alles wat puur uit datums volgt
 * live herberekend (nooit als mutable "huidige week" opgeslagen):
 * `getElapsedWeeks`/`getCurrentCycleWeekIndex` voor weergave,
 * `getEffectiveCycleStatus` voor weergave én bewerkbaarheids-checks, en
 * `reconcileCycles` als schrijvende boekhouding die bij het opstarten van
 * de module de opgeslagen status definitief bijwerkt (12.2-stijl, maar dan
 * voor datumgedreven in plaats van schemaversie-gedreven overgangen).
 *
 * Een geplande workout (blueprint) hoort structureel bij `weekIndex`
 * (0-gebaseerd, 0..weeksPerCycle-1) en wordt bij iedere herhaling van de
 * cyclus opnieuw "uitgevoerd". Voltooiing wordt daarom nooit op de
 * blueprint zelf opgeslagen, maar afgeleid uit voltooide-workoutsnapshots
 * die zowel de blueprint-ID als het absolute weeknummer (`absoluteWeekNumber`,
 * het aantal verstreken weken sinds de cyclusstart) bevatten. Dat is een
 * bewuste toevoeging bovenop de briefing: zonder dit onderscheid zou een
 * tweede keer "week 1" na een herhaling niet los te registreren zijn van
 * de eerste keer.
 */

import { addDays, weekdayMon0, isBefore, isSameOrBefore, daysBetween } from "../../core/dateUtils.js";

export const CYCLE_STATUS = {
  CONCEPT: "Concept",
  PLANNED: "Gepland",
  ACTIVE: "Actief",
  REPLACEMENT_PLANNED: "Vervanging ingepland",
  ARCHIVED: "Gearchiveerd",
  STOPPED: "Gestopt",
};

/** Eerstvolgende maandag ná de opgegeven datum (nooit dezelfde dag, ook niet als die al een maandag is, 6.8). */
export function nextMonday(fromISO) {
  const wd = weekdayMon0(fromISO); // 0 = maandag .. 6 = zondag
  return addDays(fromISO, 7 - wd);
}

/** Aantal volledig verstreken weken sinds de cyclusstart (0-gebaseerd); null als de cyclus nog niet begonnen is. */
export function getElapsedWeeks(cycle, today) {
  if (isBefore(today, cycle.startDate)) return null;
  return Math.floor(daysBetween(cycle.startDate, today) / 7);
}

/** Structurele cyclusweek (0-gebaseerd, 0..weeksPerCycle-1) voor de opgegeven datum. */
export function getCurrentCycleWeekIndex(cycle, today) {
  const elapsed = getElapsedWeeks(cycle, today);
  return elapsed === null ? null : elapsed % cycle.weeksPerCycle;
}

/**
 * Werkelijke status op een datum, afgeleid uit de opgeslagen status + datums.
 * Dit is de enige bron van waarheid voor weergave én bewerkbaarheids-checks
 * (6.11) — nooit het opgeslagen veld rechtstreeks, zodat het niet uitmaakt
 * of `reconcileCycles` al gedraaid heeft.
 */
export function getEffectiveCycleStatus(cycle, today, replacementStartDate = null) {
  if (cycle.status === CYCLE_STATUS.PLANNED) {
    return isSameOrBefore(cycle.startDate, today) ? CYCLE_STATUS.ACTIVE : CYCLE_STATUS.PLANNED;
  }
  if (cycle.status === CYCLE_STATUS.REPLACEMENT_PLANNED) {
    if (replacementStartDate && isSameOrBefore(replacementStartDate, today)) return CYCLE_STATUS.ARCHIVED;
    return CYCLE_STATUS.REPLACEMENT_PLANNED;
  }
  return cycle.status;
}

export function isEffectivelyActive(effectiveStatus) {
  return effectiveStatus === CYCLE_STATUS.ACTIVE || effectiveStatus === CYCLE_STATUS.REPLACEMENT_PLANNED;
}

/**
 * Boekhoudkundige status-overgangen die puur uit datums volgen (12.2-stijl,
 * datumgedreven). Retourneert alleen de cycli die daadwerkelijk wijzigen.
 * @param {Array} cycles alle cycli
 * @param {string} today
 */
export function reconcileCycles(cycles, today) {
  const byId = new Map(cycles.map((c) => [c.id, c]));
  const changed = [];
  for (const cycle of cycles) {
    if (cycle.status === CYCLE_STATUS.PLANNED && isSameOrBefore(cycle.startDate, today)) {
      changed.push({ ...cycle, status: CYCLE_STATUS.ACTIVE });
      continue;
    }
    if (cycle.status === CYCLE_STATUS.REPLACEMENT_PLANNED && cycle.replacedByCycleId) {
      const replacement = byId.get(cycle.replacedByCycleId);
      if (replacement && isSameOrBefore(replacement.startDate, today)) {
        changed.push({ ...cycle, status: CYCLE_STATUS.ARCHIVED, endDate: addDays(replacement.startDate, -1) });
      }
    }
  }
  return changed;
}

export function computeMissedForClosedWeek(plannedSlots, completedSlotIds) {
  const planned = plannedSlots.length;
  const completed = plannedSlots.filter((slot) => completedSlotIds.has(slot.id)).length;
  return { planned, completed, missed: planned - completed };
}

/**
 * Bepaalt de grens tot waar cyclusweken al zeker afgesloten zijn: bij een
 * gestopte/gearchiveerde cyclus is dat de dag ná de einddatum, anders
 * vandaag (6.19: "de lopende week heeft nog geen gemiste workouts").
 */
function closedBoundary(cycle, today) {
  return cycle.endDate ? addDays(cycle.endDate, 1) : today;
}

/**
 * Vindt alle inmiddels afgesloten cyclusweken zonder bestaand
 * `gymClosedWeeks`-record en berekent hun gepland/voltooid/gemist (6.19).
 * Idempotent: bestaande weken (via `existingWeekIds`, `${cycleId}:${absoluteWeekNumber}`)
 * worden overgeslagen.
 *
 * @param {object} cycle
 * @param {Array} plannedWorkoutsForCycle alle blueprints van deze cyclus
 * @param {Array} completedWorkoutsForCycle alle voltooide snapshots van deze cyclus ({plannedWorkoutId, absoluteWeekNumber})
 * @param {Set<string>} existingWeekIds
 * @param {string} today
 */
export function findClosedWeeksNeedingRecord(cycle, plannedWorkoutsForCycle, completedWorkoutsForCycle, existingWeekIds, today) {
  if (!cycle.startDate) return [];
  const boundary = closedBoundary(cycle, today);
  const elapsed = getElapsedWeeks({ startDate: cycle.startDate }, boundary);
  if (elapsed === null) return [];
  const records = [];
  for (let absoluteWeekNumber = 0; absoluteWeekNumber < elapsed; absoluteWeekNumber += 1) {
    const id = `${cycle.id}:${absoluteWeekNumber}`;
    if (existingWeekIds.has(id)) continue;
    const weekIndex = absoluteWeekNumber % cycle.weeksPerCycle;
    const weekStart = addDays(cycle.startDate, absoluteWeekNumber * 7);
    const weekEnd = addDays(weekStart, 6);
    const plannedSlots = plannedWorkoutsForCycle.filter((w) => w.weekIndex === weekIndex);
    const completedSlotIds = new Set(
      completedWorkoutsForCycle.filter((cw) => cw.absoluteWeekNumber === absoluteWeekNumber).map((cw) => cw.plannedWorkoutId)
    );
    const { planned, completed, missed } = computeMissedForClosedWeek(plannedSlots, completedSlotIds);
    records.push({
      id,
      cycleId: cycle.id,
      absoluteWeekNumber,
      weekIndex,
      startDate: weekStart,
      endDate: weekEnd,
      plannedSlotIds: plannedSlots.map((s) => s.id),
      completedSlotIds: [...completedSlotIds],
      missedSlotIds: plannedSlots.filter((s) => !completedSlotIds.has(s.id)).map((s) => s.id),
      plannedCount: planned,
      completedCount: completed,
      missedCount: missed,
    });
  }
  return records;
}

/** Is deze blueprint-slot al voltooid voor de huidige iteratie van de cyclus? */
export function isSlotCompletedThisIteration(plannedWorkoutId, absoluteWeekNumber, completedWorkoutsForCycle) {
  return completedWorkoutsForCycle.some((cw) => cw.plannedWorkoutId === plannedWorkoutId && cw.absoluteWeekNumber === absoluteWeekNumber);
}

/** Voegt de live-afgeleide status toe aan iedere cyclus (voor weergave/permissies). */
export function withEffectiveStatuses(cycles, today) {
  const byId = new Map(cycles.map((c) => [c.id, c]));
  return cycles.map((c) => {
    const replacement = c.replacedByCycleId ? byId.get(c.replacedByCycleId) : null;
    return { ...c, effectiveStatus: getEffectiveCycleStatus(c, today, replacement ? replacement.startDate : null) };
  });
}

/** De cyclus die vandaag effectief loopt (Actief of Vervanging ingepland), indien aanwezig. */
export function findActiveCycle(cycles, today) {
  return withEffectiveStatuses(cycles, today).find((c) => isEffectivelyActive(c.effectiveStatus)) || null;
}

/** Voortgang van de huidige cyclusweek (5.3/5.4), aan de hand van de blueprint-slots + hun iteratie-voltooiing. */
export function getActiveCycleWeekSummary(cycle, plannedForCycle, completedForCycle, today) {
  const absoluteWeekNumber = getElapsedWeeks(cycle, today);
  const weekIndex = absoluteWeekNumber % cycle.weeksPerCycle;
  const slots = plannedForCycle.filter((w) => w.weekIndex === weekIndex);
  const completedSlots = slots.filter((s) => isSlotCompletedThisIteration(s.id, absoluteWeekNumber, completedForCycle));
  const completedIds = new Set(completedSlots.map((s) => s.id));
  const remainingSlots = slots.filter((s) => !completedIds.has(s.id));
  return {
    absoluteWeekNumber,
    weekIndex,
    weekNumberDisplay: weekIndex + 1,
    totalWeeks: cycle.weeksPerCycle,
    planned: slots.length,
    completed: completedSlots.length,
    remaining: remainingSlots.length,
    remainingNames: remainingSlots.map((s) => s.name),
  };
}

/** Som van gemiste workouts over de laatste `n` afgesloten weken (of minder als er nog niet zoveel zijn, 5.4). */
export function summarizeMissed(closedWeeksForCycle, n) {
  const sorted = [...closedWeeksForCycle].sort((a, b) => b.absoluteWeekNumber - a.absoluteWeekNumber);
  const slice = sorted.slice(0, n);
  return { missed: slice.reduce((sum, w) => sum + w.missedCount, 0), weeksUsed: slice.length };
}
