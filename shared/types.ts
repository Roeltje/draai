export type Mood =
  "alles" | "rust" | "warm" | "energie" | "avontuur" | "nostalgie";
export type Season = "lente" | "zomer" | "herfst" | "winter" | "kerst";
export interface SelectionPreferences {
  genreMoods: Array<{ genre: string; moods: Mood[] }>;
  weatherMoods: { rain: Mood[]; cold: Mood[]; warm: Mood[] };
}
export interface Track {
  position: string;
  title: string;
  duration?: string;
}
export interface Credit {
  artistId: number;
  name: string;
  role: string;
  tracks?: string;
}
export interface MusicDate {
  kind: "release" | "birth" | "death";
  date: string;
  subject: string;
  sourceUrl: string;
}
export interface AlbumInfo {
  status: "ready" | "not_found" | "ambiguous" | "error";
  summary: string;
  wikipediaUrl: string;
  wikidataUrl: string;
  language: string;
  checkedAt: string;
  dates: MusicDate[];
  demo?: boolean;
  artists?: Array<{
    artistId: number;
    name: string;
    summary: string;
    wikipediaUrl: string;
    wikidataUrl: string;
    language: string;
    checkedAt: string;
  }>;
}
export interface Occasion {
  recordId: string;
  title: string;
  description: string;
  sourceUrl: string;
  kind: MusicDate["kind"];
  years: number;
  demo: boolean;
}
export interface RecordItem {
  id: string;
  releaseId: number;
  masterId?: number | null;
  albumInfo?: AlbumInfo;
  title: string;
  artist: string;
  artistIds: number[];
  year: number | null;
  country: string;
  label: string;
  catalogNumber: string;
  formats: string[];
  genres: string[];
  styles: string[];
  coverUrl: string;
  sourceUrl: string;
  tracks: Track[];
  credits: Credit[];
  notes: string;
  tags: Mood[];
  seasons?: Season[];
  excluded: boolean;
  available: boolean;
  isLP: boolean;
  addedAt: string;
  fetchedAt: string;
  detailsFetchedAt?: string | null;
  demo: boolean;
}
export interface Selection {
  id: string;
  record: RecordItem;
  reasons: string[];
  createdAt: string;
}
export interface ListeningSession {
  id: string;
  record: RecordItem;
  startedAt: string;
  endedAt: string | null;
  note: string;
}
export interface WeatherState {
  status: "unconfigured" | "fresh" | "stale" | "error";
  stationId: string;
  observedAt: string | null;
  temperature: number | null;
  rainRate: number | null;
  windSpeed: number | null;
  message: string;
}
export interface SyncState {
  running: boolean;
  lastSuccess: string | null;
  error: string | null;
  progress: string;
}
export interface AppState {
  mode: "demo" | "live";
  records: RecordItem[];
  selection: Selection | null;
  activeSession: ListeningSession | null;
  history: ListeningSession[];
  sync: SyncState;
  weather: WeatherState;
  preferences?: SelectionPreferences;
  occasions?: Occasion[];
  enrichment?: {
    running: boolean;
    progress: string;
    lastSuccess: string | null;
    error: string | null;
  };
  settings: {
    discogsConfigured: boolean;
    username: string;
    weatherConfigured: boolean;
    displayUrl: string;
    collectionStale: boolean;
    wikiEnabled?: boolean;
  };
}
