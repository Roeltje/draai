import type { Occasion, RecordItem } from "./types.ts";
export const KNOWLEDGE_TTL = 30 * 86400000;
const validDay = (date: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date &&
    Number(date.slice(0, 4)) > 0
  );
};
export function occasionsFor(records: RecordItem[], now: number): Occasion[] {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  const year = Number(part("year"));
  const monthDay = `${part("month")}-${part("day")}`;
  return records.flatMap((record) => {
    const info = record.albumInfo;
    if (
      !info ||
      info.status !== "ready" ||
      !record.available ||
      !record.isLP ||
      (!record.demo &&
        (!Number.isFinite(Date.parse(info.checkedAt)) ||
          now - Date.parse(info.checkedAt) >= KNOWLEDGE_TTL))
    )
      return [];
    const seen = new Set<string>();
    return info.dates.flatMap((date) => {
      const years = year - Number(date.date.slice(0, 4));
      const key = `${date.kind}:${date.subject}:${date.date}`;
      if (
        !validDay(date.date) ||
        date.date.slice(5) !== monthDay ||
        years < 1 ||
        seen.has(key)
      )
        return [];
      seen.add(key);
      const description =
        date.kind === "release"
          ? `${years} jaar sinds de ${info.demo ? "fictieve voorbeeldreleasedatum" : "releasedatum volgens Wikidata"} van ${date.subject}.`
          : date.kind === "birth"
            ? `Vandaag de geboortedag van ${date.subject}, ${years} jaar geleden geboren.`
            : `Vandaag herdenken we ${date.subject}, ${years} jaar na het overlijden.`;
      return [
        {
          recordId: record.id,
          title:
            date.kind === "release"
              ? "Album op deze dag"
              : date.kind === "birth"
                ? "Geboortedag"
                : "Ter herinnering",
          description,
          sourceUrl: date.sourceUrl,
          kind: date.kind,
          years,
          demo: !!info.demo,
        },
      ];
    });
  });
}
