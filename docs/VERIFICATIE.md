# Verificatie — 29 oktober 2026

## Uitgevoerde controles
- 69 geautomatiseerde tests geslaagd: LP-formaten, aparte demo/live-opslag, sessie-idempotentie en herstart, selectie bij kleine collecties, persoonlijke sfeergewichten, volledige/onderbroken paginering, dubbele exemplaren, veilige verwerking van verwijderingen, versheid van metadata en details, gelijktijdige synchronisatie, rate-limitpacing en retries, WU-station/meetdatum, HTTP-validatie en herkomstcontrole, secrets niet in API-output, SSE/reconnect/heartbeat en offline clientverval. Nieuwe tests controleren exacte Wiki-identiteiten, onzekere datums, taal-fallback, rate limits, Amsterdamse kalenderdagen, schrikkeldag, begrensde datumweging, expliciete opt-in, caching en middernacht in een offline browser.
- `tsc --noEmit` geslaagd.
- `vite build` geslaagd. Gecomprimeerde JavaScript circa 98 KB, CSS circa 10 KB.
- In de browser bij 390×844 en 1280×800: home, kiezen, bevestigen, notitie invullen, afronden en geschiedenis bekeken. Geen horizontale overloop op de gecontroleerde homeweergaven.
- Zoeken, sfeerlabel wijzigen, uitsluiten (kiezen wordt uitgeschakeld), uitsluiting opheffen en expliciet kiezen gecontroleerd.
- Instellingen tonen correcte ontbrekende-koppelingstatus en werkende serververbindingstest.
- Een tweede browserpagina met /display volgt starten/afronden automatisch. Donkere displayweergave visueel gecontroleerd.
- Browserlog van de productieflow bevatte geen warnings/errors.
- Notitie en sessie bewaard na een volledige serverherstart.
- SQLite-back-up gemaakt terwijl de app draaide; integrity_check was `ok`. Back-up in een aparte map teruggezet en met de echte Service geopend: zes demo-items, één afgeronde sessie en de notitie hersteld.
- Start Draai.command daadwerkelijk uitgevoerd en server succesvol gestart; shellsyntaxis gecontroleerd.
- Publieke Discogs-aanvraag voor de geconfigureerde gebruiker (één item) gaf HTTP 200 en totaal 422 items terug. Het ontvangen gegevensmodel komt overeen met de adapter. Geen complete gebruikerscollectie opgenomen in de broncode.

- Openbare Wiki-praktijktest met Kind of Blue: exact Discogs-master-ID 5460 gekoppeld aan Wikidata Q283221, Nederlandse Wikipedia-tekst (maximaal 600 tekens) en releasedatum 1959-08-17.
- Nieuwe browsercontrole: fictief albumverhaal, vaste voorbeeldreleasedatum, datumkeuze uitzetten, expliciet kalenderalbum kiezen en achtergrondverhalen bijwerken.

- LXC-installer: Bash-syntax/help, verkeerde platformomgeving vóór apt, ongeldige/tokenbevattende invoer, gecommitteerde Git-export zonder losse secrets, configuratie aanmaken/behouden en afwijzen van verkeerde checksums gecontroleerd. Vijf tests gebruiken tijdelijke bestanden en mocks; ze voeren geen apt/systemd uit.
- Officiële Node 24-downloadindex live opgehaald: unieke Linux x64- en arm64-archieven met SHA256 gevonden (v24.22.1 op het controlemoment).

## Niet op echte diensten/hardware geverifieerd
- Persoonlijk Discogs-token en WU-leessleutel ontbreken. Authenticated volledige import, echte releaseverrijking en live WU-meting zijn met fixtures getest, nog niet met deze accounts.
- Geen toegang tot Proxmox/LXC of Raspberry Pi: productie-installatie, systemd en Pi-prestaties zijn nog niet op die apparaten getest.
- QR-scannen met een echte telefoon op het LAN is nog niet getest; loopback-adressen krijgen bewust instructies in plaats van een onbruikbare QR.
- Geen muziekherkenning of smartplugbediening geïmplementeerd. Persoonlijke weerweging is met fixtures getest. Wiki-verhalen zijn wel gebouwd.
- Wiki-koppeling met eigen collectie nog niet live getest; deze staat standaard uit. Hiervoor is expliciete toestemming voor verzending van album-/artiest-IDs gevraagd na een automatische goedkeuringsblokkade.

