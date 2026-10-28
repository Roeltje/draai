# Installatie en beheer

Deze handleiding beschrijft lokale ontwikkeling en een productie-installatie in een niet-geprivilegieerde Proxmox LXC. Draai is een persoonlijke thuisnetwerk-app en heeft nog geen gebruikerslogin.

## Lokaal ontwikkelen

Installeer Node.js 24 en pnpm. Gebruik de [officiële Node.js-downloads](https://nodejs.org/en/download/) of de [Node.js-downloadarchive](https://nodejs.org/en/download/archive/v24) voor de LTS-lijn; controleer bij handmatige Linux-installatie de gepubliceerde SHASUMS. Installeer pnpm via de [officiële pnpm-instructies](https://pnpm.io/installation), bijvoorbeeld met `npm install --global pnpm@11.25.0`.

```sh
node --version   # moet v24.x tonen
pnpm --version
pnpm install
cp .env.example .env
pnpm dev
```

De voorbeeldconfiguratie start in demo. Bewerk `.env` om live gegevens in te schakelen:

```dotenv
HOST=127.0.0.1
PORT=3210
DATA_DIR=./data
DISCOGS_USERNAME=jouw-discogs-gebruikersnaam
DISCOGS_TOKEN=plaats-je-persoonlijke-token-hier
WU_STATION_ID=IWAALW30
WU_API_KEY=
WIKI_ENABLED=false
APP_ORIGIN=
```

`DISCOGS_TOKEN` bepaalt de modus: zonder token gebruikt Draai `demo.sqlite`; met token gebruikt het `live.sqlite`. De databasebestanden en luistergeschiedenis zijn daardoor gescheiden. De Discogs-token en optionele Weather Underground-leessleutel blijven op de server. Plaats ze nooit in browsercode of in een publiek toegankelijke repository. Na het wijzigen van `.env` moet je de server herstarten.

In lokale ontwikkeling draait de API op poort 3210 en Vite op `localhost:5173`. Gebruik `pnpm dev` voor beide processen. Voor productie zijn de commando’s `pnpm check`, `pnpm test`, `pnpm build` en `pnpm start`. `pnpm start` dient de gebouwde client en luistert standaard op `127.0.0.1:3210`.

## Albumverhalen en muziekkalender

Met `WIKI_ENABLED=true` schakel je de echte Wiki-koppeling in; standaard staat die uit. Hiervoor is geen API-sleutel nodig. Draai stuurt Discogs-master- en artiest-ID’s naar Wikidata en haalt het gekoppelde artikel bij Wikipedia op. Luistergeschiedenis en notities blijven lokaal. Herstart na het aanpassen van de instelling en kies bij Instellingen **Albumverhalen bijwerken**, of haal informatie per plaat op.

Koppelen gebeurt alleen via exacte IDs, nooit alleen via dezelfde titel of naam. Een korte Nederlandse artikeltekst (anders Engels) krijgt bron- en licentielinks. Exact bekende release-, geboorte- en overlijdensdatums kunnen op dezelfde dag extra meewegen; zet dat desgewenst op de startpagina uit. Kalenderdagen volgen Europe/Amsterdam. De datum van het album staat apart van de uitgave in je collectie. Ontbrekende, onzekere of dubbele matches blijven leeg. De eerste versie zoekt de hoofdartiesten; bandleden en overige credits volgen later.

Wiki-informatie heeft een aparte bewaartermijn van 30 dagen. De achtergrondknop vult ontbrekende of verlopen informatie aan; de knop bij een album vraagt die informatie opnieuw op. De demo gebruikt uitsluitend fictieve verhalen en een vast voorbeeld op 28 oktober.

## Proxmox LXC

Maak een niet-geprivilegieerde LXC met een actuele Debian-installatie, voldoende schijfruimte voor Node.js en de database, en een vast LAN-adres. Installeer Node.js 24 vanuit de [officiële Node.js-distributie](https://nodejs.org/en/download/); volg voor Linux de download- en verificatie-informatie van Node.js en controleer de gepubliceerde SHASUMS. Gebruik geen willekeurige installatiebron of shellscript van een derde partij. Zorg dat de runtime beschikbaar is als `/usr/bin/node` (de systemd-opdracht hieronder verwacht dat pad). pnpm is alleen nodig tijdens installatie en updates; installeer het vanuit npm met `npm install --global pnpm@11.25.0`.

Maak een servicegebruiker en de app-, data- en configuratiepaden aan. Zet de checkout neer in `/opt/draai` en wijs alleen de data- en configuratiepaden toe aan de servicegebruiker:

```sh
useradd --system --home-dir /opt/draai --shell /usr/sbin/nologin draai
install -d -o root -g root /opt/draai
install -d -o draai -g draai -m 0700 /var/lib/draai
```

Haal de app-code op in `/opt/draai` en voer daar als beheerder de installatie en productie-build uit:

```sh
cd /opt/draai
pnpm install --frozen-lockfile
pnpm build
```

Laat de code en `node_modules` eigendom van root/beheerder blijven; de service hoeft er alleen lees- en uitvoerrechten op te hebben. Alleen `/var/lib/draai` is schrijfbaar voor gebruiker `draai`.

Maak `/etc/draai.env` aan met alleen de productie-instellingen. Geef het bestand geen leesrechten voor andere gebruikers dan root en de servicegroep:

```dotenv
NODE_ENV=production
HOST=0.0.0.0
PORT=3210
DATA_DIR=/var/lib/draai
DISCOGS_USERNAME=jouw-discogs-gebruikersnaam
DISCOGS_TOKEN=plaats-je-persoonlijke-token-hier
WU_STATION_ID=IWAALW30
WU_API_KEY=
WIKI_ENABLED=false
APP_ORIGIN=http://192.168.1.50:3210
```

Vervang het voorbeeldadres door het vaste LAN-adres van de LXC. Bewaar dit bestand als `root:draai` met modus `0640` (bijvoorbeeld `chown root:draai /etc/draai.env` en `chmod 0640 /etc/draai.env`). Laat `DISCOGS_TOKEN` leeg of weg om in demo te starten. Stel `WU_API_KEY` alleen in als je de Weather Underground-weermeting wilt gebruiken.

De unit `deploy/draai.service` hoort bij de repository en gebruikt `/opt/draai` als werkmap, `/etc/draai.env` als omgevingsbestand en gebruiker `draai`. De startopdracht gebruikt de lokale tsx-loader:

```ini
ExecStart=/usr/bin/node node_modules/tsx/dist/cli.mjs server/index.ts
```

Installeer de unit en activeer de service:

```sh
install -m 0644 /opt/draai/deploy/draai.service /etc/systemd/system/draai.service
systemctl daemon-reload
systemctl enable --now draai
systemctl status draai
```

De webapp is daarna bereikbaar op `http://192.168.1.50:3210` (gebruik je eigen LXC-adres). Open op een telefoon dat LAN-adres; `localhost` op de telefoon verwijst naar de telefoon zelf. `/display` is een optionele tweede-schermweergave en kan in een browser op bijvoorbeeld een Pi worden geopend. Er is geen fysieke Pi- of andere hardware getest.

`HOST=0.0.0.0` maakt de service bereikbaar via netwerkinterfaces van de LXC. Beperk dit met de Proxmox- en/of LXC-firewall tot je vertrouwde thuisnetwerk en stel geen port-forwarding vanaf internet in. Draai heeft geen app-login; iedereen die de poort kan bereiken kan de app gebruiken en mogelijk de luistergeschiedenis inzien. `APP_ORIGIN` moet overeenkomen met het adres waarmee browsers de app openen.

## Updates en back-ups

Voer bij een update eerst een back-up uit, haal daarna de nieuwe code op, en bouw opnieuw:

```sh
cd /opt/draai
pnpm backup -- --env /etc/draai.env /pad/naar/veilige-back-ups/draai.sqlite
pnpm install --frozen-lockfile
pnpm build
systemctl restart draai
```

De back-upopdracht maakt een consistente SQLite-back-up van de modus uit het opgegeven configuratiebestand en controleert de integriteit. Kies per back-up een nieuwe bestandsnaam. Gebruik lokaal zonder `--env` je `.env`. Sla back-ups op een andere schijf of machine op, bescherm ze tegen onbevoegde toegang en bewaar `.env`/`/etc/draai.env` apart en veilig. De database kan persoonlijke luisternotities bevatten. Demo- en live-data hebben aparte bestanden (`demo.sqlite` en `live.sqlite`); maak voor beide modi een aparte back-up als je beide wilt bewaren.

Voor herstel, stop eerst Draai en maak een extra kopie van de bestaande database. Kopieer daarna de gewenste back-up naar de juiste bestandsnaam. Verwijder eventuele SQLite-WAL-bestanden uitsluitend terwijl de service gestopt is en nadat de bestaande database veilig is gekopieerd:

```sh
systemctl stop draai
cp /var/lib/draai/live.sqlite /var/lib/draai/live.sqlite.voor-herstel
cp /pad/naar/back-up.sqlite /var/lib/draai/live.sqlite
rm -f /var/lib/draai/live.sqlite-wal /var/lib/draai/live.sqlite-shm
chown draai:draai /var/lib/draai/live.sqlite
systemctl start draai
```

Gebruik voor herstel van de demo `demo.sqlite` in plaats van `live.sqlite`. Verwijder of vervang nooit actieve databasebestanden terwijl Draai draait.

## Functionaliteitsgrenzen

Weerdata kan via Weather Underground worden opgehaald en ververst. Die metingen beïnvloeden de selectie nog niet met persoonlijke weer- of plaatvoorkeuren; die weging is toekomstig werk. Slimme stekkers, automatisch afspelen en trackdetectie zijn niet geïmplementeerd. De schermweergave toont de sessie die je zelf in Draai bevestigt.
