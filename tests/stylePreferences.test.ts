import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULT_PREFERENCES, selectionFactors } from "../shared/selection.ts";
import { demoRecords } from "../server/demo.ts";
import { Service } from "../server/service.ts";
import { Store } from "../server/store.ts";
import { buildApp } from "../server/app.ts";
import type {
  SelectionPreferences,
  WeatherState,
  Mood,
} from "../shared/types.ts";

const now = Date.parse("2026-07-01T12:00:00Z");
const options = { useWeather: false, useSeasons: false, useGenreMoods: true };
const weather: WeatherState = {
  status: "unconfigured",
  stationId: "",
  observedAt: null,
  temperature: null,
  rainRate: null,
  windSpeed: null,
  message: "",
};
const empty: SelectionPreferences = {
  genreMoods: [],
  weatherMoods: { rain: [], cold: [], warm: [] },
};
const config = () => ({
  dataDir: mkdtempSync(join(tmpdir(), "draai-styles-")),
  username: "fixture",
  stationId: "fixture",
});

test("defaults adapt only existing concept moods at the threshold, excluding empty rules and metadata", () => {
  const concept = JSON.parse(
    readFileSync(
      new URL(
        "../docs/voorstellen/draai-mapping.concept.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const names: Record<string, string> = {
    rustig: "rust",
    warm: "warm",
    energiek: "energie",
    avontuurlijk: "avontuur",
    nostalgisch: "nostalgie",
  };
  for (const [source, field, actual] of [
    [concept.genres, "genre", DEFAULT_PREFERENCES.genreMoods],
    [concept.styles, "style", DEFAULT_PREFERENCES.styleMoods],
  ] as const) {
    const expected = Object.entries(source)
      .map(([name, values]) => ({
        [field]: name,
        moods: Object.entries(values as Record<string, unknown>)
          .filter(
            ([mood, weight]) =>
              names[mood] && typeof weight === "number" && weight >= 0.5,
          )
          .map(([mood]) => names[mood]),
      }))
      .filter((rule) => rule.moods.length);
    assert.deepEqual(actual, expected);
  }
  assert.deepEqual(DEFAULT_PREFERENCES.weatherMoods, empty.weatherMoods);
});

test("personal labels beat matched styles, matched styles beat genre, and empty style overrides prevent fallback", () => {
  const record = {
    ...demoRecords(new Date(now).toISOString())[0],
    tags: [],
    genres: ["Rock"],
    styles: [" ambient "],
  };
  const prefs: SelectionPreferences = {
    ...empty,
    genreMoods: [{ genre: "Rock", moods: ["energie"] }],
    styleMoods: [{ style: "Ambient", moods: ["warm"] }],
  };
  const factors = (
    mood: "warm" | "energie" | "rust",
    p = prefs,
    tags: Mood[] = record.tags,
  ) => selectionFactors({ ...record, tags }, mood, p, weather, now, options);
  assert.equal(factors("warm").weight, 1.4);
  assert.match(
    factors("warm").reasons.join(" "),
    /stijl-stemmingskoppeling ‘knus’/,
  );
  assert.equal(factors("energie").weight, 1);
  assert.equal(factors("warm", prefs, ["rust"]).weight, 1);
  assert.equal(factors("rust", prefs, ["rust"]).weight, 2);
  assert.equal(
    factors("energie", {
      ...prefs,
      styleMoods: [{ style: "Ambient", moods: [] }],
    }).weight,
    1,
  );
  assert.equal(
    factors("energie", {
      ...prefs,
      styleMoods: [{ style: "Other", moods: ["rust"] }],
    }).weight,
    1.4,
  );
  assert.equal(
    factors("energie", { ...prefs, styleMoods: undefined }).weight,
    1.4,
  );
  assert.equal(
    selectionFactors(record, "warm", prefs, weather, now, {
      ...options,
      useGenreMoods: false,
    }).weight,
    1,
  );
});

test("first-run defaults persist; upgrade preserves saved genre/weather and adds styles only once", async () => {
  const c = config();
  let service = new Service(c);
  try {
    assert.deepEqual(service.preferences(), DEFAULT_PREFERENCES);
    await service.close();
    const store = new Store(join(c.dataDir, "demo.sqlite"));
    const old = {
      ...empty,
      genreMoods: [{ genre: "Mine", moods: ["warm" as const] }],
      weatherMoods: { rain: ["rust" as const], cold: [], warm: [] },
    };
    store.set("preferences", old);
    store.close();
    service = new Service(c);
    assert.deepEqual(service.preferences(), {
      ...old,
      styleMoods: DEFAULT_PREFERENCES.styleMoods,
    });
    service.setPreferences({ ...old, styleMoods: [] });
    await service.close();
    service = new Service(c);
    assert.deepEqual(service.preferences(), { ...old, styleMoods: [] });
  } finally {
    await service.close();
    rmSync(c.dataDir, { recursive: true, force: true });
  }
});

test("API validates normalized style rules, preserves overrides for old clients, and survives restart", async () => {
  const c = config();
  const { app } = await buildApp(c, { now: () => now }, { schedule: false });
  try {
    const patch = (payload: unknown) =>
      app.inject({
        method: "PATCH",
        url: "/api/preferences",
        payload: payload as any,
      });
    const custom = [{ style: " Ambient ", moods: ["warm"] }];
    const valid = await patch({ ...empty, styleMoods: custom });
    assert.equal(valid.statusCode, 200);
    assert.deepEqual(valid.json().preferences.styleMoods, [
      { style: "Ambient", moods: ["warm"] },
    ]);
    const legacy = await patch(empty);
    assert.equal(legacy.statusCode, 200);
    assert.deepEqual(legacy.json().preferences.styleMoods, [
      { style: "Ambient", moods: ["warm"] },
    ]);
    for (const invalid of [
      null,
      {},
      [{ style: " ", moods: [] }],
      [{ style: "Ambient", moods: ["alles"] }],
      [{ style: "Ambient", moods: ["focus"] }],
      [{ style: "Ambient", moods: ["rust", "rust"] }],
      [{ style: "Ambient", moods: [], extra: true }],
      [
        { style: " Ambient", moods: [] },
        { style: "ambient ", moods: [] },
      ],
      Array.from({ length: 201 }, (_, i) => ({
        style: `Style ${i}`,
        moods: [],
      })),
    ]) {
      assert.equal(
        (await patch({ ...empty, styleMoods: invalid })).statusCode,
        400,
      );
    }
    assert.equal(
      (
        await patch({
          ...empty,
          styleMoods: Array.from({ length: 200 }, (_, i) => ({
            style: `Style ${i}`,
            moods: [],
          })),
        })
      ).statusCode,
      200,
    );
    assert.equal((await patch({ ...empty, styleMoods: [] })).statusCode, 200);
    await app.close();
    const reopened = new Service(c);
    try {
      assert.deepEqual(reopened.preferences(), { ...empty, styleMoods: [] });
    } finally {
      await reopened.close();
    }
  } finally {
    await app.close();
    rmSync(c.dataDir, { recursive: true, force: true });
  }
});

test("selection uses mapping by default and allows switching it off", async () => {
  const c = config();
  const service = new Service(c, { now: () => now, random: () => 0 });
  try {
    for (const record of service.store.records())
      service.store.put({
        ...record,
        tags: [],
        styles: ["Ambient"],
        genres: [],
      });
    service.select("rust");
    assert.match(
      service.state().selection!.reasons.join(" "),
      /stijl-stemmingskoppeling/,
    );
    service.select("rust", false, undefined, false, false, false);
    assert.doesNotMatch(
      service.state().selection!.reasons.join(" "),
      /stemmingskoppeling/,
    );
  } finally {
    await service.close();
    rmSync(c.dataDir, { recursive: true, force: true });
  }
});
