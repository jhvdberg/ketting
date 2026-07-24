/**
 * Hash-router (core, briefing 3.1 / 5.1).
 *
 * Hash-routing werkt na verversen en op GitHub Pages zonder server-side
 * rewrites. Elke route rendert in een vaste containerelement; een render-
 * functie mag een cleanup-functie teruggeven die wordt aangeroepen voordat
 * de volgende route rendert (bv. om listeners of intervals op te ruimen).
 */

const routes = [];
let container = null;
let notFoundRender = null;
let currentCleanup = null;

export function registerRoute(pattern, render) {
  const paramNames = [];
  const source = pattern
    .split("/")
    .map((segment) => {
      if (segment.startsWith(":")) {
        paramNames.push(segment.slice(1));
        return "([^/]+)";
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    })
    .join("/");
  routes.push({ regex: new RegExp(`^${source}$`), paramNames, render });
}

export function registerNotFound(render) {
  notFoundRender = render;
}

export function navigate(path) {
  if (location.hash.slice(1) === path) {
    handleRouteChange();
  } else {
    location.hash = path;
  }
}

export function currentPath() {
  return location.hash.slice(1) || "/";
}

async function renderInto(render, params) {
  if (typeof currentCleanup === "function") {
    try {
      currentCleanup();
    } catch {
      /* cleanup mag nooit de nieuwe render blokkeren */
    }
  }
  currentCleanup = null;
  container.innerHTML = "";
  const result = await render(container, params);
  if (typeof result === "function") currentCleanup = result;
}

async function handleRouteChange() {
  const path = currentPath().split("?")[0];
  for (const route of routes) {
    const match = path.match(route.regex);
    if (match) {
      const params = {};
      route.paramNames.forEach((name, i) => {
        params[name] = decodeURIComponent(match[i + 1]);
      });
      await renderInto(route.render, params);
      return;
    }
  }
  if (notFoundRender) await renderInto(notFoundRender, {});
}

export function initRouter(rootEl) {
  container = rootEl;
  window.addEventListener("hashchange", handleRouteChange);
  return handleRouteChange();
}
