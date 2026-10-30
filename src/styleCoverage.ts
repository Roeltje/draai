import type { RecordItem, SelectionPreferences } from "../shared/types";
import { recordExpired } from "./freshness";

export const normalizeStyle = (value: string) =>
  value.trim().replace(/\s+/g, " ").toLocaleLowerCase("nl");
export function styleCoverage(
  records: RecordItem[],
  rules: SelectionPreferences["styleMoods"] = [],
  now = Date.now(),
) {
  const mapped = new Map(
    rules.map((rule) => [
      normalizeStyle(rule.style),
      rule.moods.length ? ("mapped" as const) : ("off" as const),
    ]),
  );
  const unique = new Map(
    records
      .filter(
        (record) =>
          record.available && record.isLP && !recordExpired(record, now),
      )
      .map((record) => [record.id, record]),
  );
  const counts = new Map<
    string,
    { name: string; count: number; status: "mapped" | "off" | "unmapped" }
  >();
  let missingStyles = 0;
  for (const record of unique.values()) {
    const styles = new Map<string, string>();
    for (const style of record.styles) {
      const key = normalizeStyle(style);
      if (key && !styles.has(key))
        styles.set(key, style.trim().replace(/\s+/g, " "));
    }
    if (!styles.size) missingStyles++;
    for (const [key, name] of styles) {
      const existing = counts.get(key);
      if (existing) existing.count++;
      else
        counts.set(key, {
          name,
          count: 1,
          status: mapped.get(key) || "unmapped",
        });
    }
  }
  return {
    totalRecords: unique.size,
    missingStyles,
    styles: [...counts.values()].sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name, "nl"),
    ),
  };
}
