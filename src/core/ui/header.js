import { el } from "./dom.js";

/** Gedeelde schermkop: optionele terug-link, titel, optionele subtitel/actie. */
export function screenHeader({ title, subtitle, backTo, action }) {
  const titleGroup = el("div", { class: "title-group" });
  if (backTo) titleGroup.appendChild(el("a", { class: "back-link", href: backTo, text: "‹ Terug" }));
  titleGroup.appendChild(el("h1", { text: title }));
  if (subtitle) titleGroup.appendChild(el("div", { class: "subtitle", text: subtitle }));
  const children = [titleGroup];
  if (action) children.push(action);
  return el("div", { class: "app-header" }, children);
}
