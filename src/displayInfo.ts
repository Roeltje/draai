import type {
  Credit,
  ListeningSession,
  RecordItem,
  Track,
} from "../shared/types";

export interface SideGroup {
  side: string;
  tracks: Track[];
}

export const sideOf = (position: string) =>
  /^\s*([A-Za-z])\d*/.exec(position)?.[1].toUpperCase() ?? "";

export function groupTracks(tracks: Track[], limit: number) {
  const real = tracks.filter((t) => t.type !== "index" && t.title.trim());
  const groups: SideGroup[] = [];
  for (const track of real.slice(0, Math.max(0, limit))) {
    const side = sideOf(track.position);
    const last = groups[groups.length - 1];
    if (last && last.side === side) last.tracks.push(track);
    else groups.push({ side, tracks: [track] });
  }
  return { groups, hidden: Math.max(0, real.length - Math.max(0, limit)) };
}

export function displayCredits(credits: Credit[], limit = 8) {
  const seen = new Set<string>();
  const unique: Credit[] = [];
  for (const credit of credits) {
    const name = credit.name.trim(),
      role = credit.role.trim();
    if (!name) continue;
    const key = `${name.toLowerCase()}|${role.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({ ...credit, name, role });
  }
  return {
    credits: unique.slice(0, limit),
    hidden: Math.max(0, unique.length - limit),
  };
}

export function recordMeta(record: RecordItem) {
  return [
    record.year ? String(record.year) : "",
    record.label,
    record.catalogNumber,
    record.formats.join(", "),
  ]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" · ");
}

export function playStats(
  history: ListeningSession[],
  record: RecordItem,
  activeId?: string,
) {
  const same = history.filter(
    (s) =>
      s.id !== activeId &&
      s.endedAt !== null &&
      (record.releaseId
        ? s.record.releaseId === record.releaseId
        : s.record.id === record.id),
  );
  let latest: string | null = null;
  for (const s of same)
    if (
      Number.isFinite(Date.parse(s.startedAt)) &&
      (!latest || Date.parse(s.startedAt) > Date.parse(latest))
    )
      latest = s.startedAt;
  return { count: same.length, lastAt: latest };
}

export const formatDisplayDate = (iso: string) =>
  new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Amsterdam",
  }).format(new Date(iso));

export const formatDisplayTime = (iso: string) =>
  new Intl.DateTimeFormat("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  }).format(new Date(iso));
