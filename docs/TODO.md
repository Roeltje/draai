# Draai — geprioriteerde backlog

Bijgewerkt: 29 oktober 2026. Dit is een keuzelijst, geen opdracht om alles te bouwen. Eerst samen een kleine tranche kiezen. Prioriteit weegt persoonlijk nut voor Roel, bouw- en testwerk, onzekerheid, terugkerende kosten en tokenbeslag. De publiek-repo-afwerking blijft een bestaande opdracht; overige nieuwe productideeën hieronder zijn nog niet goedgekeurd voor uitvoering. H01, M01 en de basis van M02 zijn inmiddels op verzoek gebouwd.

## Schaal en werkwijze

- P0: lopend werk afronden of noodzakelijke voorwaarde.
- P1: veel merkbaar nut voor relatief weinig werk.
- P2: nuttig na de basis; afhankelijk van werkelijk gebruik.
- P3: parkeren, weinig persoonlijk nut of veel onzekerheid/hardware/integratiewerk.
- XS: circa 0,5–1 uur; S: 1–3 uur; M: 3–8 uur; L: 1–3 werkdagen; XL: onderzoek/proef plus meerdere dagen. Dit zijn ruwe engineeringramingen inclusief gerichte controle, geen AI-looptijden of offertes.
- Tokenbeslag laag/middel/hoog/zeer hoog is relatief. Exacte tokens zijn niet betrouwbaar vooraf te voorspellen. Browserbediening, lange context, foutzoeken en externe integraties kunnen meer kosten dan het schrijven van code.
- Luna high voor kleine, afgebakende tekst/label/configuratietaken; Sol medium voor bouwtaken; hoofdagent voor gerichte architectuur- en codecontrole. Niet standaard meerdere agents inzetten voor kleine taken. Eén feature per ronde, relevante bestanden lezen, één passende verificatieronde, geen volledige hertest bij alleen documentatie.

## Eerst afmaken

| ID | Prio | Taak | Werk / tokens | Klaar als |
|---|---|---|---|---|
| G01 | P0 | Publieke repo voorbereiden: portable paden, MIT, documentatie | S / laag | LICENSE en pakketlicentie aanwezig, geen machinegebonden paden, publieke clone plus optionele private toegang beschreven; naar GitHub gepubliceerd. Afgerond: MIT, portable docs en korte updatehandleiding gepubliceerd. |
| G02 | P0 | GitHub security-instellingen afronden | S–M / middel | Dependency graph, alerts, security-updates en malwarealerts aangezet; main-regel opgeslagen. Secret scanning/push protection na publicatie controleren; De main-regel werd vóór openbaar maken niet afgedwongen; de huidige werking moet nog worden bevestigd. Eventuele beperking noteren. Geen betaald abonnement inschakelen. Gebruiker heeft de repo inmiddels openbaar gemaakt; resterende controles na openbaar maken staan nog open. |
| G03 | Klaar | Losse korte LXC-updatehandleiding en eerste praktijkcheck | S / laag | Clone vernieuwen, updater uitvoeren, config/data behouden; werkelijk resultaat op Ubuntu26.04 apart bevestigen. Updater bestaat al, gesimuleerde foutpaden getest. Gebruiker bevestigt geslaagde update op eigen Ubuntu 26.04-LXC; app bleef bereikbaar. |
| H01 | Klaar | Afwisselende homepagehoezen | S / laag | Twee verschillende beschikbare, verse hoezen uit eigen collectie; bijvoorbeeld dagelijks wisselen in Amsterdamse tijd en stabiel tijdens paginagebruik. Geen nieuwe volledige API-import nodig; 0, 1 en 2 platen en verlopen data werken. |

Homepage: dagelijkse rotatie is gebouwd en getest. Een optionele knop voor nieuwe hoezen kan later.

## Sfeer, keuze en weer

