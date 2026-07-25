export { screenHeader } from "../../../core/ui/header.js";

export const MONTHS_LONG = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

export const CLASSIFICATION_LABELS = {
  Light: "Light",
  Medium: "Medium",
  Heavy: "Heavy",
  "Onvoldoende historie": "Onvoldoende historie",
};

export function classificationPillClass(classification) {
  if (classification === "Heavy") return "status-pill bad";
  if (classification === "Medium") return "status-pill neutral";
  if (classification === "Light") return "status-pill good";
  return "status-pill";
}

export function classificationColor(classification) {
  if (classification === "Heavy") return "var(--red)";
  if (classification === "Medium") return "var(--amber)";
  if (classification === "Light") return "var(--green)";
  return "var(--muted)";
}

export function formatWeight(weight) {
  return weight == null ? "-" : `${weight} kg`;
}

/**
 * Parseert gebruikersinvoer voor gewicht naar een getal. Een Nederlands
 * decimaal toetsenbord (inputmode="decimal") levert een komma als
 * decimaalteken (bv. "12,5"), terwijl Number() alleen een punt begrijpt en
 * anders stil NaN teruggeeft.
 */
export function parseWeightInput(value) {
  if (value === "") return null;
  return Number(value.replace(",", "."));
}
