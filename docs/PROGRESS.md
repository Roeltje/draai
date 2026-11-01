# Voortgang — 29 oktober 2026

## Afgerond
- Eerste-installatiescript voor Ubuntu 24.04/26.04 in een ongeprivilegieerde LXC: apt-basis, officiële Node 24 met checksum, pnpm, bouw als niet-rootgebruiker, gescheiden data/config en systemd-healthcheck.
- Privé-GitHub-download en token met uitsluitend leestoegang beschreven. Installer weigert bestaande deployments; aparte updater met vooraf bouwen, koude back-up en herstel toegevoegd.
- Eigen SVG-favicon in ivoor, inktzwart en koraal; hetzelfde vinyl-icoon bovenaan de README.
- Fase 0: projectstructuur, AGENTS.md, design tokens, mobiel/breed ontwerp met zes originele fictieve hoezen.
- Fase 1: echte Discogs-adapter, paginering, detailverrijking, selectie, bevestigen, afronden, notities en geschiedenis in SQLite.
- Eigen sfeerlabels, zoeken, formaatfilter en tijdelijke uitsluitingen.
- Werkende WU-adapter en metingstatus; geen verzonnen weerinvloed.
- Optionele /display-weergave met live updates en QR-code bij gebruik van een LAN-adres.
- Typecontrole, productiebuild en 69 tests geslaagd (inclusief vijf installercontroles zonder echte LXC).
- Mobiele luisterflow en brede schermweergave daadwerkelijk in browser gecontroleerd.
- Back-up plus herstel gecontroleerd; startbestand voor deze Mac en LXC-service/handleiding geleverd.

## Albumcontext en kalender afgerond
- Fase 2 (dit onderdeel): Wiki-albumsamenvattingen en exacte, naar bronnen gelinkte kalenderfeiten voor oorspronkelijke albumuitgave, geboortedag en sterfdag. Alleen exacte dag/maand/jaar telt; albumuitgave en eigen persingsdatum blijven apart. Personen worden niet op alleen naam gekoppeld en levensstatus wordt niet afgeleid. Een kleine, begrensde kalenderfactor gebruikt `Europe/Amsterdam`.
- Exacte ID-koppeling, datumprecisie, twijfelgevallen, schrikkeldag, begrensde weging, uitsluitingen, cache, foutafhandeling en opt-in zijn getest. De kalender wisselt ook in een offline browser na Amsterdamse middernacht.
- Openbare praktijktest met Kind of Blue: Nederlandstalig artikel en releasedatum 17 augustus 1959 gevonden. Geen persoonlijke collectiegegevens voor deze test gebruikt.
- Verhaal, kalenderkeuze en vernieuwen in instellingen gecontroleerd in de browser.

## Besluiten
- Telefoon is hoofdinterface. Warm ivoor, inktzwart en koraal; display is donker.
- Node 24, React/Vite, Fastify en ingebouwde SQLite; geen AI-service nodig.
- Discogs-collectiebasis iedere vijf uur verversen; details rustig bij ontbrekende gegevens en op verzoek, niet meer alle releases iedere vijf uur. Collectie- en detailgegevens verlopen afzonderlijk na zes uur. Deze vervaltijden gelden ook in een offline browser.
- Demo/live hebben gescheiden databases. Geen tokens in browsercode of logs.
- Regie/integratie door hoofdagent; interface/backend door GPT-6.1 Sol medium; installatie-documentatie door GPT-6 Luna high.

## Nog nodig voor gebruik met eigen gegevens
- DISCOGS_TOKEN en optioneel WU_API_KEY lokaal configureren. Wiki-koppeling bewust inschakelen met WIKI_ENABLED=true.
- Een proef met collectiegebonden IDs naar Wikidata is door automatische goedkeuringscontrole geblokkeerd; expliciete toestemming is gevraagd en staat nog open. Openbare voorbeeldproef is wel geslaagd.
- Authenticated Discogs-import en actuele WU-meting met de echte sleutels controleren.
- Gebruiker heeft de app op Ubuntu26.04 draaiend met HTTPS-proxy; nieuwe updater nog op echte LXC controleren.

