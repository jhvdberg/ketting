# Bouwbriefing: modulaire persoonlijke tracking-PWA

## 1. Opdracht aan Claude

Bouw een modulaire, lokale en offline bruikbare persoonlijke tracking-app die primair op een iPhone als Progressive Web App wordt gebruikt en via GitHub Pages wordt gepubliceerd.

Deze briefing is de functionele bron van waarheid. Voeg geen functies toe die hier niet worden gevraagd.

Belangrijke uitvoeringsregels:

* Bouw werkende functionaliteit, geen visuele mock-up.
* Maak geen alles-in-één HTML- of JavaScriptbestand dat alleen visueel in onderdelen is verdeeld.
* Houd de technische architectuur daadwerkelijk modulair.
* Voeg geen AI-functionaliteit toe.
* Voeg geen coaching, gegenereerde adviezen of automatisch geschreven conclusies toe.
* Voeg geen sociale functies, accounts, forum, cloudopslag of synchronisatie toe.
* Voeg geen gamification, algemene totaalscore of beloningssysteem toe.
* Voeg geen medische disclaimers, medische voorbehouden of vanzelfsprekende waarschuwingsteksten toe.
* Voeg geen placeholders toe voor toekomstige modules die nog niet bestaan.
* Gebruik geen eigen pushnotificatiesysteem.
* iPhone-herinneringen worden voorlopig buiten de app geregeld via Apple Herinneringen.
* Kies bij kleine onduidelijkheden de eenvoudigste implementatie die aantoonbaar aansluit op deze briefing.
* Meld expliciet wanneer een implementatiekeuze gevolgen heeft voor bestaande lokale data.
* Bescherm bestaande gebruikersdata bij iedere update en migratie.

Wanneer een bestaande repository wordt aangeleverd:

1. inspecteer eerst de huidige structuur en opslag;
2. inventariseer bestaande datamodellen en opslagkeys;
3. behoud bruikbare bestaande functionaliteit;
4. migreer bestaande data waar nodig;
5. overschrijf of reset lokale data nooit stilzwijgend.

---

# 2. Productdoel

De app ondersteunt drie doelen in versie 1:

1. consequent trainen volgens een zelf opgesteld trainingsprogramma;
2. dagelijks alcoholgebruik registreren, begrenzen en analyseren;
3. eenvoudige overige gewoonten bijhouden.

De app moet vooral duidelijk maken:

* wat vandaag aandacht nodig heeft;
* of de gebruiker deze week op koers ligt;
* welke patronen over langere perioden ontstaan;
* welke registraties nog ontbreken.

De gebruiker bepaalt zelf:

* oefeningen;
* workouts;
* trainingscycli;
* gewoonten;
* alcoholgrenzen;
* wildcarddagen.

De app doet geen automatische inhoudelijke voorstellen.

---

# 3. Platform en technische randvoorwaarden

## 3.1 Hosting

De app wordt als statische website via GitHub Pages gepubliceerd.

Daarom geldt:

* geen eigen backend;
* geen database op een server;
* geen authenticatieserver;
* geen server-side rendering die GitHub Pages vereist;
* routes moeten rechtstreeks en na verversen blijven werken binnen de beperkingen van GitHub Pages;
* gebruik bijvoorbeeld hash-routing of een andere aantoonbaar GitHub Pages-compatibele oplossing.

## 3.2 PWA

De app moet:

* installeerbaar zijn op het iPhone-beginscherm;
* in standalone-modus functioneren;
* een webmanifest bevatten;
* een service worker gebruiken;
* na de eerste succesvolle laadbeurt offline bruikbaar zijn;
* de benodigde applicatiebestanden lokaal cachen;
* rekening houden met iPhone-safe-areas;
* na het vergrendelen of afsluiten van de telefoon de opgeslagen status behouden.

Een actieve workout en ingevoerde gegevens mogen niet afhankelijk zijn van een open browsertab.

## 3.3 Lokale opslag

Alle persoonsgegevens en registraties blijven lokaal in de browseropslag op het apparaat.

Gebruik een robuuste gestructureerde opslagoplossing die geschikt is voor:

* grote hoeveelheden historische records;
* geneste workoutdata;
* transacties;
* datamigraties;
* volledige export en import.

IndexedDB is hiervoor de verwachte standaardoplossing. Een andere oplossing mag alleen worden gekozen wanneer die aantoonbaar dezelfde betrouwbaarheid, capaciteit en migratiemogelijkheden biedt.

Gebruik `localStorage` hoogstens voor kleine niet-kritieke interfacevoorkeuren. Sla de primaire gebruikersdata daar niet als één groeiend JSON-object op.

## 3.4 Datum en tijd

Sla bij gebeurtenissen minimaal op:

* een UTC-timestamp;
* de lokale kalenderdatum in `YYYY-MM-DD`;
* de lokale tijdzone of UTC-offset op het moment van registratie waar relevant.

Dagregistraties zijn gekoppeld aan een vaste kalenderdatum en mogen niet naar een andere dag verschuiven wanneer de tijdzone later verandert.

Trainingsweken lopen van:

* maandag 00.00 uur;
* tot zondag 23.59 uur;

volgens de lokale kalenderdatum.

## 3.5 Identificatie

Gebruik stabiele unieke identifiers voor alle duurzame objecten, waaronder:

* oefeningen;
* workouttemplates;
* geplande workoutinstanties;
* voltooide workouts;
* cycli;
* dagelijkse alcoholrecords;
* alcoholschema's;
* habits;
* habitregistraties.

Gebruik geen namen als primaire identificatie.

---

# 4. Modulaire architectuur

## 4.1 Core

De applicatiecore bevat uitsluitend algemene functionaliteit:

* applicatieopstart;
* routebeheer;
* Home;
* Instellingen;
* module-registratie;
* lokale opslagtoegang;
* export en import;
* versiebeheer;
* migraties;
* datum- en weekhulpfuncties;
* gedeelde interfacecomponenten;
* service-workerbeheer;
* algemene foutafhandeling.

De core bevat geen trainings-, alcohol- of habitlogica.

## 4.2 Modules in versie 1

Versie 1 bevat:

* Gym;
* Alcohol;
* Habits.

Toekomstige mogelijke modules zoals Body, Nutrition en Motivation worden niet gebouwd en niet als lege tegel getoond.

## 4.3 Scheiding tussen modules

Iedere module heeft:

* een eigen datamodel;
* een eigen opslagnamespace;
* een eigen schemaversie;
* eigen migraties;
* eigen routes;
* eigen schermen;
* eigen berekeningen;
* eigen exportdata;
* een gedefinieerde Home-samenvatting.

Modules mogen niet rechtstreeks in elkaars interne opslag lezen of schrijven.

De enige centrale uitwisseling in versie 1 is dat iedere module een compacte samenvatting aan Home levert.

## 4.4 Moduleregister

Iedere module registreert minimaal:

* module-ID;
* modulenaam;
* pictogram;
* hoofdroute;
* schemaversie;
* initialisatiefunctie;
* migratiefuncties;
* exportfunctie;
* importvalidatie;
* Home-samenvatting;
* beschikbaarheidsstatus;
* vaste sorteervolgorde.

Versie 1 gebruikt deze volgorde:

1. Gym
2. Alcohol
3. Habits

Er hoeft nog geen interface te bestaan om deze volgorde handmatig te wijzigen.

---

# 5. Navigatie en Home

## 5.1 Navigatieprincipe

Geef niet iedere module een vaste plaats in een onderste navigatiebalk. Dat schaalt niet wanneer later meer modules worden toegevoegd.

Home is zowel:

* het centrale overzicht;
* als het modulemenu.

Instellingen moet altijd eenvoudig bereikbaar zijn, bijvoorbeeld via een vast pictogram of een compacte algemene navigatie.

Er is geen centraal tabblad Historie. Iedere module beheert zijn eigen historie.

## 5.2 Home-opbouw

Home bestaat uit drie opeenvolgende onderdelen:

1. Vandaag
2. Deze week
3. Alle modules

Home is een overzichtsscherm en geen volledig invoerscherm.

Inhoudelijke invoer en bewerking vinden plaats binnen de afzonderlijke modules.

