# Releasechecklist

Doorloop deze lijst bij elke commit die naar `main` gepusht wordt (CLAUDE.md: "Push alleen naar `main` na een geslaagde testrun"). Zie briefing 12.3 voor de eis achter de eerste vier punten.

## 1. Tests

- [ ] `npm test` groen (alle unit- en integratietests).
- [ ] Bij een schemawijziging: een nieuwe test in `tests/modules/<module>/migrations.test.js` die de migratiestap dekt.
- [ ] Bij een wijziging in `src/core/db.js` of een `storage.js`: overweeg een aanvulling in `tests/integration/userFlows.test.js`.

## 2. Versies bijwerken

- [ ] `APP_VERSION` in `src/core/version.js` verhoogd, tenzij de wijziging **uitsluitend** visueel/tekstueel is zonder datagevolgen (12.3, laatste zin).
- [ ] `CACHE_VERSION` in `sw.js` gelijkgetrokken met `APP_VERSION`, zodra er bestanden zijn toegevoegd of gewijzigd (anders blijven gebruikers de oude versie zien totdat ze alle tabbladen sluiten).
- [ ] Nieuwe/gewijzigde object store? `DB_VERSION` in `src/core/version.js` verhoogd.
- [ ] Nieuwe/gewijzigde recordvorm binnen een module? De bijbehorende `MODULE_SCHEMA_VERSION` in die module's `migrations.js` verhoogd, met een migratiestap (zie [migraties.md](migraties.md)).
- [ ] Wijziging aan de classificatieformule (Gym)? `CLASSIFICATION_FORMULA_VERSION` in `src/modules/gym/classification.js` verhoogd, zodat historische workoutresultaten hun oorspronkelijke `formulaVersion` behouden.
- [ ] Wijziging aan de impactcontentregels (Alcohol)? `IMPACT_CONTENT_VERSION` in `src/modules/alcohol/impactContent.js` verhoogd.

## 3. Datagevolgen rapporteren (verplicht bij elke release die data raakt)

Meld expliciet bij oplevering:

- welke datamodellen zijn gewijzigd (zie [datamodel.md](datamodel.md));
- welke schemaversies veranderen;
- welke migraties worden uitgevoerd;
- of een export vooraf nadrukkelijk wordt aanbevolen;
- welke tests op de migratie zijn uitgevoerd.

Voor alleen visuele/tekstuele wijzigingen zonder datagevolgen is dit niet nodig.

## 4. Handmatige verificatie in de browser

- [ ] Normale boot: app laadt, geen console-fouten.
- [ ] Bij een wijziging die de database raakt: test ook het pad "bestaande data aanwezig, app wordt bijgewerkt" (niet alleen een lege installatie).
- [ ] Bij een service-worker-wijziging: controleer dat de updatebanner verschijnt en dat "Bijwerken" werkt zonder een actieve workoutsessie te onderbreken (12.4).
- [ ] Bij een UI-wijziging: de betrokken schermen ook echt bekeken, niet alleen de code gelezen.

## 5. Voor het pushen

- [ ] Commit in logische, losse stappen met duidelijke berichten (geen verzamelcommit van ongerelateerde wijzigingen).
- [ ] Expliciet akkoord van de gebruiker gevraagd vóór de daadwerkelijke `git push` naar `main` — nooit automatisch.

## Losstaand: risico's rond het iOS-startschermicoon

Niet iets dat een commit oplost, maar wel iets om de gebruiker actief te wijzen als het relevant wordt: op iOS gebruikt een als beginschermicoon toegevoegde webapp een eigen, afgeschermde opslag los van gewone Safari-tabbladen. Het verwijderen van dat icoon kan die opslag laten vervallen. Adviseer altijd eerst een export via Instellingen vóór zo'n actie (zie ook de toelichting in [README.md](../README.md)).
