import test from "node:test";
import assert from "node:assert/strict";
import {
  protectState,
  nextExpiry,
  METADATA_MAX_AGE,
} from "../src/freshness.ts";
import { demoRecords } from "../server/demo.ts";
import type { AppState } from "../shared/types.ts";
const now = Date.parse("2026-10-28T10:00:00Z");
function fixture(): AppState {
  const record = {
    ...demoRecords(new Date(now).toISOString())[0],
    demo: false,
    detailsFetchedAt: new Date(now).toISOString(),
  };
  return {
    mode: "live",
    records: [record],
    selection: {
      id: "pick",
      record,
      reasons: ["Example"],
      createdAt: record.fetchedAt,
    },
    activeSession: null,
    history: [
      {
        id: "session",
        record,
        startedAt: record.fetchedAt,
        endedAt: record.fetchedAt,
        note: "Mijn eigen notitie",
      },
    ],
    sync: {
      running: false,
      lastSuccess: record.fetchedAt,
      error: null,
      progress: "",
    },
    weather: {
      status: "unconfigured",
      stationId: "TEST_STATION",
      observedAt: null,
      temperature: null,
      rainRate: null,
      windSpeed: null,
      message: "",
    },
    settings: {
      discogsConfigured: true,
      username: "test",
      weatherConfigured: false,
      displayUrl: "/display",
      collectionStale: false,
    },
  };
}
test("offline client hides expired API data in collection, proposal and history but preserves private notes", () => {
  const input = fixture();
  const result = protectState(input, now + METADATA_MAX_AGE)!;
  assert.equal(result.records[0].title, "Releasegegevens verversen");
  assert.equal(result.selection!.record.coverUrl, "");
  assert.equal(result.history[0].record.credits.length, 0);
  assert.equal(result.history[0].note, "Mijn eigen notitie");
  assert.equal(result.settings.collectionStale, true);
  assert.equal(input.records[0].title, "Nachtlicht");
});
test("details expire on their own clock even after basic collection refresh and while offline", () => {
  const input = fixture();
  const deadline = now + 60_000;
  input.records[0].detailsFetchedAt = new Date(
    deadline - METADATA_MAX_AGE,
  ).toISOString();
  assert.equal(nextExpiry(input, now), deadline);
  const result = protectState(input, deadline)!;
  assert.equal(result.records[0].title, "Nachtlicht");
  assert.equal(result.records[0].tracks.length, 0);
  assert.equal(result.history[0].record.credits.length, 0);
  assert.equal(result.settings.collectionStale, false);
});
test("demo artwork stays available; stale weather cannot display current values", () => {
  const input = fixture();
  input.mode = "demo";
  input.records[0].demo = true;
  input.weather = {
    ...input.weather,
    status: "fresh",
    observedAt: new Date(now - 30 * 60_000).toISOString(),
    temperature: 12,
  };
  const result = protectState(input, now + METADATA_MAX_AGE)!;
  assert.equal(result.records[0].title, "Nachtlicht");
  assert.equal(result.weather.status, "stale");
  assert.equal(result.weather.temperature, null);
});

test("offline calendar drops yesterday's occasion at Amsterdam midnight", () => {
  const input = fixture();
  input.mode = "demo";
  input.records[0].demo = true;
  input.records[0].albumInfo = {
    status: "ready",
    summary: "",
    wikipediaUrl: "",
    wikidataUrl: "",
    language: "",
    checkedAt: new Date(now).toISOString(),
    demo: true,
    dates: [
      {
        kind: "release",
        date: "2020-10-28",
        subject: "Voorbeeldalbum",
        sourceUrl: "",
      },
    ],
  };
  const before = protectState(input, Date.parse("2026-10-28T22:59:59Z"))!;
  assert.equal(before.occasions!.length, 1);
  const after = protectState(before, Date.parse("2026-10-28T23:00:00Z"))!;
  assert.deepEqual(after.occasions, []);
});
