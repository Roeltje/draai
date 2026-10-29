# Installatie en beheer

Deze handleiding beschrijft lokale ontwikkeling en een productie-installatie in een niet-geprivilegieerde Proxmox LXC.

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
WU_STATION_ID=JOUW_STATION_ID
WU_API_KEY=
WIKI_ENABLED=false
APP_ORIGIN=
```

`DISCOGS_TOKEN` bepaalt de modus: zonder token gebruikt Draai `demo.sqlite`; met token gebruikt het `live.sqlite`. De databasebestanden en luistergeschiedenis zijn daardoor gescheiden. De Discogs-token en optionele Weather Underground-leessleutel blijven op de server. Plaats ze nooit in browsercode of in een publiek toegankelijke repository. Na het wijzigen van `.env` moet je de server herstarten.

In lokale ontwikkeling draait de API op poort 3210 en Vite op `localhost:5173`. Gebruik `pnpm dev` voor beide processen. Voor productie zijn de commando’s `pnpm check`, `pnpm test`, `pnpm build` en `pnpm start`. `pnpm start` dient de gebouwde client en luistert standaard op `127.0.0.1:3210`.

## Albumverhalen en muziekkalender

Met `WIKI_ENABLED=true` schakel je de echte Wiki-koppeling in; standaard staat die uit. Hiervoor is geen API-sleutel nodig. Draai stuurt Discogs-master- en artiest-ID’s naar Wikidata en haalt het gekoppelde artikel bij Wikipedia op. Luistergeschiedenis en notities blijven lokaal. Herstart na het aanpassen van de instelling en kies bij Instellingen **Albumverhalen bijwerken**, of haal informatie per plaat op.

Koppelen gebeurt alleen via exacte IDs, nooit alleen via dezelfde titel of naam. Een korte Nederlandse artikeltekst (anders Engels) krijgt bron- en licentielinks. Exact bekende release-, geboorte- en overlijdensdatums kunnen op dezelfde dag extra meewegen; zet dat desgewenst op de startpagina uit. Kalenderdagen volgen Europe/Amsterdam. De datum van het album staat apart van de uitgave in je collectie. Ontbrekende, onzekere of dubbele matches blijven leeg. De eerste versie zoekt de hoofdartiesten; bandleden en overige credits volgen later.

Wiki-informatie heeft een aparte bewaartermijn van 30 dagen. Ontbrekende of verlopen informatie wordt rustig op de achtergrond aangevuld; een gekozen plaat krijgt voorrang. De knop bij een album vraagt aanvulling aan, met behoud van de cachetermijn. Ook korte fragmenten over exact gekoppelde hoofdartiesten verschijnen met bronvermelding. Er wordt geen AI gebruikt. De demo gebruikt uitsluitend fictieve verhalen en een vast voorbeeld op 28 oktober.

## Proxmox LXC: aanbevolen installatie

Gebruik een **ongeprivilegieerde Ubuntu 24.04- of 26.04-container** speciaal voor Draai. Beide versies worden door de installer en updater geaccepteerd. De app is op Ubuntu 26.04 gemeld als werkend, maar de nieuwe installer en updater zijn hier niet op Linux uitgevoerd. Zie de [Ubuntu-supporttabel](https://ubuntu.com/about/release-cycle).

### 1. Container aanmaken in Proxmox

| Instelling | Startadvies |
| --- | --- |
| Template | Ubuntu 24.04 of 26.04 standaard LXC-template |
| Unprivileged container | Aan |
| CPU | 2 cores |
| Geheugen | 2 GB RAM, eventueel 512 MB swap |
| Opslag | 8 GB; meer als je lokale back-ups bewaart |
| Netwerk | Vast LAN-adres of vaste DHCP-reservering |
| Start at boot | Aan |
| Nesting / Docker | Niet nodig |

Dit is een praktische beginconfiguratie, geen gemeten minimum. Open na het aanmaken de **Console van deze container** en log in als root. Alle onderstaande opdrachten draaien daar, niet in de shell van de Proxmox-host. Je hoeft niets op de Proxmox-host te installeren.

### 2. Toegang tot de privé-repository

De repository [Roeltje/draai](https://github.com/Roeltje/draai) is privé. Je GitHub-koppeling in Codex geeft de LXC geen GitHub-aanmelding.

Maak op GitHub bij **Settings → Developer settings → Personal access tokens → Fine-grained tokens** een token met:

- Resource owner: Roeltje.
- Repository access: alleen `draai`.
- Repository permissions: **Contents: Read-only** (Metadata wordt automatisch toegestaan).
- Een passende vervaldatum. Voor een volgende download kun je een nieuw token gebruiken.

Zie de [GitHub-handleiding voor tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens). De container hoeft alleen code te lezen; schrijfrechten zijn niet nodig.

Voer in de LXC-console uit:

```sh
apt-get update
apt-get install -y ca-certificates git
git -c credential.helper= clone https://github.com/Roeltje/draai.git /root/draai-bron
```

Vul bij Username `Roeltje` in en plak bij Password het token, niet je GitHub-wachtwoord. Het wachtwoordveld toont niets tijdens plakken. Deze opdracht bewaart het token niet in Git-configuratie of de clone-URL. Zet het token ook niet zelf in de URL. Als je al een SSH-deploykey met leestoegang hebt ingesteld, mag je in plaats daarvan via `git@github.com:Roeltje/draai.git` klonen.

### 3. Installeren

Vervang het voorbeeld-IP door het LAN-adres van je container:

```sh
bash /root/draai-bron/scripts/install-lxc.sh \
  --source /root/draai-bron \
  --origin http://192.168.1.50:3210
