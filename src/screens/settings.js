/** Instellingen (briefing 9, 10, 11). */
import { el, clearNode } from "../core/ui/dom.js";
import { getDb } from "../core/context.js";
import { getModules, getAllStoreDefs } from "../core/moduleRegistry.js";
import { buildExport, exportFileName, parseImportFile, validateImportShape, applyImport } from "../core/exportImport.js";
import { APP_VERSION, CORE_SCHEMA_VERSION } from "../core/version.js";
import { CORE_META_STORE } from "../core/schemaState.js";
import { confirmDialog } from "../core/ui/confirm.js";
import { showToast } from "../core/ui/toast.js";
import { logError, userMessage } from "../core/errors.js";
import { clearAllStores } from "../core/db.js";
import { screenHeader } from "../core/ui/header.js";

async function downloadExport(db) {
  const data = await buildExport(db);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = exportFileName();
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default async function renderSettings(container) {
  const db = getDb();
  clearNode(container);

  container.appendChild(screenHeader({ title: "Instellingen", backTo: "#/" }));

  // --- back-up ---
  container.appendChild(el("h2", { class: "section", text: "Back-up" }));
  const importErrors = el("div");
  container.appendChild(
    el("div", { class: "card" }, [
      el("p", { class: "hint", text: "Exporteer op elk moment een volledige back-up, bijvoorbeeld vóór een risicovolle update of bij overstap naar een ander apparaat." }),
      el("div", { class: "btn-row" }, [
        el("button", {
          class: "btn primary",
          type: "button",
          text: "Exporteren",
          onClick: async () => {
            try {
              await downloadExport(db);
              showToast("Back-up geëxporteerd");
            } catch (err) {
              logError("export", err);
              showToast(userMessage(err, "Exporteren is mislukt."));
            }
          },
        }),
      ]),
    ])
  );

  const fileInput = el("input", { type: "file", accept: "application/json,.json", style: "display:none;" });
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = "";
    if (!file) return;
    clearNode(importErrors);
    try {
      const text = await file.text();
      const json = parseImportFile(text);
      const { valid, errors } = validateImportShape(json);
      if (!valid) {
        importErrors.appendChild(
          el("div", { class: "card" }, [
            el("p", { class: "field-error", text: "Import geweigerd. Bestaande data is niet aangepast." }),
            ...errors.map((e) => el("p", { class: "hint", text: `• ${e}` })),
          ])
        );
        return;
      }
      const ok = await confirmDialog({
        title: "Back-up importeren",
        body: "Dit vervangt al je huidige lokale data door de inhoud van dit bestand. Dit kan niet ongedaan worden gemaakt vanuit de app. Exporteer eerst je huidige data als je die wilt bewaren.",
        confirmLabel: "Importeren en vervangen",
        danger: true,
      });
      if (!ok) return;
      await applyImport(db, json);
      showToast("Import geslaagd, de app wordt herladen");
      setTimeout(() => location.reload(), 600);
    } catch (err) {
      logError("import", err);
      importErrors.appendChild(el("div", { class: "card" }, [el("p", { class: "field-error", text: userMessage(err, "Import is mislukt. Bestaande data is niet aangepast.") })]));
    }
  });

  container.appendChild(
    el("div", { class: "card" }, [
      el("p", { class: "hint", text: "Importeren vervangt al je huidige data volledig; er wordt niets samengevoegd." }),
      el("button", { class: "btn ghost", type: "button", text: "Back-up importeren", onClick: () => fileInput.click() }),
      fileInput,
    ])
  );
  container.appendChild(importErrors);

  // --- versie-informatie ---
  container.appendChild(el("h2", { class: "section", text: "Versie-informatie" }));
  const versionRows = [
    el("div", { class: "list-row" }, [el("span", { text: "Appversie" }), el("span", { class: "hint", text: APP_VERSION })]),
    el("div", { class: "list-row" }, [el("span", { text: "Coreschema" }), el("span", { class: "hint", text: String(CORE_SCHEMA_VERSION) })]),
  ];
  for (const mod of getModules()) {
    versionRows.push(el("div", { class: "list-row" }, [el("span", { text: `${mod.name}-schema` }), el("span", { class: "hint", text: String(mod.schemaVersion) })]));
  }
  container.appendChild(el("div", { class: "card" }, versionRows));

  // --- gevarenzone ---
  container.appendChild(el("h2", { class: "section", text: "Alle lokale data verwijderen" }));
  container.appendChild(
    el("div", { class: "card" }, [
      el("p", { class: "hint", text: `Verwijdert alle gegevens van alle modules (${getModules().map((m) => m.name).join(", ")}) definitief van dit apparaat. Maak eerst een export als je iets wilt bewaren.` }),
      el("button", {
        class: "btn danger",
        type: "button",
        text: "Alle lokale data verwijderen",
        onClick: async () => {
          const ok = await confirmDialog({
            title: "Alle data verwijderen",
            body: "Alle gegevens van alle modules worden definitief verwijderd van dit apparaat. Dit kan niet ongedaan worden gemaakt. Exporteer eerst een back-up als je iets wilt bewaren.",
            confirmLabel: "Definitief verwijderen",
            danger: true,
          });
          if (!ok) return;
          const storeNames = [...getAllStoreDefs().map((s) => s.name), CORE_META_STORE];
          await clearAllStores(db, storeNames);
          showToast("Alle data verwijderd, de app wordt herladen");
          setTimeout(() => location.reload(), 600);
        },
      }),
    ])
  );
}
