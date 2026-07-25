# Impactcontent: tijdelijke placeholder-keys

Per briefing 7.19-7.21 is de regelmachine voor de impactweergave (Alcohol) compleet gebouwd, maar zijn de **definitieve, regelgebaseerde teksten bewust niet ingevuld** — die moeten apart, niet AI-gegenereerd, worden aangeleverd. Tot die tijd toont de app elke contentKey als een expliciet herkenbare placeholder, bijvoorbeeld `[[impact.direct.medium]]`, zodat nooit de indruk ontstaat dat er al inhoudelijke tekst staat.

Definitie en regelmachine: `src/modules/alcohol/impactContent.js` (`IMPACT_CONTENT_VERSION = 1`). Weergave: `src/modules/alcohol/screens/impactView.js`.

## Directe impact (op basis van het dagtotaal, 7.20)

| contentKey | Voorwaarde |
|---|---|
| `impact.direct.zero` | totaal = 0 |
| `impact.direct.low` | totaal 1-2 |
| `impact.direct.medium` | totaal 3-4 |
| `impact.direct.high` | totaal ≥ 5 |

## Zevendaagse context (de betreffende dag + 6 voorgaande, eerste match wint, 7.20-7.21)

| contentKey | Prioriteit | Voorwaarde |
|---|---|---|
| `impact.context.consecutive` | 10 | 3 of meer opeenvolgende dagen met alcohol, tot en met vandaag |
| `impact.context.frequent` | 20 | 5 of meer dagen met alcohol in de 7 dagen |
| `impact.context.exceedances` | 30 | 2 of meer overschrijdingen in de 7 dagen |
| `impact.context.mostlyFree` | 40 | 4 of meer bevestigd alcoholvrije dagen in de 7 dagen |
| `impact.context.default` | 1000 | geen van bovenstaande (vangnet, altijd waar) |

Ontbrekende (niet-geregistreerde) dagen tellen nergens in mee als alcoholvrij.

## Bij het aanleveren van de definitieve teksten

1. Vervang alleen `placeholderText()` in `impactContent.js` (of de aanroep ervan in `impactView.js`) door een echte tekstopzoeking per contentKey — de regelmachine zelf (welke key bij welke situatie hoort) hoeft niet te wijzigen.
2. Verhoog `IMPACT_CONTENT_VERSION`.
3. Meld dit expliciet als een release die (contextuele) inhoud wijzigt, ook al raakt het geen opgeslagen gebruikersdata.
