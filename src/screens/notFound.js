import { el } from "../core/ui/dom.js";
import { screenHeader } from "../core/ui/header.js";

export default async function renderNotFound(container) {
  container.appendChild(screenHeader({ title: "Niet gevonden", backTo: "#/" }));
  container.appendChild(el("p", { class: "empty-state", text: "Deze pagina bestaat niet." }));
}