## 5.3 Vandaag

### Gym

Toon:

* naam van de actieve cyclus;
* huidige cyclusweek;
* aantal voltooide workouts deze week;
* totaal aantal geplande workouts;
* aantal nog openstaande workouts;
* namen van de openstaande workouts.

Wanneer een workout actief is, toon prominent:

* naam van de actieve workout;
* aantal afgevinkte sets;
* totaal aantal sets;
* een knop om de workout in de Gym-module te hervatten.

Omdat workouts niet aan een verplichte weekdag gekoppeld zijn, mag Home niet voorschrijven welke workout vandaag moet worden uitgevoerd.

### Alcohol

Toon:

* limiet van vandaag;
* geregistreerd aantal glazen van vandaag;
* status van vandaag;
* wildcardstatus;
* aantal verstreken dagen dat nog niet is geregistreerd.

Mogelijke statussen:

* Niet geregistreerd
* Binnen limiet
* Limiet overschreden
* Wildcard gebruikt

Wanneer oude dagen ontbreken, toon de oudste niet-geregistreerde datum als eerste openstaande actie.

Bij openen gaat de gebruiker naar het betreffende dagscherm in de Alcoholmodule.

Alcohol wordt niet rechtstreeks op Home ingevoerd.

### Habits

Toon:

* welke habits vandaag gepland staan;
* welke zijn voltooid;
* totaal voltooide habits;
* totaal geplande habits.

Voorbeeld:

`3 van 4 voltooid`

Bij openen gaat de gebruiker naar het dagscherm van Habits.

Habits worden niet rechtstreeks op Home afgevinkt.

## 5.4 Deze week

### Gym

Toon:

* huidige cyclusweek;
* voltooid aantal workouts;
* gepland aantal workouts;
* resterend aantal workouts;
* totaal aantal gemiste workouts sinds de start van het actieve programma;
* gemiste workouts over de laatste 4 afgesloten weken;
* gemiste workouts over de laatste 8 afgesloten weken;
* gemiste workouts over de laatste 12 afgesloten weken.

Wanneer minder afgesloten weken beschikbaar zijn, gebruik de beschikbare weken en vermeld het werkelijke aantal.

De lopende week heeft nog geen gemiste workouts.

### Alcohol

Toon tot en met vandaag:

* totaal geregistreerde glazen;
* aantal geregistreerde dagen;
* aantal ontbrekende verstreken dagen;
* aantal dagen binnen de limiet;
* aantal overschrijdingen;
* aantal wildcarddagen;
* aantal bevestigde alcoholvrije dagen.

Voor gebruik ten opzichte van limieten:

* gebruik alleen geregistreerde dagen;
* sluit wildcarddagen uit van de limietbeoordeling;
* toon wildcardgebruik wel in het algemene totaal;
* meld duidelijk hoeveel dagen ontbreken.

Toekomstige dagen van de lopende week worden niet in de actuele voortgang meegenomen.

### Habits

Toon tot en met vandaag:

* totaal aantal geplande habitmomenten;
* totaal aantal voltooide habitmomenten;
* voltooiingspercentage.

Toekomstige habitmomenten tellen nog niet als onvoltooid.

## 5.5 Alle modules

Onder de primaire informatie staat een schaalbaar tegeloverzicht.

Iedere tegel toont:

* modulenaam;
* pictogram;
* korte actuele status;
* ingang naar de module.

Voorbeelden:

* Gym: `2 van 3 workouts voltooid`
* Alcohol: `Vandaag nog niet geregistreerd`
* Habits: `3 van 4 voltooid`

Het tegeloverzicht:

* ondersteunt meerdere rijen;
* past zich aan het iPhone-scherm aan;
* wordt automatisch opgebouwd uit het moduleregister;
* toont alleen daadwerkelijk beschikbare modules;
* toont geen toekomstige placeholders.

## 5.6 Geen centrale score

Bereken geen algemene score waarin Gym, Alcohol en Habits worden samengevoegd.

Niet tonen:

`Je weekscore is 78%`

De drie onderdelen hebben verschillende doelen en blijven afzonderlijk zichtbaar.

---

# 6. Gym-module

## 6.1 Uitgangspunt

De gebruiker stelt alle oefeningen, workouts en trainingsprogramma's zelf samen.

De app bevat geen:

* ingebouwde oefeningendatabase;
* automatisch voorgestelde oefeningen;
* AI-classificatie;
* alternatieve oefeningen;
* automatisch aangepast trainingsschema;
* automatische progressievoorstellen.

## 6.2 Spiergroepen

Iedere oefening heeft exact één spiergroep.

De toegestane spiergroepen zijn uitsluitend:

* Chest
* Biceps
* Triceps
* Upper back
* Lower back
* Shoulders
* Glutes
* Legs
* Core

Geen secundaire spiergroepen.

## 6.3 Oefeningendatabase

Een oefening bevat minimaal:

* unieke ID;
* naam;
* spiergroep;
* aanmaakdatum;
* wijzigingsdatum;
* actieve of verwijderde status.

De gebruiker kan oefeningen:

* toevoegen;
* bewerken;
* verwijderen;
* opnieuw gebruiken in workouts en cycli.

Wijzigingen aan een oefening mogen historische workouts niet veranderen.

Een voltooide workout bewaart daarom zowel:

* de oorspronkelijke oefening-ID;
* als een snapshot van naam en spiergroep.

Na verwijderen van een oefening blijft historische data volledig leesbaar.

## 6.4 Drie niveaus van workouts

### Niveau 1: workoutbibliotheek

Een workouttemplate is een optioneel herbruikbare losse workout.

Een template bevat:

* unieke ID;
* naam;
* geordende oefeningen;
* per oefening geplande sets;
* per set gewicht en herhalingen.

Niet iedere geplande workout hoeft in de bibliotheek te staan.

### Niveau 2: geplande workoutinstantie

Een workout die in een cyclusweek wordt geplaatst is een zelfstandige kopie.

Een geplande workout kan ontstaan uit:

* een workouttemplate;
* een kopie van een andere geplande workout;
* een volledig nieuwe workout.

Bij gebruik van een template wordt een diepe kopie gemaakt.

Latere wijzigingen aan de geplande workout veranderen het oorspronkelijke template niet.

Latere wijzigingen aan het template veranderen reeds geplande workoutinstanties niet.

### Niveau 3: voltooide workoutsnapshot

Bij voltooiing wordt een onveranderlijke historische snapshot opgeslagen.

Latere wijzigingen aan:

* oefeningen;
* workouttemplates;
* cycli;
* spiergroepen;
* namen;

mogen de voltooide workout niet wijzigen.

## 6.5 Sets

Voor iedere set worden afzonderlijk gepland:

* gewicht;
* aantal herhalingen.

Voor Core:

* is gewicht niet van toepassing;
* wordt gewicht als `null` of afwezig opgeslagen;
* worden herhalingen wel opgeslagen;
* wordt geen gewichtsvolume berekend.

Voor andere spiergroepen:

* is gewicht een niet-negatief getal;
* zijn herhalingen een niet-negatief geheel getal.

De gebruiker beschouwt de geplande waarden als definitief. Er bestaat in versie 1 geen onderscheid tussen gepland en werkelijk uitgevoerd.

Gewicht en herhalingen kunnen tijdens een actieve workout niet worden aangepast.

## 6.6 Trainingscyclus

Een trainingscyclus bevat:

* unieke ID;
* naam;
* aanmaakdatum;
* startdatum;
* aantal workouts per week;
* aantal weken per cyclus;
* per cyclusweek een eigen lijst geplande workouts;
* status;
* eventuele einddatum;
* vervangende cyclus indien ingepland.

Mogelijke statussen:

* Concept
* Gepland
* Actief
* Vervanging ingepland
* Gearchiveerd
* Gestopt

## 6.7 Cyclusstructuur

Iedere cyclusweek heeft zijn eigen lijst met geplande workoutinstanties.

Dezelfde basisworkout kan:

* in meerdere cyclusweken voorkomen;
* meerdere keren in dezelfde cyclusweek voorkomen;
* per instantie andere gewichten, herhalingen en sets bevatten.

Er is geen gedeelde live-koppeling tussen deze kopieën.

