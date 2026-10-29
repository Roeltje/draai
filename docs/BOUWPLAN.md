# Bouwplan — werktitel: Draai

## Doel en uitgangspunten
Een aantrekkelijke persoonlijke webapp die Roel helpt vaker zijn eigen platen te luisteren. Binnen enkele seconden een plaat kiezen; daarna iets interessants ontdekken. Telefoon is het primaire apparaat. Een Raspberry Pi 3B/3B+ met een oud 19-inch scherm kan optioneel dezelfde luistersessie tonen.

Bekende koppelingen:
- Discogs-gebruiker: jouw-discogs-gebruikersnaam; collectie via de officiële API.
- Bresser-weerstation via Weather Underground, station JOUW_STATION_ID.
- Hosting: eigen Proxmox-server, applicatie in een LXC.
- Taal interface: Nederlands.
- Voor de basiswerking zijn geen AI-API, abonnement, smartplugs of Pi nodig.

## Product en vormgeving
Ontwerp als een digitaal platenboekje met de directheid van een afstandsbediening. Muziek, hoezen en typografie staan centraal. Warme donkere achtergrond, gebroken wit, één uitgesproken accentkleur en royaal witruimte. Subtiele textuur mag; leesbaarheid gaat voor sfeer. Kleuren uit hoezen kunnen accenten beïnvloeden, met voldoende contrast.

Geen generiek dashboard met rijen statistiekkaartjes. Begin met een sterke mobiele startpagina: één opvallende knop ‘Wat gaat er op?’, een optionele stemmingskeuze en een kleine verwijzing naar de vorige luistersessie. Interactie met één hand, duidelijke focus, grote aanraakvlakken en ondersteuning voor verminderde beweging. Geen eindeloze carrousel of automatisch wisselende teksten tijdens het lezen.

Ontwerp eerst met duidelijk gemarkeerde voorbeeldgegevens. Presenteer voorbeelden nooit als platen uit de echte collectie. Leg mobiele en brede schermafbeeldingen vast voor visuele controle. Toon ook lege, ladende, fout- en offline-toestanden. Gebruik bij ontbrekende hoes een verzorgde fallback.

### Schermen
1. Thuis: kiezen, stemming, weer wel/niet meenemen, vorige sessie.
2. Suggestie: grote hoes, artiest, album, formaat/persing, eerlijke uitleg waarom gekozen; ‘Deze zet ik op’ en ‘Andere plaat’.
3. Nu luisteren: hoes, tracklijst per kant wanneer bekend, releasegegevens, credits, bronlinks, notitie en ‘Sessie afronden’. Informatiedetails openen op verzoek.
4. Collectie: zoeken/filteren, formaat kiezen, eigen sfeerlabels, tijdelijk uitsluiten.
5. Geschiedenis: bevestigde sessies, notities en opnieuw kiezen.
6. Instellingen: koppelingen, verbinding testen, synchroniseren, status en laatste succesvolle update.
7. /display: rustige brede weergave van de actieve sessie. Groot leesbare tekst, weinig beweging, herstel bij netwerkverlies. Zonder sessie een rustige uitnodiging met QR-code naar de telefooninterface.

Toon ‘Geselecteerd’ totdat de gebruiker bevestigt. ‘Nu luisteren’ betekent handmatig bevestigd; zonder sensor claimt de app geen werkelijke afspeeldetectie. Geen meelopende trackindicatie alsof de app de naaldpositie kent.

## Architectuur en voorgestelde techniek
Eén repository en één applicatieservice. Voorgestelde stack: TypeScript, React met Vite voor de interface, een kleine Node-backend met Fastify, SQLite voor opslag en gewone CSS/design tokens of een beperkte componentlaag. Dit is een ontwerpkeuze, geen harde eis; controleer actuele stabiele versies en compatibiliteit voor implementatie.

De backend serveert ook de gebouwde interface. Een kleine interne scheduler beheert synchronisatie met een persistente jobstatus; geen Redis of aparte queue-service nodig. Server-Sent Events delen sessiewijzigingen met telefoon en display. Herverbinding haalt altijd de actuele serverstatus op; eenvoudig pollen is een mogelijke fallback.

