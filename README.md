<img src="public/favicon.svg" alt="Draai: een vinylplaat met een koraalkleurig label" width="80" height="80">

# Draai

Draai helpt je opnieuw een plaat uit je eigen vinylcollectie te kiezen. Je kunt een stemming meegeven, een voorstel bevestigen en je luistersessie met een notitie bewaren. De app is bedoeld voor eigen gebruik op je thuisnetwerk.

Zonder Discogs-token start Draai in demomodus met zes fictieve platen. Met een Discogs-token gebruikt Draai een aparte live-database. Demo- en live-collectie, voorstellen en luistergeschiedenis blijven gescheiden.

## Op deze Mac proberen

In deze werkmap zijn de pakketten en productie-build al aanwezig. Dubbelklik op `Start Draai.command`, laat het terminalvenster open en open de getoonde URL in je browser (standaard http://127.0.0.1:3210). Stoppen kan met Ctrl+C. Het startbestand gebruikt zo nodig de met Codex meegeleverde Node-runtime.

Voor een verse download of andere computer volg je de installatie hieronder.

## Installeren op Proxmox LXC

Er is een [installatiescript](scripts/install-lxc.sh) voor een ongeprivilegieerde **Ubuntu 24.04 LTS-container**. Het installeert de basissoftware, Node.js 24, pnpm en Draai als automatisch startende dienst. Begin met 2 CPU’s, 2 GB RAM en 8 GB opslag. Omdat deze repository privé is, heeft de LXC een eigen GitHub-aanmelding met leestoegang nodig.

Volg [de stapsgewijze LXC-handleiding](docs/INSTALLATIE.md#proxmox-lxc-aanbevolen-installatie). Voer het script binnen de container uit, niet op de Proxmox-host. Het is voor de eerste installatie; automatische app-updates zijn nog niet ingebouwd. De controles zijn lokaal gesimuleerd, een echte LXC-installatie is nog niet uitgevoerd.

## Snel starten

Vereist Node.js 24 en pnpm. Installeer Node via de [officiële Node.js-downloads](https://nodejs.org/en/download/) en pnpm volgens de [officiële pnpm-installatiehandleiding](https://pnpm.io/installation). Gebruik geen Node-versie buiten 24.

```sh
pnpm install
cp .env.example .env
pnpm dev
```

Open de lokale URL die de ontwikkelserver toont. Zonder token is dit de demo. Vul voor live gebruik `DISCOGS_USERNAME` en `DISCOGS_TOKEN` in `.env` in; stop en start daarna Draai opnieuw. Houd `.env` privé: de tokens horen alleen op de server. Zie [docs/INSTALLATIE.md](docs/INSTALLATIE.md) voor configuratie en installatie als dienst.

Handige projectcommando’s:

```sh
pnpm dev       # server en Vite-ontwikkelserver
pnpm check     # TypeScript-controle
pnpm test      # tests
pnpm build     # controle en productie-build
pnpm start     # productie-server op poort 3210
```

Weather Underground-metingen kunnen met een eigen `WU_API_KEY` en `WU_STATION_ID` worden opgehaald. De meetstatus is zichtbaar in de app; persoonlijke weervoorkeuren die de plaatkeuze wegen zijn nog toekomstig werk. Slimme stekkers zijn niet geïmplementeerd.

Draai speelt geen muziek af en detecteert geen nummers. De optionele `/display`-weergave toont een bevestigde luistersessie op een tweede scherm; die is ook te openen in een gewone browser, bijvoorbeeld op een Raspberry Pi. Er is geen fysieke Pi- of audiohardware geverifieerd.

## Albumverhalen en muziekkalender

Met `WIKI_ENABLED=true` schakel je de echte Wiki-koppeling in; standaard staat die uit. Hiervoor is geen API-sleutel nodig. Draai stuurt Discogs-master- en artiest-ID’s naar Wikidata en haalt het gekoppelde artikel bij Wikipedia op. Luistergeschiedenis en notities blijven lokaal. Herstart na het aanpassen van de instelling en kies bij Instellingen **Albumverhalen bijwerken**, of haal informatie per plaat op.

Koppelen gebeurt alleen via exacte IDs, nooit alleen via dezelfde titel of naam. Een korte Nederlandse artikeltekst (anders Engels) krijgt bron- en licentielinks. Exact bekende release-, geboorte- en overlijdensdatums kunnen op dezelfde dag extra meewegen; zet dat desgewenst op de startpagina uit. Kalenderdagen volgen Europe/Amsterdam. De datum van het album staat apart van de uitgave in je collectie. Ontbrekende, onzekere of dubbele matches blijven leeg. De eerste versie zoekt de hoofdartiesten; bandleden en overige credits volgen later.

Wiki-informatie heeft een aparte bewaartermijn van 30 dagen. De achtergrondknop vult ontbrekende of verlopen informatie aan; de knop bij een album vraagt die informatie opnieuw op. De demo gebruikt uitsluitend fictieve verhalen en een vast voorbeeld op 28 oktober.

## Netwerk en gegevens

Voor toegang vanaf telefoon of tweede scherm moeten die apparaten op hetzelfde vertrouwde thuisnetwerk zitten. Productie bindt standaard aan `127.0.0.1`; stel voor directe LAN-toegang `HOST=0.0.0.0`, `PORT=3210` en `APP_ORIGIN=http://<server-ip>:3210` in. Open op je telefoon `http://<server-ip>:3210` — `localhost` verwijst daar naar de telefoon zelf. Draai heeft nog geen app-login. Houd de service daarom binnen het vertrouwde LAN en scherm poort 3210 met de firewall af van internet.

Draai probeert Discogs-gegevens iedere vijf uur te vernieuwen. Bij verouderde gegevens vraagt Draai om synchronisatie voordat releasegegevens opnieuw worden getoond. De app vermeldt Discogs als gegevensbron en is niet verbonden aan of goedgekeurd door Discogs.

Databasebestanden staan in `DATA_DIR`: `demo.sqlite` voor de fictieve collectie en `live.sqlite` voor je eigen collectie en geschiedenis. Maak versleutelde, toegangsbeperkte back-ups; daarin kunnen persoonlijke luisternotities staan. De back-upopdracht is `pnpm backup -- /pad/naar/back-up.sqlite`.

## Oplevering

Zie [docs/VERIFICATIE.md](docs/VERIFICATIE.md) voor uitgevoerde controles en [docs/PROGRESS.md](docs/PROGRESS.md) voor afgeronde en openstaande stappen.
