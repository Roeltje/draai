# Voortgang — 28 oktober 2026

## Afgerond
- Fase 0: projectstructuur, AGENTS.md, design tokens, mobiel/breed ontwerp met zes originele fictieve hoezen.
- Fase 1: echte Discogs-adapter, paginering, detailverrijking, selectie, bevestigen, afronden, notities en geschiedenis in SQLite.
- Eigen sfeerlabels, zoeken, formaatfilter en tijdelijke uitsluitingen.
- Werkende WU-adapter en metingstatus; geen verzonnen weerinvloed.
- Optionele /display-weergave met live updates en QR-code bij gebruik van een LAN-adres.
- Typecontrole, productiebuild en 38 tests geslaagd.
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
- Discogs iedere vijf uur verversen; collectie- en detailgegevens verlopen afzonderlijk na zes uur. Deze vervaltijden gelden ook in een offline browser.
- Demo/live hebben gescheiden databases. Geen tokens in browsercode of logs.
- Regie/integratie door hoofdagent; interface/backend door GPT-6.1 Sol medium; installatie-documentatie door GPT-6 Luna high.

## Nog nodig voor gebruik met eigen gegevens
- DISCOGS_TOKEN en optioneel WU_API_KEY lokaal configureren. Wiki-koppeling bewust inschakelen met WIKI_ENABLED=true.
- Een proef met collectiegebonden IDs naar Wikidata is door automatische goedkeuringscontrole geblokkeerd; expliciete toestemming is gevraagd en staat nog open. Openbare voorbeeldproef is wel geslaagd.
- Authenticated Discogs-import en actuele WU-meting met de echte sleutels controleren.
- Installeren op de LXC; netwerkadres en firewall instellen volgens INSTALLATIE.md.

## Later
- Persoonlijke weerregels die selectie beïnvloeden.
- Camera bij de draaitafel voor covers uit uitsluitend de eigen collectie, met confidence-drempel en bevestiging bij twijfel. Een hoes op de standaard bewijst geen afspelen; geen pressing-herkenning op basis van generieke hoeskunst en geen claim van continu luisteren.
- Opt-in, snoozebare neutrale herinnering bij lang dezelfde hoes; optionele energiemeting als aanvullend sessiesignaal, nooit als bewijs op zichzelf.
- Een stabiele 3D-geprinte hoesstandaard/camerabevestiging, pas dimensioneren als camera en hardware bekend zijn. Houd rekening met lens field-of-view, montagevrijheid, licht en reflecties. Camera op hoes richten, lokale verwerking verkiezen en geen frames standaard bewaren.
- Verbanden tussen platen via muzikanten/producers; uitgebreider bronnenmateriaal naast Wikipedia.
- Eventueel HTTPS/PWA en een aanmelding/apparaatkoppeling voor gedeelde netwerken.
- Pi-autostart op echte hardware en smartplug-integratie.

Zie VERIFICATIE.md voor bewijs en grenzen van de uitgevoerde controles.