## 6.8 Start van een cyclus

Een nieuwe cyclus begint altijd op de eerstvolgende maandag.

Ook wanneer een cyclus op maandag wordt geactiveerd, begint deze pas op de daaropvolgende maandag.

Een cyclus begint nooit midden in een trainingsweek.

Tot de startdatum blijft de cyclus Gepland.

## 6.9 Automatische weekvoortgang

De cyclus gaat iedere maandag naar de volgende cyclusweek, ongeacht of alle workouts uit de vorige week zijn voltooid.

Na de laatste cyclusweek begint de cyclus opnieuw bij week 1, tenzij de cyclus:

* is gepauzeerd;
* is gestopt;
* of wordt vervangen.

Niet-uitgevoerde workouts schuiven niet door naar de volgende week.

## 6.10 Flexibele workoutdagen

Workouts worden aan een trainingsweek gekoppeld, niet aan een verplichte kalenderdag.

De gebruiker kan de geplande workouts in iedere volgorde en op iedere dag binnen de week uitvoeren.

Een workout wordt daarom niet gemist doordat een voorkeursdag voorbij is.

Optionele voorkeursdagen mogen alleen als informatieve planning worden gebruikt en veranderen de weeklogica niet.

## 6.11 Actieve cyclus bewerken

### Afgesloten weken

Afgesloten trainingsweken en voltooide workouts zijn onveranderlijk.

### Lopende week

In de actuele week mogen alleen nog niet voltooide en niet actieve geplande workouts worden:

* toegevoegd;
* bewerkt;
* gekopieerd;
* verwijderd;
* herordend.

Een actieve workout moet eerst worden voltooid of geannuleerd voordat die workout via de cycluseditor wordt aangepast.

Wanneer het aantal geplande workouts in de huidige week verandert, wordt de weekvoortgang direct opnieuw berekend.

### Toekomstige cyclusweken

Toekomstige weken binnen de actieve cyclus mogen volledig worden aangepast.

## 6.12 Cyclus vervangen

De gebruiker kan tijdens een actieve cyclus een vervangende cyclus inplannen.

De vervangende cyclus:

* wordt onmiddellijk vastgelegd;
* start op de eerstvolgende maandag;
* verandert de huidige week niet;
* kan vóór de start worden geannuleerd.

Na de overgang wordt de oude cyclus gearchiveerd.

Een gearchiveerde cyclus kan:

* worden bekeken;
* als basis worden gekopieerd;

maar niet retroactief worden gewijzigd.

## 6.13 Workout kopiëren

Een geplande workout kan worden gekopieerd naar:

* dezelfde cyclusweek;
* een andere week binnen dezelfde cyclus;
* een nieuwe cyclus;
* de workoutbibliotheek.

Opslaan in de bibliotheek maakt standaard een nieuw template.

Overschrijf een bestaand template niet automatisch.

## 6.14 Workout uitvoeren

Een actieve workout toont alle oefeningen in de vastgelegde volgorde.

Iedere geplande set toont:

* setnummer;
* gewicht indien van toepassing;
* herhalingen;
* een afvinkmogelijkheid.

De gebruiker vinkt iedere set afzonderlijk af.

Een oefening is voltooid wanneer alle bijbehorende sets zijn afgevinkt.

De workout is gereed wanneer alle sets zijn afgevinkt.

## 6.15 Voltooiingsbevestiging

Wanneer de laatste set wordt afgevinkt, verschijnt een compacte bevestiging met minimaal:

* Workout voltooien
* Terug naar workout

De workout wordt niet automatisch definitief voltooid.

Bij Terug naar workout:

* blijft de workout actief;
* blijven afgevinkte sets behouden;
* kunnen sets opnieuw worden uitgevinkt.

Bij Workout voltooien:

* wordt de definitieve snapshot opgeslagen;
* wordt de voltooiingstijd opgeslagen;
* wordt de geplande workout als voltooid gemarkeerd;
* worden weekvoortgang, historie en analyses bijgewerkt;
* wordt de actieve workoutsessie verwijderd.

## 6.16 Autosave en hervatten

Sla iedere wijziging van een setcheckbox onmiddellijk lokaal op.

Bewaar minimaal:

* geplande workout-ID;
* actieve workoutsessie-ID;
* afgevinkte sets;
* starttijd;
* laatste wijziging;
* of de voltooiingsbevestiging al is getoond.

Een actieve workout moet behouden blijven bij:

* wisselen naar een andere app;
* vergrendelen van de telefoon;
* afsluiten van de PWA;
* herladen van de pagina;
* herstarten van de telefoon;
* tijdelijk offline zijn.

Bij opnieuw openen moet de app duidelijk aanbieden de actieve workout te hervatten.

Er kan maximaal één actieve workout tegelijk bestaan.

## 6.17 Tweede workout starten

Wanneer al een workout actief is, mag geen tweede workout worden gestart.

Toon een duidelijke keuze om:

* de actieve workout te hervatten;
* of die workout eerst te annuleren.

## 6.18 Workout annuleren

Annuleren vereist bevestiging.

Bij annulering:

* worden de tijdelijke setcheckboxes en sessievoortgang verwijderd;
* telt de workout niet als voltooid;
* blijft de geplande workout in de cyclusweek bestaan;
* kan die later opnieuw vanaf nul worden gestart.

Er bestaan geen gedeeltelijk voltooide workouts in de historie.

## 6.19 Gemiste workouts

Een geplande workout geldt pas als gemist nadat de trainingsweek is afgesloten.

Berekening bij weekafsluiting:

`gemist = gepland - voltooid`

De huidige week bevat nog geen gemiste workouts.

Een workout die in een latere week alsnog wordt uitgevoerd, herstelt een eerder gemiste workout niet.

Bewaar per afgesloten week:

* startdatum;
* einddatum;
* cyclus-ID;
* cyclusweek;
* geplande workoutslots;
* voltooide workoutslots;
* gemiste workoutslots;
* aantallen gepland, voltooid en gemist.

## 6.20 Volume

Voor een gewogen set:

`setvolume = gewicht × herhalingen`

Per oefening:

`oefeningsvolume = som van de setvolumes`

Per spiergroep:

`spiergroepvolume = som van de volumes van alle oefeningen in die spiergroep`

Per workout:

`workoutvolume = som van alle gewogen setvolumes`

Core wordt volledig uitgesloten van volume.

Core blijft wel onderdeel van:

* workouts;
* setregistratie;
* herhalingen;
* voltooiing;
* historie.

## 6.21 Classificatie Light, Medium en Heavy

De classificatie wordt zowel tijdens het plannen als bij definitieve voltooiing berekend.

Omdat geplande en werkelijk uitgevoerde waarden gelijk zijn, wordt de verwachte classificatie bij volledige voltooiing de definitieve classificatie.

### Classificatie per spiergroep

Voor iedere gewogen spiergroep in de workout:

1. bereken het actuele spiergroepvolume;
2. zoek de drie meest recente voltooide workouts waarin diezelfde spiergroep voorkwam;
3. bereken het gemiddelde spiergroepvolume van die drie workouts;
4. bereken:

`ratio = actueel volume / gemiddeld volume vorige drie relevante workouts`

Classificatie:

* ratio kleiner dan 0,75: Light
* ratio van 0,75 tot en met 1,25: Medium
* ratio groter dan 1,25: Heavy

Gebruik alleen eerdere workouts die vóór de te classificeren workout zijn voltooid.

### Onvoldoende historie

Wanneer minder dan drie relevante eerdere workouts beschikbaar zijn:

* krijgt de spiergroep de status Onvoldoende historie;
* verzint de app geen alternatieve classificatie.

### Heavy-persistentie

Een spiergroep blijft Heavy wanneer:

* de vorige voltooide workout waarin die spiergroep voorkwam als Heavy was geclassificeerd;
* en het huidige spiergroepvolume minimaal 90% bedraagt van het volume van die vorige Heavy-workout.

Wanneer deze regel wordt geactiveerd:

* is de spiergroepclassificatie Heavy;
* wordt `heavyPersistenceApplied = true` opgeslagen;
* wordt voor de berekening van de hele workout een effectieve ratio gebruikt van minimaal net boven de Heavy-grens.

