# Verificatie — 28 oktober 2026

## Uitgevoerde controles
- 43 geautomatiseerde tests geslaagd: LP-formaten, aparte demo/live-opslag, sessie-idempotentie en herstart, selectie bij kleine collecties, persoonlijke sfeergewichten, volledige/onderbroken paginering, dubbele exemplaren, veilige verwerking van verwijderingen, versheid van metadata en details, gelijktijdige synchronisatie, rate-limitpacing en retries, WU-station/meetdatum, HTTP-validatie en herkomstcontrole, secrets niet in API-output, SSE/reconnect/heartbeat en offline clientverval. Nieuwe tests controleren exacte Wiki-identiteiten, onzekere datums, taal-fallback, rate limits, Amsterdamse kalenderdagen, schrikkeldag, begrensde datumweging, expliciete opt-in, caching en middernacht in een offline browser.
- `tsc --noEmit` geslaagd.
- `vite build` geslaagd. Gecomprimeerde JavaScript circa 94 KB, CSS circa 9 KB.
- In de browser bij 390×844 en 1280×800: home, kiezen, bevestigen, notitie invullen, afronden en geschiedenis bekeken. Geen horizontale overloop op de gecontroleerde homeweergaven.
- Zoeken, sfeerlabel wijzigen, uitsluiten (kiezen wordt uitgeschakeld), uitsluiting opheffen en expliciet kiezen gecontroleerd.
- Instellingen tonen correcte ontbrekende-koppelingstatus en werkende serververbindingstest.
- Een tweede browserpagina met /display volgt starten/afronden automatisch. Donkere displayweergave visueel gecontroleerd.
- Browserlog van de productieflow bevatte geen warnings/errors.
- Notitie en sessie bewaard na een volledige serverherstart.
- SQLite-back-up gemaakt terwijl de app draaide; integrity_check was `ok`. Back-up in een aparte map teruggezet en met de echte Service geopend: zes demo-items, één afgeronde sessie en de notitie hersteld.
- Start Draai.command daadwerkelijk uitgevoerd en server succesvol gestart; shellsyntaxis gecontroleerd.
- Publieke Discogs-aanvraag naar jouw-discogs-gebruikersnaam (één item) gaf HTTP 200 en totaal 422 items terug. Het ontvangen gegevensmodel komt overeen met de adapter. Geen complete gebruikerscollectie opgenomen in de broncode.

- Openbare Wiki-praktijktest met Kind of Blue: exact Discogs-master-ID 5460 gekoppeld aan Wikidata Q283221, Nederlandse Wikipedia-tekst (maximaal 600 tekens) en releasedatum 1959-08-17.
- Nieuwe browsercontrole: fictief albumverhaal, vaste voorbeeldreleasedatum, datumkeuze uitzetten, expliciet kalenderalbum kiezen en achtergrondverhalen bijwerken.

- LXC-installer: Bash-syntax/help, verkeerde platformomgeving vóór apt, ongeldige/tokenbevattende invoer, gecommitteerde Git-export zonder losse secrets, configuratie aanmaken/behouden en afwijzen van verkeerde checksums gecontroleerd. Vijf tests gebruiken tijdelijke bestanden en mocks; ze voeren geen apt/systemd uit.
- Officiële Node 24-downloadindex live opgehaald: unieke Linux x64- en arm64-archieven met SHA256 gevonden (v24.22.1 op het controlemoment).

## Niet op echte diensten/hardware geverifieerd
- Persoonlijk Discogs-token en WU-leessleutel ontbreken. Authenticated volledige import, echte releaseverrijking en live WU-meting zijn met fixtures getest, nog niet met deze accounts.
- Geen toegang tot Proxmox/LXC of Raspberry Pi: productie-installatie, systemd en Pi-prestaties zijn nog niet op die apparaten getest.
- QR-scannen met een echte telefoon op het LAN is nog niet getest; loopback-adressen krijgen bewust instructies in plaats van een onbruikbare QR.
- Geen muziekherkenning, smartplugbediening of persoonlijke weerweging geïmplementeerd. Wiki-verhalen zijn wel gebouwd.
- Wiki-koppeling met eigen collectie nog niet live getest; deze staat standaard uit. Hiervoor is expliciete toestemming voor verzending van album-/artiest-IDs gevraagd na een automatische goedkeuringsblokkade.

## Reproduceren
Met Node 24 en pnpm: `pnpm install --frozen-lockfile`, `pnpm check`, `pnpm test`, `pnpm build`, `pnpm start`.
Open de getoonde URL. De eerste start zonder tokens gebruikt zes fictieve platen en een lege geschiedenis.
De tijdens de browsercontrole gemaakte testgeschiedenis is uit de opgeleverde demodatabase gehaald en apart bewaard als tijdelijk testmateriaal. De download bevat geen database of secrets.