Backend doet alle externe API-aanroepen. Tokens blijven op de server, komen niet in frontendbundels, browseropslag of logs. Voor de eerste versie worden secrets via een lokaal configuratiebestand met beperkte rechten of service-omgeving ingesteld; de UI toont alleen of iets geconfigureerd is.

Ontwikkeling eerst lokaal. Productie rechtstreeks in een ongeprivilegieerde LXC met systemd, een aparte servicegebruiker en persistente datamap. Docker-in-LXC is niet nodig. Begin als praktische raming met 1–2 vCPU, 1 GB RAM en circa 8 GB schijf; bouwstappen kunnen meer geheugen vragen. Meet het echte verbruik. Geen wijzigingen aan de Proxmox-host nodig voor de applicatie.

Gebruik in eerste instantie het thuisnetwerk. Leg adres, poort, opstarten en firewallinstellingen vast. Wijzigingsroutes controleren origin en zijn beschermd tegen ongewenste aanvragen. Voeg een eenvoudige aanmelding of apparaatkoppeling toe als andere netwerkgebruikers toegang kunnen krijgen; displaytoegang mag alleen lezen. Publicatie op internet valt buiten de eerste versie. Installeren als echte PWA en serviceworker volgen pas na HTTPS; de gewone mobiele website werkt zonder installatie.

### Opslagmodel
- CollectionItem: Discogs-instance-ID, release-ID, folder, datum toegevoegd, beschikbaar/uitgesloten. Twee exemplaren van dezelfde release blijven onderscheidbaar.
- Release: artiesten met IDs, titel, formaten, genres, stijlen, land, releasedatum, labels, catalogusnummers, master-ID, bron en ophaaltijd.
- Albumcontext: korte samenvatting met bron-URL en ophaaldatum; exacte kalenderfeiten met type (oorspronkelijke albumuitgave, geboortedag of sterfdag), datum, persoon/release-ID en bron-URL. Bewaar oorspronkelijke albumuitgave apart van de datum waarop dit eigen exemplaar is geperst/uitgebracht. Een jaartal alleen is geen exacte kalenderdatum en telt niet mee.
- Track en Credit: posities/rollen, artist-ID en trackbereik waar beschikbaar.
- PersonalTag: eigen sfeerlabels; niet als Discogs-feiten presenteren.
- ListeningSession: gekozen exemplaar, start/einde, status, notitie en optionele feedback.
- SelectionEvent: voorstel, keuzegrond, overgeslagen/bevestigd. Overslaan maakt geen luistersessie.
- WeatherSnapshot: metingstijd, ophaaltijd, station, eenheden, beschikbare waarden en kwaliteit/veroudering.
- SyncState: laatste geslaagde synchronisatie, paginering, fout en volgende poging.

Verwijder verdwenen collectie-items niet uit historische sessies. Bewaar zowel oorspronkelijke albumdatum als persingsdatum wanneer betrouwbaar beschikbaar; presenteer ze duidelijk apart. SQLite-migraties zijn versiebeheerbaar. Back-up moet een consistente databasekopie plus configuratie omvatten; documenteer herstel en voer één herstelcontrole uit.

## Discogs-koppeling
Gebruik een persoonlijk token en een herkenbare User-Agent. Verifieer voor implementatie officiële API-documentatie, authenticatie, gebruiksvoorwaarden, afbeeldingsvoorwaarden en cachingregels. Collection endpoint: /users/jouw-discogs-gebruikersnaam/collection/folders/0/releases, met volledige paginering. Release details via /releases/{id}; master/artistgegevens alleen wanneer nuttig.

Synchroniseer bij eerste configuratie, vervolgens dagelijks en op verzoek. Bewaar basisgegevens zodra een pagina binnen is; verrijk details in de achtergrond. Respecteer rate-limitheaders en tijdelijke blokkades met back-off; geen onbeperkte retries. Laat laatste geslaagde gegevens bruikbaar bij storingen. Verwijderingen pas verwerken na een volledig geslaagde collectiescan. Voorkom dubbele synchronisatiejobs.