Gebruik hiervoor bijvoorbeeld:

`effectieve ratio = max(berekende ratio, 1.250001)`

Hierdoor werkt Heavy-persistentie ook door in de gewogen workoutberekening.

### Classificatie van de hele workout

Combineer de effectieve ratio's van de classificeerbare spiergroepen.

Weeg iedere spiergroep op basis van het aantal geplande sets van die spiergroep:

`gewogen ratio = som(effectieve groepsratio × aantal groepssets) / totaal aantal classificeerbare sets`

Gebruik daarna dezelfde grenzen:

* kleiner dan 0,75: Light
* 0,75 tot en met 1,25: Medium
* groter dan 1,25: Heavy

Core telt niet mee.

Spiergroepen met Onvoldoende historie tellen niet mee in de gewogen ratio.

Wanneer geen enkele gewogen spiergroep voldoende historie heeft:

* krijgt de hele workout Onvoldoende historie.

Wanneer slechts een deel van de sets classificeerbaar is:

* toon de berekende Light-, Medium- of Heavy-classificatie;
* toon daarnaast de classificatiedekking, bijvoorbeeld `12 van 18 gewogen sets meegenomen`.

### Historische opslag

Sla per spiergroep minimaal op:

* actueel volume;
* gebruikte drie historische workout-ID's;
* de drie historische volumes;
* berekend gemiddelde;
* berekende ratio;
* effectieve ratio;
* aantal sets;
* basisclassificatie;
* definitieve classificatie;
* Heavy-persistentie toegepast;
* ID en volume van de vorige Heavy-workout indien gebruikt.

Sla voor de hele workout op:

* gewogen ratio;
* aantal classificeerbare sets;
* totaal aantal gewogen sets;
* classificatiedekking;
* definitieve classificatie;
* gebruikte formuleversie.

Historische classificaties mogen niet veranderen wanneer de formule later wordt aangepast.

## 6.22 Classificatie tijdens planning

Toon in de workout- en cycluseditor:

* gepland volume per spiergroep;
* historische referentie;
* verwachte classificatie per spiergroep;
* verwachte classificatie van de hele workout;
* melding Onvoldoende historie waar van toepassing;
* classificatiedekking.

De app geeft geen advies over hoe de gebruiker de workout moet aanpassen.

## 6.23 Gymhistorie

Gebruik een maandkalender.

De kalender:

* opent op de huidige maand;
* kan terugbladeren tot de eerste workout;
* kan niet verder dan de huidige maand vooruit;
* toont voltooide workouts op hun voltooiingsdatum.

In een kalenderdag wordt per workout uitsluitend getoond:

* Light
* Medium
* Heavy
* of Onvoldoende historie

Toon in de kalendertegel geen:

* oefeningen;
* sets;
* herhalingen;
* gewichten;
* volume;
* duur.

Bij openen van een workout mag een afzonderlijk detailscherm de volledige onveranderlijke workoutsnapshot tonen.

Gemiste workouts worden niet aan een specifieke kalenderdag gekoppeld en verschijnen daarom niet in deze kalender.

## 6.24 Grafieken

### Maximumgewicht per oefening

Voor een geselecteerde oefening:

* één datapunt per voltooide workout waarin de oefening voorkwam;
* datapunt is het hoogste gewicht van alle sets van die oefening;
* x-as is voltooiingsdatum;
* y-as is kilogram;
* toon de volledige historie.

Gebruik historische oefening-ID's zodat hernoemen of verwijderen de grafiek niet breekt.

Core-oefeningen hebben geen maximumgewichtgrafiek.

### Volume per spiergroep

Voor een geselecteerde gewogen spiergroep:

* één datapunt per afgesloten trainingsweek;
* waarde is het totale volume van alle voltooide workouts in die week;
* week loopt maandag tot en met zondag;
* toon de volledige historie.

Beschikbare spiergroepen:

* Chest
* Biceps
* Triceps
* Upper back
* Lower back
* Shoulders
* Glutes
* Legs

Core is uitgesloten.

Wanneer een spiergroep in een week niet is getraind:

* sla voor die week geen werkelijk volume van nul op;
* markeer de waarneming als ontbrekend;
* laat in de visualisatie de laatste beschikbare waarde horizontaal doorlopen;
* gebruik de doorgerekende visuele waarde niet in gemiddelden, classificaties of andere berekeningen.

Grafieken zijn lijngrafieken en moeten op een iPhone horizontaal en interactief te onderzoeken zijn wanneer de historie breder is dan het scherm.

## 6.25 Voltooide workoutsnapshot

Bewaar minimaal:

* unieke workout-ID;
* geplande workoutslot-ID;
* starttijd;
* voltooiingstijd;
* lokale voltooiingsdatum;
* cyclus-ID;
* cyclusnaam als snapshot;
* cyclusweek;
* positie binnen de week;
* workoutnaam als snapshot;
* geordende oefeningensnapshots;
* oefening-ID;
* oefeningnaam;
* spiergroep;
* alle sets;
* gewicht;
* herhalingen;
* setvolume;
* oefeningsvolume;
* spiergroepvolume;
* workoutvolume;
* groepsclassificaties;
* totale workoutclassificatie;
* alle gebruikte classificatiebaselines;
* formuleversie;
* dataschemaversie.

Wanneer technisch eenvoudig, bewaar ook het tijdstip waarop iedere set werd afgevinkt. Dit is opslag voor eventueel later gebruik en hoeft niet in versie 1 te worden getoond.

---

# 7. Alcoholmodule

## 7.1 Uitgangspunt

De Alcoholmodule registreert dagelijks het aantal glazen in drie vaste contexten.

De module bevat geen invoer voor:

* tijdstip;
* afzonderlijke drinkmomenten;
* dranksoort;
* milliliters;
* alcoholpercentage;
* standaardglazen of eenhedenberekening.

Alle aantallen worden als gewone glazen behandeld.

## 7.2 Dagrecord

Per kalenderdatum kan maximaal één alcoholrecord bestaan.

Een record bevat:

* datum;
* glazen Thuis solo;
* glazen Thuis samen;
* glazen Sociale context;
* dagtotaal;
* wildcardstatus;
* geldende daglimiet als snapshot;
* berekende dagstatus;
* aanmaaktijd;
* laatste wijziging;
* schemaversie.

De drie aantallen zijn gehele getallen van nul of hoger.

`dagtotaal = solo + samen + sociaal`

Meerdere contexten op dezelfde dag zijn mogelijk.

## 7.3 Drie verschillende dagtoestanden

Maak expliciet onderscheid tussen:

1. geen record aanwezig;
2. record aanwezig met totaal nul;
3. record aanwezig met één of meer glazen.

Een lege dag is nooit automatisch alcoholvrij.

## 7.4 Dag invoeren en wijzigen

De gebruiker kan:

* vandaag invoeren;
* een eerdere dag invoeren;
* een bestaand record wijzigen;
* een record verwijderen.

Na iedere wijziging worden alle afhankelijke statistieken opnieuw berekend.

Een toekomstige datum kan niet worden geregistreerd.

## 7.5 Weekdagschema

De gebruiker stelt voor iedere weekdag een maximumaantal glazen in:

* maandag;
* dinsdag;
* woensdag;
* donderdag;
* vrijdag;
* zaterdag;
* zondag.

Een maximum van nul betekent een geplande alcoholvrije dag.

De gebruiker bepaalt zelf de waarden.

Er worden geen inhoudelijke standaardwaarden door de app opgelegd.

## 7.6 Historische schema's

Bewaar alcoholschema's met een ingangsdatum.

Een nieuw schema:

* geldt vanaf de datum waarop het wordt geactiveerd;
* verandert eerdere kalenderdagen niet;
* bewaart eerdere schema's voor historische beoordeling.

Iedere dag wordt beoordeeld aan de hand van de limiet die op die datum werkelijk gold.

Een latere wijziging mag oude dagen niet volgens de nieuwe limiet herberekenen.

Bewaar de toegepaste limiet daarnaast als snapshot in het dagrecord of de dagbeoordeling.

## 7.7 Dagstatus

Een dag heeft één van deze statussen:

