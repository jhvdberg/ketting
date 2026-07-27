/** Bibliotheekscherm: overzicht, importeren van een tekstenpakket (JSON), en filteren op traditie. */
import { el, clearNode } from "../../../core/ui/dom.js";
import { getDb } from "../../../core/context.js";
import { screenHeader } from "../../../core/ui/header.js";
import { showToast } from "../../../core/ui/toast.js";
import { logError } from "../../../core/errors.js";
import { listTexts, importTexts, getSelectedTraditions, setSelectedTraditions } from "../storage.js";
import { extractImportTexts, isValidImportEntry, listTraditionsWithCounts } from "../model.js";

export default async function renderLibrary(container) {
  const db = getDb();
  clearNode(container);

  container.appendChild(screenHeader({ title: "Bibliotheek", backTo: "#/lezen" }));

  const countEl = el("p", { text: "" });
  const errorEl = el("div");
  const traditionsSection = el("div");

  async function refreshCount() {
    const texts = await listTexts(db);
    countEl.textContent = texts.length === 0 ? "Nog geen teksten in je bibliotheek." : `${texts.length} tekst(en) in je bibliotheek.`;
  }

  async function toggleTradition(tradition) {
    const allTraditions = listTraditionsWithCounts(await listTexts(db)).map((t) => t.tradition);
    const selected = await getSelectedTraditions(db);
    const effective = new Set(selected.length === 0 ? allTraditions : selected);
    if (effective.has(tradition)) effective.delete(tradition);
    else effective.add(tradition);
    // Zodra weer alles is aangevinkt, terug naar "geen filter" (lege lijst), zodat
    // toekomstig geïmporteerde tradities automatisch blijven meedoen.
    await setSelectedTraditions(db, effective.size === allTraditions.length ? [] : [...effective]);
    await refreshTraditions();
  }

  async function refreshTraditions() {
    clearNode(traditionsSection);
    const texts = await listTexts(db);
    const withCounts = listTraditionsWithCounts(texts);
    if (withCounts.length === 0) return;
    const selected = await getSelectedTraditions(db);
    const effective = new Set(selected.length === 0 ? withCounts.map((t) => t.tradition) : selected);

    traditionsSection.appendChild(el("h2", { class: "section", text: "Filter op traditie" }));
    traditionsSection.appendChild(
      el("p", {
        class: "hint",
        text: selected.length === 0 ? "Alle tradities doen mee. Vink er een paar aan om te beperken." : `${effective.size} van ${withCounts.length} tradities actief in de dagelijkse rotatie.`,
      })
    );
    const pick = el("div", { class: "daypick", style: "flex-wrap:wrap; gap:8px;" });
    for (const { tradition, count } of withCounts) {
      const btn = el("button", { type: "button", text: `${tradition} (${count})`, class: effective.has(tradition) ? "sel" : "", style: "flex:0 0 auto; padding:9px 12px;" });
      btn.addEventListener("click", () => toggleTradition(tradition));
      pick.appendChild(btn);
    }
    traditionsSection.appendChild(pick);
    traditionsSection.appendChild(
      el("div", { class: "btn-row", style: "margin-top:10px;" }, [
        el("button", {
          class: "btn ghost small",
          type: "button",
          text: "Alles selecteren",
          onClick: async () => {
            await setSelectedTraditions(db, []);
            await refreshTraditions();
          },
        }),
      ])
    );
  }

  await refreshCount();
  await refreshTraditions();

  container.appendChild(el("div", { class: "card" }, [countEl]));
  container.appendChild(traditionsSection);

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
      await refreshTraditions();
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
