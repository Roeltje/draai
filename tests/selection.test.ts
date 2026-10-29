import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  recordSeasons,
  seasonToday,
  selectionFactors,
  DEFAULT_PREFERENCES,
} from "../shared/selection.ts";
import { demoRecords } from "../server/demo.ts";
import { Service } from "../server/service.ts";
import { buildApp } from "../server/app.ts";
import type {
  SelectionPreferences,
  WeatherState,
  RecordItem,
} from "../shared/types.ts";
const now = Date.parse("2026-07-01T12:00:00Z");
const record = () => demoRecords(new Date(now).toISOString())[0];
const config = () => ({
  dataDir: mkdtempSync(join(tmpdir(), "draai-selection-")),
  username: "fixture",
  stationId: "FIXTURE",
});
const weather: WeatherState = {
  status: "fresh",
  stationId: "FIXTURE",
  observedAt: new Date(now).toISOString(),
  temperature: 8,
  rainRate: 1,
  windSpeed: null,
  message: "",
};
const prefs: SelectionPreferences = {
  genreMoods: [{ genre: "Rock", moods: ["nostalgie"] }],
  weatherMoods: { rain: ["nostalgie"], cold: ["nostalgie"], warm: ["warm"] },
};
const options = { useWeather: true, useSeasons: true, useGenreMoods: true };

test("Christmas window crosses the Amsterdam year boundary and inference has explicit overrides", () => {
  for (const day of ["2026-11-15", "2026-12-25", "2027-01-06"])
    assert.equal(seasonToday(Date.parse(`${day}T12:00:00Z`)).christmas, true);
  for (const day of ["2026-11-14", "2027-01-07", "2026-07-01"])
    assert.equal(seasonToday(Date.parse(`${day}T12:00:00Z`)).christmas, false);
  assert.equal(seasonToday(Date.parse("2026-11-14T23:30:00Z")).christmas, true);
  const r: RecordItem = { ...record(), title: "A Christmas Album", tags: [] };
  assert.deepEqual(recordSeasons(r), { seasons: ["kerst"], inferred: true });
  assert.equal(
    selectionFactors(r, "alles", prefs, weather, now, options).blocked,
    true,
  );
  r.seasons = [];
  assert.equal(
    selectionFactors(r, "alles", prefs, weather, now, options).blocked,
    false,
  );
  delete r.seasons;
  r.title = "Holiday Memories";
  assert.equal(recordSeasons(r).inferred, false);
});

test("personal season labels lower out-of-season weight and can be switched off", () => {
  const r = { ...record(), tags: [], seasons: ["winter"] as const };
  const winter = { ...r, seasons: ["winter" as const] };
  assert.equal(
    selectionFactors(winter, "alles", prefs, weather, now, options).weight,
    0.65,
  );
  assert.equal(
    selectionFactors(winter, "alles", prefs, weather, now, {
      ...options,
      useSeasons: false,
    }).weight,
    1,
  );
});

test("manual moods override genre moods and only fresh weather contributes a bounded personal weight", () => {
  const r = { ...record(), tags: [], genres: ["rock"] };
  const fresh = selectionFactors(r, "nostalgie", prefs, weather, now, options);
  assert.equal(fresh.weight, 1.4 * 1.25);
  assert.match(fresh.reasons.join(" "), /genre-stemmingskoppeling/);
  // Rain + cold together still contribute only one small weather weight.
  assert.equal(
    selectionFactors(
      r,
      "nostalgie",
      prefs,
      { ...weather, temperature: 25 },
      now,
      options,
    ).weight,
    fresh.weight,
  );
  assert.equal(
    selectionFactors(
      r,
      "nostalgie",
      prefs,
      { ...weather, status: "stale" },
      now,
      options,
    ).weight,
    1.4,
  );
  assert.equal(
    selectionFactors(
      r,
      "nostalgie",
      prefs,
      { ...weather, observedAt: new Date(now - 31 * 60000).toISOString() },
      now,
      options,
    ).weight,
    1.4,
  );
  assert.equal(
    selectionFactors(r, "nostalgie", prefs, weather, now, {
      ...options,
      useWeather: false,
    }).weight,
    1.4,
  );
  assert.equal(
    selectionFactors(
      { ...r, tags: ["rust"] },
      "nostalgie",
      prefs,
      weather,
      now,
      options,
    ).weight,
    1,
  );
  assert.equal(
    selectionFactors(
      { ...r, tags: ["nostalgie"] },
      "nostalgie",
      prefs,
      weather,
      now,
      options,
    ).weight,
    2 * 1.25,
  );
  assert.equal(
    selectionFactors(r, "nostalgie", prefs, weather, now, {
      ...options,
      useGenreMoods: false,
    }).weight,
    1,
  );
});

