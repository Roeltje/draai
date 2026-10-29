import type { RecordItem } from "../shared/types";
import { recordExpired } from "./freshness";

/** Stable for one Amsterdam calendar day; advances one position each day. */
export function homeCovers(
  records: RecordItem[],
  now = Date.now(),
): RecordItem[] {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) =>
    Number(parts.find((value) => value.type === type)!.value);
  const day = Math.floor(
    Date.UTC(part("year"), part("month") - 1, part("day")) / 86400000,
  );
  const unique = new Map<string, RecordItem>();
  for (const record of records) {
    if (
      record.available &&
      record.isLP &&
      !record.excluded &&
      record.coverUrl.trim() &&
      !recordExpired(record, now)
    )
      unique.set(record.id, record);
  }
  const pool = [...unique.values()].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
  if (!pool.length) return [];
  const start = ((day % pool.length) + pool.length) % pool.length;
  return Array.from(
    { length: Math.min(2, pool.length) },
    (_, index) => pool[(start + index) % pool.length],
  );
}
