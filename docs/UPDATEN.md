# Draai bijwerken in je LXC

Voer dit uit als root **in de Ubuntu-LXC**, niet op de Proxmox-host. Maak vooraf een Proxmox-back-up. Je bestaande installatie moet draaien als draai.service onder /opt/draai, met data in /var/lib/draai en instellingen in /etc/draai.env. Node24 en pnpm11.25.0 moeten beschikbaar zijn. De updater weigert afwijkende installaties in plaats van die stilzwijgend om te bouwen.

Als je bronclone /root/draai-bron al bestaat:

```sh
git -C /root/draai-bron pull --ff-only origin main
bash /root/draai-bron/scripts/update-lxc.sh --source /root/draai-bron --ref main
systemctl status draai --no-pager
curl --fail http://127.0.0.1:3210/api/health
```

Ontbreekt die clone? Gebruik eerst `git clone https://github.com/Roeltje/draai.git /root/draai-bron`. Zolang de repository privé is, heb je GitHub-leestoegang nodig; na openbaar maken niet. Stop bij een mislukte Git-download en los die eerst op.

De updater bouwt vooraf, stopt de dienst kort voor een volledige back-up en codewissel, en probeert bij fouten de oude versie te herstellen. Configuratie, sleutels, APP_ORIGIN en beide databases blijven behouden. Back-ups staan onder /var/backups/draai. De scriptcontroles zijn gesimuleerd getest; een echte LXC-update blijft apart te verifiëren.

Vul DISCOGS_USERNAME en WU_STATION_ID expliciet in /etc/draai.env: er zijn geen persoonlijke standaardwaarden meer. Na alleen een configuratiewijziging: `systemctl restart draai`. Lees bij een weigering de melding; verander nooit lukraak paden/rechten om een controle te omzeilen.

Meer uitleg: [Installatie en beheer](INSTALLATIE.md#updates-en-back-ups).
