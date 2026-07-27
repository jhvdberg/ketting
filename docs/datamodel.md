# Datamodel en versies

Eén IndexedDB-database (`ketting`, `src/core/version.js: DB_NAME`), met per module een eigen namespace van object stores. Elke module is de enige eigenaar van zijn eigen stores: alleen de `storage.js` van die module raakt ze rechtstreeks aan (briefing 4.3).

## Versies

Twee soorten versienummers, met een bewust verschillend doel (briefing 12.1):

| Constante | Bestand | Betekenis |
|---|---|---|
| `DB_VERSION` | `src/core/version.js` | IndexedDB **structurele** versie: bepaalt welke object stores bestaan. Wordt alleen opgehoogd als een module een nieuwe store toevoegt. |
| `CORE_SCHEMA_VERSION` | `src/core/version.js` | Vorm van de coregegevens in een export (momenteel leeg, `core.data = {}`). |
| `HABITS_SCHEMA_VERSION` | `src/modules/habits/migrations.js` | Vorm van de Habits-recordvelden. |
| `GYM_SCHEMA_VERSION` | `src/modules/gym/migrations.js` | Vorm van de Gym-recordvelden. |
| `ALCOHOL_SCHEMA_VERSION` | `src/modules/alcohol/migrations.js` | Vorm van de Alcohol-recordvelden. |
| `READING_SCHEMA_VERSION` | `src/modules/reading/migrations.js` | Vorm van de Lezen-recordvelden. |
| `CLASSIFICATION_FORMULA_VERSION` | `src/modules/gym/classification.js` | Versie van de classificatieformule. Elke voltooide workout bevat deze waarde als `formulaVersion`, zodat een latere formulewijziging historische uitkomsten nooit met terugwerkende kracht verandert. |
| `IMPACT_CONTENT_VERSION` | `src/modules/alcohol/impactContent.js` | Versie van de impactcontentregels/-teksten (los van het dataschema). |
| `EXPORT_FORMAT_VERSION` | `src/core/version.js` | Vorm van het exportbestand zelf (envelop rond de moduledata). |
| `APP_VERSION` | `src/core/version.js` | Weergaveversie van de app, getoond in Instellingen en gebruikt als `sw.js`-cacheversie-indicatie. |

Een module-schemaversie hoger dan wat de huidige appversie ondersteunt (bijvoorbeeld bij een import van een nieuwere back-up in een oudere app) wordt altijd geweigerd met een duidelijke foutmelding — nooit stilzwijgend geïnterpreteerd (12.2).

De daadwerkelijk *opgeslagen* schemaversie per module staat los van de code-constante, bijgehouden in de `core_meta`-store (zie hieronder) via `src/core/schemaState.js`. Bij het opstarten (`migrateModules()` in `src/main.js`) wordt de opgeslagen versie vergeleken met de constante in de code en zo nodig gemigreerd (zie [migraties.md](migraties.md)).

## Core

### `core_meta` (keyPath `id`)

Eén vast record (`id: "schemaVersions"`) met `versions: { [moduleId]: schemaVersion }` — de daadwerkelijk opgeslagen schemaversie per module.

## Habits (`src/modules/habits/storage.js`)

### `habits` (keyPath `id`)
`{ id, name }`

### `habitSchedules` (keyPath `id`, index `by_habitId`)
Historische weekschema-versies per habit — een nieuwe versie vervangt nooit de oude, maar wordt toegevoegd met een nieuwe ingangsdatum (briefing 8.4).
`{ id, habitId, days: number[] (Mon0-index, 0=maandag), effectiveFrom: "YYYY-MM-DD" }`

### `habitEntries` (keyPath `id`, index `by_habitId`)
Alleen een record bij een daadwerkelijk uitgevoerd moment; afwezigheid = niet gedaan (minimale opslag).
`{ id: "<habitId>:<date>", habitId, date: "YYYY-MM-DD", recordedAt: ISO-timestamp }`

## Gym (`src/modules/gym/storage.js`)

### `gymExercises` (keyPath `id`)
`{ id, name, muscleGroup, active }` — `muscleGroup` is één van de negen vaste waarden in `src/modules/gym/model.js: MUSCLE_GROUPS` (Core is uitgesloten van volumeberekeningen, 6.20).

### `gymTemplates` (keyPath `id`)
`{ id, name, exercises: [{ exerciseId, order, sets: [{ weight, reps }] }] }` — live verwijzing naar `exerciseId` (geen snapshot); alleen voltooide workouts bevriezen namen.

### `gymPlannedWorkouts` (keyPath `id`, index `by_cycleId`)
Diepe kopie van een template op het moment van plannen (nooit een live koppeling, 6.4).
`{ id, cycleId, weekIndex, position, name, exercises: [...], completed, completedAt, completedWorkoutId }`

### `gymActiveSession` (keyPath `id`)
Hoogstens één record (`id: "current"`).
`{ id: "current", plannedWorkoutId, startedAt, lastChangedAt, checkedSets: { "<exIdx>-<setIdx>": true }, confirmationShown }`

### `gymCompletedWorkouts` (keyPath `id`, index `by_cycleId`)
Onveranderlijke snapshot (6.25): bevroren oefeningnamen/spiergroepen, alle sets, spiergroepvolumes, workoutvolume, classificatie per spiergroep (met baselines) en totale classificatie, plus `formulaVersion`.
`{ id, cycleId, plannedWorkoutId, completedAt, exercises: [...], groupResults, workoutResult, muscleGroupVolumes, workoutVolume, formulaVersion }`