| ID | Prio | Idee / opbrengst | Werk / tokens | Kleinste bruikbare scope en afhankelijkheid |
|---|---|---|---|---|
| M01 | Klaar | Stemming Warm zichtbaar hernoemen naar Knus | XS / laag | Interne sleutel `warm` behouden; labels/toelichting aanpassen zodat bestaande voorkeuren intact blijven. |
| M02 | Basis klaar / rest P2 | Voorgevulde stylemapping en inventaris | M / middel | Gebouwd: 91 ingeschakelde stijlregels, 13 genredefaults, bewerken/uitzetten en reset als concept. Stijlinventaris en aantallen met/zonder stemming nu gebouwd in aparte PR. Nog later: expliciete standaard/eigen-badges. Lever een bruikbare standaardmapping voor styles met genre-fallback; de gebruiker hoeft geen lege editor te vullen. Eigen plaatlabels gaan vóór style, style vóór genre. Toon standaard versus eigen aanpassing, dekking, uitzetten en reset. Tel top 30–50 styles om hiaten te vinden, niet als voorwaarde voor gebruik. Bestaande eigen regels nooit overschrijven bij updates. Eerst bestaande stemmingen, niet meteen alle weerregels. |
| M03 | P2 | Melancholisch, Feestelijk, Focus, Dromerig | M / middel | Per stemming kiezen wat echt nodig is; gedeelde types, API-validatie, labels, opslagcompatibiliteit, filters en tests meenemen. Focus betekent voorkeur, geen bewijs van weinig zang. |
| M04 | Gebouwd, PR | Warm/koud-drempels instelbaar | S–M / middel | Getalvelden/sliders met validatie en reset; huidige koudegrens van 10 °C niet stilzwijgend vervangen door concept van 5 °C. Warmte is nu 22 °C. Hysterese pas met stabiele opslag van conditiestatus. |
| M05 | P2 | Gewogen mappings0–1 en begrensde gecombineerde score | M–L / hoog | Schema/importvalidatie, uitleg per bijdrage, meerdere styles normaliseren/maximeren zodat veel labels niet automatisch winnen. Eerst simpele presets zonder uitgebreide gewichten-editor. |
| M06 | P2 | Meer weergegevens: wind, dauwpunt, straling, gevoelstemperatuur | M / middel–hoog | Eerst echte WU-response en Bresser-sensoren inventariseren. Ontbrekende/ongeldige waarden en eenheden afhandelen; alleen beschikbare meetwaarden gebruiken. |
| M07 | P3 | Zonnig/grijs, mogelijke mist/sneeuw/benauwdheid afleiden | L / hoog | Afhankelijk van M06; heuristiek herkenbaar als inschatting. Straling vereist dag/nacht en referentie; sneeuw/mist nooit stellige waarneming op basis van één grens. |
| M08 | P3 | Relatieve maandtemperatuur, druktrend, hysterese | L / hoog | Klimaatnormalenbron + lokaal tijdvenster/historie nodig. Niet gratis uit huidige momentopname afleidbaar; eerst nut van M04 evalueren. |
| M09 | P2 | Tijd/dag en donker als optionele sfeerfactor | S–M / middel | Begin met eigen tijdschema, tijdzone en nacht-overgangen; zonsondergang later met lokaal ingestelde coördinaten. Zondagochtend=jazz is een uitschakelbare preset, geen waarheid. |
| M10 | P2 | Extra thema’s: Halloween, Sinterklaas, Koningsdag, Oud & Nieuw | M / middel | Eigen lokale thematags en kalenderperioden; jaargrens testen. Release-land bewijst geen nationaliteit/taal. Huidig kerstfilter behouden tot expliciet anders gekozen. |
| M11 | P2 | Stofparels/nieuwe aanwinsten verfijnen | S–M / middel | Rotatie bestaat al; voeg optioneel `date_added` en duidelijkere keuzegronden toe. Geen geregistreerde sessie ≠ nooit beluisterd. |
| M12 | P2 | Bijzondere jubilea zoals 50 jaar prominenter tonen | S / laag–middel | Kalenderbasis bestaat. Alleen exacte originele albumdatum; eigen persingsdatum niet verwarren met albumjubileum. |
| M13 | P2 | Beschikbare tijd: plaat/kant passend bij20minuten | M / middel | Tracks naar kant groeperen, ontbrekende/onjuiste tijden melden; label schatting. Eerst aanbeveling zonder automatische timer. |
| M14 | P2 | Duim omhoog/omlaag | S registreren, L meeleren / middel–hoog | Eerst expliciete feedback bewaren en toonbaar maken; later begrensd aanpassen met reset, zonder een zichzelf versterkende smalle selectie. |
| M15 | P2 | Ketting via dezelfde muzikant, producer, label of jaar | M / middel | Eerst één relatie; credits op artiest-ID, geen naamgokken. Label/jaar is een feitelijke relatie, geen bewezen muzikale gelijkenis. |
| M16 | P3 | Last.fm-tags als extra sfeerbron | L / hoog | Nieuwe API, identiteit, cache, voorwaarden en foutpaden; na evaluatie van eigen stylemapping. Scrobbelen levert niet vanzelf betrouwbare moodlabels op. |

