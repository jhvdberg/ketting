import { registerRoute } from "../../core/router.js";
import renderGymHome from "./screens/gymHome.js";
import renderExerciseList from "./screens/exerciseList.js";
import renderExerciseEditor from "./screens/exerciseEditor.js";
import renderTemplateLibrary from "./screens/templateLibrary.js";
import renderTemplateEditor from "./screens/templateEditor.js";
import renderCycleList from "./screens/cycleList.js";
import renderCycleEditor from "./screens/cycleEditor.js";
import renderActiveCycleOverview from "./screens/activeCycleOverview.js";
import renderPlannedWorkoutEditor from "./screens/plannedWorkoutEditor.js";
import renderActiveWorkout from "./screens/activeWorkout.js";
import renderGymCalendar from "./screens/calendar.js";
import renderWorkoutDetail from "./screens/workoutDetail.js";
import renderExerciseChart from "./screens/exerciseChart.js";
import renderMuscleGroupChart from "./screens/muscleGroupChart.js";
import renderArchivedCycles from "./screens/archivedCycles.js";
import renderArchivedCycleDetail from "./screens/archivedCycleDetail.js";

/** Registreert alle Gym-routes. Letterlijke paden staan vóór de :id-wildcards. */
export function registerGymRoutes() {
  registerRoute("/gym/exercises", renderExerciseList);
  registerRoute("/gym/exercises/new", renderExerciseEditor);
  registerRoute("/gym/exercises/:id/edit", renderExerciseEditor);
  registerRoute("/gym/exercises/:id/chart", renderExerciseChart);

  registerRoute("/gym/templates", renderTemplateLibrary);
  registerRoute("/gym/templates/new", renderTemplateEditor);
  registerRoute("/gym/templates/:id/edit", renderTemplateEditor);

  registerRoute("/gym/cycles/new", renderCycleEditor);
  registerRoute("/gym/cycles/active", renderActiveCycleOverview);
  registerRoute("/gym/cycles/archived", renderArchivedCycles);
  registerRoute("/gym/cycles/archived/:id", renderArchivedCycleDetail);
  registerRoute("/gym/cycles/:id/edit", renderCycleEditor);
  registerRoute("/gym/cycles", renderCycleList);

  registerRoute("/gym/workouts/:id/edit", renderPlannedWorkoutEditor);
  registerRoute("/gym/workout/active", renderActiveWorkout);

  registerRoute("/gym/calendar", renderGymCalendar);
  registerRoute("/gym/calendar/:month", renderGymCalendar);
  registerRoute("/gym/history/:id", renderWorkoutDetail);

  registerRoute("/gym/muscle-groups/:group/chart", renderMuscleGroupChart);

  registerRoute("/gym", renderGymHome);
}