## Reproduceren
Met Node 24 en pnpm: `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm test`, `pnpm build`, `pnpm start`.
Open de getoonde URL. De eerste start zonder tokens gebruikt zes fictieve platen en een lege geschiedenis.
De tijdens de browsercontrole gemaakte testgeschiedenis is uit de opgeleverde demodatabase gehaald en apart bewaard als tijdelijk testmateriaal. De download bevat geen database of secrets.


## Nieuwe onderhoudsronde
- Volledige suite inclusief echte lokale SSE-verbindingstests geslaagd; typecheck en productiebuild geslaagd.
- Installer/updater:15 tests met gesimuleerde systeemopdrachten, inclusief behoud config, beide databases en WAL, mislukte build vóór servicestop, backupfout, gedeeltelijke codewissel en rollback bij mislukte healthcheck. Geen echte Linux/systemd-uitvoering hier.
- Bulkfixture422records:5collectiepagina’s, geen bulkverversing bestaande details, geselecteerde plaat wel met voorrang. Prioriteit, deduplicatie, stopgedrag, backoff en veranderende Wiki-identiteit getest.
- Korte artiestfragmenten en gedeelde30dagen-artikelcache met fixtures; geen nieuwe liveoproep met persoonlijke collectie gedaan.
- Browser390×844: SVG-ster visueel juist; nostalgie kiezen, sessie starten, notitie bewaren, afronden en statistieken gecontroleerd. VoorkeurJazz→nostalgie en regen→nostalgie opgeslagen en na herladen bevestigd. Tijdnotatie na review gelijkgetrokken voor korte sessies.
- Apple/manifestPNG’s gegenereerd met eigen script. Geen echte iPhone/iPad-installatie uitgevoerd.

- Nieuwe statistieken ook visueel bekeken op1280×800; mobiele schermafbeelding opgeslagen. Seizoenlabel Winter opslaan en terugzetten naar automatisch via de interface gecontroleerd. Voorkeuren en sessie bleven na serverherstart behouden.

- Persoonlijke configuratie:19 relevante tests en productiebuild geslaagd. Beide ontbrekende-ID-gevallen via het echte serverstartpunt gecontroleerd: exit vóór database/start, zonder sleutel in foutmelding. Geen persoonlijke username/station-ID/domein meer in bijgehouden huidige bestanden.


## Homepage/Knus/stijlpresets — 29 oktober 2026
- 78/78 tests geslaagd, inclusief lokale SSE-tests. Typecheck en productiebuild geslaagd na laatste interfacecorrectie.
- Dagrotatie: Amsterdamse winter-/zomertijd, jaargrens, stabiele volgorde, 0/1/2 records, uitsluitingen en verouderde gegevens. Geen extra externe verzoeken.
- Stijlvoorkeuren: initieel vullen, oude voorkeuren migreren, herstartbehoud, expliciet lege regels/lijsten, oudere clients, invoervalidatie, stijl/genre/handmatige prioriteit en begrensde weging getest.
- Productiebuild visueel gecontroleerd op 390×844 en 1280×800. Ambient→Knus toegevoegd, opgeslagen en na herladen bevestigd. Knus gekozen, suggestie bevestigd, notitie ingevuld, sessie afgerond en geschiedenis/statistieken zichtbaar gecontroleerd. Tijdelijke demodata buiten de repository gebruikt.
- Geen echte Discogs-/WU-accountoproepen of LXC-update uitgevoerd in deze ronde. GitHub-regel wel opgeslagen maar niet afgedwongen zolang dit private repositoryplan dat niet ondersteunt; secret scanning/push protection na openbaar maken opnieuw controleren.

- Gebruikersbevestiging na publicatie: eigen Ubuntu 26.04-LXC bijgewerkt en app nog bereikbaar. De specifieke server is niet door de ontwikkelagent geïnspecteerd.

## Temperatuurgrenzen en stijlinventaris — 30 oktober 2026
Gerichte selectie-/API-/migratietests controleren standaardwaarden, grenswaarden, foutieve/lege invoer, oudere clients en herstartbehoud. Inventaris-tests controleren casing/spaties, dubbele labels per exemplaar, expliciet lege regels, frequenties en ontbrekende/verlopen data. Mobiele browsercontrole: fictieve Voorbeeldstijl tweemaal geteld, regel aangemaakt met Knus, koudegrens leeg blokkeert bewaren, 7/24 °C opgeslagen en na herladen behouden. Alleen tijdelijke demodata aangepast.
