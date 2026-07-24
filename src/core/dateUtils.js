/**
 * Datum- en weekhulpfuncties (core, briefing 4.1).
 *
 * Kalenderdatums worden altijd als vaste 'YYYY-MM-DD'-string opgeslagen en
 * verwerkt. Ze worden nooit via `new Date(isoString)` geparsed (dat leest UTC
 * en kan een dag verschuiven), maar altijd via de lokale jaar/maand/dag-
 * componenten, zodat een eenmaal opgeslagen dag nooit van kalenderdag
 * verandert wanneer de tijdzone van het apparaat later wijzigt (briefing 3.4).
 */

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function pad2(n) {
  return String(n).padStart(2, "0");
}

/** Lokale kalenderdatum van een Date-object als 'YYYY-MM-DD'. */
export function toISODate(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** De lokale kalenderdatum van vandaag (of van het opgegeven Date-object). */
export function todayISO(date = new Date()) {
  return toISODate(date);
}

export function isValidISODate(iso) {
  if (typeof iso !== "string" || !ISO_DATE_RE.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

/** Zet een 'YYYY-MM-DD'-string om naar een Date op lokale middernacht. */
export function parseISODate(iso) {
  if (!isValidISODate(iso)) {
    throw new Error(`Ongeldige datum: ${iso}`);
  }
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Weekdag van een ISO-datum, met maandag = 0 .. zondag = 6. */
export function weekdayMon0(iso) {
  const jsDay = parseISODate(iso).getDay(); // 0 = zondag .. 6 = zaterdag
  return (jsDay + 6) % 7;
}

export function addDays(iso, n) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Maandag van de trainings-/kalenderweek (ma 00:00 t/m zo 23:59, briefing 3.4). */
export function startOfWeek(iso) {
  return addDays(iso, -weekdayMon0(iso));
}

export function endOfWeek(iso) {
  return addDays(startOfWeek(iso), 6);
}

/** Stabiele sleutel voor "de week waarin deze datum valt": de maandag-ISO. */
export function weekKey(iso) {
  return startOfWeek(iso);
}

export function compareISO(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function isBefore(a, b) {
  return compareISO(a, b) < 0;
}

export function isAfter(a, b) {
  return compareISO(a, b) > 0;
}

export function isSameOrBefore(a, b) {
  return compareISO(a, b) <= 0;
}

export function isSameOrAfter(a, b) {
  return compareISO(a, b) >= 0;
}

export function isPast(iso, today = todayISO()) {
  return isBefore(iso, today);
}

export function isFuture(iso, today = todayISO()) {
  return isAfter(iso, today);
}

export function daysBetween(a, b) {
  return Math.round((parseISODate(b) - parseISODate(a)) / 86400000);
}

/** Alle ISO-datums van a t/m b (inclusief), oplopend. */
export function eachDay(a, b) {
  const days = [];
  for (let d = a; isSameOrBefore(d, b); d = addDays(d, 1)) {
    days.push(d);
  }
  return days;
}

/** UTC-tijdstip als ISO-timestamp, voor aanmaak-/wijzigingstijden. */
export function nowTimestamp() {
  return new Date().toISOString();
}