Eerste selectie standaard uit vinyl-LP’s. Singles, boxsets en later cd’s krijgen expliciete filterregels. Vertrouw niet alleen op het woord ‘Vinyl’; test de daadwerkelijke formaatstructuur.

Aanvullende credits, tijden en afbeeldingen kunnen ontbreken. Toon alleen beschikbare feiten. Verbind credits via artist-ID; gelijk gespelde namen zijn geen bewijs dat het dezelfde persoon is. Houd rekening met Discogs-naamvarianten en disambiguatienummers.

Albumcontext en kalenderdata zijn een kleine, begrensde verrijking. Gebruik Wiki-bronnen voor een korte albumsamenvatting en voor exacte dagen van oorspronkelijke albumuitgave, artiestengeboortedag en artiestensterfdag. Sla per feit de bronlink op en toon die bij de context. Gebruik uitsluitend een exacte dag/maand/jaar: een jaartal zonder dag en maand telt niet mee. Verwar de oorspronkelijke albumuitgave niet met de persingsdatum van het eigen exemplaar; bewaar en presenteer die als afzonderlijke feiten. Koppel personen uitsluitend aan bestaande artist-ID's of een ondubbelzinnige bronidentiteit; nooit op alleen een overeenkomende naam. Noem een geboortedag alleen als zodanig als de bron die ondersteunt. Leid niet af of iemand nog leeft of overleden is; toon een sterfdag uitsluitend met een expliciete, betrouwbare bron. Kalenderselectie gebruikt de tijdzone `Europe/Amsterdam` en een kleine, harde bovengrens op de totale kalenderbijdrage, zodat kalenderdata de gewone selectie slechts licht kunnen beïnvloeden. De uitleg noemt het feit en de bron; ontbrekende of onzekere data hebben geen gewicht.

## Weer en keuze-algoritme
WU-sleutel apart van de upload/stationssleutel configureren. Verifieer officiële actuele toegang en velden. Controleer station-ID, meettijd, eenheden en ontbrekende waarden. Haal met gematigd interval op, bijvoorbeeld iedere 10 minuten als de voorwaarden dat toelaten. Als een meting ouder dan een instelbare grens is (begin met 30 minuten), geen weergewicht gebruiken en de status tonen.

Start met uitlegbare gewogen toevalskeuze. Filter eerst op beschikbaar formaat en uitsluitingen. Geef langer niet gehoorde platen meer kans; sluit recente voorstellen en luistersessies tijdelijk uit. Nieuwe/onbekende geschiedenis betekent ‘nog niet geregistreerd’, niet ‘nooit geluisterd’. Bij een kleine collectie filters versoepelen zodat selectie mogelijk blijft.

Stemming gebruikt aanvankelijk eigen labels; Discogs-stijlen leveren hooguit expliciet benoemde grove suggesties. Weer is een klein, optioneel gewicht op door de gebruiker ingestelde sfeerrelaties. Geen automatische claim ‘regen betekent jazz’. Bewaar keuzegewichten en gebruik uitsluitend echte bijdragen voor de uitleg. Een seed/injecteerbare randombron maakt tests reproduceerbaar. Geen taalmodel nodig voor de selectie.

## Informatie tijdens het luisteren
Eerste versie: hoes, specifieke release, tracks en beschikbare credits. Tweede versie: verbindingen binnen de eigen collectie, bijvoorbeeld gedeelde producer of label, met doorklik naar de betreffende platen. Geef bij labelverbanden geen muzikale verwantschap als vaststaand feit.

Redactionele verhalen en luistertips zijn een aparte uitbreiding met bron-URL, ophaaldatum en onderscheid tussen feit en interpretatie. Geen verzonnen weetjes bij ontbrekende bronnen. AI-verrijking is optioneel, kan kosten veroorzaken en blokkeert nooit kiezen of luisteren. Ontwerp de eerste versie volledig bruikbaar zonder AI.