* Niet beoordeeld
* Binnen limiet
* Limiet overschreden
* Wildcard gebruikt

### Binnen limiet

Een geregistreerde dag zonder wildcard waarbij:

`dagtotaal ≤ geldende limiet`

### Limiet overschreden

Een geregistreerde dag zonder wildcard waarbij:

`dagtotaal > geldende limiet`

### Wildcard gebruikt

Een geregistreerde dag waarop wildcard is geactiveerd.

De normale limiet wordt voor de nalevingsbeoordeling van die dag genegeerd.

Het werkelijke aantal glazen blijft volledig opgeslagen en telt mee in algemene gebruikstotalen.

### Niet beoordeeld

Een verstreken dag zonder registratie.

## 7.8 Alcoholvrije dagen

Een bevestigde alcoholvrije dag is iedere geregistreerde dag met totaal nul.

Een behaalde geplande alcoholvrije dag is specifieker:

* geldende limiet is nul;
* dagtotaal is nul;
* geen wildcard.

Een gemiste geplande alcoholvrije dag is:

* geldende limiet is nul;
* een registratie bestaat;
* dagtotaal is groter dan nul;
* geen wildcard.

Een niet-geregistreerde dag met limiet nul is niet beoordeeld en telt niet als gemist.

## 7.9 Niet-geregistreerde dagen

Een verstreken dag zonder registratie:

* telt niet als alcoholvrij;
* telt niet als binnen de limiet;
* telt niet als overschrijding;
* telt niet als gemiste alcoholvrije dag;
* wordt uitgesloten van het nalevingspercentage;
* verlaagt de registratiegraad.

De module toont:

* het aantal ontbrekende dagen;
* de betreffende datums;
* de oudste ontbrekende datum als eerste.

Vanaf Home kan de gebruiker rechtstreeks naar de oudste ontbrekende datum gaan.

Na opslaan opent zo nodig de volgende ontbrekende datum.

## 7.10 Wildcards

Een wildcard wordt toegepast op één specifieke kalenderdatum.

Gebruik bijvoorbeeld voor een feestdag, vakantie of evenement.

Een wildcarddag:

* is geen dag binnen de limiet;
* is geen overschrijding;
* is geen gemiste alcoholvrije dag;
* blijft apart herkenbaar;
* behoudt alle geregistreerde glazen;
* telt mee in algemeen totaalgebruik;
* wordt uitgesloten van nalevingspercentages.

Toon wildcardstatistieken over:

* totaal aantal wildcards;
* laatste 4 afgesloten weken;
* laatste 8 afgesloten weken;
* laatste 12 afgesloten weken;
* kalendermaand;
* volledige historie;
* datums;
* totaal aantal glazen op wildcarddagen.

De toon is neutraal.

## 7.11 Nalevingspercentage

Bereken:

`dagen binnen limiet / (dagen binnen limiet + dagen met overschrijding)`

Sluit uit:

* wildcarddagen;
* niet-geregistreerde dagen;
* toekomstige dagen.

Toon altijd de registratiegraad naast het nalevingspercentage.

## 7.12 Gebruik ten opzichte van limieten

Maak onderscheid tussen:

### Totaal gebruik

Alle geregistreerde glazen, inclusief wildcarddagen.

### Beoordeeld gebruik

Glazen op geregistreerde dagen zonder wildcard.

### Beoordeelde limiet

De som van de historische daglimieten van geregistreerde dagen zonder wildcard.

Gebruik voor de vergelijking met limieten:

* beoordeeld gebruik;
* beoordeelde limiet.

Hierdoor veroorzaken wildcarddagen geen misleidende overschrijding van de periodeteller.

Niet-geregistreerde dagen worden niet in deze vergelijking opgenomen. Toon daarom altijd hoeveel kalenderdagen ontbreken.

## 7.13 Alcoholkalender

Gebruik een maandkalender over de volledige gebruiksduur van de module.

De kalender:

* opent standaard op de huidige maand;
* kan onbeperkt terugbladeren tot de eerste moduledata;
* kan niet voorbij de huidige maand bladeren.

Toon per dag:

* totaal aantal glazen indien geregistreerd;
* historische daglimiet;
* dagstatus;
* wildcardindicatie;
* duidelijke indicatie bij Niet beoordeeld.

Bij openen van een dag kan de gebruiker:

* de drie contextaantallen bekijken;
* aantallen aanpassen;
* wildcard aanpassen;
* totaal bekijken;
* historische limiet bekijken;
* status bekijken;
* het record verwijderen.

## 7.14 Analyses

De module analyseert de volledige beschikbare historie.

Beschikbare inzichten zijn minimaal:

* totaal aantal glazen;
* gemiddeld aantal glazen per kalenderdag;
* gemiddeld aantal glazen per geregistreerde dag;
* gemiddeld aantal glazen per drinkdag;
* aantal drinkdagen;
* aantal bevestigde alcoholvrije dagen;
* aantal behaalde geplande alcoholvrije dagen;
* aantal gemiste geplande alcoholvrije dagen;
* aantal dagen binnen de limiet;
* aantal overschrijdingen;
* aantal wildcarddagen;
* aantal niet-geregistreerde verstreken dagen;
* registratiegraad;
* nalevingspercentage;
* glazen Thuis solo;
* glazen Thuis samen;
* glazen Sociale context;
* procentuele contextverdeling;
* beoordeeld gebruik;
* beoordeelde limiet;
* gebruik ten opzichte van de beoordeelde limiet.

## 7.15 Automatische vergelijkingsperioden

De gebruiker hoeft niet zelf telkens twee perioden te selecteren.

De app toont vaste relevante vergelijkingen zodra voldoende historie beschikbaar is.

### Weekvergelijkingen

Gebruik uitsluitend volledig afgesloten kalenderweken.

Toon:

* laatste afgesloten week tegenover de week direct daarvoor;
* laatste afgesloten week tegenover de week vier weken eerder;
* laatste 4 afgesloten weken tegenover de 4 weken daarvoor;
* laatste 8 afgesloten weken tegenover de 8 weken daarvoor;
* laatste 12 afgesloten weken tegenover de 12 weken daarvoor.

### Maandvergelijkingen

Gebruik uitsluitend volledig afgesloten kalendermaanden.

Toon:

* laatste afgesloten maand tegenover de maand direct daarvoor;
* laatste afgesloten maand tegenover twee maanden eerder;
* laatste afgesloten maand tegenover drie maanden eerder;
* laatste afgesloten maand tegenover het gemiddelde van de drie voorafgaande maanden;
* laatste 3 afgesloten maanden tegenover de 3 maanden daarvoor;
* laatste 6 afgesloten maanden tegenover de 6 maanden daarvoor;
* laatste 12 afgesloten maanden tegenover de 12 maanden daarvoor.

### Jaarvergelijking

Zodra voldoende historie beschikbaar is:

* laatste volledig afgesloten kalenderjaar tegenover het kalenderjaar daarvoor.

## 7.16 Actuele periode

Vergelijk een onvolledige lopende week of maand niet rechtstreeks met een volledig afgesloten periode alsof beide compleet zijn.

Toon voor een lopende week of maand alleen voortgang tot en met vandaag, waaronder:

* glazen tot nu toe;
* beoordeeld gebruik;
* beoordeelde limiet;
* binnen-limietdagen;
* overschrijdingen;
* wildcards;
* ontbrekende dagen;
* registratiegraad.

## 7.17 Inzichten per vergelijking

Vergelijk voor iedere periode alle beschikbare relevante inzichten.

Toon waar toepasbaar:

* waarde van de recente periode;
* waarde van de referentieperiode;
* absoluut verschil;
* procentuele verandering.

Wanneer de referentiewaarde nul is:

* bereken geen procentuele verandering;
* toon alleen het absolute verschil.

Historische limieten van iedere afzonderlijke datum blijven leidend.

Beoordeel oude perioden niet opnieuw volgens het huidige weekschema.

## 7.18 Onvolledige registratie in analyses

Wanneer een periode niet volledig is geregistreerd:

* blijft de vergelijking beschikbaar;
* toon hoeveel dagen in beide perioden ontbreken;
* behandel ontbrekende dagen niet als nul glazen;
* toon de registratiegraad;
* presenteer geen schijnnauwkeurige conclusies.

