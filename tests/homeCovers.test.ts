import test from "node:test";
import assert from "node:assert/strict";
import { homeCovers } from "../src/homeCovers.ts";
import { METADATA_MAX_AGE } from "../src/freshness.ts";
import { demoRecords } from "../server/demo.ts";

const now = Date.parse("2026-10-29T12:00:00Z");
const records = () => demoRecords(new Date(now).toISOString());
const ids = (time: number, pool = records()) =>
  homeCovers(pool, time).map((record) => record.id);

test("home sleeves stay stable within the Amsterdam day and ignore collection ordering", () => {
  const pool = records();
  const first = ids(Date.parse("2026-10-28T23:00:00Z"), pool);
  assert.deepEqual(ids(Date.parse("2026-10-29T22:59:59Z"), pool), first);
  assert.deepEqual(ids(now, [...pool].reverse()), first);
  assert.equal(first.length, 2);
  assert.notEqual(first[0], first[1]);
});

test("home sleeves advance at Amsterdam midnight, including summertime and year boundaries", () => {
  for (const [before, after] of [
    ["2026-10-29T22:59:59Z", "2026-10-29T23:00:00Z"],
    ["2026-07-10T21:59:59Z", "2026-07-10T22:00:00Z"],
    ["2026-12-31T22:59:59Z", "2026-12-31T23:00:00Z"],
  ]) {
    assert.notDeepEqual(ids(Date.parse(before)), ids(Date.parse(after)));
  }
  const today = ids(now);
  const tomorrow = ids(now + 86400000);
  assert.equal(today[1], tomorrow[0]);
});

test("home sleeves handle empty and tiny pools without repeating a record", () => {
  assert.deepEqual(homeCovers([], now), []);
  const pool = records();
  assert.deepEqual(homeCovers([pool[0]], now), [pool[0]]);
  assert.equal(new Set(ids(now, pool.slice(0, 2))).size, 2);
  assert.equal(homeCovers([pool[0], pool[0]], now).length, 1);
});

test("only available, included LPs with fresh supplied covers are shown", () => {
  const base = records()[0];
  const live = { ...base, demo: false, fetchedAt: new Date(now).toISOString() };
  const pool = [
    live,
    { ...base, id: "unavailable", available: false },
    { ...base, id: "single", isLP: false },
    { ...base, id: "excluded", excluded: true },
    { ...base, id: "missing", coverUrl: " " },
    {
      ...live,
      id: "expired",
      fetchedAt: new Date(now - METADATA_MAX_AGE).toISOString(),
    },
    { ...live, id: "invalid", fetchedAt: "invalid" },
  ];
  assert.deepEqual(homeCovers(pool, now), [live]);
  assert.deepEqual(homeCovers([live], now + METADATA_MAX_AGE), []);
  assert.equal(homeCovers([base], now + METADATA_MAX_AGE).length, 1);
});