## Bouwfasen en oplevercriteria
### 0 — Fundament en visuele richting
Repository, README, AGENTS.md, configuratievoorbeeld zonder secrets, basisstructuur, design tokens en klikbaar ontwerp met voorbeelddata. Thuis, suggestie en luisterscherm werken mobiel en breed. Oplevering: lokaal te openen demo en gecontroleerde schermafbeeldingen. Visuele richting is concreet te beoordelen voordat alle koppelingen worden gebouwd.

### 1 — De eerste echte luisteravond
Discogs-synchronisatie, selectie, bevestigen, sessie afronden en geschiedenis. Minimale release-details, instellingenstatus en foutafhandeling. Oplevering: echte collectie inladen, alleen geschikte LP’s voorstellen, een sessie registreren, herstarten en dezelfde geschiedenis terugvinden. Sleutels ontbreken niet stilzwijgend: toon instelinstructies; demo blijft expliciet gescheiden.

### 2 — Persoonlijk en interessant (in uitvoering)
Eigen labels, weerkoppeling, transparante keuzegronden, beschikbare credits/collectieverbindingen en Wiki-albumcontext met exact gedateerde kalenderfeiten. Kalenderbijdrage is begrensd en wordt in `Europe/Amsterdam` bepaald. Geen fuzzy naamkoppeling; geen jaartal als exacte dag; geen onbewezen aanname over leven/overlijden. Oplevering: oude weerdata worden genegeerd; ontbrekende credits/context leveren een nette pagina; recente platen worden aantoonbaar minder vaak voorgesteld; datumfeiten zijn herleidbaar naar hun bron en beïnvloeden de keuze alleen binnen de vastgelegde bovengrens.

### 3 — LXC en optioneel display
Installatiescript of exacte installatiehandleiding, service, updates, migraties en back-up/herstel. /display volgt telefoonwijzigingen automatisch. Pi-installatiehandleiding voor browser in kioskmodus, autostart en herstel na verbindingsverlies. Oplevering: serverherstart overleven; telefoonwissel wordt zichtbaar op display; Pi-prestaties op echte hardware controleren. Als Pi ontbreekt, expliciet alleen desktop-browsercontrole rapporteren.

### 4 — Extra’s, alleen na bruikbare basis
Een optionele camera bij de draaitafel die naar de hoes op een standaard kijkt, sessieherinneringen, een later te ontwerpen 3D-geprinte standaard/camerabevestiging, PWA onder HTTPS, leesstand, gastmodus, routes door de collectie en smartplugs. Geen verplicht onderdeel van de eerste oplevering. Zie de aparte toekomstscope hieronder voor de grenzen rond camera, herkenning en energie.

## Toekomstscope: camera, sessiesignalen en hoesstand
Dit is toekomstig werk en geen onderdeel van de huidige fase. Een camera mag alleen covers vergelijken met platen uit de gekoppelde eigen collectie. Stel een expliciete confidence-drempel in; bij een dubbelzinnig resultaat vraagt Draai de gebruiker om bevestiging. Een generieke hoesillustratie is nooit bewijs voor een specifieke persing en mag dus geen pressing-ID opleveren. De camera kan zien dat dezelfde hoes op de standaard blijft staan, maar dat bewijst niet dat de plaat speelt of dat iemand luistert. Geen automatische claim van continu luisteren.

Een optionele energiemeting kan als aanvullend sessiesignaal helpen, maar bewijst op zichzelf evenmin dat muziek klinkt. Een langdurig zichtbare zelfde hoes kan een opt-in herinnering geven, met snooze en een neutrale toon; geen verwijtende toon en geen automatische sessieafronding. Blijf handmatige bevestiging en afronding ondersteunen.

Als er hardware wordt gekozen, ontwerp dan een stabiele 3D-geprinte hoesstandaard en camerabevestiging met passende lens field-of-view, lichtinval en reflecties in gedachten. Bepaal de prototype-afmetingen pas nadat camera en overige hardware bekend zijn; maak de montagevrijheid instelbaar. Richt de camera alleen op de hoes en verwerk beelden bij voorkeur lokaal. Bewaar opgenomen frames niet standaard; maak eventuele opslag expliciet opt-in en zichtbaar. Test de opstelling met echte covers, licht en kijkhoeken voordat herkenning als betrouwbaar wordt gepresenteerd.