Gebruik geen AI-geschreven samenvattingen.

## 7.19 Impactuitleg

De module bevat een vaste, regelgebaseerde impactuitleg.

Deze uitleg wordt niet door AI gegenereerd.

De toon van de content is:

* direct;
* zakelijk;
* concreet;
* confronterend;
* kort.

Geen:

* verzachtende marketingtaal;
* humor;
* moraliserende beschuldigingen;
* medische disclaimers;
* algemene medische voorbehouden;
* automatisch gegenereerde gezondheidsclaims.

## 7.20 Directe impact en zevendaagse context

Voor iedere geregistreerde, afgesloten kalenderdag kan de app twee vaste teksten selecteren.

### Directe impacttekst

Gebaseerd op het totale aantal glazen van de betreffende dag.

De inhoud kan betrekking hebben op:

* slaapkwaliteit;
* energie de volgende dag;
* trainingsherstel;
* concentratie;
* stemming;
* lichamelijke belasting.

### Contexttekst

Gebaseerd op de betreffende dag plus de zes voorgaande kalenderdagen.

Bereken daarvoor:

* totaal aantal glazen in zeven dagen;
* aantal geregistreerde dagen;
* aantal ontbrekende dagen;
* aantal drinkdagen;
* aantal bevestigde alcoholvrije dagen;
* aantal opeenvolgende drinkdagen tot en met de betreffende dag;
* aantal overschrijdingen;
* aantal wildcards.

Ontbrekende dagen gelden niet als alcoholvrij.

## 7.21 Impactcontent als configuratie

Sla de impactteksten los van de functionele programmacode op, bijvoorbeeld in een inhoudsconfiguratie.

De configuratie ondersteunt:

* bereiken of exacte aantallen glazen;
* vaste directe impactteksten;
* vaste zevendaagse contextregels;
* vaste contextteksten;
* prioriteit wanneer meerdere contextregels passen;
* contentversie.

Claude bouwt het regelsysteem en de contentstructuur.

Claude verzint niet zelfstandig de definitieve impactteksten. Gebruik duidelijk herkenbare tijdelijke contentkeys of expliciete placeholders totdat de teksten apart worden aangeleverd.

Toon geen medisch voorbehoud rond deze placeholders.

## 7.22 Wanneer impact wordt getoond

De definitieve impactuitleg hoort bij een afgesloten kalenderdag.

Op Home kan bijvoorbeeld de meest recente geregistreerde afgesloten dag worden samengevat.

Een registratie van vandaag kan wel worden ingevoerd, maar de definitieve afgesloten-dagimpact wordt pas na het eindigen van de kalenderdag vastgesteld.

Bij retroactieve invoer of wijziging worden opnieuw berekend:

* de gewijzigde dag;
* de zes daaropvolgende kalenderdagen.

---

# 8. Habits-module

## 8.1 Doel

Habits is een eenvoudige generieke module voor terugkerende gewoonten die alleen als uitgevoerd of niet uitgevoerd hoeven te worden geregistreerd.

Complexere onderwerpen krijgen later eventueel een zelfstandige module.

## 8.2 Habitgegevens

Een habit bevat:

* unieke ID;
* naam;
* optionele vrije beschrijving;
* één of meer geplande weekdagen;
* aanmaakdatum;
* wijzigingsdatum;
* actieve status;
* historische schemaversies.

Voorbeelden:

* Naam: Lezen
* Beschrijving: Minimaal 30 minuten

of:

* Naam: Wandelen
* Beschrijving: Minimaal 8.000 stappen

De app interpreteert de beschrijving niet.

Er worden geen minuten, stappen of andere waarden apart ingevoerd.

## 8.3 Binaire registratie

Een gepland habitmoment heeft uitsluitend twee uitvoeringsmogelijkheden:

* uitgevoerd;
* niet uitgevoerd.

De gebruiker kan een gepland moment:

* afvinken;
* opnieuw uitvinken;
* retroactief invullen;
* retroactief corrigeren.

Niet-geplande dagen tellen niet als uitgevoerd of gemist.

Een verstreken geplande dag zonder voltooiing geldt als niet uitgevoerd.

Toekomstige geplande dagen zijn nog niet gemist.

## 8.4 Historische schema's

Wanneer de geplande weekdagen worden gewijzigd:

* geldt het nieuwe schema vanaf de wijzigingsdatum;
* blijven eerdere dagen beoordeeld volgens het schema dat toen gold;
* worden eerdere registraties niet herschreven.

Bewaar daarom effectieve schemaversies met ingangsdatum.

## 8.5 Streaks

Toon per habit:

* huidige streak;
* langste streak ooit.

Een streak bestaat uit opeenvolgende geplande habitmomenten die zijn voltooid.

Niet-geplande kalenderdagen onderbreken een streak niet.

Voorbeeld:

Een habit staat gepland op maandag, woensdag en vrijdag.

Wanneer alle drie zijn voltooid, is de streak drie. Dinsdag en donderdag hebben geen invloed.

Een gemist gepland moment verbreekt de streak.

Na retroactieve wijzigingen worden huidige en langste streak volledig opnieuw berekend op basis van de historische schema's.

## 8.6 Habitkalender

Iedere habit heeft een maandkalender over de volledige looptijd.

Toon per dag onderscheid tussen:

* gepland en uitgevoerd;
* gepland en niet uitgevoerd;
* niet gepland;
* toekomstige geplande dag.

De kalender:

* opent op de huidige maand;
* kan terugbladeren tot de aanmaakdatum of eerste historische gegevens;
* gebruikt het historische weekschema.

## 8.7 Beheer

De gebruiker kan habits:

* aanmaken;
* bewerken;
* verwijderen.

Verwijderen vereist bevestiging.

Bij definitief verwijderen worden:

* de actieve habit;
* de schemaversies;
* de bijbehorende registraties;

uit de actieve moduledata verwijderd.

Een verwijderde habit blijft niet als lege tegel zichtbaar.

## 8.8 Afbakening

De Habits-module bevat geen:

* kwantitatieve invoervelden;
* automatisch berekende eenheden;
* categorieën;
* AI-advies;
* automatisch aangemaakte habits;
* koppeling met Gym;
* koppeling met Alcohol;
* eigen notificaties;
* ingewikkelde habittypen.

## 8.9 Home-samenvatting

Habits levert aan Home:

* habits die vandaag gepland staan;
* voltooide status;
* totaal gepland vandaag;
* totaal voltooid vandaag;
* voortgang tot en met vandaag in de huidige week.

Home wijzigt de habitrecords niet rechtstreeks.

---

# 9. Instellingen

Instellingen bevat in versie 1 minimaal:

* volledige back-up exporteren;
* volledige back-up importeren;
* appversie;
* algemene schemaversie;
* schemaversie per module;
* eventueel informatie over de geïnstalleerde PWA-versie;
* een functie om alle lokale data te verwijderen, alleen met zeer duidelijke bevestiging.

Voeg geen account- of cloudinstellingen toe.

---

# 10. Export

## 10.1 Handmatige export

De gebruiker kan op ieder moment een volledige back-up exporteren.

Er is geen wekelijkse of andere periodieke herinnering.

De primaire aanleiding voor export is:

* vóór een release die opslag of datamodellen wijzigt;
* vóór een risicovolle migratie;
* bij overstap naar een ander apparaat;
* als algemene handmatige reservekopie.

## 10.2 Inhoud exportbestand

Een export bevat één volledig bestand met:

* exportformaatversie;
* exportdatum;
* appversie;
* algemene schemaversie;
* coredata;
* Gym-data;
* Alcohol-data;
* Habits-data;
* per module de schemaversie;
* alle actieve gegevens;
* alle historie;
* alle gearchiveerde cycli;
* ruwe records;
* opgeslagen berekeningen;
* historische classificaties;
* contentversies waar relevant.

Mogelijke hoofdstructuur:

