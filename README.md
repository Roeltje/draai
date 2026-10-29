<img src="public/favicon.svg" alt="Draai: een vinylplaat met een koraalkleurig label" width="80" height="80">

# Draai

Draai helpt je opnieuw een plaat uit je eigen vinylcollectie te kiezen. Je kunt een stemming meegeven, een voorstel bevestigen en je luistersessie met een notitie bewaren. De app is bedoeld voor eigen gebruik op je thuisnetwerk.

Zonder Discogs-token start Draai in demomodus met zes fictieve platen. Met een Discogs-token gebruikt Draai een aparte live-database. Demo- en live-collectie, voorstellen en luistergeschiedenis blijven gescheiden.

## Op deze Mac proberen

In deze werkmap zijn de pakketten en productie-build al aanwezig. Dubbelklik op `Start Draai.command`, laat het terminalvenster open en open de getoonde URL in je browser (standaard http://127.0.0.1:3210). Stoppen kan met Ctrl+C. Het startbestand gebruikt zo nodig de met Codex meegeleverde Node-runtime.

Voor een verse download of andere computer volg je de installatie hieronder.

## Installeren op Proxmox LXC

Er is een [installatiescript](scripts/install-lxc.sh) voor een ongeprivilegieerde **Ubuntu 24.04- of 26.04-container**. Het installeert de basissoftware, Node.js 24, pnpm 11.25.0 en Draai als automatisch startende dienst. Begin met 2 CPU’s, 2 GB RAM en 8 GB opslag. Omdat deze repository privé is, heeft de LXC een eigen GitHub-aanmelding met leestoegang nodig.

Volg [de stapsgewijze LXC-handleiding](docs/INSTALLATIE.md#proxmox-lxc-aanbevolen-installatie). Voer scripts binnen de container uit, niet op de Proxmox-host. Bewaar de productieconfiguratie in `/etc/draai.env`; daarmee kun je later updates uitvoeren zonder je instellingen te vervangen. De aparte updater heeft een expliciete procedure en maakt vóór de codewissel een herstelbare back-up.

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

Weather Underground-metingen kunnen met een eigen `WU_API_KEY` en `WU_STATION_ID` worden opgehaald. Via Instellingen koppel je zelf genres en gemeten weer aan stemmingen. Op de startpagina kies je welke verbanden meetellen. Slimme stekkers zijn niet geïmplementeerd.

Draai speelt geen muziek af en detecteert geen nummers. De optionele `/display`-weergave toont een bevestigde luistersessie op een tweede scherm; die is ook te openen in een gewone browser, bijvoorbeeld op een Raspberry Pi. Er is geen fysieke Pi- of audiohardware geverifieerd.

## Albumverhalen en muziekkalender

Met `WIKI_ENABLED=true` schakel je de echte Wiki-koppeling in; standaard staat die uit. Hiervoor is geen API-sleutel nodig. Draai stuurt Discogs-master- en artiest-ID’s naar Wikidata en haalt het gekoppelde artikel bij Wikipedia op. Luistergeschiedenis en notities blijven lokaal. Herstart na het aanpassen van de instelling en kies bij Instellingen **Albumverhalen bijwerken**, of haal informatie per plaat op.

Koppelen gebeurt alleen via exacte IDs, nooit alleen via dezelfde titel of naam. Een korte Nederlandse artikeltekst (anders Engels) krijgt bron- en licentielinks. Exact bekende release-, geboorte- en overlijdensdatums kunnen op dezelfde dag extra meewegen; zet dat desgewenst op de startpagina uit. Kalenderdagen volgen Europe/Amsterdam. De datum van het album staat apart van de uitgave in je collectie. Ontbrekende, onzekere of dubbele matches blijven leeg. De eerste versie zoekt de hoofdartiesten; bandleden en overige credits volgen later.

Wiki-informatie heeft een aparte bewaartermijn van 30 dagen. Ontbrekende of verlopen informatie wordt rustig op de achtergrond aangevuld; een gekozen plaat krijgt voorrang. De knop bij een album vraagt aanvulling aan, met behoud van de cachetermijn. Ook korte fragmenten over exact gekoppelde hoofdartiesten verschijnen met bronvermelding. Er wordt geen AI gebruikt. De demo gebruikt uitsluitend fictieve verhalen en een vast voorbeeld op 28 oktober.

## Netwerk en gegevens

De LXC-installer configureert `HOST=0.0.0.0`, `PORT=3210` en `DATA_DIR=/var/lib/draai` in `/etc/draai.env`. Zo kan een reverse proxy op een andere machine de app bereiken via HTTP op het LXC-adres en poort 3210. Voor rechtstreekse LAN-toegang open je `http://<server-ip>:3210` op je telefoon; `localhost` verwijst daar naar de telefoon zelf. De installer configureert zelf geen firewall of HTTPS. Als je een reverse proxy gebruikt, scherm poort 3210 dan af van internet en sta alleen verkeer van de proxy toe.

Voorbeeld met Nginx Proxy Manager: stel daar een proxy host in met domein `draai.example.com`, upstream scheme `http`, upstream host het IP-adres van de LXC en upstream port `3210`. Laat Nginx Proxy Manager het publieke HTTPS-certificaat verzorgen. Zet in `/etc/draai.env` `APP_ORIGIN=https://draai.example.com` (zonder afsluitende slash) en herstart Draai. Zie [de installatiehandleiding](docs/INSTALLATIE.md#toegang-via-een-https-reverse-proxy) voor de stappen.

Draai vernieuwt alleen de Discogs-collectiebasis iedere vijf uur (bij 422 exemplaren vijf pagina’s). Ontbrekende releasedetails worden rustig aangevuld; bestaande details alleen bij gebruik. Hoezen worden niet op de server gedownload en collectieafbeeldingen laden pas nabij het zichtbare scherm. Bij verouderde gegevens vraagt Draai om synchronisatie voordat releasegegevens opnieuw worden getoond. De app vermeldt Discogs als gegevensbron en is niet verbonden aan of goedgekeurd door Discogs.

Databasebestanden staan in `DATA_DIR`: `demo.sqlite` voor de fictieve collectie en `live.sqlite` voor je eigen collectie en geschiedenis. Maak versleutelde, toegangsbeperkte back-ups; daarin kunnen persoonlijke luisternotities staan. De back-upopdracht is `pnpm backup -- /pad/naar/back-up.sqlite`.

## Oplevering

Zie [docs/VERIFICATIE.md](docs/VERIFICATIE.md) voor uitgevoerde controles en [docs/PROGRESS.md](docs/PROGRESS.md) voor afgeronde en openstaande stappen.


## Persoonlijker kiezen
Nostalgisch is een eigen stemming. Geef platen sfeer- en seizoenslabels; koppel in Instellingen genres en verse weerdata aan jouw stemming. Kerstplaten worden voorzichtig op titel/stijl herkend en bij willekeurig kiezen buiten 15 november–6 januari overgeslagen. Met **Hele jaar** kun je dat per plaat overrulen. Andere seizoenslabels geven een bescheiden voorkeur, geen harde blokkade.

De geschiedenis bevat statistieken over geregistreerde sessies, unieke exemplaren, sessieduur en het verkende deel van je beschikbare LP’s. Sessieduur is geen gemeten afspeeltijd.

Op iPhone/iPad: open de HTTPS-site in Safari en kies **Deel → Zet op beginscherm**. Er zijn aparte Apple- en manifesticonen. Dit voegt geen offlinewerking toe. Een eerder bewaard icoon kan opnieuw toevoegen vereisen. Iconen opnieuw genereren: `node scripts/generate-icons.mjs`.

Discogs-gebruikersnaam en weerstation-ID hebben geen ingebouwde standaardwaarde. Vul `DISCOGS_USERNAME` en `WU_STATION_ID` uitsluitend in je eigen `.env` (LXC: `/etc/draai.env`) in. De meegeleverde configuratie bevat lege velden; upgrades bewaren bestaande waarden.
