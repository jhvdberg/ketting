/**
 * Applicatiestart (briefing 4.1): opent de database, registreert modules,
 * voert eventuele migraties uit en start de router.
 */
import { openDatabase } from "./core/db.js";
import { DB_NAME, DB_VERSION } from "./core/version.js";
import { registerModule, getAllModules, getAllStoreDefs } from "./core/moduleRegistry.js";
import { isModuleEnabled } from "./core/modulePrefs.js";
import { setDb } from "./core/context.js";
import { registerRoute, registerNotFound, initRouter } from "./core/router.js";
import { initServiceWorker } from "./core/swManager.js";
import { loadSchemaState, saveSchemaState, CORE_META_STORE_DEF } from "./core/schemaState.js";
import { logError } from "./core/errors.js";
import { el } from "./core/ui/dom.js";

import { gymModule } from "./modules/gym/index.js";
import { registerGymRoutes } from "./modules/gym/routes.js";
import { alcoholModule } from "./modules/alcohol/index.js";
import { registerAlcoholRoutes } from "./modules/alcohol/routes.js";
import { habitsModule } from "./modules/habits/index.js";
import { registerHabitsRoutes } from "./modules/habits/routes.js";
import { readingModule } from "./modules/reading/index.js";
import { registerReadingRoutes } from "./modules/reading/routes.js";
import renderHome from "./screens/home.js";
import renderSettings from "./screens/settings.js";
import renderNotFound from "./screens/notFound.js";

registerModule(gymModule);
registerModule(alcoholModule);
registerModule(habitsModule);
registerModule(readingModule);

async function migrateModules(db) {
  // Migraties draaien altijd voor alle gebouwde modules, ook uitgezette:
  // een module die je later weer aanzet mag nooit een verouderd schema
  // hebben omdat migraties oversloegen terwijl hij uitstond.
  const state = await loadSchemaState(db);
  let changed = false;
  for (const mod of getAllModules()) {
    const installed = state[mod.id];
    if (installed == null) {
      state[mod.id] = mod.schemaVersion;
      changed = true;
    } else if (installed < mod.schemaVersion) {
      if (typeof mod.migrateLiveData === "function") {
        await mod.migrateLiveData(db, installed, mod.schemaVersion);
      }
      state[mod.id] = mod.schemaVersion;
      changed = true;
    } else if (installed > mod.schemaVersion) {
      throw new Error(
        `Lokale data van '${mod.name}' gebruikt schemaversie ${installed}, nieuwer dan wat deze app-versie ondersteunt (${mod.schemaVersion}). Werk de app bij.`
      );
    }
  }
  if (changed) await saveSchemaState(db, state);
}

function renderFatalError(message) {
  const root = document.getElementById("app");
  root.innerHTML = "";
  root.appendChild(el("div", { class: "app-header" }, [el("div", { class: "title-group" }, [el("h1", { text: "Ketting" })])]));
  root.appendChild(
    el("div", { class: "card" }, [
      el("p", { class: "field-error", text: "De app kon niet starten." }),
      el("p", { class: "hint", text: message }),
    ])
  );
}

function showUpdateBanner(apply) {
  const slot = document.getElementById("banner-slot");
  slot.innerHTML = "";
  slot.appendChild(
    el("div", { class: "banner" }, [
      el("span", { text: "Nieuwe versie beschikbaar." }),
      el("button", { class: "btn primary", type: "button", text: "Bijwerken", onClick: apply }),
    ])
  );
}

async function boot() {
  // Service-workerregistratie staat bewust buiten de try/catch en vóór het
  // openen van de database: als het opstarten faalt (bv. door een lokaal
  // databaseprobleem), moet de update-banner alsnog kunnen verschijnen zodat
  // een gebruiker een gerepareerde appversie kan ophalen. Stond dit binnen
  // het try-blok, dan zou een falende boot() nooit bij serviceworker-
  // detectie komen en zou een gebruiker voor altijd vastzitten op een oude,
  // gecachte, kapotte versie.
  initServiceWorker({ onUpdateReady: showUpdateBanner });

  try {
    const stores = [...getAllStoreDefs(), CORE_META_STORE_DEF];
    const db = await openDatabase({ name: DB_NAME, version: DB_VERSION, stores });
    setDb(db);
    await migrateModules(db);
    // init() draait ook voor uitgezette modules: bv. Gym's cyclusreconciliatie
    // moet blijven bijhouden wat er (zou zijn) gebeurd, ook als de module nu
    // even niet zichtbaar is, anders klopt de historie niet meer zodra hij
    // weer aangezet wordt.
    for (const mod of getAllModules()) {
      await mod.init(db);
    }

    registerRoute("/", renderHome);
    registerRoute("/settings", renderSettings);
    // Routes van een uitgezette module worden bewust niet geregistreerd: zo
    // valt directe navigatie ernaartoe (bv. een oude bladwijzer) netjes terug
    // op de bestaande "niet gevonden"-pagina in plaats van de module te tonen.
    if (isModuleEnabled(gymModule.id)) registerGymRoutes();
    if (isModuleEnabled(alcoholModule.id)) registerAlcoholRoutes();
    if (isModuleEnabled(habitsModule.id)) registerHabitsRoutes();
    if (isModuleEnabled(readingModule.id)) registerReadingRoutes();
    registerNotFound(renderNotFound);

    await initRouter(document.getElementById("app"));
  } catch (err) {
    logError("boot", err);
    renderFatalError(err && err.message ? err.message : "Onbekende fout. Probeer de pagina te herladen.");
  }
}

boot();
