# Migratiestructuur

Zie ook [datamodel.md](datamodel.md) voor wat elke versieconstante precies betekent, en de [releasechecklist](releasechecklist.md) voor wat je bij een schemawijziging moet opleveren.

## Twee plekken waar dezelfde migratiestap wordt hergebruikt

Elke module (`habits`, `gym`, `alcohol`, `reading`) heeft een `migrations.js` met:

- een `MODULE_SCHEMA_VERSION`-constante;
- een `MIGRATIONS`-object: sleutel = bronversie, waarde = een pure functie die van die versie naar `versie + 1` migreert;
- `migrateXxxData(data, fromVersion, toVersion)`: past de stappen na elkaar toe, werkt op de platte exportvorm (bv. `{ habits, schedules, entries }`).

Deze ene pure functie wordt op **twee plekken** aangeroepen:

1. **Bij het opstarten van de app** (`migrateLiveData(db, fromVersion, toVersion)` in de moduledescriptor, aangeroepen vanuit `migrateModules()` in `src/main.js`): leest de huidige IndexedDB-data via `exportAll(db)`, migreert, en schrijft het resultaat atomair terug via `replaceAll(db, migrated)`.
2. **Bij het importeren van een back-up** (`migrateExportData` in de moduledescriptor, aangeroepen vanuit `prepareImportRecords()` in `src/core/exportImport.js`): migreert de data uit het importbestand vóórdat die naar IndexedDB-records wordt omgezet.

Zo bestaat er precies één plek per schemastap waar de daadwerkelijke transformatie staat, in plaats van twee losse implementaties die uiteen kunnen lopen.

## Opstartvolgorde (`src/main.js: boot()`)

1. Service worker registreren (bewust vóór de databasestappen, zie hieronder).
2. `openDatabase()`: opent/creëert de IndexedDB-database en alle geregistreerde stores (zie "Structurele versie" hieronder).
3. `migrateModules(db)`: voor elke module, vergelijk de opgeslagen schemaversie (`core_meta`-store) met de code-constante:
   - ontbreekt de opgeslagen versie nog (eerste keer): sla de huidige constante op, geen migratie nodig;
   - opgeslagen versie lager dan de constante: voer `migrateLiveData()` uit, sla de nieuwe versie op;
   - opgeslagen versie hoger dan de constante: **weiger** met een duidelijke foutmelding ("werk de app bij") — nooit downgraden of gokken.
4. De eigen `init(db)` van elke module.
5. Router starten.

Een falende stap 2-4 toont een foutscherm, maar blokkeert stap 1 nooit: zo kan een gebruiker altijd nog een update ontvangen, zelfs als de app zelf niet meer opstart (zie "Service-workerregistratie" hieronder).

## Structurele IndexedDB-versie (`DB_VERSION`) en zelfherstel

`DB_VERSION` bepaalt alleen *welke object stores bestaan*, los van de schemaversie van de data erin. `openDatabase()` (`src/core/db.js`) doet dit in twee stappen:

1. **Probe-open** zonder specifieke versie, om de daadwerkelijke staat te zien (welke stores bestaan er al, welke versie staat er al op de schijf).
2. Als er stores ontbreken terwijl het versienummer al op of boven `DB_VERSION` staat (een vastgelopen upgrade, zie hieronder), wordt er één versie hoger geopend om alleen de ontbrekende stores alsnog aan te maken — zonder bestaande stores of data aan te raken. Het aangevraagde versienummer is altijd minstens het al opgeslagen versienummer, nooit lager (anders gooit IndexedDB een `VersionError`).

Deze reparatielogica is toegevoegd na een incident (2026-07-24/25) waarbij WebKit op een iPhone een `versionchange`-transactie kennelijk niet volledig had afgerond (bijvoorbeeld doordat de app op de achtergrond ging tijdens een eerdere update), waardoor de database op het juiste versienummer stond maar één store miste. Zonder deze fix blijft zo'n ontbrekende store voor altijd ontbreken, omdat `onupgradeneeded` alleen vuurt wanneer het aangevraagde versienummer hoger is dan het opgeslagen nummer. Zie `tests/integration/userFlows.test.js` voor een test die dit scenario reproduceert.

## Service-workerregistratie vóór databasetoegang

`initServiceWorker()` wordt in `boot()` bewust **vóór** het openen van de database aangeroepen, niet erna. Reden: als het opstarten om wat voor reden dan ook faalt, moet de "Bijwerken"-banner nog steeds kunnen verschijnen zodat een gebruiker een reeds gerepareerde appversie kan ophalen. Stond deze registratie ná de databasestappen (zoals aanvankelijk het geval was), dan zou een falende `boot()` nooit code bereiken die een wachtende service worker kan activeren — een dead end waarbij een gebruiker voor altijd op een oude, gecachte, kapotte versie vastzit totdat alle tabbladen van de site handmatig gesloten worden. Ook dit kwam voort uit hetzelfde incident van 2026-07-24/25.

## v1-migratie (bewust niet uitgevoerd)

De vorige "Ketting"-app (`ketting-v1` in `localStorage`) wordt niet automatisch gemigreerd naar deze app. Dit was een expliciete, bewuste keuze bij de start van fase 0, in afwijking van de standaard-migratie-eis in de briefing. De oude key wordt niet aangeraakt of verwijderd (dus recoverable), maar wordt door de nieuwe app niet gelezen.

## Nieuwe migratiestap toevoegen

1. Verhoog de `MODULE_SCHEMA_VERSION`-constante van de betreffende module met 1.
2. Voeg een functie toe aan `MIGRATIONS` onder de **oude** versie als sleutel, die de data naar de vorm van de nieuwe versie transformeert.
3. Schrijf een test in `tests/modules/<module>/migrations.test.js` die de oude vorm naar de nieuwe migreert en het resultaat controleert.
4. Voegt de wijziging ook een nieuwe object store toe? Verhoog dan ook `DB_VERSION` in `src/core/version.js`.
5. Rapporteer bij oplevering expliciet: welk datamodel wijzigt, welke schemaversie(s) omhoog gaan, welke migratiestappen draaien, en of een export vooraf wordt aanbevolen (zie [releasechecklist.md](releasechecklist.md)).
