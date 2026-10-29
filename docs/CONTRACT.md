# Interface contract

Shared types in shared/types.ts. JSON API same-origin. All mutations take JSON and return fresh AppState unless specified. Errors: {error: string} with suitable status. Frontend fetch helper checks response.ok.

- GET /api/state -> AppState
- POST /api/select {mood?: Mood, useWeather?: boolean, recordId?: string} -> AppState. recordId is explicit collection pick; new random suggestions exclude recent selections where possible. Does not start playback. Refuse replacement while a session is active (409).
- POST /api/sessions/start {selectionId: string} -> AppState. Idempotent for same selection; cannot create second active session.
- POST /api/sessions/finish {sessionId: string, note?: string} -> AppState. Idempotent.
- PATCH /api/records/:id {tags?: Mood[], excluded?: boolean} -> AppState
- POST /api/sync {} -> 202 AppState; background sync, emits state when updated; 400 if no token.
- POST /api/weather/refresh {} -> AppState
- GET /api/events -> SSE event `state` with AppState; initial state on connect, heartbeat; frontend refetches on reconnect.
- GET /api/health -> {ok:true}

Demo mode when DISCOGS_TOKEN absent, separate persistent database from live. Config env: PORT=3210, HOST=127.0.0.1, DATA_DIR=./data, DISCOGS_USERNAME=jouw-discogs-gebruikersnaam, DISCOGS_TOKEN, WU_API_KEY, WU_STATION_ID=JOUW_STATION_ID, APP_ORIGIN (for LAN/reverse proxy origin allowlisting). No config/token mutation from browser in v1. Expose booleans only. Dev Vite on localhost:5173 proxies API to localhost:3210. Allow that dev origin explicitly in nonproduction only. Production start serves dist/client.

Demo records are fictional, six original graphic sleeve illustrations at /artwork/{01..06}.svg. Titles/artists: Nachtlicht / Studio Noord; Tussen de regels / Mira & de Rivier; Zachte landing / Het Getij; Buiten bereik / Satelliet; Kleine uren / Oscar Vale Trio; Open water / Alma Sol. All facts/tracks/credits clearly demo. Frontend can use these artwork filenames; backend seed supplies matching coverUrl. First selection may be weighted but no fake current weather or personal history.

Discogs terms fetched 2026-10-27: API content cannot display >6h outdated (https://support.discogs.com/hc/en-us/articles/360009334593-API-Terms-of-Use). Adjust earlier daily-cache plan: refresh within 6h (e.g. 5h), data stale gate at 6h, no stale Discogs metadata shown on failed refresh; preserve private listening notes/history IDs and show refresh-needed placeholders. Distinguish collection and details freshness; don't mark old details fresh just by refreshing basic data. Demo exempt. Include `Data provided by Discogs` linked to release/collection and nonaffiliation notice in Settings/docs. No persistent image download; use supplied image URLs with fallback.

Main scope phases 0/1 fully working, simple tags/weather/display if feasible. No smartplug implementation now. API contracts may change only with root coordination.

## Albumverhalen en muziekkalender (28 oktober 2026)
- RecordItem.masterId is the Discogs master ID; albumInfo contains Wiki sources and structured dates. See new optional shared types.
- POST /api/enrichment/refresh {} -> 202 AppState starts background enrichment. POST /api/records/:id/enrich {} -> 202 AppState queues missing/expired album info with priority. Errors sanitized.
- /api/select additionally accepts useAnniversaries?:boolean, default true, passed as fourth Service.select parameter; explicit picks never claim weighted reasons.
- AppState.occasions is computed for today in Europe/Amsterdam. AppState.enrichment is background status.
- Match Wikidata only via exact Discogs master P1954 and artist P1953. No artist/title-only guesses. Ambiguous matches stay unlinked. Wikipedia article from matched entity nlwiki fallback enwiki; bounded excerpt with source/language/CC BY-SA attribution.
- Calendar uses exact day-precision Gregorian dates only, excludes deprecated/uncertain claims and conflicting birth/death dates. Release dates may differ by territory; say 'releasedatum volgens Wikidata', not exact pressing date. Birth label 'geboortedag' for living/dead. Feb29 matches only Feb29. No future anniversary/negative years.
- Personal calendar boost capped at e.g.1.8x and explanations cite actual occasion. Existing exclusions/recent picks remain effective. Blank day no fabricated occasion.
- Fictitious demo infos explicitly labeled; one static 28 October demo event is okay (no generated-to-today fake birthdays). Camera later only.
- Live Wiki requests require WIKI_ENABLED=true; disabled routes reject before network access. Demo never requests external Wiki sources.
- Wiki metadata stored locally with own30day refresh; Wikipedia excerpt plain text, cap600chars and link to article/history/license. No external web text as instructions.


## Personal preferences and paced enrichment — 29 October 2026
- Mood adds `nostalgie`. Seasons: lente/zomer/herfst/winter/kerst. PATCH record accepts `seasons: Season[] | null`: null restores automatic conservative Christmas inference; [] explicitly means year-round.
- PATCH /api/preferences accepts complete `{genreMoods:[{genre,moods}], weatherMoods:{rain,cold,warm}}`. Persistent per demo/live database; defaults empty. Explicit record tags override genre rules.
- POST /api/select adds useSeasons (default true), useGenreMoods (false), useWeather (false). Seasons use Amsterdam calendar. Christmas excluded outside Nov15–Jan6 for random suggestions unless season logic disabled or year-round override; explicit picks allowed. Other out-of-season records retain reduced weight.
- POST /api/records/:id/details ->202 AppState. Deduplicated priority details/Wiki queue. Selection requests this automatically; no blocking external calls in selection.
- Collection basics refresh5h. Missing details fill gradually, existing details refresh only on demand/current record after5h; separate6h display expiry remains. No backend cover downloads. Queue serial with3s pacing, persistent15min failure pauses. Wiki30day cache includes negative matches; shared excerpts cached per article. Exact identified main artists only, up to4 fragments of600characters with source links. No AI or translation service.
- Statistics count completed registered sessions, distinct collection instances, registered session duration and share of available LP instances heard. They do not detect actual listening.
