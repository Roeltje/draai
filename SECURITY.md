# Veilig gebruik

Draai is bedoeld voor zelfhosting op een vertrouwd netwerk. Er is nog geen ingebouwde gebruikerslogin. Beperk bereikbaarheid via LAN/VPN of een beveiligde reverse proxy. HTTPS en APP_ORIGIN zijn geen authenticatie. Stel poort3210 niet rechtstreeks open naar internet.

Bewaar tokens alleen in je lokale .env of /etc/draai.env; commit geen database, back-up of configuratie met sleutels. Gebruik de nieuwste main-versie en maak voor updates een back-up. De MIT-licentie op de broncode verandert de voorwaarden voor externe Discogs-, Wikipedia- of weergegevens niet.

Meld een kwetsbaarheid bij voorkeur via GitHub Security → Report a vulnerability als die functie beschikbaar is. Plaats geen sleutels, privédata of werkende aanvallen op een persoonlijke installatie in publieke issues. Is privé melden niet beschikbaar, vraag in een issue uitsluitend om een privécontactkanaal zonder kwetsbaarheidsdetails.
