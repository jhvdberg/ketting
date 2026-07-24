/**
 * Service-workerbeheer (core, briefing 3.2 / 12.4).
 *
 * Registreert de service worker en volgt het veilige updatepatroon: een
 * nieuwe versie wordt gedownload en blijft "waiting" tot de gebruiker
 * expliciet kiest om bij te werken. Er wordt nooit automatisch geherladen
 * tijdens een actieve sessie.
 */

export function initServiceWorker({ onUpdateReady } = {}) {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker
    .register("./sw.js")
    .then((registration) => {
      if (registration.waiting && navigator.serviceWorker.controller) {
        onUpdateReady?.(() => activateUpdate(registration));
      }
      registration.addEventListener("updatefound", () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            onUpdateReady?.(() => activateUpdate(registration));
          }
        });
      });
    })
    .catch((err) => {
      console.error("[Ketting] service worker registratie mislukt:", err);
    });

  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
}

function activateUpdate(registration) {
  if (registration.waiting) {
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }
}
