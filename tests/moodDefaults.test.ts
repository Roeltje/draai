import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ADDED_STYLE_MOODS,
  CONCEPT_STYLE_MOODS,
  MOOD_DEFAULTS_VERSION,
} from "../shared/moodDefaults.ts";
import {
  DEFAULT_PREFERENCES,
  MOODS,
  selectionFactors,
} from "../shared/selection.ts";
import { demoRecords } from "../server/demo.ts";
import { buildApp } from "../server/app.ts";
import { Service } from "../server/service.ts";
import { Store } from "../server/store.ts";
import type { SelectionPreferences, WeatherState } from "../shared/types.ts";

const now = Date.parse("2026-11-01T12:00:00Z");
const key = (name: string) =>
  name.trim().replace(/\s+/g, " ").toLocaleLowerCase();
const config = () => ({
  dataDir: mkdtempSync(join(tmpdir(), "draai-mood-defaults-")),
  username: "fixture",
  stationId: "fixture",
});
const weather: WeatherState = {
  status: "unconfigured",
  stationId: "",
  observedAt: null,
  temperature: null,
  rainRate: null,
  windSpeed: null,
  message: "",
};
const DISCOGS_GENRES = [
  "Blues",
  "Brass & Military",
  "Children's",
  "Classical",
  "Electronic",
  "Folk, World, & Country",
  "Funk / Soul",
  "Hip Hop",
  "Jazz",
  "Latin",
  "Non-Music",
  "Pop",
  "Reggae",
  "Rock",
  "Stage & Screen",
];
// Frequent Discogs styles outside the original concept preset.
const COMMON_STYLES = [
  "Acid House",
  "Art Rock",
  "Avantgarde",
  "Breakbeat",
  "Chicago Blues",
  "Conscious",
  "Contemporary R&B",
  "Dark Ambient",
  "Darkwave",
  "Doo Wop",
  "Electric Blues",
  "Euro House",
  "Europop",
  "Glam",
  "Goth Rock",
  "Industrial",
  "Instrumental",
  "Latin Jazz",
  "Leftfield",
  "Modern Classical",
  "Neo-Classical",
  "Noise",
  "Pop Rap",
  "Post Bop",
  "Post Rock",
  "Reggae-Pop",
  "Schlager",
  "Score",
  "Shoegaze",
  "Stoner Rock",
  "Symphonic Rock",
  "Thrash",
  "Trance",
  "UK Garage",
];

test("defaults cover every Discogs genre and common styles with valid, unique rules", () => {
  const styles = DEFAULT_PREFERENCES.styleMoods!;
  const genres = DEFAULT_PREFERENCES.genreMoods;
  assert.equal(new Set(styles.map((r) => key(r.style))).size, styles.length);
  assert.equal(new Set(genres.map((r) => key(r.genre))).size, genres.length);
  assert.ok(styles.length > 400 && styles.length <= 1000, `${styles.length}`);
  for (const rule of [...styles, ...genres])
    assert.ok(
      rule.moods.every((mood) => mood !== "alles" && MOODS.includes(mood)) &&
        new Set(rule.moods).size === rule.moods.length,
      JSON.stringify(rule),
    );
  const genreKeys = new Set(genres.map((r) => key(r.genre)));
  for (const genre of DISCOGS_GENRES)
    assert.ok(genreKeys.has(key(genre)), genre);
  const styleKeys = new Map(styles.map((r) => [key(r.style), r.moods]));
  for (const style of COMMON_STYLES)
    assert.ok(styleKeys.get(key(style))?.length, style);
  const off = styles.filter((r) => !r.moods.length);
  assert.ok(off.length < 30, off.map((r) => r.style).join(", "));
});

test("records with any musical genre get a default mood, also for unmapped styles", () => {
  const base = demoRecords(new Date(now).toISOString())[0];
  for (const genre of DISCOGS_GENRES.filter((g) => g !== "Non-Music")) {
    const record = { ...base, tags: [], genres: [genre], styles: ["Zzz"] };
    assert.ok(
      DEFAULT_PREFERENCES.genreMoods.find((r) => key(r.genre) === key(genre))!
        .moods.length,
      genre,
    );
    const anyMood = MOODS.filter((m) => m !== "alles").some(
      (mood) =>
        selectionFactors(record, mood, DEFAULT_PREFERENCES, weather, now, {
          useWeather: false,
          useSeasons: false,
          useGenreMoods: true,
        }).weight > 1,
    );
    assert.ok(anyMood, genre);
  }
});

test("API accepts the complete default preset", async () => {
  const { app } = await buildApp(config(), {}, { schedule: false });
  try {
    const res = await app.inject({
      method: "PATCH",
      url: "/api/preferences",
      payload: DEFAULT_PREFERENCES,
    });
    assert.equal(res.statusCode, 200, res.body);
    assert.deepEqual(
      res.json().preferences.styleMoods,
      DEFAULT_PREFERENCES.styleMoods,
    );
  } finally {
    await app.close();
  }
});

test("version upgrade adds only new defaults and keeps changed, disabled and removed rules", async () => {
  const c = config();
  const changed = CONCEPT_STYLE_MOODS[0];
  const removed = CONCEPT_STYLE_MOODS[1];
  const disabledAdded = ADDED_STYLE_MOODS.find((r) => r.moods.length)!;
  const saved: SelectionPreferences = {
    genreMoods: [{ genre: "rock", moods: ["rust"] }],
    styleMoods: [
      { style: changed.style, moods: ["avontuur"] },
      ...CONCEPT_STYLE_MOODS.slice(2),
      { style: ` ${disabledAdded.style.toUpperCase()} `, moods: [] },
      { style: "Eigen stijl", moods: ["warm"] },
    ],
    weatherMoods: { rain: ["rust"], cold: [], warm: [] },
  };
  const store = new Store(join(c.dataDir, "demo.sqlite"));
  store.set("preferences", saved);
  store.close();
  let service = new Service(c);
  try {
    const prefs = service.preferences();
    const styles = new Map(prefs.styleMoods!.map((r) => [key(r.style), r]));
    assert.deepEqual(styles.get(key(changed.style))!.moods, ["avontuur"]);
    assert.equal(styles.has(key(removed.style)), false);
    assert.deepEqual(styles.get(key(disabledAdded.style))!.moods, []);
    assert.deepEqual(styles.get("eigen stijl")!.moods, ["warm"]);
    assert.deepEqual(
      prefs.styleMoods!.slice(0, saved.styleMoods!.length),
      saved.styleMoods,
    );
    for (const rule of ADDED_STYLE_MOODS)
      assert.ok(styles.has(key(rule.style)), rule.style);
    assert.deepEqual(prefs.genreMoods[0], { genre: "rock", moods: ["rust"] });
    assert.ok(prefs.genreMoods.some((r) => r.genre === "Brass & Military"));
    assert.deepEqual(prefs.weatherMoods, saved.weatherMoods);
    assert.equal(
      service.store.get("moodDefaultsVersion", 0),
      MOOD_DEFAULTS_VERSION,
    );

    // A later removal of a new default is not undone on restart.
    const trimmed = prefs.styleMoods!.filter(
      (r) => key(r.style) !== key(ADDED_STYLE_MOODS.at(-1)!.style),
    );
    service.setPreferences({ ...prefs, styleMoods: trimmed });
    await service.close();
    service = new Service(c);
    assert.deepEqual(service.preferences().styleMoods, trimmed);
  } finally {
    await service.close();
    rmSync(c.dataDir, { recursive: true, force: true });
  }
});
