import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type {
  AppState,
  Mood,
  RecordItem,
  SyncState,
  WeatherState,
  Season,
  SelectionPreferences,
} from "../shared/types.ts";
import { WorkQueue } from "./queue.ts";
import { DEFAULT_PREFERENCES, selectionFactors } from "../shared/selection.ts";
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
  private queue: WorkQueue;
  private closing = false;
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
    // Seed once; only add styles when upgrading saved preferences from older versions.
    const savedPreferences = this.store.get<SelectionPreferences | null>(
      "preferences",
      null,
    );
    if (!savedPreferences)
      this.store.set("preferences", structuredClone(DEFAULT_PREFERENCES));
    else if (savedPreferences.styleMoods === undefined)
      this.store.set("preferences", {
        ...savedPreferences,
        styleMoods: structuredClone(DEFAULT_PREFERENCES.styleMoods),
      });
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
    this.queue = new WorkQueue(deps.wait);
    this.knowledge = new KnowledgeClient(
      this.fetcher,
      deps.wait,
      this.now,
      this.store,
    );
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
      preferences: this.preferences(),
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
    useWeather = false,
    recordId?: string,
    useAnniversaries = true,
    useSeasons = true,
    useGenreMoods = true,
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
    const prefs = this.preferences(),
      weather = this.state().weather;
    const factors = (r: RecordItem) =>
      selectionFactors(r, mood, prefs, weather, this.now(), {
        useWeather,
        useSeasons,
        useGenreMoods,
      });
    if (!recordId) eligible = eligible.filter((r) => !factors(r).blocked);
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
      const personal = factors(record);
      const occasion = occasions.find((o) => o.recordId === record.id);
      const dateWeight = occasion ? 1.8 : 1;
      return {
        record,
        weight: historyWeight * personal.weight * dateWeight,
        personal,
        days,
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
    if (!recordId) reasons.push(...chosen.personal.reasons);
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
    this.requestRecord(chosen.record.id);
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
  patch(
    id: string,
    body: { tags?: Mood[]; excluded?: boolean; seasons?: Season[] | null },
  ) {
    const record = this.store.record(id);
    if (!record) throw new AppError(404, "Plaat niet gevonden.");
    const updated = { ...record, ...body };
    if (updated.seasons === null) delete updated.seasons;
    this.store.put(updated as RecordItem);
    this.emit();
  }
  async synchronize(_refreshDetails = false) {
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
    this.syncTask = this.runSync().finally(() => {
      this.sync.running = false;
      this.syncTask = null;
      this.saveSync();
    });
    return this.syncTask;
  }
  private async runSync() {
    try {
      let page = 1;
      let pages = 1;
      const seen = new Set<string>();
      do {
        if (this.closing) return;
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
      this.startBackground();
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
  preferences(): SelectionPreferences {
    return this.store.get("preferences", structuredClone(DEFAULT_PREFERENCES));
  }
  setPreferences(preferences: SelectionPreferences) {
    this.store.set("preferences", {
      ...preferences,
      styleMoods: preferences.styleMoods ?? this.preferences().styleMoods,
    });
    this.emit();
  }
  private wikiKey(record: RecordItem) {
    return `${record.masterId ?? 0}:${[...record.artistIds].sort((a, b) => a - b).join(",")}`;
  }
  requestRecord(id: string) {
    const record = this.store.record(id);
    if (!record) throw new AppError(404, "Plaat niet gevonden.");
    this.queueDetails(record, 100);
    if (this.config.wikiEnabled) void this.queueWiki(record, 90);
  }
  startBackground() {
    if (this.closing || this.mode === "demo") return;
    for (const record of this.store.records().filter((r) => r.available)) {
      if (!this.store.detailsAt(record.id)) this.queueDetails(record, 0);
      if (this.config.wikiEnabled) void this.queueWiki(record, 0);
    }
    this.refreshActive();
  }
  refreshActive() {
    const state = this.state();
    const record = state.activeSession?.record ?? state.selection?.record;
    if (record) this.requestRecord(record.id);
  }
  private queueDetails(record: RecordItem, priority: number): Promise<void> {
    if (record.demo || this.closing || !this.config.token)
      return Promise.resolve();
    const at = this.store.detailsAt(record.id);
    if (
      at &&
      !stale(at, this.now(), priority > 0 ? REFRESH_INTERVAL : Infinity)
    )
      return Promise.resolve();
    const key = `details:${record.releaseId}`;
    if (this.store.get<number>("discogsDetailsRetryAfter", 0) > this.now())
      return Promise.resolve();
    if (this.store.get<number>(`backoff:${key}`, 0) > this.now())
      return Promise.resolve();
    return this.queue.enqueue(key, priority, async () => {
      try {
        const detail = await this.client.get(`/releases/${record.releaseId}`);
        for (const current of this.store
          .records()
          .filter((r) => r.releaseId === record.releaseId))
          this.store.put(enrich(current, detail), this.iso());
        this.store.set(`backoff:${key}`, 0);
      } catch {
        this.store.set(`backoff:${key}`, this.now() + 15 * 60000);
        this.store.set("discogsDetailsRetryAfter", this.now() + 15 * 60000);
        this.queue.cancel("details:");
        this.sync.error =
          "Releasegegevens tijdelijk niet bereikbaar; later opnieuw.";
      }
      this.emit();
    });
  }
  private queueWiki(record: RecordItem, priority: number): Promise<void> {
    if (
      record.demo ||
      this.mode === "demo" ||
      !this.config.wikiEnabled ||
      this.closing
    )
      return Promise.resolve();
    if (this.store.get<number>("wikiRetryAfter", 0) > this.now())
      return Promise.resolve();
    const cached = record.albumInfo;
    const ttl = cached?.status === "error" ? 15 * 60000 : KNOWLEDGE_TTL;
    if (
      cached &&
      Number.isFinite(Date.parse(cached.checkedAt)) &&
      this.now() - Date.parse(cached.checkedAt) < ttl &&
      cached.artists !== undefined
    )
      return Promise.resolve();
    if (
      cached &&
      cached.status !== "ready" &&
      this.now() - Date.parse(cached.checkedAt) < ttl
    )
      return Promise.resolve();
    return this.queue.enqueue(
      `wiki:${this.wikiKey(record)}`,
      priority,
      async () => {
        const current = this.store.record(record.id);
        if (!current || !current.available) return;
        const currentKey = this.wikiKey(current),
          fresh = current.albumInfo;
        if (
          fresh &&
          this.now() - Date.parse(fresh.checkedAt) <
            (fresh.status === "error" ? 15 * 60000 : KNOWLEDGE_TTL) &&
          (fresh.status !== "ready" || fresh.artists !== undefined)
        )
          return;
        this.enrichment.running = true;
        this.enrichment.progress = "Album- en artiestbronnen ophalen…";
        this.emit();
        const albumInfo = await this.knowledge.lookup(current);
        if (albumInfo.status === "error") {
          this.store.set("wikiRetryAfter", this.now() + 15 * 60000);
          this.queue.cancel("wiki:");
        }
        for (const target of this.store
          .records()
          .filter((r) => this.wikiKey(r) === currentKey))
          this.store.put({ ...target, albumInfo });
        this.enrichment.running = false;
        this.enrichment.error =
          albumInfo.status === "error"
            ? "Wiki-bronnen tijdelijk niet bereikbaar."
            : null;
        this.enrichment.progress =
          albumInfo.status === "error"
            ? "Bronnen later opnieuw proberen"
            : "Album- en artiestbronnen bijgewerkt";
        if (albumInfo.status !== "error")
          this.enrichment.lastSuccess = this.iso();
        this.store.set("enrichment", this.enrichment);
        this.emit();
      },
    );
  }
  async enrichRecords(id?: string) {
    this.ensureWikiEnabled();
    if (id) {
      const record = this.store.record(id);
      if (!record) throw new AppError(404, "Plaat niet gevonden.");
      await this.queueWiki(record, 90);
    } else
      await Promise.all(
        this.store
          .records()
          .filter((r) => r.available)
          .map((r) => this.queueWiki(r, 0)),
      );
  }
  waitForBackground() {
    return this.queue.idle();
  }
  async close() {
    this.closing = true;
    await this.queue.close();
    await this.syncTask;
    this.store.close();
  }
}
