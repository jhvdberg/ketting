import { el } from "./dom.js";

/**
 * Compact bevestigingsvenster (briefing 13, 15). Vermeldt concreet wat
 * gebeurt; retourneert een Promise<boolean>.
 */
export function confirmDialog({ title, body, confirmLabel = "Bevestigen", cancelLabel = "Annuleren", danger = false }) {
  return new Promise((resolve) => {
    const onKey = (e) => {
      if (e.key === "Escape") close(false);
    };
    function close(result) {
      overlay.remove();
      document.removeEventListener("keydown", onKey);
      resolve(result);
    }
    const dialog = el("div", { class: "modal", role: "alertdialog", "aria-modal": "true" }, [
      el("h3", { class: "modal-title", text: title }),
      el("p", { class: "modal-body", text: body }),
      el("div", { class: "modal-actions" }, [
        el("button", { class: "btn ghost", type: "button", onClick: () => close(false), text: cancelLabel }),
        el("button", { class: danger ? "btn danger" : "btn primary", type: "button", onClick: () => close(true), text: confirmLabel }),
      ]),
    ]);
    const overlay = el("div", { class: "modal-overlay" }, [dialog]);
    document.body.appendChild(overlay);
    document.addEventListener("keydown", onKey);
  });
}
