import test from "node:test";
import assert from "node:assert/strict";
import type { ListeningSession, RecordItem } from "../shared/types.ts";
import {
  displayCredits,
  groupTracks,
  playStats,
  recordMeta,
} from "../src/displayInfo.ts";

const t = (position: string, title = position, type?: "index") =>
  ({ position, title, type }) as never;
const rec = (id: string, releaseId: number) =>
  ({ id, releaseId }) as RecordItem;
const sess = (
  id: string,
  record: RecordItem,
  startedAt: string,
  endedAt: string | null = startedAt,
) => ({ id, record, startedAt, endedAt, note: "" }) as ListeningSession;

test("groupTracks groups by side and skips index headings", () => {
  const { groups, hidden } = groupTracks(
    [t("A1"), t("", "Kop", "index"), t("A2"), t("B1"), t("B2")],
    10,
  );
  assert.deepEqual(
    groups.map((g) => [g.side, g.tracks.length]),
    [
      ["A", 2],
      ["B", 2],
    ],
  );
  assert.equal(hidden, 0);
});

test("groupTracks caps tracks and counts the rest", () => {
  const { groups, hidden } = groupTracks(
    [t("A1"), t("A2"), t("B1"), t("B2"), t("B3")],
    3,
  );
  assert.equal(groups.flatMap((g) => g.tracks).length, 3);
  assert.equal(hidden, 2);
});

test("groupTracks puts positions without letter in one group", () => {
  const { groups } = groupTracks([t("1"), t("2"), t("3")], 10);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].side, "");
});

test("displayCredits dedupes name+role and limits", () => {
  const c = (name: string, role: string) => ({ artistId: 1, name, role });
  const r = displayCredits(
    [
      c("A", "Bass"),
      c("a", "bass"),
      c("A", "Drums"),
      c("B", "Bass"),
      c(" ", "x"),
    ],
    2,
  );
  assert.equal(r.credits.length, 2);
  assert.equal(r.hidden, 1);
});

test("recordMeta skips empty parts", () => {
  assert.equal(
    recordMeta({
      year: 0,
      label: "Lab",
      catalogNumber: "",
      formats: ["Vinyl", "LP"],
    } as RecordItem),
    "Lab · Vinyl, LP",
  );
});

test("playStats counts earlier sessions of the same release only", () => {
  const a = rec("a", 5);
  const history = [
    sess("1", a, "2026-01-01T10:00:00Z"),
    sess("2", a, "2026-03-01T10:00:00Z"),
    sess("3", rec("b", 6), "2026-04-01T10:00:00Z"),
    sess("4", a, "2026-05-01T10:00:00Z"),
    sess("5", a, "2026-06-01T10:00:00Z", null),
  ];
  const r = playStats(history, a, "4");
  assert.equal(r.count, 2);
  assert.equal(r.lastAt, "2026-03-01T10:00:00Z");
  assert.deepEqual(playStats([], a), { count: 0, lastAt: null });
});

test("playStats falls back to record id when releaseId is 0", () => {
  const d1 = rec("demo-1", 0);
  const r = playStats(
    [
      sess("1", d1, "2026-01-01T10:00:00Z"),
      sess("2", rec("demo-2", 0), "2026-02-01T10:00:00Z"),
    ],
    d1,
  );
  assert.equal(r.count, 1);
});