```json
{
  "format": "personal-tracker-backup",
  "exportVersion": 1,
  "exportedAt": "ISO timestamp",
  "appVersion": "x.y.z",
  "core": {
    "schemaVersion": 1,
    "data": {}
  },
  "modules": {
    "gym": {
      "schemaVersion": 1,
      "data": {}
    },
    "alcohol": {
      "schemaVersion": 1,
      "data": {}
    },
    "habits": {
      "schemaVersion": 1,
      "data": {}
    }
  }
}
```

Dit is een richtinggevend formaat. Pas het aan wanneer dat technisch nodig is, maar behoud dezelfde volledige versieerbaarheid en modulescheiding.

## 10.3 Bestandsnaam

Gebruik een herkenbare naam met datum, bijvoorbeeld:

`personal-tracker-backup-2026-07-24.json`

---

# 11. Import

## 11.1 Geen samenvoeging

Het importeren van een volledige back-up vervangt alle bestaande lokale appdata.

Voer geen automatische merge uit.

Dit voorkomt:

* dubbele workouts;
* dubbele alcoholregistraties;
* dubbele habits;
* conflicterende historische schema's;
* inconsistente identifiers.

## 11.2 Bevestiging

Voor import toont de app:

* dat alle huidige lokale data wordt vervangen;
* dat de actie vanuit de app niet automatisch ongedaan kan worden gemaakt;
* dat de gebruiker eerst de huidige data kan exporteren.

## 11.3 Veilig importproces

Voer import in deze volgorde uit:

1. lees het gekozen bestand;
2. valideer het hoofdformaat;
3. valideer verplichte onderdelen;
4. valideer core- en moduleschemaversies;
5. valideer identifiers en referenties;
6. migreer het bestand in een tijdelijke opslagstructuur indien nodig;
7. controleer de gemigreerde data opnieuw;
8. vervang pas daarna de actieve lokale data;
9. herlaad de applicatie;
10. controleer dat de nieuwe data succesvol kan worden gelezen.

De bestaande lokale data mag pas verdwijnen nadat de volledige import succesvol is voorbereid.

Gebruik waar mogelijk één transactie of een vergelijkbaar atomair vervangingsproces.

## 11.4 Importfouten

Bij een ongeldig, beschadigd of niet-ondersteund bestand:

* breek de import af;
* behoud alle bestaande lokale gegevens;
* toon concreet welke validatie is mislukt;
* wis niets;
* probeer niet gedeeltelijk te importeren.

---

# 12. Versiebeheer en migraties

## 12.1 Versies

Gebruik minimaal:

* `appVersion`;
* `coreSchemaVersion`;
* `gymSchemaVersion`;
* `alcoholSchemaVersion`;
* `habitsSchemaVersion`;
* versies van berekeningsformules waar historische uitkomsten vast moeten blijven;
* impactcontentversie.

## 12.2 Automatische migratie

Wanneer een nieuwe appversie een nieuw dataschema gebruikt:

* detecteer de bestaande schemaversie;
* voer alle benodigde migratiestappen in volgorde uit;
* migreer niet rechtstreeks via ongedocumenteerde aannames;
* valideer de uitkomst;
* wijzig de actieve data pas na een succesvolle migratie;
* bewaar historische snapshots en identifiers.

Een normale applicatie-update mag de lokale data nooit opnieuw initialiseren.

## 12.3 Release-informatie

Lever bij iedere release die data raakt minimaal:

* welke datamodellen zijn gewijzigd;
* welke schemaversies veranderen;
* welke migraties worden uitgevoerd;
* of een export vooraf nadrukkelijk wordt aanbevolen;
* welke tests op migratie zijn uitgevoerd.

Voor alleen visuele of tekstuele wijzigingen zonder datagevolgen is een extra export niet noodzakelijk.

## 12.4 Service-workerupdate

Een nieuwe service worker mag:

* geen lokale gebruikersdata verwijderen;
* geen actieve workout onderbreken;
* niet midden in een actieve sessie een geforceerde reload uitvoeren.

Wanneer een nieuwe versie beschikbaar is:

* mag een compacte updatemelding worden getoond;
* wordt de update pas na een veilige gebruikersactie of normale herstart actief;
* blijft de actieve workoutsessie opgeslagen.

---

# 13. Interfaceprincipes

De app is primair voor een iPhone.

Gebruik:

* grote betrouwbare aanraakvlakken;
* duidelijke hiërarchie;
* weinig tekst per kaart;
* eenvoudige formulieren;
* vaste termen;
* duidelijke foutmeldingen;
* compacte bevestigingsvensters;
* leesbare grafieken;
* veilige marges rond schermranden en de iPhone-home-indicator.

Vermijd:

* overvolle dashboards;
* verborgen swipe-acties als enige bedieningsmogelijkheid;
* onduidelijke pictogrammen zonder label;
* lange animaties;
* decoratieve statistieken;
* overmatige gamification;
* onnodige modals;
* horizontale pagina-overloop.

Grafieken mogen horizontaal te verkennen zijn wanneer dit functioneel nodig is.

Gebruik een directe en zakelijke interfacetoon.

---

# 14. Lege toestanden

## 14.1 Gym zonder cyclus

Toon:

* dat nog geen actieve cyclus bestaat;
* een duidelijke ingang om oefeningen, workouts en een cyclus aan te maken.

Maak geen automatisch trainingsschema.

## 14.2 Alcohol zonder weekschema

Vraag de gebruiker eerst om voor alle zeven weekdagen een limiet in te stellen.

Leg uitsluitend uit:

* dat nul een geplande alcoholvrije dag betekent;
* dat de waarden later kunnen worden aangepast.

Vul geen inhoudelijke standaardlimieten in.

## 14.3 Alcohol zonder registratie

Toon Niet geregistreerd.

Behandel dit niet als nul glazen.

## 14.4 Habits zonder habits

Toon een eenvoudige ingang om de eerste habit aan te maken.

Maak geen voorbeeldhabits automatisch actief.

---

# 15. Verwijderen en bevestigingen

Vraag bevestiging bij minimaal:

* annuleren van een actieve workout;
* verwijderen van een oefening die nog in templates voorkomt;
* verwijderen van een workouttemplate;
* verwijderen van een geplande workout uit de actuele week;
* stoppen of vervangen van een actieve cyclus;
* verwijderen van een alcoholrecord;
* verwijderen van een habit;
* importeren van een back-up;
* verwijderen van alle lokale data.

Een bevestiging vermeldt concreet wat wordt verwijderd en wat behouden blijft.

Historische workoutsnapshots blijven bestaan wanneer een bronobject zoals een oefening of template wordt verwijderd.

---

# 16. Berekeningen en afgeleide data

Bewaar waar zinvol zowel:

* ruwe invoer;
* als berekende historische uitkomsten.

Afgeleide data moet opnieuw berekend kunnen worden vanuit de ruwe data.

Historische beslissingen die later door formulewijzigingen zouden veranderen, worden daarnaast als snapshot opgeslagen.

Voorbeelden:

* historische workoutclassificatie blijft opgeslagen;
* toegepaste alcohollimiet blijft opgeslagen;
* habitdag gebruikt het historische weekschema;
* formule- en contentversies blijven gekoppeld.

Gebruik geen niet-deterministische berekeningen.

Dezelfde invoer en dezelfde formuleversie moeten altijd dezelfde uitkomst geven.

---

# 17. Foutafhandeling

De app moet begrijpelijk omgaan met minimaal:

* mislukte lokale opslag;
* ontbrekende of beschadigde records;
* verbroken referenties;
* mislukte import;
* onbekende toekomstige schemaversie;
* service-workerupdate;
* onvoldoende opslagruimte;
* onverwacht sluiten tijdens een workout;
* ongeldige invoer;
* dubbele dagrecords;
* dubbele actieve workout.

Bij fouten:

* verlies geen bestaande data;
* toon geen generieke melding als `Something went wrong` wanneer een concrete oorzaak bekend is;
* log technische details lokaal in de console;
* toon de gebruiker een korte bruikbare foutmelding;
* bied waar mogelijk opnieuw proberen aan.

---

# 18. Vereiste schermen

De exacte visuele compositie mag worden ontworpen, maar versie 1 moet functioneel minimaal deze schermen of equivalente routes bevatten.

## Algemeen

* Home
* Instellingen
* Export
* Import
* Importbevestiging
* Versie-informatie

