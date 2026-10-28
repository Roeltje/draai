import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type {
  AppState,
  Mood,
  RecordItem,
  SyncState,
  WeatherState,
} from "../shared/types.ts";
import { Store } from "./store.ts";
import { demoRecords } from "./demo.ts";
import { KnowledgeClient, KNOWLEDGE_TTL, occasionsFor } from "./knowledge.ts";
import {
  basicRecord,
  DiscogsClient,
  enrich,
  stale,
  REFRESH_INTERVAL,
} from "./discogs.ts";

export interface Config {
  dataDir: string;
  token?: string;
  username: string;
  weatherKey?: string;
  stationId: string;
  origin?: string;
  production?: boolean;
  wikiEnabled?: boolean;
}
export interface Dependencies {
  now?: () => number;
  random?: () => number;
  fetcher?: typeof fetch;
  wait?: (ms: number) => Promise<void>;
}
type SelectionRow = {
  id: string;
  record_id: string;
  reasons: string;
  created_at: string;
};
type SessionRow = {
  id: string;
  record_id: string;
  started_at: string;
  ended_at: string | null;
  note: string;
};
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}
export class Service {
  store: Store;
  mode: "demo" | "live";
  sync: SyncState;
  listeners = new Set<() => void>();
  private now: () => number;
  private random: () => number;
  private fetcher: typeof fetch;
  private client: DiscogsClient;
  private syncTask: Promise<void> | null = null;
  private knowledge: KnowledgeClient;
  private enrichmentTask: Promise<void> | null = null;
  private enrichment: NonNullable<AppState["enrichment"]>;
  constructor(
    public config: Config,
    deps: Dependencies = {},
  ) {
    this.now = deps.now ?? Date.now;
    this.random = deps.random ?? Math.random;
    this.fetcher = deps.fetcher ?? fetch;
    this.mode = config.token ? "live" : "demo";
    mkdirSync(config.dataDir, { recursive: true });
    this.store = new Store(join(config.dataDir, `${this.mode}.sqlite`));
    if (this.mode === "demo" && !this.store.records().length)
      demoRecords(this.iso()).forEach((r) => this.store.put(r, this.iso()));
    if (this.mode === "demo" && this.store.get("demoKnowledgeVersion", 0) < 1) {
      for (const seeded of demoRecords(this.iso())) {
        const current = this.store.record(seeded.id);
        if (current)
          this.store.put({ ...current, albumInfo: seeded.albumInfo });
      }
      this.store.set("demoKnowledgeVersion", 1);
    }
    this.knowledge = new KnowledgeClient(this.fetcher, deps.wait, this.now);
    this.enrichment = this.store.get("enrichment", {
      running: false,
      progress: "Nog geen albuminformatie opgehaald",
      lastSuccess: null,
      error: null,
    });
    this.enrichment.running = false;
    this.sync = this.store.get<SyncState>("sync", {
      running: false,
      lastSuccess: null,
      error: null,
      progress:
        this.mode === "demo"
          ? "Voorbeeldcollectie"
          : "Nog niet gesynchroniseerd",
    });
    this.sync.running = false;
    this.client = new DiscogsClient(
      config.token ?? "",
      this.fetcher,
      deps.wait,
    );
  }
  private iso() {
    return new Date(this.now()).toISOString();
  }
  emit() {
    for (const listener of this.listeners) listener();
  }
  private saveSync() {
    this.store.set("sync", this.sync);
    this.emit();
  }
  private visible(r: RecordItem): RecordItem {
    if (r.demo) return r;
    r = { ...r, detailsFetchedAt: this.store.detailsAt(r.id) };
    if (stale(r.fetchedAt, this.now()))
      return {
        ...r,
        title: "Releasegegevens verversen",
        artist: "Discogs-gegevens verlopen",
        artistIds: [],
        year: null,
        country: "",
        label: "",
        catalogNumber: "",
        formats: [],
        genres: [],
        styles: [],
        coverUrl: "",
        tracks: [],
        credits: [],
        notes: "",
      };
    if (stale(r.detailsFetchedAt ?? null, this.now()))
      return { ...r, country: "", tracks: [], credits: [], notes: "" };
    return r;
  }
  state(): AppState {
    const records = this.store.records().map((r) => this.visible(r));
    const byId = new Map(records.map((r) => [r.id, r]));
    const selectedId = this.store.get<string | null>("selection", null);
    const selection = selectedId
      ? (this.store.db
          .prepare("SELECT * FROM selections WHERE id=?")
          .get(selectedId) as SelectionRow | undefined)
      : undefined;
    const sessions = this.store.db
      .prepare("SELECT * FROM sessions ORDER BY started_at DESC,rowid DESC")
      .all() as SessionRow[];
    const session = (s: SessionRow) => ({
      id: s.id,
      record: byId.get(s.record_id)!,
      startedAt: s.started_at,
      endedAt: s.ended_at,
      note: s.note,
    });
    let weather = this.store.get<WeatherState>("weather", {
      status: "unconfigured",
      stationId: this.config.stationId,
      observedAt: null,
      temperature: null,
      rainRate: null,
      windSpeed: null,
      message: this.config.weatherKey
        ? "Nog geen meting opgehaald."
        : "Geen Weather Underground API-sleutel ingesteld.",
    });
    if (
      weather.status === "fresh" &&
      (!weather.observedAt ||
        this.now() - Date.parse(weather.observedAt) > 30 * 60000)
    )
      weather = {
        ...weather,
        status: "stale",
        message: "Meting ouder dan 30 minuten; geen invloed op selectie.",
      };
    return {
      mode: this.mode,
      records,
      selection:
        selection && byId.has(selection.record_id)
          ? {
              id: selection.id,
              record: byId.get(selection.record_id)!,
              reasons: JSON.parse(selection.reasons),
              createdAt: selection.created_at,
            }
          : null,
      activeSession: sessions.find((s) => !s.ended_at)
        ? session(sessions.find((s) => !s.ended_at)!)
        : null,
      history: sessions.filter((s) => s.ended_at).map(session),
      sync: { ...this.sync },
      weather,
      occasions: occasionsFor(records, this.now()),
      enrichment: { ...this.enrichment },
      settings: {
        discogsConfigured: !!this.config.token,
        username: this.config.username,
        weatherConfigured: !!this.config.weatherKey,
        wikiEnabled: !!this.config.wikiEnabled,
        displayUrl: "/display",
        collectionStale:
          this.mode === "live" &&
          (stale(this.sync.lastSuccess, this.now()) ||
            records.some((r) => r.available && stale(r.fetchedAt, this.now()))),
      },
    };
  }
  select(
    mood: Mood = "alles",
    _useWeather = false,
    recordId?: string,
    useAnniversaries = true,
  ) {
    if (this.state().activeSession)
      throw new AppError(409, "Rond eerst de actieve luistersessie af.");
    let eligible = this.store
      .records()
      .filter(
        (r) =>
          r.available &&
          !r.excluded &&
          r.isLP &&
          (r.demo || !stale(r.fetchedAt, this.now())),
      );
    if (recordId) eligible = eligible.filter((r) => r.id === recordId);
    if (!eligible.length)
      throw new AppError(
        409,
        "Geen geschikte LP beschikbaar. Synchroniseer of pas uitsluitingen aan.",
      );
    const recent = this.store.db
      .prepare("SELECT record_id FROM selections ORDER BY rowid DESC LIMIT 3")
      .all() as { record_id: string }[];
    const history = this.store.db
      .prepare(
        "SELECT record_id,MAX(started_at) AS latest FROM sessions GROUP BY record_id",
      )
      .all() as { record_id: string; latest: string }[];
    const playedToday = new Set(
      history
        .filter((s) => this.now() - Date.parse(s.latest) < 86400000)
        .map((s) => s.record_id),
    );
    const fresh = eligible.filter(
      (r) =>
        !recent.some((s) => s.record_id === r.id) && !playedToday.has(r.id),
    );
    if (fresh.length && !recordId) eligible = fresh;
    else if (!recordId) {
      const notPlayedToday = eligible.filter((r) => !playedToday.has(r.id));
      if (notPlayedToday.length) eligible = notPlayedToday;
      const different = eligible.filter((r) => r.id !== recent[0]?.record_id);
      if (different.length) eligible = different;
    }
    const occasions =
      useAnniversaries && !recordId ? occasionsFor(eligible, this.now()) : [];
    const weighted = eligible.map((record) => {
      const last = history.find((s) => s.record_id === record.id)?.latest;
      const days = last
        ? Math.max(0, (this.now() - Date.parse(last)) / 86400000)
        : null;
      const historyWeight = days === null ? 2 : 1 + Math.min(days / 30, 2);
      const moodWeight = mood !== "alles" && record.tags.includes(mood) ? 2 : 1;
      const occasion = occasions.find((o) => o.recordId === record.id);
      const dateWeight = occasion ? 1.8 : 1;
      return {
        record,
        weight: historyWeight * moodWeight * dateWeight,
        days,
        moodWeight,
        occasion,
      };
    });
    let cursor = this.random() * weighted.reduce((n, w) => n + w.weight, 0);
    const chosen =
      weighted.find((w) => (cursor -= w.weight) < 0) ??
      weighted[weighted.length - 1];
    const reasons = [
      recordId
        ? "Zelf uit je collectie gekozen."
        : "Gewogen toevalskeuze uit beschikbare vinyl-LP’s.",
    ];
    if (!recordId && chosen.days === null)
      reasons.push("Nog geen luistersessie geregistreerd; krijgt extra kans.");
    else if (!recordId && chosen.days !== null)
      reasons.push(
        `Laatste geregistreerde sessie ${Math.floor(chosen.days)} dagen geleden; dit bepaalt het geschiedenisgewicht.`,
      );
    if (!recordId && chosen.moodWeight > 1)
      reasons.push(`Jouw sfeerlabel ‘${mood}’ geeft extra kans.`);
    if (chosen.occasion)
      reasons.push(
        `${chosen.occasion.description} Daardoor telt deze plaat vandaag 1,8× mee in de loting.`,
      );
    if (fresh.length && !recordId && (recent.length || playedToday.size))
      reasons.push(
        "Recente voorstellen en vandaag geregistreerde sessies vermeden.",
      );
    const id = randomUUID();
    this.store.db
      .prepare("INSERT INTO selections VALUES (?,?,?,?)")
      .run(id, chosen.record.id, JSON.stringify(reasons), this.iso());
    this.store.set("selection", id);
    this.emit();
  }
  start(selectionId: string) {
    if (
      this.store.db
        .prepare("SELECT id FROM sessions WHERE selection_id=?")
        .get(selectionId)
    )
      return;
    const selection = this.store.db
      .prepare("SELECT * FROM selections WHERE id=?")
      .get(selectionId) as SelectionRow | undefined;
    if (!selection || this.store.get("selection", "") !== selectionId)
      throw new AppError(404, "Dit voorstel is niet meer actief.");
    if (this.state().activeSession)
      throw new AppError(409, "Er is al een actieve sessie.");
    const record = this.store.record(selection.record_id);
    if (
      !record ||
      !record.available ||
      record.excluded ||
      !record.isLP ||
      (!record.demo && stale(record.fetchedAt, this.now()))
    )
      throw new AppError(
        409,
        "Deze LP is niet meer beschikbaar of de gegevens zijn verlopen. Kies opnieuw of synchroniseer.",
      );
    this.store.db
      .prepare(
        "INSERT INTO sessions(id,selection_id,record_id,started_at) VALUES (?,?,?,?)",
      )
      .run(randomUUID(), selectionId, selection.record_id, this.iso());
    this.store.set("selection", null);
    this.emit();
  }
  finish(sessionId: string, note?: string) {
    const session = this.store.db
      .prepare("SELECT * FROM sessions WHERE id=?")
      .get(sessionId) as SessionRow | undefined;
    if (!session) throw new AppError(404, "Sessie niet gevonden.");
    if (session.ended_at) return;
    this.store.db
      .prepare("UPDATE sessions SET ended_at=?,note=? WHERE id=?")
      .run(this.iso(), note ?? "", sessionId);
    this.emit();
  }
  patch(id: string, body: { tags?: Mood[]; excluded?: boolean }) {
    const record = this.store.record(id);
    if (!record) throw new AppError(404, "Plaat niet gevonden.");
    this.store.put({ ...record, ...body });
    this.emit();
  }
  async synchronize(refreshDetails = false) {
    if (!this.config.token)
      throw new AppError(
        400,
        "Stel DISCOGS_TOKEN in op de server en herstart.",
      );
    if (this.syncTask) return this.syncTask;
    this.sync.running = true;
    this.sync.error = null;
    this.sync.progress = "Collectie ophalen…";
    this.saveSync();
    this.syncTask = this.runSync(refreshDetails).finally(() => {
      this.sync.running = false;
      this.syncTask = null;
      this.saveSync();
    });
    return this.syncTask;
  }
  private async runSync(refreshDetails: boolean) {
    try {
      let page = 1;
      let pages = 1;
      const seen = new Set<string>();
      do {
        const data = await this.client.get(
          `/users/${encodeURIComponent(this.config.username)}/collection/folders/0/releases?per_page=100&page=${page}`,
        );
        if (
          !data.pagination ||
          !Number.isInteger(data.pagination.pages) ||
          data.pagination.pages < 0 ||
          data.pagination.pages > 10000 ||
          !Array.isArray(data.releases)
        )
          throw new Error("Ongeldig antwoord van Discogs.");
        pages = Math.max(1, data.pagination.pages);
        for (const item of data.releases) {
          if (
            !Number.isInteger(item.instance_id) ||
            !Number.isInteger(item.basic_information?.id)
          )
            throw new Error("Onvolledige collectiegegevens ontvangen.");
          const id = String(item.instance_id);
          const old = this.store.record(id);
          this.store.put(basicRecord(item, old, this.iso()));
          seen.add(id);
        }
        this.sync.progress = `Collectiepagina ${page} van ${pages}`;
        this.saveSync();
        page++;
      } while (page <= pages);
      for (const record of this.store.records())
        if (!seen.has(record.id))
          this.store.put({ ...record, available: false });
      this.sync.lastSuccess = this.iso();
      this.saveSync();
      const detailCache = new Map<number, Record<string, any>>();
      for (const record of this.store.records().filter((r) => r.available)) {
        if (
          !refreshDetails &&
          !stale(this.store.detailsAt(record.id), this.now(), REFRESH_INTERVAL)
        )
          continue;
        this.sync.progress = `Releasegegevens ophalen (${detailCache.size + 1})`;
        this.saveSync();
        let details = detailCache.get(record.releaseId);
        if (!details) {
          details = await this.client.get(`/releases/${record.releaseId}`);
          detailCache.set(record.releaseId, details);
        }
        // Re-read personal fields: user edits during an API request must survive.
        const current = this.store.record(record.id)!;
        this.store.put(enrich(current, details), this.iso());
        this.emit();
      }
      this.sync.progress = "Collectie bijgewerkt";
    } catch (error) {
      this.sync.error =
        error instanceof Error ? error.message : "Synchronisatie mislukt.";
      this.sync.progress = "Synchronisatie onderbroken; probeer opnieuw.";
    }
  }
  async refreshWeather() {
    if (!this.config.weatherKey) return;
    let weather: WeatherState = {
      status: "error",
      stationId: this.config.stationId,
      observedAt: null,
      temperature: null,
      rainRate: null,
      windSpeed: null,
      message: "Weer ophalen mislukt. Selectie werkt zonder weer.",
    };
    try {
      const url = new URL(
        "https://api.weather.com/v2/pws/observations/current",
      );
      url.search = new URLSearchParams({
        stationId: this.config.stationId,
        format: "json",
        units: "m",
        apiKey: this.config.weatherKey,
      }).toString();
      const response = await this.fetcher(url, {
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error();
      const data = (await response.json()) as {
        observations?: Record<string, any>[];
      };
      const o = data.observations?.[0];
      const observed = o?.obsTimeUtc ? Date.parse(o.obsTimeUtc) : NaN;
      if (
        !o ||
        o.stationID !== this.config.stationId ||
        !Number.isFinite(observed) ||
        observed > this.now() + 5 * 60000 ||
        !o.metric ||
        o.qcStatus === 0
      )
        throw new Error();
      const value = (v: unknown) =>
        typeof v === "number" && Number.isFinite(v) ? v : null;
      weather = {
        status: this.now() - observed > 30 * 60000 ? "stale" : "fresh",
        stationId: this.config.stationId,
        observedAt: new Date(observed).toISOString(),
        temperature: value(o.metric.temp),
        rainRate: value(o.metric.precipRate),
        windSpeed: value(o.metric.windSpeed),
        message:
          "Stationsmeting; weer beïnvloedt de keuze pas met eigen sfeerrelaties.",
      };
    } catch {
      /* Never propagate a URL containing the API key. */
    }
    this.store.set("weather", weather);
    this.emit();
  }
  ensureWikiEnabled() {
    if (this.mode === "live" && !this.config.wikiEnabled)
      throw new AppError(
        403,
        "Albumbronnen staan uit. Schakel WIKI_ENABLED=true in op de server om Discogs-album- en artiest-ID’s naar Wikimedia te sturen.",
      );
  }
  async enrichRecords(id?: string) {
    this.ensureWikiEnabled();
    if (id && !this.store.record(id))
      throw new AppError(404, "Plaat niet gevonden.");
    if (this.enrichmentTask) {
      if (id)
        throw new AppError(
          409,
          "Er loopt al een albuminformatie-opdracht. Probeer straks opnieuw.",
        );
      return this.enrichmentTask;
    }
    this.enrichment = {
      ...this.enrichment,
      running: true,
      error: null,
      progress: "Albumbronnen ophalen…",
    };
    this.store.set("enrichment", this.enrichment);
    this.emit();
    this.enrichmentTask = this.runEnrichment(id).finally(() => {
      this.enrichment.running = false;
      this.enrichmentTask = null;
      this.store.set("enrichment", this.enrichment);
      this.emit();
    });
    return this.enrichmentTask;
  }
  private async runEnrichment(id?: string) {
    try {
      const records = this.store
        .records()
        .filter((r) => (id ? r.id === id : r.available));
      let errors = 0;
      for (let index = 0; index < records.length; index++) {
        const record = records[index];
        if (this.mode === "demo" || record.demo) continue;
        const cached = record.albumInfo;
        if (
          !id &&
          cached &&
          Number.isFinite(Date.parse(cached.checkedAt)) &&
          this.now() - Date.parse(cached.checkedAt) <
            (cached.status === "error" ? 15 * 60000 : KNOWLEDGE_TTL)
        )
          continue;
        this.enrichment.progress = `Albumbronnen ${index + 1} van ${records.length}`;
        this.emit();
        const albumInfo = await this.knowledge.lookup(record);
        if (albumInfo.status === "error") errors++;
        const current = this.store.record(record.id);
        if (current) this.store.put({ ...current, albumInfo });
        this.emit();
      }
      this.enrichment.progress = errors
        ? "Een deel van de bronnen is tijdelijk niet bereikbaar."
        : "Albumbronnen bijgewerkt";
      this.enrichment.error = errors
        ? "Wiki-bronnen tijdelijk niet bereikbaar. Kiezen en luisteren blijven werken."
        : null;
      if (!errors) this.enrichment.lastSuccess = this.iso();
    } catch {
      this.enrichment.error =
        "Albuminformatie ophalen mislukt. Kiezen en luisteren blijven werken.";
    }
  }
  async close() {
    await this.syncTask;
    await this.enrichmentTask;
    this.store.close();
  }
}
