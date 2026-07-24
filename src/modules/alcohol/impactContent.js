/**
 * Impactcontent als configuratie, los van de functionele code (briefing
 * 7.19-7.21). De regelmachine en contentstructuur zijn compleet; de
 * definitieve teksten zijn dat bewust niet. Elke contentKey wordt in de UI
 * getoond als een expliciet herkenbare placeholder (bv. `[[impact.direct.medium]]`)
 * totdat de echte, regelgebaseerde (niet AI-gegenereerde) teksten apart
 * worden aangeleverd. Geen medisch voorbehoud rond deze placeholders.
 */

export const IMPACT_CONTENT_VERSION = 1;

/** Directe impact: gebaseerd op het dagtotaal (7.20). */
export const DIRECT_IMPACT_RULES = [
  { id: "direct-0", min: 0, max: 0, contentKey: "impact.direct.zero" },
  { id: "direct-1-2", min: 1, max: 2, contentKey: "impact.direct.low" },
  { id: "direct-3-4", min: 3, max: 4, contentKey: "impact.direct.medium" },
  { id: "direct-5plus", min: 5, max: null, contentKey: "impact.direct.high" },
];

export function resolveDirectImpact(total) {
  const rule = DIRECT_IMPACT_RULES.find((r) => total >= r.min && (r.max === null || total <= r.max));
  return rule ? rule.contentKey : null;
}

/**
 * Zevendaagse context: de betreffende dag + de zes voorgaande kalenderdagen
 * (7.20). Ontbrekende dagen gelden niet als alcoholvrij.
 */
export function computeSevenDayContext(records, date) {
  const byDate = new Map(records.map((r) => [r.date, r]));
  const days = [];
  const d = new Date(date);
  for (let i = 0; i < 7; i += 1) {
    const dd = new Date(d);
    dd.setDate(dd.getDate() - i);
    days.push(`${dd.getFullYear()}-${String(dd.getMonth() + 1).padStart(2, "0")}-${String(dd.getDate()).padStart(2, "0")}`);
  }
  days.reverse(); // oudste eerst, meest recent (de betreffende dag) laatst

  let totalGlasses = 0;
  let registeredDays = 0;
  let missingDays = 0;
  let drinkingDays = 0;
  let confirmedFreeDays = 0;
  let exceedances = 0;
  let wildcards = 0;

  for (const day of days) {
    const record = byDate.get(day);
    if (!record) {
      missingDays += 1;
      continue;
    }
    registeredDays += 1;
    totalGlasses += record.total;
    if (record.total > 0) drinkingDays += 1;
    if (record.total === 0) confirmedFreeDays += 1;
    if (record.wildcard) wildcards += 1;
    else if (record.status === "Limiet overschreden") exceedances += 1;
  }

  let consecutiveDrinkingDays = 0;
  for (let i = days.length - 1; i >= 0; i -= 1) {
    const record = byDate.get(days[i]);
    if (record && record.total > 0) consecutiveDrinkingDays += 1;
    else break;
  }

  return { date, days, totalGlasses, registeredDays, missingDays, drinkingDays, confirmedFreeDays, consecutiveDrinkingDays, exceedances, wildcards };
}

/** Zevendaagse contextregels, laagste prioriteitswaarde wint (eerste match, 7.21). */
export const CONTEXT_RULES = [
  { id: "context-consecutive", priority: 10, condition: (ctx) => ctx.consecutiveDrinkingDays >= 3, contentKey: "impact.context.consecutive" },
  { id: "context-frequent", priority: 20, condition: (ctx) => ctx.drinkingDays >= 5, contentKey: "impact.context.frequent" },
  { id: "context-exceedances", priority: 30, condition: (ctx) => ctx.exceedances >= 2, contentKey: "impact.context.exceedances" },
  { id: "context-free", priority: 40, condition: (ctx) => ctx.confirmedFreeDays >= 4, contentKey: "impact.context.mostlyFree" },
  { id: "context-default", priority: 1000, condition: () => true, contentKey: "impact.context.default" },
];

export function resolveContextImpact(context) {
  const sorted = [...CONTEXT_RULES].sort((a, b) => a.priority - b.priority);
  const rule = sorted.find((r) => r.condition(context));
  return rule ? rule.contentKey : null;
}

export function placeholderText(contentKey) {
  return contentKey ? `[[${contentKey}]]` : null;
}
