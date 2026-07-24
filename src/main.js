/**
 * Applicatiestart (briefing 4.1): opent de database, registreert modules,
 * voert eventuele migraties uit en start de router.
 */
import { openDatabase } from "./core/db.js";
import { DB_NAME, DB_VERSION } from "./core/version.js";
import { registerModule, getModules, getAllStoreDefs } from "./core/moduleRegistry.js";
import { setDb } from "./core/context.js";
import { registerRoute, registerNotFound, initRouter } from "./core/router.js";
import { initServiceWorker } from "./core/swManager.js";
import { loadSchemaState, saveSchemaState, CORE_META_STORE_DEF } from "./core/schemaState.js";
import { logError } from "./core/errors.js";
import { el } from "./core/ui/dom.js";

import { habitsModule } from "./modules/habits/index.js";
import { registerHabitsRoutes } from "./modules/habits/routes.js";
import renderHome from "./screens/home.js";
import renderSettings from "./screens/settings.js";
import renderNotFound from "./screens/notFound.js";

registerModule(habitsModule);

async function migrateModules(db) {
  const state = await loadSchemaState(db);
  let changed = false;
  for (const mod of getModules()) {
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
  try {
    const stores = [...getAllStoreDefs(), CORE_META_STORE_DEF];
    const db = await openDatabase({ name: DB_NAME, version: DB_VERSION, stores });
    setDb(db);
    await migrateModules(db);
    for (const mod of getModules()) {
      await mod.init(db);
    }

    registerRoute("/", renderHome);
    registerRoute("/settings", renderSettings);
    registerHabitsRoutes();
    registerNotFound(renderNotFound);

    await initRouter(document.getElementById("app"));

    initServiceWorker({ onUpdateReady: showUpdateBanner });
  } catch (err) {
    logError("boot", err);
    renderFatalError(err && err.message ? err.message : "Onbekende fout. Probeer de pagina te herladen.");
  }
}

boot();