## Kiosk en persoonlijke administratie

| ID | Prio | Idee / opbrengst | Werk / tokens | Scope / grens |
|---|---|---|---|---|
| K01 | P1 | Kioskinformatie schalen in lagen | M / middel | Klein hoes/artiest/titel; middel tracks/jaar/label; groot beschikbare credits/weer/geschiedenis. Test circa 540×320, 1024×600 en 1920×1080 én kijkafstand. Geen track/kant tonen alsof gedetecteerd. Geen nieuwe data nodig voor eerste stap. |
| K02 | P2 | Rustmodus met langzaam wisselende hoezen, weer en aanbeveling | M / middel | Geen actieve sessie; gedeelde rotatie met H01, beperkte beelden, weinig animatie en reduced-motion. Geen stille wijzigingen aan selectie of geschiedenis. |
| K03 | P2 | Nachtstand en dimmen | S / laag–middel | Begin met instelbaar tijdschema en CSS-dimmen; hardwarehelderheid is aparte integratie. Zonsondergang hangt af van M09. |
| K04 | P2 | Kanttimer en omdraaiseintje | M / middel | Expliciet kantA/B starten/pauzeren/corrigeren; voortgang en track alleen als schatting. Stiltes/livealbums maken werkelijke naaldpositie onbekend. |
| K05 | P2 | Vindplaats in de kast | S / laag–middel | Lokaal vrij tekstveld per exemplaar, zichtbaar bij voorstel/kiosk en zoekbaar. Discogs custom-fieldsimport later; geen write-back nodig. |
| K06 | P3 | Naaldteller met begindatum/startstand/reset | S–M / middel | Voor gebruiker nu lage waarde. Geregistreerde sessietijd hooguit schatting; handmatig corrigeren. Reset via nieuw element bewaren, geen historie weggooien. Onderhoudsgrens zelf instellen. |
| K07 | P3 | Was-/schoonmaakregistratie | S / laag–middel | Datum en notitie per exemplaar; optionele herinnering, geen verzonnen conditieadvies. |
| K08 | P3 | Eigen aankoopprijs en kosten per geregistreerde draai | M / middel | Prijs+valuta optioneel; ontbrekend blijft onbekend; deling door nul en nulplays afhandelen. Geen automatische vervanging aankoopprijs door marktwaarde. |
| K09 | P3 | Afzonderlijke marktwaarde per draai | L / hoog | Eerst officiële API-toegang, velden en cachevoorwaarden onderzoeken. Schatting en peildatum zichtbaar; niet aannemen dat release-mediaan verkrijgbaar is. |

## Statistieken en koppelingen