## Smartplugs: latere uitbreiding
Voorkeur voor uitlezen en schakelen via bestaande Home Assistant-installatie als die er is; anders eerst merk, lokaal protocol en meetmogelijkheden vaststellen. Geen hardwareaankoop veronderstellen.

Plug A blijft permanent aan en meet het verbruik van de platenspeler. Detecteer ‘aan’ met op echte metingen afgestelde drempel, minimale duur en hysterese; een speler kan ook aanstaan zonder plaat. Deze detectie mag hooguit de displayweergave wekken of bevestiging vragen. Ze identificeert geen album en registreert niet automatisch een voltooide luistersessie.

Plug B kan een aangewezen scherm of lamp inschakelen. Leg eerst vast welk apparaat dit is, of dat apparaat na stroomherstel aan kan en hoe uitschakelen veilig verloopt. Een Pi niet abrupt via een stekker uitschakelen; die blijft aan of krijgt een nette shutdown. Handmatige override, wachttijd en geen schakelactie bij verouderde sensorwaarden. Houd deze koppeling los van de kernapp.

## Verificatie
Test betekenisvolle risico’s: Discogs-paginering, dubbele exemplaren, gedeeltelijke synchronisatiefout, verwijderen na volledige scan, LP-filter, ontbrekende velden, rate limiting, verouderde weerdata, selectiefilters en selectiegeschiedenis, idempotent bevestigen en herverbinden van display. Gebruik opgeslagen geanonimiseerde API-fixtures voor normale tests; geen echte sleutels in testdata.

Eén browserroute door kiezen → bevestigen → afronden → geschiedenis; controle op telefoonformaat en breed scherm. Visuele inspectie van hoofdschermen en fouttoestanden. Voer passende lint/typechecks, relevante tests en productiebuild uit. Meld wat werkelijk is gecontroleerd en wat nog echte hardware/toegang nodig heeft.

## Codex-werkwijze
Aanbevolen regisseur: GPT-6 Astra met high reasoning voor architectuur, opsplitsen en review. Aanbevolen bouwer: GPT-6.1 Sol met medium reasoning voor geïntegreerde features; opschalen naar high bij lastige fouten. GPT-6 Luna met high reasoning voor kleine heldere deeltaken. Dit is een praktische aanbeveling, geen gegarandeerde kwaliteits- of kostenverhouding.

De hoofdagent beheert dit plan, architectuurbesluiten en voortgang. Delegeer opdrachten met afgebakende bestanden, duidelijke input/output en oplevercriteria. Laat niet twee agents tegelijk dezelfde bestanden wijzigen. De hoofdagent integreert en controleert uitvoering; een review is geen bewijs dat tests zijn uitgevoerd. Gebruik maximaal twee gelijktijdige bouwtaken als ze werkelijk onafhankelijk zijn. Geen doorlopende achtergrondbewaking veronderstellen buiten een actieve run.

Leg in AGENTS.md vast: productdoel, stack, opdrachten voor draaien/controleren, omgang met secrets, grenzen tussen agents, visuele criteria en definitie van klaar. Houd beslissingen en voortgang kort bij in docs/. Bewaar het bouwplan in de projectrepository en actualiseer het bij gewijzigde scope.

## Startopdracht voor Codex
Bouw de app uit dit bouwplan. Gebruik de huidige projectmap als repository, of maak daarin een nette projectstructuur als die nog leeg is. Werk eerst fase 0 en 1 af tot een lokaal werkende en visueel gecontroleerde versie. De telefoon is het primaire apparaat; het losse scherm is optioneel. Geef de vormgeving evenveel aandacht als de koppelingen.

Treed op als regisseur en delegeer afgebakend bouwwerk aan GPT-6.1 Sol met medium reasoning; gebruik GPT-6 Luna met high reasoning alleen voor kleine heldere opdrachten. Als een modelinstelling niet beschikbaar is, meld dat en gebruik het beste beschikbare alternatief. Zorg dat gedelegeerde taken geen overlappende bestanden bewerken. Beoordeel zelf architectuur, gebruikersflow, wijzigingen en verificatie.

