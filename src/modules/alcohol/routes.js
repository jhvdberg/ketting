import { registerRoute } from "../../core/router.js";
import renderAlcoholHome from "./screens/alcoholHome.js";
import renderSchedule from "./screens/schedule.js";
import renderDayEntry from "./screens/dayEntry.js";
import renderMissingEntries from "./screens/missingEntries.js";
import renderAlcoholCalendar from "./screens/calendar.js";
import renderAnalysisOverview from "./screens/analysisOverview.js";
import renderPeriodComparisons from "./screens/periodComparisons.js";
import renderWildcardOverview from "./screens/wildcardOverview.js";
import renderImpactView from "./screens/impactView.js";

export function registerAlcoholRoutes() {
  registerRoute("/alcohol/schedule", renderSchedule);
  registerRoute("/alcohol/missing", renderMissingEntries);
  registerRoute("/alcohol/day", renderDayEntry);
  registerRoute("/alcohol/day/:date", renderDayEntry);
  registerRoute("/alcohol/calendar", renderAlcoholCalendar);
  registerRoute("/alcohol/calendar/:month", renderAlcoholCalendar);
  registerRoute("/alcohol/analysis", renderAnalysisOverview);
  registerRoute("/alcohol/comparisons", renderPeriodComparisons);
  registerRoute("/alcohol/wildcards", renderWildcardOverview);
  registerRoute("/alcohol/impact", renderImpactView);
  registerRoute("/alcohol/impact/:date", renderImpactView);
  registerRoute("/alcohol", renderAlcoholHome);
}
