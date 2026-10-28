import type { RecordItem } from "../shared/types.ts";
export const MAX_AGE = 6 * 60 * 60 * 1000;
export const REFRESH_INTERVAL = 5 * 60 * 60 * 1000;
export const stale = (at: string | null, now: number, maxAge = MAX_AGE) =>
  !at || !Number.isFinite(Date.parse(at)) || now - Date.parse(at) >= maxAge;
type AnyData = Record<string, any>;
export function isLP(formats: AnyData[] = []): boolean {
  return (
    formats.some(
      (f) =>
        f.name === "Vinyl" &&
        Array.isArray(f.descriptions) &&
        f.descriptions.includes("LP"),
    ) && !formats.some((f) => f.name === "Box Set")
  );
}
export function basicRecord(
  item: AnyData,
  old: RecordItem | undefined,
  now: string,
): RecordItem {
  const b = item.basic_information ?? {};
  const artists = b.artists ?? [];
  const labels = b.labels ?? [];
  return {
    id: String(item.instance_id),
    releaseId: b.id,
    masterId:
      Number.isSafeInteger(b.master_id) && b.master_id > 0
        ? b.master_id
        : (old?.masterId ?? null),
    albumInfo: old?.albumInfo,
    title: b.title ?? "Onbekende titel",
    artist:
      artists.map((a: AnyData) => a.name).join(", ") || "Onbekende artiest",
    artistIds: artists.map((a: AnyData) => a.id),
    year: b.year || null,
    country: old?.country ?? "",
    label: labels.map((l: AnyData) => l.name).join(", "),
    catalogNumber: labels
      .map((l: AnyData) => l.catno)
      .filter(Boolean)
      .join(", "),
    formats: (b.formats ?? []).flatMap((f: AnyData) => [
      f.name,
      ...(f.descriptions ?? []),
    ]),
    genres: b.genres ?? [],
    styles: b.styles ?? [],
    coverUrl: b.cover_image ?? b.thumb ?? "",
    sourceUrl: `https://www.discogs.com/release/${b.id}`,
    tracks: old?.tracks ?? [],
    credits: old?.credits ?? [],
    notes: old?.notes ?? "",
    tags: old?.tags ?? [],
    excluded: old?.excluded ?? false,
    available: true,
    isLP: isLP(b.formats),
    addedAt: item.date_added ?? now,
    fetchedAt: now,
    demo: false,
  };
}
export function enrich(record: RecordItem, detail: AnyData): RecordItem {
  return {
    ...record,
    masterId:
      Number.isSafeInteger(detail.master_id) && detail.master_id > 0
        ? detail.master_id
        : record.masterId,
    country: detail.country ?? "",
    tracks: (detail.tracklist ?? [])
      .filter((t: AnyData) => t.type_ !== "heading")
      .map((t: AnyData) => ({
        position: t.position ?? "",
        title: t.title ?? "",
        duration: t.duration || undefined,
      })),
    credits: (detail.extraartists ?? [])
      .filter((a: AnyData) => typeof a.id === "number")
      .map((a: AnyData) => ({
        artistId: a.id,
        name: a.name,
        role: a.role,
        tracks: a.tracks || undefined,
      })),
    notes: detail.notes ?? "",
  };
}
export class DiscogsClient {
  constructor(
    private token: string,
    private fetcher: typeof fetch = fetch,
    private wait: (ms: number) => Promise<void> = (ms) =>
      new Promise((r) => setTimeout(r, ms)),
  ) {}
  async get(path: string): Promise<AnyData> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await this.fetcher(`https://api.discogs.com${path}`, {
        headers: {
          Authorization: `Discogs token=${this.token}`,
          "User-Agent": "Draai/0.1 personal-record-picker",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(15000),
      }).catch(() => null);
      if (response?.ok) {
        const remaining = Number(
          response.headers.get("X-Discogs-Ratelimit-Remaining") ?? 60,
        );
        // Space even successful requests below the authenticated 60/minute limit.
        // A shared token can exhaust its budget elsewhere; allow its window to reset.
        await this.wait(remaining < 2 ? 60000 : 1100);
        return (await response.json()) as AnyData;
      }
      if (response && response.status !== 429 && response.status < 500)
        throw new Error(
          `Discogs-aanvraag mislukt (${response.status}). Controleer configuratie en toegang.`,
        );
      if (attempt === 2)
        throw new Error(
          "Discogs is tijdelijk niet bereikbaar. Probeer later opnieuw.",
        );
      const retry = response?.headers.get("Retry-After");
      const seconds = retry ? Number(retry) : NaN;
      const delay = Number.isFinite(seconds)
        ? seconds * 1000
        : retry
          ? Date.parse(retry) - Date.now()
          : 1000 * 2 ** attempt;
      await this.wait(Math.max(1100, Math.min(delay || 1100, 60000)));
    }
    throw new Error("Discogs niet bereikbaar.");
  }
}