## Later
- Feedback op sfeerkeuzes en verbindingen tussen albums.
- Camera bij de draaitafel voor covers uit uitsluitend de eigen collectie, met confidence-drempel en bevestiging bij twijfel. Een hoes op de standaard bewijst geen afspelen; geen pressing-herkenning op basis van generieke hoeskunst en geen claim van continu luisteren.
- Opt-in, snoozebare neutrale herinnering bij lang dezelfde hoes; optionele energiemeting als aanvullend sessiesignaal, nooit als bewijs op zichzelf.
- Een stabiele 3D-geprinte hoesstandaard/camerabevestiging, pas dimensioneren als camera en hardware bekend zijn. Houd rekening met lens field-of-view, montagevrijheid, licht en reflecties. Camera op hoes richten, lokale verwerking verkiezen en geen frames standaard bewaren.
- Verbanden tussen platen via muzikanten/producers; uitgebreider bronnenmateriaal naast Wikipedia.
- Eventueel HTTPS/PWA en een aanmelding/apparaatkoppeling voor gedeelde netwerken.
- Pi-autostart op echte hardware en smartplug-integratie.

Zie VERIFICATIE.md voor bewijs en grenzen van de uitgevoerde controles.


## Onderhoud en personalisatie 29 oktober
- Sol medium bouwde backend, interface en scripts; Luna high werkte de installatiehandleiding bij. Hoofdagent beoordeelde integratie en liet een race tussen detailverrijking en Wiki-identiteitskoppeling corrigeren met regressietest.
- 69 tests geslaagd, inclusief422records-paginering zonder bulkdetailverversing, queue-prioriteit/deduplicatie/backoff, seizoen/weerweging en15gesimuleerde installer-/updatergevallen.
- Gebruiker kiest korte bronfragmenten; AI samenvatten/vertalen uitgesteld. Artistfragmenten gekoppeld via exacteIDs, geen naamgokken.
- Nostalgie, persoonlijke genre-/weerregels en seizoenslabels; kerstfilter heeft expliciete overrides.
- SVG-ster, Apple180/manifest192/512iconen, lazy collectiehoezen en geregistreerde luisterstatistieken.
- Configuratiepad en HTTPS-origin prominent gedocumenteerd. Updater bewaart configuratie en volledige koude back-up. Geen nieuwe externe AI-service of kosten.

## Persoonlijke configuratie
Discogs-gebruikersnaam en weerstation-ID uitsluitend via eigen omgevingsconfiguratie; geen persoonlijke defaults in code, installatievoorbeeld of documentatie. Voorbeelddomein generiek gemaakt. Bestaande lokale configuratie blijft behouden. Oudere Git-commits zijn niet herschreven.

## Backlog op verzoek — 29 oktober 2026
Nieuwe ideeën geïnventariseerd in TODO.md met prioriteit, werk/tokeninschatting en afhankelijkheden. Aangeleverde JSON bewaard als niet-actief concept in docs/voorstellen. Homepage gebruikt vaste records0en2; dagrotatie voorgesteld, nog niet gebouwd. Gebruiker wil eerst kiezen, daarna implementeren. GitHub/publicatiestap blijft open; dependency graph en Dependabot alerts wel aangezet, overige settings nog afronden.

Gebruikerskeuze: style-/genrestartmapping standaard ingevuld en actief, eigen tweaks behouden; voorgestelde volgorde onderschreven. Hardware en extra PWA-functies voor later. Dit is vastgelegd in TODO.md; nog geen mappingcode gebouwd.

