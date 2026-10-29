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