| ID | Prio | Idee | Werk / tokens | Scope / afhankelijkheid |
|---|---|---|---|---|
| S01 | P2 | Dekking afgelopen jaar en minst geregistreerde platen | S / laag–middel | Basisdekking bestaat; datumfilter en eerlijke labels. Importgeschiedenis zegt niets over luisteren vóór Draai. |
| S02 | P2 | Heatmap uur×weekdag | S–M / middel | Lokale tijd, lege/kleine datasets, toegankelijk alternatief. Alleen bevestigde sessies. |
| S03 | P2 | Weer tegenover genre | M / middel | Bij sessiestart optioneel weer-snapshot en bron/versheid bewaren; oude sessies niet achteraf van verzonnen weer voorzien. |
| S04 | P3 | Jaaroverzicht / Draai Wrapped | M–L / middel–hoog | Pas zinvol met voldoende geschiedenis; bouw op S01/S02. Exportafbeelding later. |
| S05 | P3 | Gekocht versus gedraaid | M / middel | `date_added` is toevoegdatum, geen bewezen aankoopdatum. Eigen aankoopdatum optioneel, labelgrafiek correct. |
| S06 | P3 | Collectiewaarde door de tijd | L / hoog | Eerst rechten/toegang/bewaarvoorwaarden onderzoeken; koers/valuta en collectiewijzigingen vertekenen vergelijking. |
| I01 | P2 | Home Assistant/MQTT nu-luisteren | M–L / hoog | Uitgaand statusbericht met reconnect/retained/reset, lokaal brokeradres en secrets. Versterker/lampen alleen via door gebruiker gekozen automatisering. |
| I02 | P3 | Last.fm/ListenBrainz-scrobbelen | L / hoog | Opt-in accountkoppeling, dubbelen/retries, tracks en werkelijk luisteren niet uit albumkeuze afleiden. Begin met handmatige bevestiging. |
| I03 | P3 | Wantlist-prijsalerts | L–XL / zeer hoog | Officiële endpointmogelijkheden/rate limits/voorwaarden eerst verifiëren; geen scraping als impliciete fallback. Staat los van meer luisteren. |
| I04 | P3 | Gaststemmen via QR | L / hoog | Lees-/schrijfrechten, beperkte gasttoegang, sessiecodes/verval en misbruikpreventie. Bestaande QR is geen gastbeveiliging. |
| I05 | P2 | Open-Meteo als optionele weerbron/fallback | M / middel–hoog | Eerst actuele gebruiksvoorwaarden/licentie verifiëren. Eigen station blijft voorkeursbron; fallback expliciet gelabeld. Geen oude meting als actueel presenteren. |
| I06 | P2 | Dockerfile + Compose naast LXC | M–L / hoog | Niet nodig voor Roel; hoger voor publieke adoptie. Node24, persistent volume, uid/rechten, healthcheck, secretsenv, back-up en upgrade. amd64/arm64 bouwen/testen; geen bewezen Pi 3-prestaties claimen. Eerste stap lokaal bouwen, imagepublicatie later. |
| I07 | P2 | Vollediger installeerbare/offline PWA | M–L / hoog | Manifest/Appleiconen bestaan. Voor later bevestigd. iPhone-beginschermwebapp werkt al; meerwaarde zit vooral in offline-startscherm en eventueel opt-in push. Serviceworker-updatepad, geen token/API/private data onbedoeld cachen, geen verouderde Discogsdata blijven tonen. UI-shell offline ≠ hele collectie offline. |
| I08 | P1 | Eenvoudige export/back-up vanuit app | M / middel | Bestaand CLI-back-up/herstel behouden. Geauthenticeerde/afgeschermde download met privédata; eerst losse geschiedenisexport, herstel later apart. |
| I09 | P2 | Aanmelding/apparaatkoppeling voor gedeelde netwerken | L / hoog | Nu app zonderlogin achter LAN/VPN/proxy-toegang houden. Zelfhosting neemt onderhouds- en beveiligingsverantwoordelijkheid niet weg. Publieke broncode vereist geen publieke app. |

## Later: geluid, camera en hardware