## Publieke repository voorbereiden
MIT-licentie, portable ontwikkelinstructies, SECURITY.md, korte LXC-updatehandleiding en wekelijkse Dependabot-configuratie toegevoegd. Dependency graph, Dependabot alerts, security updates en malware alerts via GitHub bevestigd ingeschakeld. Branchregel Protect main (geen force-push/verwijderen, geen bypass) na gebruikersbevestiging opgeslagen voor default branch main. Op huidige private plan worden rulesets niet afgedwongen. Secret scanning/push protection niet aangeboden op deze private instellingenpagina: na openbaar maken controleren. Zichtbaarheid niet gewijzigd; geen betaald abonnement geactiveerd.


## Volledige stijl- en genredefaults — 1 november 2026
- Standaardverbanden uitgebreid van 91 naar 734 stijlen en van 13 naar alle 15 Discogs-genres, zodat vrijwel elke LP direct een stemming krijgt. Genre blijft vangnet voor onbekende stijlen; 19 niet-muziekstijlen (zoals Spoken Word en Interview) en het genre Non-Music staan bewust uit.
- Upgrade via `moodDefaultsVersion` 2 voegt alleen nieuwe stijlen/genres toe die nog niet bewaard zijn. Eigen aanpassingen, uitgezette en eerder verwijderde regels en een bewust lege lijst blijven ongemoeid; eigen plaatlabels gaan nog altijd voor.
- Maximum aantal stijlregels in de API verhoogd van 200 naar 1000.
- Stijllijst opgesteld door een Sonnet-subagent, verzonnen/dubbele namen door de hoofdagent verwijderd; de stemmingen zijn smaakvoorstellen.
- 99 tests, typecontrole en productiebuild geslaagd. Niet in de browser of op de echte LXC-collectie gecontroleerd; het aantal ‘zonder verband’ moet na update sterk dalen.

## Homepage en stijlvoorkeuren afgerond — 29 oktober 2026
- Afgebakend bouwwerk door GPT-6.1 Sol medium; hoofdagent controleerde migratie, selectie, interface en integratie. Kleine browserbevinding door dezelfde frontendagent opgelost: zonder passende collectiestijlen verschijnen de presets meteen.
- Dagelijkse homepagehoezen in Amsterdamse tijd, zonder extra API-import. Maximaal twee verschillende exemplaren; lege/kleine/verlopen collecties afgevangen.
- Warm zichtbaar hernoemd naar Knus, interne sleutel behouden. 91 stijlregels en 13 genredefaults; persoonlijke plaatlabels vóór stijl vóór genre. Stijlen standaard actief, weer niet stilzwijgend ingeschakeld.
- Eenmalige upgrade vult ontbrekende stijlregels, bewaart eigen genre-/weerregels en expliciet lege stijllijsten. Bewerken en terugzetten naar standaard werkt via concept en opslaan.
- 78 tests, typecontrole en productiebuild geslaagd. Mobiele en brede browsercontrole, voorkeur opslaan/herladen en kiezen/starten/afronden/geschiedenis gecontroleerd met een aparte tijdelijke demodatabase.
- M02-dekking/topstyles-inventaris en badges standaard/eigen blijven vervolgwerk. Pushreminders en begrensde geschatte speeltijd staan op de backlog, niet gebouwd.


## Publieke introductie en LXC-praktijkcheck
- Gebruiker bevestigt geslaagde update op de eigen Ubuntu 26.04-LXC; app is nog bereikbaar. Dit is een gebruikersbevestiging, geen eigen controle van die server.
- Repository via GitHub als openbaar bevestigd. README voor nieuwe gebruikers herschreven, met mobiele en brede screenshots van fictieve demogegevens. Geen persoonlijke collectie of configuratie afgebeeld.
- Alleen documentatie en screenshots gewijzigd; geen nieuwe runtimefuncties in deze ronde.

