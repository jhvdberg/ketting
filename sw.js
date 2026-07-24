/**
 * Service worker (briefing 3.2, 12.4). Classic script (geen ES-module) voor
 * brede Safari/iOS-compatibiliteit, dus de cacheversie hieronder wordt
 * handmatig gesynchroniseerd met src/core/version.js bij elke release die
 * bestanden toevoegt of wijzigt.
 */
const CACHE_VERSION = "ketting-v2.2.0";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-180.png",
  "./icon-512.png",
  "./css/base.css",
  "./src/main.js",
  "./src/core/context.js",
  "./src/core/dateUtils.js",
  "./src/core/db.js",
  "./src/core/errors.js",
  "./src/core/exportImport.js",
  "./src/core/id.js",
  "./src/core/moduleRegistry.js",
  "./src/core/router.js",
  "./src/core/schemaState.js",
  "./src/core/swManager.js",
  "./src/core/version.js",
  "./src/core/ui/confirm.js",
  "./src/core/ui/dom.js",
  "./src/core/ui/header.js",
  "./src/core/ui/toast.js",
  "./src/screens/home.js",
  "./src/screens/notFound.js",
  "./src/screens/settings.js",
  "./src/modules/habits/index.js",
  "./src/modules/habits/migrations.js",
  "./src/modules/habits/model.js",
  "./src/modules/habits/routes.js",
  "./src/modules/habits/storage.js",
  "./src/modules/habits/screens/shared.js",
  "./src/modules/habits/screens/calendar.js",
  "./src/modules/habits/screens/day.js",
  "./src/modules/habits/screens/detail.js",
  "./src/modules/habits/screens/editor.js",
  "./src/modules/habits/screens/habitsHome.js",
  "./src/modules/habits/screens/list.js",
  "./src/modules/habits/screens/streaks.js",
  "./src/modules/gym/index.js",
  "./src/modules/gym/routes.js",
  "./src/modules/gym/storage.js",
  "./src/modules/gym/model.js",
  "./src/modules/gym/cycleModel.js",
  "./src/modules/gym/classification.js",
  "./src/modules/gym/migrations.js",
  "./src/modules/gym/charts.js",
  "./src/modules/gym/screens/shared.js",
  "./src/modules/gym/screens/gymHome.js",
  "./src/modules/gym/screens/exerciseList.js",
  "./src/modules/gym/screens/exerciseEditor.js",
  "./src/modules/gym/screens/templateLibrary.js",
  "./src/modules/gym/screens/templateEditor.js",
  "./src/modules/gym/screens/cycleList.js",
  "./src/modules/gym/screens/cycleEditor.js",
  "./src/modules/gym/screens/activeCycleOverview.js",
  "./src/modules/gym/screens/plannedWorkoutEditor.js",
  "./src/modules/gym/screens/activeWorkout.js",
  "./src/modules/gym/screens/calendar.js",
  "./src/modules/gym/screens/workoutDetail.js",
  "./src/modules/gym/screens/exerciseChart.js",
  "./src/modules/gym/screens/muscleGroupChart.js",
  "./src/modules/gym/screens/archivedCycles.js",
  "./src/modules/gym/screens/archivedCycleDetail.js",
  "./src/modules/alcohol/index.js",
  "./src/modules/alcohol/routes.js",
  "./src/modules/alcohol/storage.js",
  "./src/modules/alcohol/model.js",
  "./src/modules/alcohol/analysis.js",
  "./src/modules/alcohol/impactContent.js",
  "./src/modules/alcohol/migrations.js",
  "./src/modules/alcohol/screens/shared.js",
  "./src/modules/alcohol/screens/alcoholHome.js",
  "./src/modules/alcohol/screens/schedule.js",
  "./src/modules/alcohol/screens/dayEntry.js",
  "./src/modules/alcohol/screens/missingEntries.js",
  "./src/modules/alcohol/screens/calendar.js",
  "./src/modules/alcohol/screens/analysisOverview.js",
  "./src/modules/alcohol/screens/periodComparisons.js",
  "./src/modules/alcohol/screens/wildcardOverview.js",
  "./src/modules/alcohol/screens/impactView.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(ASSETS)));
  // Bewust geen self.skipWaiting(): een actieve sessie mag niet ongevraagd
  // onderbroken worden. Activeren gebeurt pas na een expliciete
  // "bijwerken"-actie van de gebruiker (zie src/core/swManager.js).
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Cache-first met achtergrondverversing: werkt direct offline, blijft
// tegelijk bijwerken zodra er weer verbinding is.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(event.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
