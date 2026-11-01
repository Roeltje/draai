import type { AlbumInfo, MusicDate, RecordItem } from "../shared/types.ts";

export { KNOWLEDGE_TTL, occasionsFor } from "../shared/calendar.ts";
type Data = Record<string, any>;
const gregorian = "http://www.wikidata.org/entity/Q1985727";
const validDay = (date: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date &&
    Number(date.slice(0, 4)) > 0
  );
};
export function exactDates(
  entity: Data,
  property: string,
  kind: MusicDate["kind"],
  subject: string,
): MusicDate[] {
  const dates = (entity.claims?.[property] ?? []).flatMap((claim: Data) => {
    const v = claim.mainsnak?.datavalue?.value;
    if (
      claim.rank === "deprecated" ||
      claim.mainsnak?.snaktype !== "value" ||
      !v ||
      !Number.isInteger(v.precision) ||
      v.precision < 11 ||
      v.calendarmodel !== gregorian ||
      v.before !== 0 ||
      v.after !== 0 ||
      v.timezone !== 0
    )
      return [];
    // Territory qualifiers can distinguish publication dates. Uncertainty and all
    // other date qualifiers are deliberately excluded rather than interpreted.
    if (
      Object.keys(claim.qualifiers ?? {}).some(
        (p) => kind !== "release" || p !== "P291",
      )
    )
      return [];
    const date =
      typeof v.time === "string" && v.time.startsWith("+")
        ? v.time.slice(1, 11)
        : "";
    return validDay(date)
      ? [
          {
            kind,
            date,
            subject,
            sourceUrl: `https://www.wikidata.org/wiki/${entity.id}`,
          },
        ]
      : [];
  }) as MusicDate[];
  const unique = [...new Map(dates.map((d) => [d.date, d])).values()];
  return kind !== "release" && unique.length > 1 ? [] : unique;
}

export type WikiFailure = {
  kind: "rate_limit" | "unavailable" | "timeout" | "rejected" | "invalid";
  service: "wdqs" | "wikidata" | "wikipedia";
  status?: number;
  retryAfterMs?: number;
};
export class WikiError extends Error {
  constructor(public failure: WikiFailure) {
    super(`Wiki-aanvraag mislukt (${failure.kind})`);
  }
}
const serviceOf = (url: string): WikiFailure["service"] => {
  const host = new URL(url).hostname;
  return host === "query.wikidata.org"
    ? "wdqs"
    : host.endsWith("wikipedia.org")
      ? "wikipedia"
      : "wikidata";
};
const soft = (f?: WikiFailure) =>
  f?.kind === "rate_limit" ||
  f?.kind === "unavailable" ||
  f?.kind === "timeout";

const keptClaims = ["P1953", "P1954", "P577", "P569", "P570"];
// Keep only what lookupDetailed reads, so cached entities stay small.
const trimEntity = (e: Data): Data => {
  const pick = (obj: Data | undefined, keys: string[]) =>
    Object.fromEntries(
      keys.filter((k) => obj?.[k] !== undefined).map((k) => [k, obj![k]]),
    );
  const out: Data = {
    id: e.id,
    labels: pick(e.labels, ["nl", "en"]),
    sitelinks: pick(e.sitelinks, ["nlwiki", "enwiki"]),
    claims: pick(e.claims, keptClaims),
  };
  if (e.missing !== undefined) out.missing = e.missing;
  return out;
};