## CI en Dependabot — 30 oktober 2026
- GitHub Actions-workflow `ci.yml`: bij push naar main en elke PR install (frozen lockfile), typecontrole, tests, build en `pnpm audit --prod --audit-level high`. Alleen leesrechten, Node 24, pnpm-versie uit package.json.
- Dependabot: minor- en patchupdates gegroepeerd in één PR, grote versiesprongen apart, 5 dagen cooldown voor nieuwe versies; GitHub Actions maandelijks bijgewerkt.
- Lokaal alle stappen van de workflow geslaagd behalve de audit: main bevat nog het hoge lek in @fastify/static, dat Dependabot-PR #2 (10.1.7) oplost. CI wordt pas groen na die merge. De workflow zelf is nog niet op GitHub gedraaid.
## Kleine voorkeurverbeteringen — 30 oktober 2026
- Op verzoek voortaan featurebranches en pull requests; geen rechtstreekse publicatie naar main.
- Sol medium bouwt afgebakende backend- en interfacetaken; hoofdagent controleert integratie en browsergedrag.
- Instelbare koude-/warmtegrenzen met validatie en behoud bij herstart/oudere clients; standaard 10/22 °C. Stijloverzicht telt bekende styles en maakt ontbrekende regels direct bewerkbaar.

## Optionele kanttimer — 30 oktober 2026
- PR #10 bevat temperatuurgrenzen en stijlinventaris; GitHub CI groen. PR #11 bouwt daarop voort met de timer. Niets automatisch gemerged; main niet rechtstreeks gewijzigd.
- Timer standaard uit, handmatig starten per kant of expliciete albumfallback, pauze/hervatten, snooze5min, herinnering verbergen en stoppen. Instelling uit wist timer zonder luistersessie af te ronden.
- Sol medium deed frontend/backend; hoofdagent reviewde en integreerde de inmiddels gewijzigde main inclusief pakketupdate. Alle91 tests, typecheck en productiebuild slagen.
- Browser op telefoonformaat: inschakelen/wachttijd0, A starten, pauze/hervatten, herinnering, snooze, B starten, herladen, herinnering uit, globale instelling uit en sessie afronden. Tijdelijke fictieve tracks van1seconde gebruikt om geen echte minuten te wachten. Geen echte Discogs/WU/hardware- of LXC-update in deze ronde.

## Wiki-fouten isoleren — 1 november 2026
- Productie toonde 149 albums klaar, 1 fout en 280 nooit opgehaald: één snelle fout zette alle Wiki-verrijking 15 minuten stil.
- Fouten worden nu geclassificeerd (rate limit, onbeschikbaar, timeout, afgewezen, ongeldig) en per poging gelogd zonder URL's, titels of Discogs-ID's. Een afgewezen of ongeldig album krijgt alleen zelf status error met 6 uur uitstel; de wachtrij loopt door.
- Bronniveau-fouten (429/5xx/timeout, ook bij een samenvatting) geven een afkoeling van 5-60 minuten met één automatische hervatting. Optionele `WIKI_CONTACT` komt in de User-Agent.
- Entiteit-/SPARQL-caching blijft open. Niet tegen de echte Wikimedia-diensten getest in deze ronde.

## Kioskweergave in lagen (K01) — 1 november 2026
- `/display` schaalt nu in lagen met pure CSS-mediaqueries op breedte én hoogte: klein hoes/titel/artiest, middel (≥900×560) meta en tracklijst per kant, groot (≥1600×900) ook credits, vers weer en eerdere draaien. Scherm is exact de viewport en scrolt nooit; geen track of kant gemarkeerd als spelend; Discogs-bron in elke laag.
- Hulpfuncties in `src/displayInfo.ts` met unit-tests; demo-1 kreeg fictieve credits.
- Sonnet bouwde; hoofdagent controleerde in de browser op 540×320, 1024×600, 1920×1080 en 375×812 (geen overflow) en vergrootte titel/kleine tekst op het grote scherm. Niet op het echte kioskscherm of een Pi gecontroleerd.
