# Bewuste implementatiekeuzes buiten de briefing

Korte lijst van beslissingen die nodig waren om de briefing te bouwen maar er niet functioneel in vastgelegd waren (briefing 21.12).

## Architectuur

- **Eén IndexedDB-database met per-module stores**, in plaats van een aparte database per module. Voldoet aan de eis van een eigen namespace per module via de `storage.js`-toegangsgrens, niet via fysieke databasescheiding.
- **Statistieken en cyclusstatus worden nooit gecachet, altijd live herberekend** uit de ruwe records (Gym-cyclusstatus, Alcohol-analyse, Habits-streaks). Dit is de kern van hoe retroactieve correcties (19.4/19.5) automatisch doorwerken zonder aparte "herbereken"-actie.
- **Historische schema-versionering** (`effectiveFrom` + "laatste versie ≤ datum geldt") is identiek toegepast op Habits-weekschema's en Alcohol-weekschema's. Een latere wijziging herberekent nooit eerder opgeslagen dagen met terugwerkende kracht.
- **Eigen, kleine SVG-lijngrafiekrenderer** voor de Gym-grafieken (oefening/spiergroep), in plaats van een externe library — in lijn met "geen externe runtime-dependencies".
- **Eigen, minimale in-memory IndexedDB-nabootsing** in `tests/helpers/fakeIndexedDB.js`, uitsluitend voor tests, om integratietests te kunnen schrijven zonder een externe testdependency toe te voegen (`node --test` heeft geen ingebouwde IndexedDB).

## Databasebetrouwbaarheid (naar aanleiding van een incident op 2026-07-24/25)

- **`openDatabase()` herstelt zichzelf** als de database op het juiste versienummer staat maar één of meer object stores mist (een vastgelopen WebKit-upgrade). Zie [migraties.md](migraties.md).
- **Service-workerregistratie staat vóór, niet ná, de databasestappen** in `boot()`, zodat een falende opstart de "Bijwerken"-banner nooit blokkeert.

Beide punten waren niet in de briefing voorzien; ze zijn toegevoegd nadat een echte WebKit-eigenaardigheid op de iPhone van de gebruiker een niet-werkende app veroorzaakte.

## Databehoud

- **v1-localStorage-data wordt niet automatisch gemigreerd.** Expliciete, bewuste keuze bij de start van fase 0, in afwijking van de standaard-migratie-eis. De oude key blijft ongemoeid (dus recoverable), maar wordt niet gelezen.
- **Habit-uitvoeringen alleen als aanwezig record**, nooit als boolean vlag — minimale opslag, zelfde semantiek als de oude `history`-kaart uit v1.
- Op iOS gebruikt een **beginschermicoon-webapp een eigen, van gewone Safari-tabbladen afgeschermde opslag**. Dit is geen keuze van deze app maar een platformeigenschap; de conclusie ervan (altijd eerst exporteren vóór het toevoegen/verwijderen van het icoon) staat in [README.md](../README.md) en de [releasechecklist](releasechecklist.md).

## Schermen

- **Daginvoer en Dagdetails (Alcohol) zijn samengevoegd tot één scherm** (`dayEntry.js`) met een datumparameter, omdat de briefing ze met identieke mogelijkheden beschrijft (drie contextaantallen, wildcard, status/limiet, verwijderen).
- **Periodevergelijkingen worden pas getoond zodra de referentieperiode niet vóór `moduleStartDate` begint** (`getAvailableComparisons`) — een bewuste, eenvoudige interpretatie van "zodra voldoende historie beschikbaar is" (7.15).
- **Impactcontent wordt getoond als expliciet herkenbare placeholder** (bv. `[[impact.direct.medium]]`) in plaats van verzonnen teksten, conform de instructie in 7.21 om geen definitieve content te bedenken. Zie [impactcontent.md](impactcontent.md).

## Alcohol: "geen maximum" per dag

Niet in de oorspronkelijke briefing; toegevoegd op uitdrukkelijk verzoek van de gebruiker tijdens fase 2. Een weekschemadag kan naast een numerieke limiet ook "geen maximum" zijn (sentinelwaarde `NO_LIMIT = -1`, los van `null` dat "nog geen schema" betekent). Zo'n dag telt — net als een wildcard — niet mee in het nalevingspercentage of de beoordeelde-gebruik/limiet-statistieken, wel in het totaal aantal glazen. Geldt alleen voor het weekschema, niet als losse markering per dag.

## Functies aan/uit (module enable/disable)

Niet in de oorspronkelijke briefing; toegevoegd op verzoek van de gebruiker na fase 3. Een nieuwe "Functies"-sectie in Instellingen laat je elke module afzonderlijk uitzetten. De voorkeur staat in `localStorage`, niet IndexedDB (een toestelinstelling, geen gebruikersdata) — zie [datamodel.md](datamodel.md). Uitzetten verbergt een module alleen (Home + routes); schemamigraties en module-`init()` blijven voor elke module doorlopen, ook uitgezette, zodat data nooit veroudert of verloren gaat.

## Lezen: een volledig nieuwe module buiten de briefing

De hele Lezen-module (roterende bibliotheek met dagelijkse leesteksten uit boeken/geschriften) staat niet in `docs/briefing.md` — dit is de enige toevoeging in het project die een volledig nieuwe module betreft in plaats van een aanpassing binnen een bestaande. Gebouwd op uitdrukkelijk verzoek van de gebruiker, volgens exact dezelfde architectuur als Gym/Alcohol/Habits (moduleregister-descriptor, dunne `storage.js`, pure domeinlogica, Home-integratie). Kernkeuzes:

- **Meegeleverde startbibliotheek, automatisch geladen.** `src/modules/reading/seed-texts.json` (850 teksten, publiek-domein bronnen: Bijbel KJV 1611, klassieke filosofie, etc.) wordt bij de eerste opstart automatisch geïmporteerd zodra de bibliotheek leeg is (`seedFromBundledFileIfEmpty()` in `init()`), zodat er geen handmatige importstap nodig is. De bibliotheekimport (`#/lezen/bibliotheek`) blijft bestaan om later zelf meer teksten toe te voegen. Een mislukte netwerk-/parsefout bij het vullen mag het opstarten van de app nooit blokkeren en wordt daarom zelf afgevangen.
- **Roulatie in plaats van een eindige wachtrij.** `selectTodaysText()` kiest altijd de tekst die het langst geleden (of nooit) getoond is; zodra de hele bibliotheek ooit getoond is begint het vanzelf opnieuw bij de langst-niet-getoonde. Geen harde stop, geen lege staat, werkt met elke bibliotheekgrootte.
- **De tekst van vandaag wordt pas gekozen en vastgelegd bij het openen van het modulescherm zelf**, niet als bijwerking van het renderen van Home — Home blijft zo puur lezend, zoals bij de andere modules.
- **Importformaat accepteert zowel een kale array als `{ texts: [...] }`**, en vereist alleen `source` en `text` per entry; overige velden (traditie, auteur, vertaler, jaartal, referentie, quote, thema's, woordaantal) zijn optionele metadata die getoond wordt als aanwezig. Duplicaten (zelfde bron+referentie) worden bij een herhaalde import automatisch overgeslagen.