```

Het script:

1. Controleert Ubuntu 24.04 of 26.04, root, systemd en de ongeprivilegieerde LXC. Het weigert de Proxmox-host en een bestaande Draai-installatie.
2. Installeert de basissoftware met `apt`.
3. Haalt de nieuwste beschikbare **Node.js 24** Linux-distributie op via nodejs.org en controleert de SHA-256-checksum. Installeert pnpm 11.25.0. Deze geïsoleerde runtime staat onder `/opt/draai-node`; er wordt geen oudere Ubuntu-Node gebruikt en geen extra apt-repository toegevoegd.
4. Bouwt de applicatie als een gebruiker zonder rootrechten en zet de code en afhankelijkheden neer in `/opt/draai`.
5. Maakt `/etc/draai.env` met demo-instellingen en `/var/lib/draai` voor de databases. Bestaande configuratie en gegevens worden behouden.
6. Installeert `draai.service`, schakelt automatisch starten in en controleert of de app antwoordt.

Het script maakt de app bereikbaar op poort 3210 van de LXC. De firewall wordt niet gewijzigd. Als je een reverse proxy gebruikt, sta op poort 3210 alleen verkeer van die proxy toe; publiceer die upstreampoort niet rechtstreeks.

Open daarna **http://192.168.1.50:3210** op je telefoon of computer. Je begint met de zes fictieve voorbeeldplaten. Gebruik op de telefoon het LXC-adres; localhost zou de telefoon zelf zijn. Het optionele luisterscherm staat op `http://192.168.1.50:3210/display`.

Als je het script al los naar de container hebt gekopieerd, kan het ook zelf klonen:

```sh
bash install-lxc.sh --repo git@github.com:Roeltje/draai.git \
  --ref main --origin http://192.168.1.50:3210
```

Daarvoor moet de SSH-toegang in die container al werken. Met een HTTPS-repository gebruik je de interactieve Git-aanmelding. `--source` neemt de vastgelegde Git-versie uit je clone; niet-vastgelegde bestanden zijn geen onderdeel van de installatie. Bekijk `bash scripts/install-lxc.sh --help` voor de exacte opties.

### 4. Configuratie en je eigen collectie

De productieconfiguratie staat in **`/etc/draai.env`**. Bewerk dit bestand in de LXC, bijvoorbeeld met `nano /etc/draai.env` (installeer nano indien nodig via apt). De installer maakt het aan met demo-instellingen. Zet hier je Discogs-token en eventueel de Weather Underground-leessleutel:

```dotenv
NODE_ENV=production
HOST=0.0.0.0
PORT=3210
DATA_DIR=/var/lib/draai
DISCOGS_USERNAME=jouw-discogs-gebruikersnaam
DISCOGS_TOKEN=
WU_STATION_ID=JOUW_STATION_ID
WU_API_KEY=
WIKI_ENABLED=false
APP_ORIGIN=http://192.168.1.50:3210
```

Vul de waarden lokaal in en herstart:

```sh
systemctl restart draai
systemctl status draai --no-pager
```

Een ingevuld Discogs-token schakelt over op de aparte live-database. Zet `WIKI_ENABLED=true` als je de hierboven beschreven Wiki-koppeling wilt gebruiken. Bij een gewijzigd IP/hostnaam pas je ook `APP_ORIGIN` aan. Houd `HOST`, `PORT` en `DATA_DIR` op de bovenstaande waarden voor deze installatie. De updater laat `/etc/draai.env` ongemoeid en verwacht deze `HOST`, `PORT` en `DATA_DIR`-instellingen.

### Toegang via een HTTPS-reverse-proxy

De LXC-installer stelt `HOST=0.0.0.0` en `PORT=3210` in, zodat een proxy op een andere machine de app kan bereiken. De verbinding van proxy naar LXC is HTTP; HTTPS eindigt op de proxy. Bijvoorbeeld in Nginx Proxy Manager:

| Nginx Proxy Manager-veld | Waarde |
| --- | --- |
| Domain Names | `draai.example.com` |
| Scheme | `http` |
| Forward Hostname / IP | IP-adres van de Draai-LXC, bijvoorbeeld `192.168.1.50` |
| Forward Port | `3210` |
| SSL | Vraag of selecteer een certificaat voor `draai.example.com` en schakel HTTPS in |

Zet daarna in `/etc/draai.env`:

```dotenv
APP_ORIGIN=https://draai.example.com
```

