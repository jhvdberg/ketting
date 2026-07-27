import { registerRoute } from "../../core/router.js";
import renderReadingHome from "./screens/readingHome.js";
import renderLibrary from "./screens/library.js";

/** Registreert alle Lezen-routes. Letterlijke paden staan vóór /lezen zelf. */
export function registerReadingRoutes() {
  registerRoute("/lezen/bibliotheek", renderLibrary);
  registerRoute("/lezen/:date", renderReadingHome);
  registerRoute("/lezen", renderReadingHome);
}