| ID | Prio | Idee | Werk / tokens | Eerst nodig |
|---|---|---|---|---|
| A01 | P3 | Mic/line-in bron kiezen, ruisgrens en lokaal geluid/stilte | L / hoog | Echte kiosk/hardwareproef; HTTPS/micrechten of lokale capture-agent; kalibratie/hysterese, geen standaard audiobewaring. Powernode Edge-aansluitingen nog uit officiële handleiding controleren. Geen hardwareadvies/aanschaf nu. |
| A02 | P3 | Kant/track schatten uit stiltes en Discogsduur | XL / zeer hoog | A01+K04. Gesprekken, liveplaten, crossfades, oppervlakruis, pauzes en ontbrekende tijden: nooit betrouwbare trackdetectie beloven. Geluid≠draaitafel speelt. |
| A03 | P3 | Betaalde audioherkenning (AudD/ACRCloud) | XL / zeer hoog | Eerst korte proef, actuele kosten/voorwaarden en expliciete toestemming audioupload; budgetlimiet. Aangeleverde prijzen niet geverifieerd. Schakelbaar; geen abonnement afsluiten tijdens bouwen. |
| A04 | P3 | AcoustID/Chromaprint onderzoeken | XL / zeer hoog | Lokaal fingerprint maken is niet hetzelfde als gratis volledige herkenningsdatabase zelf hosten; dekking/identiteit/voorwaarden eerst toetsen. |
| A05 | P3 | Camera op hoesstand + herkenning eigen collectie | XL / zeer hoog | Reeds toekomstplan. Geen pressing-/afspeelbewijs uit hoes; lokale verwerking en bevestiging bij twijfel. |
| A06 | P3 | 3D-hoesstand/cameramount en smartplugs | L–XL / hoog | Pas na hardwarekeuze. Energiemeting aanvullend signaal, geen bewijs van werkelijk luisteren. |

## Wat al bestaat: niet opnieuw bouwen

- QR in kiosk, handmatig bevestigde nu-luisterenweergave en live updates.
- Releasedetails met tracks, credits, jaar, label en land; uitbreiden kioskpresentatie is K01.
- Nostalgie, eigen sfeerlabels, genre-/weerrelaties en optionele seizoensweging; kerstuitzondering en jaar-rondoverride.
- Gewogen toeval, recente voorstellen/sessies vermijden en geschiedenisgewicht. Niet-geregistreerde platen krijgen al extra kans.
- Exacte Wiki-release-/geboorte-/sterfdatums, korte album-/artiestfragmenten, bronlinks en begrensde kalenderweging.
- Uitleg bij gekozen plaat; alleen daadwerkelijke bijdragen noemen.
- Seriële achtergrondverrijking, prioriteit gekozen plaat,Wiki-cache van 30 dagen, geen 400 detailverversingen elke 5 uur; aparte Discogs-vervalgrenzen van 6 uur. Hoezen als externeURL, browserlazy-loading; geen serverofflinehoesarchief.
- Statistieken sessies/unieke exemplaren/geregistreerde tijd/dekking, gescheiden demo/live-opslag.
- Manifest/Appleiconen, LXC-installatie/updater en consistente CLI-SQLiteback-up. Updater maakt ook koude herstelkopie; echte LXC-updatetest nog bevestigen.

## Beoordeling aangeleverde mapping (origineel concept)

Het oorspronkelijke JSON is bewaard als [conceptmapping](voorstellen/draai-mapping.concept.json). Geldige JSON met 9 stemmingen, 15 genres en 99 styles; de app importeert dit bestand niet rechtstreeks. De actieve preset in shared/moodDefaults.ts neemt ondersteunde moods met gewicht vanaf 0,5 over als eenvoudige verbanden; de overige voorstellen blijven voor later. De tekst en externe API-/hardwareclaims zijn voorstellen, geen geverifieerde documentatie.