export class KnowledgeClient {
  private lastService: WikiFailure["service"] = "wikidata";
  // Minimum spacing between request starts, per service.
  private lastRequestAt = new Map<WikiFailure["service"], number>();
  private userAgent: string;
  constructor(
    private fetcher: typeof fetch = fetch,
    private wait: (ms: number) => Promise<void> = (ms) =>
      new Promise((r) => setTimeout(r, ms)),
    private now: () => number = Date.now,
    private cache?: {
      get<T>(key: string, fallback: T): T;
      set(key: string, value: unknown): void;
    },
    private log: (line: string) => void = (l) => console.warn(l),
    contact?: string,
  ) {
    const clean = (contact ?? "")
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f-\u009f()]/g, "")
      .trim()
      .slice(0, 200)
      .trim();
    this.userAgent = clean
      ? `Draai/0.1 (${clean}; personal music collection)`
      : "Draai/0.1 (personal music collection; source-linked research)";
  }
  // One bundled request per language; cached titles are skipped.
  private async excerpts(language: string, titles: string[], deadline: number) {
    type Excerpt = {
      at: number;
      summary: string;
      wikipediaUrl: string;
      language: string;
    };
    const out = new Map<string, Excerpt>();
    const todo: string[] = [];
    for (const title of new Set(titles)) {
      const cached = this.cache?.get<Excerpt | null>(
        `wikiExcerpt:${language}:${title}`,
        null,
      );
      if (cached && this.now() - cached.at < 30 * 86400000)
        out.set(title, cached);
      else todo.push(title);
    }
    if (!todo.length) return out;
    const wiki = new URL(`https://${language}.wikipedia.org/w/api.php`);
    wiki.search = new URLSearchParams({
      action: "query",
      prop: "extracts",
      exintro: "1",
      explaintext: "1",
      exchars: "600",
      exlimit: "20",
      redirects: "1",
      titles: todo.join("|"),
      format: "json",
      formatversion: "2",
    }).toString();
    const data = await this.get(wiki.toString(), deadline);
    const pages: Data[] = Array.isArray(data.query?.pages)
      ? data.query.pages
      : [];
    const hop = (list: unknown) =>
      new Map<string, string>(
        (Array.isArray(list) ? list : []).flatMap((x: Data) =>
          typeof x?.from === "string" && typeof x?.to === "string"
            ? [[x.from, x.to] as [string, string]]
            : [],
        ),
      );
    const normalized = hop(data.query?.normalized);
    const redirects = hop(data.query?.redirects);
    for (const title of todo) {
      const final = (t: string) => redirects.get(t) ?? t;
      const target = final(normalized.get(title) ?? title);
      const page =
        pages.find((x) => x?.title === target) ??
        (todo.length === 1 && pages.length === 1 ? pages[0] : undefined);
      const extract = page?.extract;
      const result = {
        at: this.now(),
        summary:
          typeof extract === "string"
            ? extract
                .replace(/<[^>]*>/g, "")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 600)
            : "",
        language,
        wikipediaUrl: `https://${language}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
      };
      this.cache?.set(`wikiExcerpt:${language}:${title}`, result);
      out.set(title, result);
    }
    return out;
  }
  private async get(url: string, deadline: number): Promise<Data> {
    const service = serviceOf(url);
    this.lastService = service;
    const fail = (
      failure: WikiFailure,
      attempt: number,
      started: number,
      note = "",
    ) => {
      const what = failure.status
        ? `HTTP ${failure.status} (${failure.kind})`
        : failure.kind;
      this.log(
        `Wiki: ${service} ${what} poging ${attempt + 1}/2, ${Math.max(0, this.now() - started)} ms${note}`,
      );
      return new WikiError(failure);
    };
    for (let attempt = 0; attempt < 2; attempt++) {
      const gap = (this.lastRequestAt.get(service) ?? -Infinity) + 1000;
      if (gap > this.now()) await this.wait(gap - this.now());
      const started = this.now();
      this.lastRequestAt.set(service, started);
      const remaining = deadline - started;
      if (remaining <= 0)
        throw fail({ kind: "timeout", service }, attempt, started);
      const response = await this.fetcher(url, {
        headers: { "User-Agent": this.userAgent, Accept: "application/json" },
        signal: AbortSignal.timeout(Math.min(6000, remaining)),
      }).catch(() => null);
      if (response?.ok) {
        let data: Data;
        try {
          data = (await response.json()) as Data;
        } catch {
          throw fail({ kind: "invalid", service }, attempt, started);
        }
        if (!data || typeof data !== "object")
          throw fail({ kind: "invalid", service }, attempt, started);
        if (data.error)
          throw fail({ kind: "rejected", service }, attempt, started);
        return data;
      }
      const status = response?.status;
      if (response && status !== 429 && status! < 500)
        throw fail({ kind: "rejected", service, status }, attempt, started);
      const header = response?.headers.get("Retry-After");
      const seconds = Number(header);
      const retry = !header
        ? 1000
        : Number.isFinite(seconds)
          ? seconds * 1000
          : Date.parse(header) - this.now();
      const retryAfterMs =
        status === 429 && header && Number.isFinite(retry)
          ? Math.max(0, retry)
          : undefined;
      const failure: WikiFailure = !response
        ? { kind: "timeout", service }
        : status === 429
          ? { kind: "rate_limit", service, status, retryAfterMs }
          : { kind: "unavailable", service, status };
      const note =
        retryAfterMs !== undefined
          ? `, Retry-After ${Math.round(retryAfterMs / 1000)} s`
          : "";
      const error = fail(failure, attempt, started, note);
      if (attempt === 1) throw error;
      const delay = Math.max(500, Number.isFinite(retry) ? retry : 1000);
      if (delay >= deadline - this.now()) throw error;
      await this.wait(delay);
    }
    throw new WikiError({ kind: "unavailable", service });
  }
  async lookup(record: RecordItem): Promise<AlbumInfo> {
    return (await this.lookupDetailed(record)).info;
  }
  async lookupDetailed(
    record: RecordItem,
  ): Promise<{ info: AlbumInfo; failure?: WikiFailure }> {
    const checkedAt = new Date(this.now()).toISOString();
    const empty = (status: AlbumInfo["status"]): AlbumInfo => ({
      status,
      summary: "",
      wikipediaUrl: "",
      wikidataUrl: "",
      language: "",
      checkedAt,
      dates: [],
    });
    const ids = [
      ...(Number.isSafeInteger(record.masterId) && record.masterId! > 0
        ? [{ property: "P1954", id: record.masterId! }]
        : []),
      ...record.artistIds
        .filter((id) => Number.isSafeInteger(id) && id > 0)
        .slice(0, 12)
        .map((id) => ({ property: "P1953", id })),
    ];
    const done = (info: AlbumInfo, failure?: WikiFailure) => ({
      info,
      failure,
    });
    if (!ids.length) return done(empty("not_found"));
    let excerptFailure: WikiFailure | undefined;
    const deadline = this.now() + 30000;
    try {
      const DAY = 86400000;
      const grouped = new Map<string, Set<string>>();
      const fresh: typeof ids = [];
      for (const x of ids) {
        const hit = this.cache?.get<{ at: number; entities: string[] } | null>(
          `wikiMatch:${x.property}:${x.id}`,
          null,
        );
        if (
          hit &&
          Array.isArray(hit.entities) &&
          this.now() - hit.at < (hit.entities.length ? 30 : 7) * DAY
        ) {
          if (hit.entities.length)
            grouped.set(`${x.property}:${x.id}`, new Set(hit.entities));
        } else fresh.push(x);
      }
      if (fresh.length) {
        const query = `SELECT DISTINCT ?property ?discogsId ?entity WHERE { VALUES (?property ?discogsId) { ${fresh.map((x) => `(wdt:${x.property} "${x.id}")`).join(" ")} } ?entity ?property ?discogsId . } LIMIT 100`;
        const url = new URL("https://query.wikidata.org/sparql");
        url.search = new URLSearchParams({ query, format: "json" }).toString();
        const matches = await this.get(url.toString(), deadline);
        if (!Array.isArray(matches.results?.bindings)) {
          this.log("Wiki: wdqs ongeldig antwoord (invalid)");
          throw new WikiError({ kind: "invalid", service: "wdqs" });
        }
        const found = new Map<string, Set<string>>();
        for (const b of matches.results.bindings) {
          const p = String(b.property?.value ?? "")
            .split("/")
            .pop();
          const id = b.discogsId?.value;
          const entity = String(b.entity?.value ?? "")
            .split("/")
            .pop()!;
          if (
            !/^Q[1-9]\d*$/.test(entity) ||
            !fresh.some((x) => x.property === p && String(x.id) === id)
          )
            continue;
          const key = `${p}:${id}`;
          if (!found.has(key)) found.set(key, new Set());
          found.get(key)!.add(entity);
        }
        for (const x of fresh) {
          const key = `${x.property}:${x.id}`;
          const set = found.get(key);
          this.cache?.set(`wikiMatch:${key}`, {
            at: this.now(),
            entities: set ? [...set] : [],
          });
          if (set) grouped.set(key, set);
        }
      }
      const exact = [...grouped]
        .filter(([, set]) => set.size === 1)
        .map(([key, set]) => ({ key, id: [...set][0] }));
      if (!exact.length)
        return done(
          empty(
            [...grouped.values()].some((s) => s.size > 1)
              ? "ambiguous"
              : "not_found",
          ),
        );
      const qids = [...new Set(exact.map((x) => x.id))];
      const entities: Record<string, Data> = {};
      const missing: string[] = [];
      for (const q of qids) {
        const hit = this.cache?.get<{ at: number; entity: Data } | null>(
          `wikiEntity:${q}`,
          null,
        );
        if (hit?.entity && this.now() - hit.at < 30 * DAY)
          entities[q] = hit.entity;
        else missing.push(q);
      }
      if (missing.length) {
        const entityUrl = new URL("https://www.wikidata.org/w/api.php");
        entityUrl.search = new URLSearchParams({
          action: "wbgetentities",
          ids: missing.join("|"),
          props: "claims|labels|sitelinks",
          languages: "nl|en",
          format: "json",
        }).toString();
        const result = await this.get(entityUrl.toString(), deadline);
        for (const q of missing) {
          const e = result.entities?.[q];
          if (!e || typeof e !== "object") continue;
          const trimmed = trimEntity(e);
          entities[q] = trimmed;
          this.cache?.set(`wikiEntity:${q}`, {
            at: this.now(),
            entity: trimmed,
          });
        }
      }
      const result = { entities };
      const dates: MusicDate[] = [];
      const artists: NonNullable<AlbumInfo["artists"]> = [];
      const artistEntities: Array<{
        artistId: number;
        name: string;
        entity: Data;
      }> = [];
      let album: Data | undefined;
      let first: Data | undefined;
      for (const match of exact) {
        const entity = result.entities?.[match.id];
        if (!entity || entity.missing !== undefined) continue;
        const [property, id] = match.key.split(":");
        // Verify the actual entity still has the same non-deprecated identifier.
        const benignIdentifierQualifiers = new Set(["P1810", "P813"]);
        if (
          !(entity.claims?.[property] ?? []).some(
            (c: Data) =>
              c.rank !== "deprecated" &&
              !Object.keys(c.qualifiers ?? {}).some(
                (p) => !benignIdentifierQualifiers.has(p),
              ) &&
              c.mainsnak?.datavalue?.value === id,
          )
        )
          continue;
        first ??= entity;
        const name =
          entity.labels?.nl?.value ??
          entity.labels?.en?.value ??
          (property === "P1954" ? record.title : "Artiest");
        if (property === "P1954") {
          album = entity;
          dates.push(...exactDates(entity, "P577", "release", name));
        } else {
          artistEntities.push({ artistId: Number(id), name, entity });
          dates.push(
            ...exactDates(entity, "P569", "birth", name),
            ...exactDates(entity, "P570", "death", name),
          );
        }
      }
      if (!first) return done(empty("not_found"));
      const info: AlbumInfo = {
        ...empty("ready"),
        wikidataUrl: `https://www.wikidata.org/wiki/${(album ?? first).id}`,
        dates,
        artists,
      };
      const pickLink = (entity: Data) => {
        const language = entity.sitelinks?.nlwiki
          ? "nl"
          : entity.sitelinks?.enwiki
            ? "en"
            : "";
        const title = entity.sitelinks?.[`${language}wiki`]?.title;
        return language && typeof title === "string"
          ? { language, title }
          : undefined;
      };
      // Exact album-artist identities only; do not infer band membership.
      const shown = artistEntities.slice(0, 4);
      const albumLink = album ? pickLink(album) : undefined;
      const links = [albumLink, ...shown.map((a) => pickLink(a.entity))];
      const byLanguage = new Map<string, string[]>();
      for (const l of links)
        if (l)
          byLanguage.set(l.language, [
            ...(byLanguage.get(l.language) ?? []),
            l.title,
          ]);
      const texts = new Map<
        string,
        { summary: string; wikipediaUrl: string; language: string }
      >();
      // Structured verified dates remain usable when an excerpt request fails.
      for (const [language, titles] of byLanguage) {
        if (excerptFailure) break;
        try {
          for (const [t, x] of await this.excerpts(language, titles, deadline))
            texts.set(`${language}:${t}`, x);
        } catch (e) {
          if (e instanceof WikiError && soft(e.failure))
            excerptFailure = e.failure;
        }
      }
      const textOf = (l?: { language: string; title: string }) =>
        l ? texts.get(`${l.language}:${l.title}`) : undefined;
      const albumText = textOf(albumLink);
      if (albumText) {
        info.summary = albumText.summary;
        info.language = albumText.language;
        info.wikipediaUrl = albumText.wikipediaUrl;
      }
      shown.forEach((artist, i) => {
        const story = {
          artistId: artist.artistId,
          name: artist.name,
          summary: "",
          wikipediaUrl: "",
          wikidataUrl: `https://www.wikidata.org/wiki/${artist.entity.id}`,
          language: "",
          checkedAt,
        };
        const text = textOf(links[i + 1]);
        if (text) {
          story.summary = text.summary;
          story.language = text.language;
          story.wikipediaUrl = text.wikipediaUrl;
        }
        artists.push(story);
      });
      return done(info, excerptFailure);
    } catch (e) {
      const failure =
        e instanceof WikiError
          ? e.failure
          : ({ kind: "invalid", service: this.lastService } as WikiFailure);
      return done(empty("error"), failure);
    }
  }
}
