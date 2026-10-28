import type { AppState, RecordItem } from "../shared/types";
import { occasionsFor } from "../shared/calendar";

export const METADATA_MAX_AGE = 6 * 60 * 60 * 1000;
export const WEATHER_MAX_AGE = 30 * 60 * 1000;
export function recordExpired(record: RecordItem, now = Date.now()): boolean {
  const fetched = Date.parse(record.fetchedAt);
  return (
    !record.demo &&
    (!Number.isFinite(fetched) || now - fetched >= METADATA_MAX_AGE)
  );
}

function protectRecord(record: RecordItem, now: number): RecordItem {
  if (!recordExpired(record, now)) {
    if (
      !record.demo &&
      (!record.detailsFetchedAt ||
        now - Date.parse(record.detailsFetchedAt) >= METADATA_MAX_AGE ||
        !Number.isFinite(Date.parse(record.detailsFetchedAt)))
    ) {
      return { ...record, country: "", tracks: [], credits: [], notes: "" };
    }
    return record;
  }
  // Preserve private identifiers and personal labels; expired API metadata is hidden.
  return {
    ...record,
    title: "Releasegegevens verversen",
    artist: "Discogs-gegevens verlopen",
    artistIds: [],
    year: null,
    country: "",
    label: "",
    catalogNumber: "",
    formats: [],
    genres: [],
    styles: [],
    coverUrl: "",
    tracks: [],
    credits: [],
    notes: "",
    addedAt: "",
    available: false,
    isLP: false,
  };
}

export function protectState(
  state: AppState | null,
  now = Date.now(),
): AppState | null {
  if (!state) return null;
  const protect = (record: RecordItem) => protectRecord(record, now);
  const collectionExpired =
    state.mode === "live" &&
    (!state.sync.lastSuccess ||
      !Number.isFinite(Date.parse(state.sync.lastSuccess)) ||
      now - Date.parse(state.sync.lastSuccess) >= METADATA_MAX_AGE ||
      state.records.some(
        (record) => record.available && recordExpired(record, now),
      ));
  const observed = state.weather.observedAt
    ? Date.parse(state.weather.observedAt)
    : NaN;
  const weatherExpired =
    state.weather.status === "fresh" &&
    (!Number.isFinite(observed) || now - observed >= WEATHER_MAX_AGE);
  return {
    ...state,
    records: state.records.map(protect),
    occasions: occasionsFor(state.records.map(protect), now),
    selection: state.selection
      ? {
          ...state.selection,
          record: protect(state.selection.record),
          reasons: recordExpired(state.selection.record, now)
            ? ["Vernieuw de Discogs-gegevens voordat je deze plaat bevestigt."]
            : state.selection.reasons,
        }
      : null,
    activeSession: state.activeSession
      ? { ...state.activeSession, record: protect(state.activeSession.record) }
      : null,
    history: state.history.map((session) => ({
      ...session,
      record: protect(session.record),
    })),
    settings: {
      ...state.settings,
      collectionStale: state.settings.collectionStale || collectionExpired,
    },
    weather: weatherExpired
      ? {
          ...state.weather,
          status: "stale",
          temperature: null,
          rainRate: null,
          windSpeed: null,
          message:
            "Meting ouder dan 30 minuten. Vernieuw voor actuele waarden.",
        }
      : state.weather,
  };
}

/** Wake the UI at the next expiry even when the browser has lost its connection. */
export function nextExpiry(
  state: AppState | null,
  now = Date.now(),
): number | null {
  if (!state) return null;
  const records = [
    ...state.records,
    ...state.history.map((s) => s.record),
    ...(state.selection ? [state.selection.record] : []),
    ...(state.activeSession ? [state.activeSession.record] : []),
  ];
  const deadlines = records
    .filter((record) => !record.demo)
    .map((record) => Date.parse(record.fetchedAt) + METADATA_MAX_AGE);
  deadlines.push(
    ...records
      .filter((record) => !record.demo && record.detailsFetchedAt)
      .map((record) => Date.parse(record.detailsFetchedAt!) + METADATA_MAX_AGE),
  );
  if (state.mode === "live" && state.sync.lastSuccess)
    deadlines.push(Date.parse(state.sync.lastSuccess) + METADATA_MAX_AGE);
  if (state.weather.status === "fresh" && state.weather.observedAt)
    deadlines.push(Date.parse(state.weather.observedAt) + WEATHER_MAX_AGE);
  const future = deadlines.filter(
    (deadline) => Number.isFinite(deadline) && deadline > now,
  );
  return future.length ? Math.min(...future) : null;
}