test("Christmas automatic filter never blocks an explicit collection pick or whole-year override", async () => {
  const c = config();
  const service = new Service(c, { now: () => now, random: () => 0 });
  try {
    const first = service.store.record("demo-1")!;
    service.store.put({ ...first, title: "Christmas Test" });
    service.select();
    assert.notEqual(service.state().selection!.record.id, first.id);
    service.select("alles", false, first.id);
    assert.equal(service.state().selection!.record.id, first.id);
    assert.deepEqual(service.state().selection!.reasons, [
      "Zelf uit je collectie gekozen.",
    ]);
    service.patch(first.id, { seasons: [] });
    assert.deepEqual(
      recordSeasons(service.store.record(first.id)!).seasons,
      [],
    );
    service.patch(first.id, { seasons: null });
    assert.equal(recordSeasons(service.store.record(first.id)!).inferred, true);
    service.patch(first.id, { excluded: true });
    assert.throws(
      () => service.select("alles", false, first.id),
      /Geen geschikte/,
    );
  } finally {
    await service.close();
    rmSync(c.dataDir, { recursive: true, force: true });
  }
});

test("preferences and nostalgia persist; API rejects malformed mappings and supports season reset", async () => {
  const c = config();
  const { app } = await buildApp(c, { now: () => now }, { schedule: false });
  try {
    assert.deepEqual(
      (await app.inject("/api/state")).json().preferences,
      DEFAULT_PREFERENCES,
    );
    const result = await app.inject({
      method: "PATCH",
      url: "/api/preferences",
      payload: prefs,
    });
    assert.equal(result.statusCode, 200);
    for (const invalid of [
      { ...prefs, extra: true },
      { ...prefs, weatherMoods: { rain: ["alles"], cold: [], warm: [] } },
      {
        ...prefs,
        genreMoods: [
          { genre: "Rock", moods: [] },
          { genre: "rock", moods: [] },
        ],
      },
      { ...prefs, genreMoods: [{ genre: "", moods: [] }] },
    ])
      assert.equal(
        (
          await app.inject({
            method: "PATCH",
            url: "/api/preferences",
            payload: invalid,
          })
        ).statusCode,
        400,
      );
    assert.equal(
      (
        await app.inject({
          method: "PATCH",
          url: "/api/records/demo-1",
          payload: { tags: ["nostalgie"], seasons: ["kerst"] },
        })
      ).statusCode,
      200,
    );
    const reset = await app.inject({
      method: "PATCH",
      url: "/api/records/demo-1",
      payload: { seasons: null },
    });
    assert.equal(reset.statusCode, 200);
    assert.equal(reset.json().records[0].seasons, undefined);
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/select",
          payload: {
            mood: "nostalgie",
            useGenreMoods: true,
            useSeasons: false,
            useWeather: true,
          },
        })
      ).statusCode,
      200,
    );
    await app.close();
    const reopened = new Service(c);
    try {
      assert.deepEqual(reopened.preferences(), prefs);
      assert.deepEqual(reopened.store.record("demo-1")!.tags, ["nostalgie"]);
    } finally {
      await reopened.close();
    }
  } finally {
    await app.close();
    rmSync(c.dataDir, { recursive: true, force: true });
  }
});
