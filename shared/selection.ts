import type {
  Mood,
  RecordItem,
  Season,
  SelectionPreferences,
  WeatherState,
} from "./types.ts";
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
export const DEFAULT_PREFERENCES: SelectionPreferences = {
  genreMoods: [],
  weatherMoods: { rain: [], cold: [], warm: [] },
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
  const genreTags = options.useGenreMoods
    ? prefs.genreMoods
        .filter((g) =>
          record.genres.some(
            (r) => r.toLocaleLowerCase() === g.genre.toLocaleLowerCase(),
          ),
        )
        .flatMap((g) => g.moods)
    : [];
  // Explicit personal tags take precedence over genre-derived mood suggestions.
  const effective = record.tags.length ? record.tags : genreTags;
  if (mood !== "alles" && effective.includes(mood)) {
    weight *= record.tags.length ? 2 : 1.4;
    reasons.push(
      record.tags.length
        ? `Jouw sfeerlabel ‘${mood}’ geeft extra gewicht.`
        : `Jouw genre-stemmingskoppeling ‘${mood}’ geeft extra gewicht.`,
    );
  }
  if (
    options.useWeather &&
    weather.status === "fresh" &&
    weather.observedAt &&
    now - Date.parse(weather.observedAt) <= 30 * 60000 &&
    now - Date.parse(weather.observedAt) >= -5 * 60000
  ) {
    const conditions: Array<"rain" | "cold" | "warm"> = [];
    if (weather.rainRate !== null && weather.rainRate > 0)
      conditions.push("rain");
    if (weather.temperature !== null && weather.temperature < 10)
      conditions.push("cold");
    if (weather.temperature !== null && weather.temperature >= 22)
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
