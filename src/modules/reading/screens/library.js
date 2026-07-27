/** Bibliotheekscherm: overzicht + importeren van een tekstenpakket (JSON). */
import { el, clearNode } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { screenHeader } from "../../../core/ui/header.js";
import { showToast } from "../../../core/ui/toast.js";
import { logError } from "../../../core/errors.js";
import { listTexts, importTexts } from "../storage.js";
import { extractImportTexts, isValidImportEntry } from "../model.js";

export default async function renderLibrary(container) {
  const db = getDb();
  clearNode(container);

  container.appendChild(screenHeader({ title: "Bibliotheek", backTo: "#/lezen" }));

  const countEl = el("p", { text: "" });
  const errorEl = el("div");

  async function refreshCount() {
    const texts = await listTexts(db);
    countEl.textContent = texts.length === 0 ? "Nog geen teksten in je bibliotheek." : `${texts.length} tekst(en) in je bibliotheek.`;
  }
  await refreshCount();

  container.appendChild(el("div", { class: "card" }, [countEl]));

  container.appendChild(el("h2", { class: "section", text: "Importeren" }));

  const fileInput = el("input", { type: "file", accept: "application/json,.json", style: "display:none;" });
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = "";
    if (!file) return;
    clearNode(errorEl);
    try {
      const jsonText = await file.text();
      const json = JSON.parse(jsonText);
      const entries = extractImportTexts(json);
      if (!entries) {
        errorEl.appendChild(el("div", { class: "card" }, [el("p", { class: "field-error", text: "Onbekend bestandsformaat: verwacht een lijst teksten, of { texts: [...] }." })]));
        return;
      }
      const validEntries = entries.filter(isValidImportEntry);
      const invalidCount = entries.length - validEntries.length;
      const { added, skipped } = await importTexts(db, validEntries);
      const parts = [`${added} tekst(en) toegevoegd`];
      if (skipped > 0) parts.push(`${skipped} overgeslagen (al aanwezig)`);
      if (invalidCount > 0) parts.push(`${invalidCount} ongeldig genegeerd`);
      showToast(parts.join(", "));
      await refreshCount();
    } catch (err) {
      logError("reading-import", err);
      errorEl.appendChild(el("div", { class: "card" }, [el("p", { class: "field-error", text: "Dit bestand kon niet worden gelezen. Controleer of het geldige JSON is." })]));
    }
  });

  container.appendChild(
    el("div", { class: "card" }, [
      el("p", { class: "hint", text: "Voeg teksten toe met een JSON-bestand: een lijst met objecten die minimaal 'source' (waar de tekst vandaan komt) en 'text' bevatten. Importeren voegt toe aan je bestaande bibliotheek; al aanwezige bron+referentie-combinaties worden overgeslagen." }),
      el("button", { class: "btn primary", type: "button", text: "Bestand kiezen", onClick: () => fileInput.click() }),
      fileInput,
    ])
  );
  container.appendChild(errorEl);
}
