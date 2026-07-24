import { registerRoute } from "../../core/router.js";
import renderHabitsHome from "./screens/habitsHome.js";
import renderDayScreen from "./screens/day.js";
import renderHabitList from "./screens/list.js";
import renderHabitEditor from "./screens/editor.js";
import renderHabitDetail from "./screens/detail.js";
import renderHabitCalendar from "./screens/calendar.js";
import renderHabitStreaks from "./screens/streaks.js";

/** Registreert alle Habits-routes. Letterlijke paden staan vóór de :id-wildcard. */
export function registerHabitsRoutes() {
  registerRoute("/habits/list", renderHabitList);
  registerRoute("/habits/new", renderHabitEditor);
  registerRoute("/habits/day", renderDayScreen);
  registerRoute("/habits/day/:date", renderDayScreen);
  registerRoute("/habits/:id/edit", renderHabitEditor);
  registerRoute("/habits/:id/calendar", renderHabitCalendar);
  registerRoute("/habits/:id/calendar/:month", renderHabitCalendar);
  registerRoute("/habits/:id/streaks", renderHabitStreaks);
  registerRoute("/habits", renderHabitsHome);
  registerRoute("/habits/:id", renderHabitDetail);
}
