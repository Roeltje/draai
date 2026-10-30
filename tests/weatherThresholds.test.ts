import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEFAULT_PREFERENCES,
  DEFAULT_WEATHER_THRESHOLDS,
  selectionFactors,
} from "../shared/selection.ts";
import { demoRecords } from "../server/demo.ts";
import { buildApp } from "../server/app.ts";
import { Service } from "../server/service.ts";
import { Store } from "../server/store.ts";
import type { SelectionPreferences, WeatherState } from "../shared/types.ts";

const now = Date.parse("2026-10-30T12:00:00Z");
const config = () => ({
  dataDir: mkdtempSync(join(tmpdir(), "draai-thresholds-")),
  username: "fixture",
  stationId: "fixture",
});
const preferences: SelectionPreferences = {
  genreMoods: [],
  styleMoods: [],
  weatherMoods: { rain: [], cold: ["rust"], warm: ["energie"] },
};

test("weather thresholds use exclusive cold and inclusive warm boundaries, with older preference defaults", () => {
  assert.deepEqual(DEFAULT_WEATHER_THRESHOLDS, { coldBelow: 10, warmFrom: 22 });
  const weather: WeatherState = {
    status: "fresh",
    stationId: "fixture",
    observedAt: new Date(now).toISOString(),
    temperature: null,
    rainRate: 0,
    windSpeed: null,
    message: "",
  };
  for (const thresholds of [undefined, { coldBelow: -5.5, warmFrom: 18.5 }]) {
    const prefs = { ...preferences, weatherThresholds: thresholds };
    const { coldBelow, warmFrom } = thresholds ?? DEFAULT_WEATHER_THRESHOLDS;
    for (const [temperature, coldWeight, warmWeight] of [
      [coldBelow - 0.01, 1.25, 1],
      [coldBelow, 1, 1],
      [warmFrom - 0.01, 1, 1],
      [warmFrom, 1, 1.25],
      [null, 1, 1],
    ] as const) {
      for (const [tag, expected] of [
        ["rust", coldWeight],
        ["energie", warmWeight],
      ] as const) {
        const record = {
          ...demoRecords(new Date(now).toISOString())[0],
          tags: [tag],
        };
        const factor = selectionFactors(
          record,
          "alles",
          prefs,
          { ...weather, temperature },
          now,
          { useWeather: true, useSeasons: false, useGenreMoods: true },
        );
        assert.equal(
          factor.weight,
          expected,
          `${tag} at ${temperature}, thresholds ${JSON.stringify(thresholds)}`,
        );
      }
    }
  }
});

test("upgrade adds only missing thresholds and preserves all custom mood rules across restart", async () => {
  const c = config();
  const store = new Store(join(c.dataDir, "demo.sqlite"));
  store.set("preferences", preferences);
  store.close();
  let service = new Service(c);
  try {
    assert.deepEqual(service.preferences(), {
      ...preferences,
      weatherThresholds: DEFAULT_WEATHER_THRESHOLDS,
    });
    service.setPreferences({
      ...preferences,
      weatherThresholds: { coldBelow: 3.5, warmFrom: 27 },
    });
    await service.close();
    service = new Service(c);
    assert.deepEqual(service.preferences(), {
      ...preferences,
      weatherThresholds: { coldBelow: 3.5, warmFrom: 27 },
    });
  } finally {
    await service.close();
    rmSync(c.dataDir, { recursive: true, force: true });
  }
});

test("API validates complete bounded numeric thresholds and keeps them when old clients omit the field", async () => {
  const c = config();
  const { app } = await buildApp(c, {}, { schedule: false });
  try {
    const patch = (weatherThresholds: unknown) =>
      app.inject({
        method: "PATCH",
        url: "/api/preferences",
        payload: { ...preferences, weatherThresholds },
      });
    for (const invalid of [
      null,
      [],
      10,
      "10",
      {},
      { coldBelow: 10 },
      { warmFrom: 22 },
      { coldBelow: "10", warmFrom: 22 },
      { coldBelow: false, warmFrom: 22 },
      { coldBelow: NaN, warmFrom: 22 },
      { coldBelow: -Infinity, warmFrom: 22 },
      { coldBelow: 10, warmFrom: Infinity },
      { coldBelow: -40.01, warmFrom: 22 },
      { coldBelow: 10, warmFrom: 50.01 },
      { coldBelow: 22, warmFrom: 22 },
      { coldBelow: 23, warmFrom: 22 },
      { coldBelow: 10, warmFrom: 22, extra: 1 },
    ]) {
      assert.equal(
        (await patch(invalid)).statusCode,
        400,
        JSON.stringify(invalid),
      );
    }
    const valid = await patch({ coldBelow: -40, warmFrom: 50 });
    assert.equal(valid.statusCode, 200);
    const previous = valid.json().preferences;
    const legacy = await app.inject({
      method: "PATCH",
      url: "/api/preferences",
      payload: preferences,
    });
    assert.equal(legacy.statusCode, 200);
    assert.deepEqual(legacy.json().preferences, previous);
    await app.close();
    const reopened = new Service(c);
    try {
      assert.deepEqual(reopened.preferences(), {
        ...preferences,
        weatherThresholds: { coldBelow: -40, warmFrom: 50 },
      });
    } finally {
      await reopened.close();
    }
  } finally {
    await app.close();
    rmSync(c.dataDir, { recursive: true, force: true });
  }
});