1. Sleutels verschillen: `rustig→rust`, `energiek→energie`, `avontuurlijk→avontuur`, `nostalgisch→nostalgie`. `warm` kan intern blijven en zichtbaar Knus worden. Nieuwe moods vereisen M03. Onbekende keys niet stilzwijgend negeren.
2. Prioriteit: expliciete eigen plaatlabels → gemapte styles → genre. Optionele persoonlijke weervoorkeuren blijven leidend. Vooraf dekking tonen; alle nulscores moeten gewone selectie toelaten.
3. Alle gewichten van 0–1 zijn smaakvoorstellen. Genre zegt niets zekers over tempo/zang; Style-/genredefaults zijn volgens gebruikerskeuze standaard actief en aanpasbaar; expliciete eigen labels en wijzigingen blijven leidend. Nieuwe weerdetectie of andere externe koppelingen worden hierdoor niet automatisch ingeschakeld. De formule uit de bijlage vervangt huidige weging niet automatisch.
4. `_standaard_uitsluiten` voor Children's/Non-Music/Comedy/Spoken Word is niet goedgekeurd. Dat zijn gebruikerskeuzes. De bijlage spreekt tegelijk over alleen zachte gewichten én harde uitsluitingen; expliciet onderscheid nodig.
5. `Holiday` niet zonder controle gelijkstellen aan Kerst of aan een sluitend kerstfilter; taxonomie en werkelijke collectiewaarden eerst toetsen. Eigen kersttags/overrides blijven leidend. De conceptperiode van 1–26 december wijkt af van huidige 15 november–6 januari; niet ongemerkt migreren.
6. Seizoenen in concept zijn astronomische datumbanden, huidige app gebruikt meteorologische maanden. Eerst één definitie kiezen. Jaargrens en vrijdagavond-na-middernacht testen.
7. `country=Netherlands` is geen bewijs van Nederlandse artiest/taal; gebruik eigen thema voor Koningsdag. `released` kan je specifieke persing betreffen: geen onterecht 50-jarig albumjubileum.
8. Mist/sneeuw/zon zijn heuristieken. Benauwd en heet zijn verschillende verschijnselen. Windchill/heatIndex alleen gebruiken waar beschikbaar en toepasselijk. Druktrend vergt historie; zonsondergang is nog niet geïmplementeerd.
9. Geen onbeperkte offline Discogs-cache afspreken; huidige freshnessbeleid/voorwaarden eerst toetsen vóór wijzigen. Verouderd weer niet als actueel laten meetellen. Eigen notities blijven wel lokaal beschikbaar.
10. Waarde≠kosten, toevoegen≠kopen, sessietijd≠speelduur, microfoongeluid≠muziekherkenning. Productlabels en statistieken moeten deze verschillen behouden.

## Gewenste volgorde (door gebruiker onderschreven; uitvoering per tranche)

1. Lopende GitHub/publicatie-afwerking G01–G03 afronden.
2. Kleine zichtbare winst: H01 homepagehoezen + M01 Knus.
3. Betere suggesties: M02 style-inventaris/preset voor bestaande moods + M04 drempels. Pas na gebruik M03/M05.
4. Als het kioskscherm er werkelijk staat: K01; anders eerst S01 of K05 naar behoefte.
5. Voor andere gebruikers: I06 Docker + I05 alternatieve weerbron. Audio/camera en waardegrafieken blijven achteraan.

Nieuwe scope, modelkeuze en uitgevoerde controles per tranche kort in PROGRESS.md noteren. Geen afzonderlijke onderzoeksronde naar elke externe dienst vóór die feature wordt gekozen; dat bespaart nu tokens.

## Bevestigde voorkeuren
De gebruiker wil direct werkende, voorgevulde style-/genredefaults kunnen tweaken. Geen lege configuratie als eerste ervaring. Extra hardware (microfoon, line-in, camera, smartplugs) blijft P3; PWA-uitbreidingen ook pas later. De eerste versie behoudt handmatig bevestigde luistersessies.

## Later: reminders en geschatte speeltijd
Per kant beschikbare Discogs-tracktijden optellen; gebruiker bevestigt welke kant start. Push na kantduur plus instelbare speling, alleen als nog niet afgemeld; annuleren bij stoppen/omdraaien, snooze en dubbele meldingen voorkomen. Als kantduur ontbreekt maar albumduur betrouwbaar is: optionele albumreminder met speling, duidelijk zo benoemd. Zonder betrouwbare duur geen verzonnen deadline. HTTPS, push-toestemming en serverplanning nodig; iPhone-achtergrondtimer niet als betrouwbare scheduler gebruiken.
Geschatte speelduur apart van sessietijd: bij bekende gekozen kant/albumduur hoogstens min(geregistreerde verstreken tijd, bekende duur), met expliciete labels en correctiemogelijkheid. Onbekende duur blijft sessietijd, geen gemeten afspeeltijd. Geen automatische claim dat de plaat echt speelde, geen ongevraagd automatisch afronden. Reminder en duurherziening blijven voor later, niet onderdeel van homepage/Knus/stylemapping.
