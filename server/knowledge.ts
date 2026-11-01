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

export class KnowledgeClient {
  private lastService: WikiFailure["service"] = "wikidata";
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
  private async excerpt(language: string, title: string, deadline: number) {
    const key = `wikiExcerpt:${language}:${title}`;
    const cached = this.cache?.get<{
      at: number;
      summary: string;
      wikipediaUrl: string;
      language: string;
    } | null>(key, null);
    if (cached && this.now() - cached.at < 30 * 86400000) return cached;
    const wiki = new URL(`https://${language}.wikipedia.org/w/api.php`);
    wiki.search = new URLSearchParams({
      action: "query",
      prop: "extracts",
      exintro: "1",
      explaintext: "1",
      exchars: "600",
      redirects: "1",
      titles: title,
      format: "json",
      formatversion: "2",
    }).toString();
    const data = await this.get(wiki.toString(), deadline);
    const extract = data.query?.pages?.[0]?.extract;
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
    this.cache?.set(key, result);
    return result;
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
      const started = this.now();
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
        await this.wait(250);
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
    // After a service-level excerpt failure the remaining excerpts are skipped.
    const tryExcerpt = async (language: string, title: string) => {
      if (excerptFailure) return null;
      try {
        return await this.excerpt(language, title, deadline);
      } catch (e) {
        if (e instanceof WikiError && soft(e.failure))
          excerptFailure = e.failure;
        return null;
      }
    };
    const deadline = this.now() + 18000;
    try {
      const query = `SELECT DISTINCT ?property ?discogsId ?entity WHERE { VALUES (?property ?discogsId) { ${ids.map((x) => `(wdt:${x.property} "${x.id}")`).join(" ")} } ?entity ?property ?discogsId . } LIMIT 100`;
      const url = new URL("https://query.wikidata.org/sparql");
      url.search = new URLSearchParams({ query, format: "json" }).toString();
      const matches = await this.get(url.toString(), deadline);
      if (!Array.isArray(matches.results?.bindings)) {
        this.log("Wiki: wdqs ongeldig antwoord (invalid)");
        throw new WikiError({ kind: "invalid", service: "wdqs" });
      }
      const grouped = new Map<string, Set<string>>();
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
          !ids.some((x) => x.property === p && String(x.id) === id)
        )
          continue;
        const key = `${p}:${id}`;
        if (!grouped.has(key)) grouped.set(key, new Set());
        grouped.get(key)!.add(entity);
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
      const entityUrl = new URL("https://www.wikidata.org/w/api.php");
      entityUrl.search = new URLSearchParams({
        action: "wbgetentities",
        ids: qids.join("|"),
        props: "claims|labels|sitelinks",
        languages: "nl|en",
        format: "json",
      }).toString();
      const result = await this.get(entityUrl.toString(), deadline);
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
      if (album) {
        const language = album.sitelinks?.nlwiki
          ? "nl"
          : album.sitelinks?.enwiki
            ? "en"
            : "";
        const title = album.sitelinks?.[`${language}wiki`]?.title;
        if (language && typeof title === "string") {
          // Structured verified dates remain usable when the excerpt fails.
          const excerpt = await tryExcerpt(language, title);
          if (excerpt) {
            info.summary = excerpt.summary;
            info.language = excerpt.language;
            info.wikipediaUrl = excerpt.wikipediaUrl;
          }
        }
      }
      // Exact album-artist identities only; do not infer band membership.
      for (const artist of artistEntities.slice(0, 4)) {
        const story = {
          artistId: artist.artistId,
          name: artist.name,
          summary: "",
          wikipediaUrl: "",
          wikidataUrl: `https://www.wikidata.org/wiki/${artist.entity.id}`,
          language: "",
          checkedAt,
        };
        const language = artist.entity.sitelinks?.nlwiki
          ? "nl"
          : artist.entity.sitelinks?.enwiki
            ? "en"
            : "";
        const title = artist.entity.sitelinks?.[`${language}wiki`]?.title;
        if (language && typeof title === "string") {
          // One artist outage never removes verified album facts.
          const excerpt = await tryExcerpt(language, title);
          if (excerpt) {
            story.summary = excerpt.summary;
            story.language = excerpt.language;
            story.wikipediaUrl = excerpt.wikipediaUrl;
          }
        }
        artists.push(story);
      }
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
