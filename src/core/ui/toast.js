import { el } from "./dom.js";

let toastEl = null;
let timer = null;

function ensureToastEl() {
  if (toastEl) return toastEl;
  toastEl = el("div", { class: "toast", role: "status", "aria-live": "polite" });
  document.body.appendChild(toastEl);
  return toastEl;
}

export function showToast(message, { duration = 2200 } = {}) {
  const node = ensureToastEl();
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(timer);
  timer = setTimeout(() => node.classList.remove("show"), duration);
}