### `gymCycles` (keyPath `id`)
`{ id, name, createdAt, startDate, workoutsPerWeek, weeksPerCycle, status, endDate, replacesCycleId, replacedByCycleId }` — de daadwerkelijke, live status wordt altijd afgeleid via `getEffectiveCycleStatus()` in `cycleModel.js`, nooit rechtstreeks uit `status` gelezen (zie de briefing-toelichting bij hoofdstuk 6).

### `gymClosedWeeks` (keyPath `id`, index `by_cycleId`)
`{ id: "<cycleId>:<weekIndex>", cycleId, weekIndex, startDate, endDate, plannedSlotIds, completedSlotIds, missed }` — gematerialiseerd zodra een week is afgesloten (6.19), idempotent opnieuw berekenbaar.

## Alcohol (`src/modules/alcohol/storage.js`)

### `alcoholDays` (keyPath `date`)
Hoogstens één record per datum (7.2). `status` en `appliedLimit` worden bij het opslaan berekend/vastgelegd en nadien nooit met terugwerkende kracht herschreven door een latere schemawijziging.
`{ date: "YYYY-MM-DD", solo, together, social, total, wildcard, appliedLimit, status }`

`status` is één van `src/modules/alcohol/model.js: DAY_STATUS` ("Niet beoordeeld" / "Binnen limiet" / "Limiet overschreden" / "Wildcard gebruikt" / "Geen limiet"). `appliedLimit` kan de sentinelwaarde `NO_LIMIT` (`-1`) bevatten — bewust geen `null` (dat betekent "nog geen schema") en geen `Infinity` (niet JSON/IndexedDB-veilig).

### `alcoholSchedules` (keyPath `id`)
Historische weekschema-versies, zelfde patroon als Habits.
`{ id, days: number[7] (Mon0-index, waarde per dag of NO_LIMIT), effectiveFrom: "YYYY-MM-DD" }`

## Lezen (`src/modules/reading/storage.js`)

Deze module staat niet in de oorspronkelijke briefing; zie [implementatiekeuzes.md](implementatiekeuzes.md). De bibliotheek wordt bij de eerste opstart automatisch gevuld vanuit het meegeleverde `src/modules/reading/seed-texts.json` (zolang de bibliotheek leeg is); via `#/lezen/bibliotheek` kan je later zelf meer teksten toevoegen met een JSON-import.

### `readingTexts` (keyPath `id`)
`{ id, order, tradition, school, author, source, translator, editionYear, reference, title, text, quote, primaryTheme, themes: string[], wordCount, lastShownDate: "YYYY-MM-DD"|null, timesShown, addedAt }` — alleen `source` en `text` zijn verplicht bij import, de rest is optionele metadata die getoond wordt als aanwezig. `order` bewaart de importvolgorde (voor de eerste ronde vóór er rotatiehistorie is); `lastShownDate`/`timesShown` sturen de rotatie (zie hieronder) en worden nooit door een latere import overschreven van bestaande teksten.

### `readingLog` (keyPath `date`)
Hoogstens één record per datum. `{ date: "YYYY-MM-DD", textId }` — legt vast welke tekst op welke dag getoond is, zodat herhaald openen dezelfde dag dezelfde tekst laat zien.

**Rotatielogica** (`selectTodaysText()` in `model.js`): geen wachtrij die opraakt. Bij het openen van `#/lezen` zonder log-record voor vandaag wordt de tekst gekozen die het langst geleden (of nog nooit) getoond is; bij gelijke stand wint de laagste `order`. Zodra de hele bibliotheek ooit getoond is, rouleert het gewoon door vanaf de langst-niet-getoonde — geen harde stop, geen lege staat. De keuze gebeurt bewust pas op het modulescherm zelf (niet als bijwerking van het renderen van Home), zodat Home puur lezend blijft.

## Lokale voorkeuren (localStorage)

Naast IndexedDB (data) gebruikt de app `localStorage` voor kleine interfacevoorkeuren die geen onderdeel zijn van een back-up:

| Key | Bestand | Betekenis |
|---|---|---|
| `ketting-disabled-modules` | `src/core/modulePrefs.js` | JSON-array met id's van modules die de gebruiker in Instellingen heeft uitgezet. Beïnvloedt alleen zichtbaarheid/navigatie (`getModules()` in `moduleRegistry.js`) — raakt nooit IndexedDB-data, migraties of module-`init()` aan (die blijven altijd voor alle modules draaien, zie [migraties.md](migraties.md)). Ontbreekt de key, dan zijn alle modules aan (standaardgedrag, geen migratie nodig voor bestaande gebruikers). Zit bewust niet in export/import: het is een toestelinstelling, geen gebruikersdata.

## Export/importformaat

Zie `src/core/exportImport.js`. Eén JSON-bestand:

```
{
  format: "personal-tracker-backup",
  exportVersion: number,
  exportedAt: ISO-timestamp,
  appVersion: string,
  core: { schemaVersion, data: {} },
  modules: { [moduleId]: { schemaVersion, data } }
}
```

Import gebeurt in één atomaire IndexedDB-transactie over alle betrokken stores (`bulkReplace` in `src/core/db.js`): valideren en migreren gebeurt volledig vóór er iets geschreven wordt, en een fout halverwege rolt de hele transactie terug zonder de bestaande data aan te tasten (11.3).
