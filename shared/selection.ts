import type {
  Mood,
  RecordItem,
  Season,
  SelectionPreferences,
  WeatherState,
} from "./types.ts";
import { DEFAULT_SIDE_TIMER_SETTINGS } from "./sideTimer.ts";
import { DEFAULT_GENRE_MOODS, DEFAULT_STYLE_MOODS } from "./moodDefaults.ts";
export { DEFAULT_GENRE_MOODS, DEFAULT_STYLE_MOODS } from "./moodDefaults.ts";
export const MOODS: Mood[] = [
  "alles",
  "rust",
  "warm",
  "energie",
  "avontuur",
  "nostalgie",
];
export const SEASONS: Season[] = [
  "lente",
  "zomer",
  "herfst",
  "winter",
  "kerst",
];
export const DEFAULT_WEATHER_THRESHOLDS = { coldBelow: 10, warmFrom: 22 };
export const DEFAULT_PREFERENCES: SelectionPreferences = {
  genreMoods: DEFAULT_GENRE_MOODS,
  styleMoods: DEFAULT_STYLE_MOODS,
  weatherMoods: { rain: [], cold: [], warm: [] },
  weatherThresholds: DEFAULT_WEATHER_THRESHOLDS,
  sideTimer: DEFAULT_SIDE_TIMER_SETTINGS,
};
export function seasonToday(now: number): {
  season: Season;
  christmas: boolean;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const month = Number(parts.find((p) => p.type === "month")!.value),
    day = Number(parts.find((p) => p.type === "day")!.value);
  return {
    season:
      month >= 3 && month <= 5
        ? "lente"
        : month >= 6 && month <= 8
          ? "zomer"
          : month >= 9 && month <= 11
            ? "herfst"
            : "winter",
    christmas:
      month === 12 || (month === 11 && day >= 15) || (month === 1 && day <= 6),
  };
}
export function recordSeasons(record: RecordItem): {
  seasons: Season[];
  inferred: boolean;
} {
  if (record.seasons !== undefined)
    return { seasons: record.seasons, inferred: false };
  const christmas =
    /(?:\bchristmas\b|\bxmas\b|\bkerst(?:mis|muziek)?\b|\bno[eë]l\b)/i.test(
      [record.title, ...record.styles].join(" "),
    );
  return { seasons: christmas ? ["kerst"] : [], inferred: christmas };
}
export function selectionFactors(
  record: RecordItem,
  mood: Mood,
  prefs: SelectionPreferences,
  weather: WeatherState,
  now: number,
  options: { useWeather: boolean; useSeasons: boolean; useGenreMoods: boolean },
) {
  const reasons: string[] = [];
  let weight = 1;
  const seasons = recordSeasons(record);
  const today = seasonToday(now);
  const blocked =
    options.useSeasons && seasons.seasons.includes("kerst") && !today.christmas;
  if (options.useSeasons && seasons.seasons.length && !blocked) {
    const matches =
      seasons.seasons.includes(today.season) ||
      (seasons.seasons.includes("kerst") && today.christmas);
    weight *= matches ? 1.25 : 0.65;
    reasons.push(
      `${seasons.inferred ? "Kerstregel op basis van titel/stijl" : "Jouw seizoenslabel"}: ${matches ? "past bij deze periode" : "buiten het seizoen, daarom minder gewicht"}.`,
    );
  }
  const matches = (names: string[], name: string) =>
    names.some(
      (candidate) =>
        candidate.trim().toLocaleLowerCase() ===
        name.trim().toLocaleLowerCase(),
    );
  const styleRules = options.useGenreMoods
    ? (prefs.styleMoods ?? []).filter((rule) =>
        matches(
          record.styles.map((style) => style.replace(/\s+/g, " ")),
          rule.style.replace(/\s+/g, " "),
        ),
      )
    : [];
  const genreRules =
    options.useGenreMoods && !styleRules.length
      ? prefs.genreMoods.filter((rule) => matches(record.genres, rule.genre))
      : [];
  // A matching empty style override intentionally prevents genre fallback.
  const effective = record.tags.length
    ? record.tags
    : (styleRules.length ? styleRules : genreRules).flatMap(
        (rule) => rule.moods,
      );
  if (mood !== "alles" && effective.includes(mood)) {
    weight *= record.tags.length ? 2 : 1.4;
    const label = mood === "warm" ? "knus" : mood;
    reasons.push(
      record.tags.length
        ? `Jouw sfeerlabel ‘${label}’ geeft extra gewicht.`
        : `Jouw ${styleRules.length ? "stijl" : "genre"}-stemmingskoppeling ‘${label}’ geeft extra gewicht.`,
    );
  }
  if (
    options.useWeather &&
    weather.status === "fresh" &&
    weather.observedAt &&
    now - Date.parse(weather.observedAt) <= 30 * 60000 &&
    now - Date.parse(weather.observedAt) >= -5 * 60000
  ) {
    const thresholds = prefs.weatherThresholds ?? DEFAULT_WEATHER_THRESHOLDS;
    const conditions: Array<"rain" | "cold" | "warm"> = [];
    if (weather.rainRate !== null && weather.rainRate > 0)
      conditions.push("rain");
    if (
      weather.temperature !== null &&
      weather.temperature < thresholds.coldBelow
    )
      conditions.push("cold");
    if (
      weather.temperature !== null &&
      weather.temperature >= thresholds.warmFrom
    )
      conditions.push("warm");
    if (
      conditions.some((c) =>
        prefs.weatherMoods[c].some((m) => effective.includes(m)),
      )
    ) {
      weight *= 1.25;
      reasons.push(
        "Een verse stationsmeting past bij jouw eigen weer-stemmingskoppeling; klein extra gewicht (1,25×).",
      );
    }
  }
  return { weight, blocked, reasons };
}
