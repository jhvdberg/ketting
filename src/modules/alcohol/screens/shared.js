export { screenHeader } from "../../../core/ui/header.js";

export const MONTHS_LONG = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

export function statusColor(status) {
  if (status === "Binnen limiet") return "var(--green)";
  if (status === "Limiet overschreden") return "var(--red)";
  if (status === "Wildcard gebruikt") return "var(--amber)";
  return "var(--muted)";
}

export function statusPillClass(status) {
  if (status === "Binnen limiet") return "status-pill good";
  if (status === "Limiet overschreden") return "status-pill bad";
  if (status === "Wildcard gebruikt") return "status-pill neutral";
  return "status-pill";
}

export function formatPercent(value) {
  return value == null ? "-" : `${Math.round(value * 100)}%`;
}

export function formatDiff(diff) {
  if (!diff) return "-";
  const sign = diff.absoluteDiff > 0 ? "+" : "";
  const pct = diff.percentChange == null ? "" : ` (${diff.percentChange > 0 ? "+" : ""}${Math.round(diff.percentChange * 100)}%)`;
  return `${sign}${round1(diff.absoluteDiff)}${pct}`;
}

export function round1(n) {
  return n == null ? "-" : Math.round(n * 10) / 10;
}