Begin met het lezen van bestaande projectinstructies. Maak AGENTS.md en een korte voortgangslijst. Start direct met bouwen, gebruik expliciete voorbeelddata zolang tokens ontbreken en zorg dat de echte koppeling later zonder herbouw te configureren is. Vraag alleen om ontbrekende informatie die daadwerkelijk blokkeert en werk ondertussen aan onafhankelijke onderdelen door. Installeer niets op de Proxmox-host. Lever broncode, lokale startinstructies, relevante controles en een LXC-installatiehandleiding. Rapporteer beperkingen eerlijk. Ga na de eerste lokale versie door met de volgende fasen voor zover de benodigde toegang beschikbaar is.

## Nog te bepalen bij implementatie
Exact Bresser-model is alleen nodig als WU niet volstaat. Node-/pakketversies worden bij de bouw gecontroleerd. LXC-besturingssysteem, netwerkadres, HTTPS-route en eventuele Home Assistant-koppeling worden bij installatie ingevuld. Discogs- en WU-tokens worden lokaal geconfigureerd. Exact Pi-model en schermaansluiting worden pas nodig voor de displayfase.

## Implementatiebesluiten — 28 oktober 2026
De eerste interface gebruikt warm ivoor met inktzwarte typografie en koraal; de optionele schermweergave is donker. Discogs wordt elke vijf uur vernieuwd, met afzonderlijke vervaltijden voor collectie- en releasegegevens en verbergen na zes uur. Dit vervangt de oorspronkelijke dagelijkse synchronisatie. Er is een echte WU-adapter met meetstatus; persoonlijke weerweging is toegevoegd; verbindingen tussen albums volgen later. De basisflow, sfeerlabels, geschiedenis en display zijn gebouwd. Zie PROGRESS.md en VERIFICATIE.md voor de actuele status.

Albumverhalen en de muziekkalender zijn gebouwd en getest. Live Wiki-opvragen vereist WIKI_ENABLED=true. De proef met een openbaar album slaagde; eigen accountgegevens en LXC/Pi-hardware moeten nog worden gecontroleerd. Camera, hoesstand en stekkers blijven toekomstig werk.

LXC-installatiebesluit: Ubuntu 24.04 LTS, startadvies 2 vCPU/2 GB RAM/8 GB opslag. Eerste-installatiescript met apt-basissoftware, eigen officiële Node 24-runtime onder /opt/draai-node en systemd. Privé-repository wordt met eigen leestoegang in de LXC opgehaald. Een aparte updater bouwt vooraf, bewaart configuratie en maakt een koude back-up met herstel bij fouten. Scripts accepteren Ubuntu 24.04 en 26.04; gebruiker heeft de app op26.04 draaien. Geen daadwerkelijke Proxmox-installatie vanuit deze ontwikkelsessie.


### Aanvulling 29 oktober 2026
Korte Wikipedia-bronfragmenten voor album én hoofdartiest; gebruiker kiest AI pas later. Rustige verrijking met voorrang voor de gekozen plaat, gedeelde artikelcache30dagen. Discogs-collectiebasis elke5uur, details alleen ontbrekend of actief/in beeld, met eigen6uur-verval. Nostalgie, persoonlijke genre-/weerregels, seizoenen en sessiestatistieken toegevoegd. SVG-ster en Apple/manifesticonen zonder verplichte PWA-serviceworker.

Mogelijke vervolgstappen: feedback ‘past wel/niet bij mijn stemming’, een route langs gedeelde muzikanten/producer, en een leeslijst bij luistermomenten. Een platenzaakvariant krijgt een uitsluitend leesbaar publiek scherm, recente platen en eigen voorraad-/winkelkoppeling. Voor betaald gebruik/commerce eerst Discogs-voorwaarden en benodigde toestemming onderzoeken; dat is nog geen huidige productfunctie. Camera en smartplugs blijven later.
