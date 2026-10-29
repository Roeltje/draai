import test from "node:test";
import assert from "node:assert/strict";
import type { ListeningSession, RecordItem } from "../shared/types.ts";
import {
  listeningStats,
  formatRegisteredDuration,
} from "../src/listeningStats.ts";
const record = (id: string, available = true, isLP = true) =>
  ({ id, available, isLP }) as RecordItem;
const session = (
  id: string,
  record: RecordItem,
  start: string,
  end: string | null,
) =>
  ({
    id,
    record,
    startedAt: start,
    endedAt: end,
    note: "",
  }) as ListeningSession;
test("counts completed sessions and unique owned copies without counting an active session", () => {
  const a = record("copy-a"),
    b = record("copy-b");
  const history = [
    session("1", a, "2026-01-01T10:00:00Z", "2026-01-01T10:30:00Z"),
    session("2", a, "2026-01-02T10:00:00Z", "2026-01-02T10:15:00Z"),
    session("3", b, "2026-01-03T10:00:00Z", null),
  ];
  const stats = listeningStats(history, [a, b]);
  assert.equal(stats.sessions, 2);
  assert.equal(stats.uniqueRecords, 1);
  assert.equal(stats.durationMs, 45 * 60000);
  assert.equal(stats.discoveryPercent, 50);
});
test("discovery intersects current available LPs; removed records remain in historical counts", () => {
  const owned = record("owned"),
    removed = record("removed", false),
    single = record("single", true, false),
    unheard = record("unheard");
  const history = [owned, removed, single].map((r, i) =>
    session(String(i), r, "2026-01-01T10:00:00Z", "2026-01-01T11:00:00Z"),
  );
  const stats = listeningStats(history, [owned, removed, single, unheard]);
  assert.equal(stats.uniqueRecords, 3);
  assert.equal(stats.collectionSize, 2);
  assert.equal(stats.discovered, 1);
  assert.equal(stats.discoveryPercent, 50);
});
test("empty collection has no invented percentage and invalid or negative intervals add no time", () => {
  const r = record("a");
  const stats = listeningStats(
    [
      session("1", r, "invalid", "invalid"),
      session("2", r, "2026-01-02T10:00:00Z", "2026-01-01T10:00:00Z"),
    ],
    [],
  );
  assert.equal(stats.sessions, 2);
  assert.equal(stats.durationMs, 0);
  assert.equal(stats.discoveryPercent, null);
  const empty = listeningStats([], []);
  assert.equal(empty.sessions, 0);
  assert.equal(empty.uniqueRecords, 0);
  assert.equal(empty.durationMs, 0);
});

test("registered duration is consistent at zero, subminute, rounding and hour boundaries", () => {
  for (const [milliseconds, label] of [
    [0, "0 min"],
    [1, "<1 min"],
    [29999, "<1 min"],
    [30000, "<1 min"],
    [59999, "<1 min"],
    [60000, "1 min"],
    [89999, "1 min"],
    [90000, "2 min"],
    [3599999, "1 u 0 min"],
    [5400000, "1 u 30 min"],
    [-1, "0 min"],
    [NaN, "0 min"],
    [Infinity, "0 min"],
  ] as const)
    assert.equal(formatRegisteredDuration(milliseconds), label);
});