Gebruik geen afsluitende slash. Herstart Draai na een configuratiewijziging met `systemctl restart draai`. Beperk netwerktoegang tot poort 3210 tot de proxy en beheer de publieke toegang aan de proxyzijde.

### Beheer en controle

```sh
systemctl status draai --no-pager
journalctl -u draai -n 80 --no-pager
systemctl restart draai
curl --fail http://127.0.0.1:3210/api/health
```

| Onderdeel | Pad |
| --- | --- |
| Gedownloade Git-clone | /root/draai-bron |
| Gebouwde applicatie, alleen lezen voor dienst | /opt/draai |
| Node.js 24 en pnpm | /opt/draai-node/bin |
| Configuratie, root:draai 0640 | /etc/draai.env |
| Databases, alleen toegankelijk voor dienst/root | /var/lib/draai |
| Systemd-unit | /etc/systemd/system/draai.service |

De installer is uitsluitend voor de **eerste installatie**. Hij weigert een bestaande installatie en overschrijft die niet. Bij een mislukking meldt hij de stap. Neem na een geslaagde eerste installatie een Proxmox-back-up van de container.

### Wat wel en niet is getest

De installer en updater zijn samen met 15 tests met nagebootste systeemopdrachten gecontroleerd. De nieuwe scripts zijn hier niet echt op Linux of in een Ubuntu-LXC uitgevoerd; apt, systemd en de installatie/update in jouw Proxmox-omgeving moeten dus nog in de praktijk worden bevestigd.

## Updates en back-ups

### App bijwerken

Voer updates uit als root **binnen de LXC**. De updatebron is de clone `/root/draai-bron`. Haal eerst de nieuwste commit op met de Git-aanmelding die je voor de privérepository hebt ingesteld (read-only toegang is voldoende):

```sh
git -C /root/draai-bron pull --ff-only origin main
bash /root/draai-bron/scripts/update-lxc.sh \
  --source /root/draai-bron \
  --ref main
```

Je kunt ook `--repo` gebruiken als je Git-aanmelding in de LXC werkt. Geef nooit een token of wachtwoord mee in de repository-URL. `--source` exporteert de gecommitteerde versie uit de clone; niet-gecommitteerde wijzigingen worden niet meegenomen.

Voor de update moeten de actieve `draai.service`, installatiepaden en standaardconfiguratie aanwezig zijn. De updater ondersteunt de meegeleverde systemd-unit en een oudere standaardunit die Node met de lokale tsx-loader start. Hij weigert onder meer systemd drop-ins, afwijkende units, ontbrekende/symlink-installatiepaden, lokale codewijzigingen, `.env` of data in `/opt/draai`, en een andere `DATA_DIR`. Hij zet een maatwerkinstallatie niet automatisch om; herstel eerst de ondersteunde indeling of voer een handmatige migratie uit.

Node.js 24 en pnpm 11.25.0 moeten al beschikbaar zijn voor de bestaande service. De updater installeert of wijzigt geen OS-pakketten en voert geen `apt-get update` uit. Voor de build gebruikt hij de bestaande runtime. De huidige `APP_ORIGIN`, sleutels en overige configuratie blijven in `/etc/draai.env` behouden.

De updater bouwt eerst de nieuwe versie terwijl de oude service nog draait. Daarna stopt hij de service, maakt een root-only koude back-up onder `/var/backups/draai` van `/etc/draai.env`, de systemd-unit, de volledige `/var/lib/draai`-map (dus zowel demo- als live-database en SQLite-sidecars) en de huidige code. Dan wisselt hij de code en controleert de health-endpoint. Bij een fout probeert hij code, configuratie, unit en data te herstellen en de oude service opnieuw te starten. Bewaar de back-up ook na een geslaagde update; deze bevat privégegevens. Iedere update bewaart ook de volledige code inclusief afhankelijkheden: controleer de vrije schijfruimte en verplaats oudere back-ups zo nodig naar je eigen back-upopslag. Het script verwijdert ze niet automatisch.

Maak vanuit de LXC een consistente back-up van de actieve database (demo of live):

```sh
install -d -m 0700 /var/backups/draai
cd /opt/draai
/opt/draai-node/bin/node scripts/backup.mjs --env /etc/draai.env \
  "/var/backups/draai/draai-$(date +%Y%m%d-%H%M%S).sqlite"
```

De updater verandert geen Proxmox-instellingen, firewall of reverse-proxyconfiguratie. Maak daarnaast geregeld een Proxmox-back-up van de hele container. Beheer Ubuntu-systeemupdates apart via apt; de geïsoleerde Node-runtime wordt niet door apt bijgewerkt.

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

Weerdata kan via Weather Underground worden opgehaald en ververst. Persoonlijke weerregels kunnen optioneel de selectie beïnvloeden; alleen met een verse meting en zelf ingestelde verbanden. Slimme stekkers, automatisch afspelen en trackdetectie zijn niet geïmplementeerd. De schermweergave toont de sessie die je zelf in Draai bevestigt.
