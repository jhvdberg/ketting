# Ketting

Persoonlijke, modulaire tracking-PWA voor gym, alcoholgebruik, habits en dagelijkse leesteksten. Vanilla JavaScript (ES-modules), geen buildstap, geen frameworks, geen externe runtime-dependencies. Data blijft lokaal op het toestel in IndexedDB; er is bewust geen cloud-opslag of account (zie [docs/briefing.md](docs/briefing.md)).

De volledige functionele specificatie staat in [docs/briefing.md](docs/briefing.md). Aanvullende documentatie:

- [docs/datamodel.md](docs/datamodel.md) — IndexedDB-stores per module en alle versieconstantes.
- [docs/migraties.md](docs/migraties.md) — hoe schemamigraties werken.
- [docs/releasechecklist.md](docs/releasechecklist.md) — checklist voor elke release die data raakt.
- [docs/impactcontent.md](docs/impactcontent.md) — tijdelijke placeholder-contentkeys in de Alcohol-impactweergave.
- [docs/implementatiekeuzes.md](docs/implementatiekeuzes.md) — beslissingen die niet functioneel in de briefing vastlagen.

## Projectstructuur

```
index.html                 app-shell, laadt src/main.js als module
manifest.json, sw.js       PWA-manifest en service worker
css/base.css                gedeelde basisstijlen
package.json                 "type":"module", testscript, geen dependencies

src/
  main.js                    opstartvolgorde: db openen, modules registreren, migreren, router starten
  core/                      IndexedDB-wrapper, router, moduleregister, export/import, service-workerbeheer, datumhelpers, UI-helpers
  screens/                    Home, Instellingen, 404
  modules/
    gym/                       oefeningen, templates, cycli, actieve workout, classificatie, grafieken
    alcohol/                   weekschema, dagregistratie, analyse, periodevergelijkingen, impactcontent
    habits/                    habits, historische schema's, streaks
    reading/                    roterende bibliotheek met dagelijkse leesteksten (buiten de oorspronkelijke briefing, zie implementatiekeuzes.md)

tests/
  core/, modules/            unit-tests voor pure, DOM-vrije logica
  integration/                 gebruikersstromen tegen een echte (nagebootste) IndexedDB
  helpers/                     minimale in-memory IndexedDB-nabootsing, alleen voor tests
```

Elke module is zelfstandig: alleen `storage.js` van die module raakt de eigen IndexedDB-stores aan, en Home/Instellingen kennen geen enkele modulespecifieke logica — ze werken uitsluitend via het moduleregister (`src/core/moduleRegistry.js`).

## Lokaal ontwikkelen

Geen buildstap nodig; alles draait direct als ES-modules. Start een eenvoudige statische server in de projectmap, bijvoorbeeld:

```
npx --yes serve .
```

of (met Python):

```
python -m http.server 5173
```

Open daarna de getoonde localhost-URL. IndexedDB en de service worker werken alleen via `http://` of `https://`, niet via een `file://`-pad.

## Testen

```
npm test
```

Draait alle tests in `tests/` via Node's ingebouwde testrunner (`node --test`), zonder externe testdependencies. Dekt:

- pure domeinlogica per module (`tests/modules/*/*.test.js`);
- coregedrag zoals weekgrenzen en export/import-validatie (`tests/core/`);
- migratiepaden per module;
- integratiestromen tegen een echte (in-memory nagebootste) IndexedDB (`tests/integration/`), inclusief een volledige export/import-rondweg op een vers toestel.

Het hervatten van een actieve workoutsessie na herladen wordt handmatig in de browser geverifieerd (echte IndexedDB-persistentie over een paginaherlaad heen laat zich niet zinvol nabootsen in `node --test`).

## Deployment

GitHub Pages, branch `main`, map `/ (root)`. Een push naar `main` publiceert direct; er is geen aparte buildstap. Draai `npm test` en verifieer handmatig in de browser vóórdat je naar `main` pusht (zie [docs/releasechecklist.md](docs/releasechecklist.md)).

De app draait in een submap (`/ketting/`) op GitHub Pages: alle paden in `index.html`, `manifest.json` en `sw.js` zijn daarom relatief (`./...`), nooit absoluut vanaf de domeinroot.

## PWA-installatie (iPhone)

Open de URL in Safari, tik op "Deel" en kies "Zet op beginscherm". Let op: op iOS gebruikt een als beginschermicoon toegevoegde app een eigen, afgeschermde opslag los van gewone Safari-tabbladen. Verwijder je dat icoon, dan kan die opslag (en dus lokale data) verloren gaan. Maak daarom altijd eerst een export via Instellingen voordat je het icoon verwijdert of opnieuw toevoegt.