## Gym

* Gym-hoofdscherm
* Oefeningenlijst
* Oefening toevoegen en bewerken
* Workoutbibliotheek
* Workouttemplate toevoegen en bewerken
* Cyclioverzicht
* Cyclus aanmaken en bewerken
* Actieve-cyclusoverzicht
* Geplande workout bewerken
* Actieve workout
* Voltooiingsbevestiging
* Gymkalender
* Historische workoutdetails
* Oefeningsgrafiek maximumgewicht
* Spiergroepgrafiek volume
* Gearchiveerde cycli
* Gearchiveerde cyclusdetails

## Alcohol

* Alcohol-hoofdscherm
* Daginvoer
* Ontbrekende registraties
* Weekdagschema
* Alcoholkalender
* Dagdetails
* Analyseoverzicht
* Periodevergelijkingen
* Wildcardoverzicht
* Impactweergave

## Habits

* Habits-hoofdscherm
* Dagscherm
* Habitlijst
* Habit toevoegen en bewerken
* Habitdetails
* Habitkalender
* Streakoverzicht

---

# 19. Acceptatiecriteria

De implementatie is pas gereed wanneer minimaal onderstaande scenario's werken.

## 19.1 Algemene architectuur

* Gym, Alcohol en Habits zijn technisch afzonderlijke modules.
* Home gebruikt uitsluitend gedefinieerde modulesamenvattingen.
* Een nieuwe testmodule kan als tegel worden geregistreerd zonder de Home-logica inhoudelijk te herschrijven.
* De app werkt via GitHub Pages.
* De app is op een iPhone installeerbaar.
* De app werkt offline na de eerste laadbeurt.

## 19.2 Gegevensbehoud

* Herladen verwijdert geen data.
* Afsluiten en opnieuw openen verwijdert geen data.
* Een service-workerupdate verwijdert geen data.
* Een actieve workout blijft hervatbaar.
* Een datamigratie behoudt historie en identifiers.
* Een mislukte import laat de bestaande data volledig intact.

## 19.3 Gym

* Een gebruiker kan zelf oefeningen toevoegen.
* Iedere oefening heeft exact één toegestane spiergroep.
* Een workouttemplate kan meerdere oefeningen en afzonderlijke sets bevatten.
* Een geplande workout is onafhankelijk van het gebruikte template.
* Dezelfde workout kan meerdere keren in één cyclus voorkomen met verschillende waarden.
* Een cyclus begint altijd op de eerstvolgende maandag.
* De cyclusweek verandert iedere maandag automatisch.
* Niet-uitgevoerde workouts rollen niet door.
* Een workout kan op iedere dag van de trainingsweek worden uitgevoerd.
* Er kan maar één actieve workout bestaan.
* Iedere set wordt afzonderlijk afgevinkt.
* Gewicht en herhalingen kunnen tijdens de workout niet worden gewijzigd.
* De laatste set voltooit de workout niet zonder bevestiging.
* Annuleren wist alleen de actieve sessievoortgang.
* Een geplande workout blijft na annuleren beschikbaar.
* Gemiste workouts worden pas na zondag vastgesteld.
* Historische workouts veranderen niet na het hernoemen of verwijderen van een oefening.
* Core telt niet mee in volume.
* De Light-, Medium- en Heavy-grenzen worden exact toegepast.
* Heavy-persistentie werkt.
* Onvoldoende historie wordt expliciet getoond.
* Classificatiedekking wordt opgeslagen en getoond wanneer slechts een deel classificeerbaar is.
* De kalendertegel toont alleen classificatie.
* De maximumgewichtgrafiek gebruikt het hoogste setgewicht per workout.
* De spiergroepgrafiek gebruikt weektotalen.
* Een ontbrekende trainingsweek wordt visueel doorgetrokken zonder een werkelijke nulmeting op te slaan.

## 19.4 Alcohol

* Er kan per datum maximaal één record bestaan.
* Een record kan in meerdere contexten tegelijk glazen bevatten.
* Een record met drie nullen is een bevestigde alcoholvrije dag.
* Een ontbrekend record is Niet beoordeeld.
* Een ontbrekende dag telt niet als alcoholvrij of overschrijding.
* De oudste ontbrekende dag is eenvoudig bereikbaar.
* Iedere weekdag kan een eigen limiet hebben.
* Nul betekent een geplande alcoholvrije dag.
* Een nieuw schema verandert historische beoordelingen niet.
* Een wildcard negeert de daglimiet voor naleving.
* Wildcardglazen blijven in het totale gebruik staan.
* Wildcards tellen niet mee als binnen limiet of overschrijding.
* Niet-geregistreerde dagen tellen niet mee in het nalevingspercentage.
* Historische vergelijkingen gebruiken de limieten die toen werkelijk golden.
* Week- en maandvergelijkingen gebruiken alleen volledig afgesloten perioden.
* Ontbrekende dagen worden niet als nul glazen behandeld.
* Retroactieve wijziging werkt alle afhankelijke statistieken bij.
* Retroactieve wijziging herberekent de impactcontext voor de gewijzigde dag en de zes volgende dagen.
* Er wordt geen AI-tekst gegenereerd.
* Er worden geen medische disclaimers toegevoegd.

## 19.5 Habits

* Een habit kan een naam, beschrijving en weekdagen bevatten.
* Een habit is uitsluitend binair.
* Niet-geplande dagen tellen niet als gemist.
* Een gemist gepland moment verbreekt de streak.
* Niet-geplande dagen verbreken de streak niet.
* Retroactieve wijzigingen herberekenen streaks.
* Een wijziging van weekdagen herschrijft het verleden niet.
* De kalender gebruikt het historische weekschema.
* Home wijzigt habits niet rechtstreeks.

## 19.6 Export en import

* Een export bevat alle modules en historie.
* Een export bevat alle schemaversies.
* Een import wordt volledig gevalideerd vóór vervanging.
* Import voegt data niet samen.
* Import vervangt bestaande data alleen na bevestiging.
* Een corrupt bestand verwijdert geen bestaande data.
* Een oudere ondersteunde back-up wordt gemigreerd.
* Een back-up met een onbekende nieuwere schemaversie wordt veilig geweigerd.

---

# 20. Testvereisten

Schrijf geautomatiseerde tests voor minimaal:

* weekgrenzen maandag tot en met zondag;
* cyclusweekovergang;
* cyclusherhaling na de laatste week;
* gemiste-workoutberekening;
* set- en workoutvolume;
* Core-uitsluiting;
* groepsclassificatie;
* Heavy-persistentie;
* gewogen workoutclassificatie;
* onvoldoende historie;
* alcoholstatus per dag;
* historische alcohollimieten;
* wildcardbehandeling;
* nalevingspercentage;
* niet-geregistreerde dagen;
* periodevergelijkingen;
* retroactieve alcoholherberekening;
* habitplanning;
* habitstreaks;
* historische habitschema's;
* exportvalidatie;
* importvalidatie;
* migraties;
* hervatten van een actieve workout.

Voeg daarnaast integratietests toe voor de belangrijkste gebruikersstromen.

---

# 21. Op te leveren resultaat

Lever minimaal:

1. volledige modulaire broncode;
2. een werkende GitHub Pages-build;
3. PWA-manifest en service worker;
4. duidelijke projectstructuur;
5. README met installatie, lokale ontwikkeling en deployment;
6. documentatie van de datamodellen;
7. documentatie van schema- en formuleversies;
8. migratiestructuur;
9. tests;
10. releasechecklist;
11. beschrijving van alle nog gebruikte tijdelijke impactcontentkeys;
12. korte lijst van bewuste implementatiekeuzes die niet functioneel in deze briefing waren vastgelegd.

Bouw geen functies buiten deze briefing alleen omdat ze gebruikelijk of technisch interessant zijn.

De eerste prioriteit is:

1. betrouwbare lokale opslag;
2. foutloos behoud van historie;
3. correcte Gym-logica;
4. correcte Alcohol-logica;
5. eenvoudige Habits;
6. compact Home-overzicht;
7. goede offline werking op iPhone.

Visuele verfijning komt pas nadat deze kern aantoonbaar correct werkt.
