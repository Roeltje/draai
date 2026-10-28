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

export class KnowledgeClient {
  constructor(
    private fetcher: typeof fetch = fetch,
    private wait: (ms: number) => Promise<void> = (ms) =>
      new Promise((r) => setTimeout(r, ms)),
    private now: () => number = Date.now,
  ) {}
  private async get(url: string, deadline: number): Promise<Data> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const remaining = deadline - this.now();
      if (remaining <= 0) throw new Error("Wiki-timeout");
      const response = await this.fetcher(url, {
        headers: {
          "User-Agent":
            "Draai/0.1 (personal music collection; source-linked research)",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(Math.min(6000, remaining)),
      }).catch(() => null);
      if (response?.ok) {
        const data = (await response.json()) as Data;
        if (data.error) throw new Error("Wiki-aanvraag mislukt");
        await this.wait(250);
        return data;
      }
      if (response && response.status !== 429 && response.status < 500)
        throw new Error("Wiki-aanvraag mislukt");
      if (attempt === 1) throw new Error("Wiki tijdelijk niet bereikbaar");
      const header = response?.headers.get("Retry-After");
      const seconds = Number(header);
      const retry = !header
        ? 1000
        : Number.isFinite(seconds)
          ? seconds * 1000
          : Date.parse(header) - this.now();
      const delay = Math.max(500, Number.isFinite(retry) ? retry : 1000);
      if (delay >= deadline - this.now())
        throw new Error("Wiki vraagt om later opnieuw te proberen");
      await this.wait(delay);
    }
    throw new Error("Wiki tijdelijk niet bereikbaar");
  }
  async lookup(record: RecordItem): Promise<AlbumInfo> {
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
    if (!ids.length) return empty("not_found");
    const deadline = this.now() + 18000;
    try {
      const query = `SELECT DISTINCT ?property ?discogsId ?entity WHERE { VALUES (?property ?discogsId) { ${ids.map((x) => `(wdt:${x.property} "${x.id}")`).join(" ")} } ?entity ?property ?discogsId . } LIMIT 100`;
      const url = new URL("https://query.wikidata.org/sparql");
      url.search = new URLSearchParams({ query, format: "json" }).toString();
      const matches = await this.get(url.toString(), deadline);
      if (!Array.isArray(matches.results?.bindings))
        throw new Error("Ongeldig Wiki-antwoord");
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
        return empty(
          [...grouped.values()].some((s) => s.size > 1)
            ? "ambiguous"
            : "not_found",
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
          dates.push(
            ...exactDates(entity, "P569", "birth", name),
            ...exactDates(entity, "P570", "death", name),
          );
        }
      }
      if (!first) return empty("not_found");
      const info: AlbumInfo = {
        ...empty("ready"),
        wikidataUrl: `https://www.wikidata.org/wiki/${(album ?? first).id}`,
        dates,
      };
      if (album) {
        const language = album.sitelinks?.nlwiki
          ? "nl"
          : album.sitelinks?.enwiki
            ? "en"
            : "";
        const title = album.sitelinks?.[`${language}wiki`]?.title;
        if (language && typeof title === "string") {
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
          try {
            const data = await this.get(wiki.toString(), deadline);
            const extract = data.query?.pages?.[0]?.extract;
            if (typeof extract === "string") {
              info.summary = extract
                .replace(/<[^>]*>/g, "")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 600);
              info.language = language;
              info.wikipediaUrl = `https://${language}.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
            }
          } catch {
            /* Structured verified dates remain usable when the excerpt fails. */
          }
        }
      }
      return info;
    } catch {
      return empty("error");
    }
  }
}
