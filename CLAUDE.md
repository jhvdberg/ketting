# Persoonlijke tracking-PWA

## Bron van waarheid

De volledige functionele specificatie staat in `docs/briefing.md`. Die briefing is leidend. Bouw niets dat daar niet in staat. Lees bij twijfel eerst de relevante paragraaf opnieuw.

## Vaste werkregels

- Werk gefaseerd en wacht na elke fase op akkoord voordat je verdergaat:
  - Fase 0: core (routing, IndexedDB-opslaglaag, moduleregister, Home-skelet, instellingen, export/import) plus de complete Habits-module inclusief migratie van bestaande v1-data.
  - Fase 1: Gym-module.
  - Fase 2: Alcohol-module.
  - Fase 3: resterende tests, README, datamodel- en migratiedocumentatie, releasechecklist.
- Schrijf bij elke fase de bijbehorende geautomatiseerde tests (briefing hoofdstuk 20) en draai ze voordat je de fase als klaar meldt.
- Meld bij elke oplevering expliciet of er gevolgen zijn voor bestaande lokale gebruikersdata (briefing 12.3).
- Commit in logische stappen met duidelijke berichten. Push alleen naar `main` na een geslaagde testrun.

## Technische keuzes (vastgesteld)

- Vanilla JavaScript met ES-modules, geen buildstap, geen frameworks, geen externe runtime-dependencies.
- Hash-routing voor GitHub Pages-compatibiliteit.
- IndexedDB via een eigen dunne wrapper in de core. localStorage alleen voor kleine interfacevoorkeuren.
- Alle berekenings- en domeinlogica in framework-vrije, DOM-vrije modules zodat tests via `node --test` draaien zonder browser.
- Deployment: GitHub Pages, branch `main`, map `/ (root)`.

## Bestaande situatie

- De repo bevat een werkende v1 ("Ketting"): één `index.html` met habits in localStorage onder de key `ketting-v1` (structuur: `{ habits: [{id, name, days, history}], playlist }`), plus `manifest.json`, `sw.js` en twee iconen.
- De gebruiker heeft live data in Safari op zijn iPhone onder die key. De nieuwe app MOET die data bij eerste start detecteren en migreren naar de Habits-module in IndexedDB. Nooit stilzwijgend resetten.
- De quotes- en playlistfunctionaliteit uit v1 vervalt bewust; alleen de habitdata migreert.
- De service worker moet bij updates bestaande data en een actieve workoutsessie intact laten (briefing 12.4).

## Taal en stijl

- Interfaceteksten in het Nederlands, directe zakelijke toon, gebruik "je kan" in plaats van "je kunt".
- Geen koppeltekens tussen samenstellingen tenzij strikt vereist, geen gedachtestreepjes.
- Code, commits en documentatie in het Engels; README en datamodeldocumentatie mogen in het Nederlands.
