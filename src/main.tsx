import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Check,
  CircleHelp,
  Disc3,
  House,
  Library,
  History,
  Settings,
  Shuffle,
  Plus,
  X,
  Search,
  CloudSun,
  RefreshCw,
  Radio,
  CheckCheck,
  WifiOff,
  ChevronDown,
  Monitor,
  CalendarDays,
  BookOpen,
} from "lucide-react";
import QRCode from "qrcode";
import type { AppState, RecordItem, Mood } from "../shared/types";
import "./styles.css";
import { AlbumStory } from "./AlbumStory";
import { BrandStar } from "./BrandStar";
import { SeasonEditor } from "./SeasonEditor";
import { ListeningStats } from "./ListeningStatsPanel";
import { formatRegisteredDuration } from "./listeningStats";
import { PreferencesEditor } from "./PreferencesEditor";
import { homeCovers } from "./homeCovers";
import { protectState, nextExpiry, recordExpired } from "./freshness";

type Page =
  | "home"
  | "suggestion"
  | "listening"
  | "collection"
  | "history"
  | "settings"
  | "display";
const moods: { id: Mood; label: string; hint: string }[] = [
  { id: "alles", label: "Verras me", hint: "Alles mag" },
  { id: "rust", label: "Rustig", hint: "Even vertragen" },
  { id: "warm", label: "Knus", hint: "Voor de gezelligheid" },
  { id: "energie", label: "Energiek", hint: "Een beetje vaart" },
  { id: "avontuur", label: "Avontuurlijk", hint: "Buiten de lijntjes" },
  { id: "nostalgie", label: "Nostalgisch", hint: "Even terug in de tijd" },
];
const stamp = (v: string | null) =>
  v
    ? new Intl.DateTimeFormat("nl-NL", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(v))
    : "Nog niet bijgewerkt";
const day = (v: string) =>
  new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(v));
function Cover({
  record,
  className = "",
  priority = false,
}: {
  record: RecordItem;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [record.coverUrl]);
  return !failed && record.coverUrl ? (
    <img
      className={`cover ${className}`}
      src={record.coverUrl}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      alt={`Hoes van ${record.title}`}
      onError={() => setFailed(true)}
    />
  ) : (
    <div className={`cover fallback-cover ${className}`}>
      <Disc3 size={64} />
      <span>{record.artist}</span>
      <strong>{record.title}</strong>
      <small>Hoes niet beschikbaar</small>
    </div>
  );
}
function App() {
  const initial = window.location.pathname.replace(/^\//, "") || "home";
  const [page, setPage] = useState<Page>(
    [
      "suggestion",
      "listening",
      "collection",
      "history",
      "settings",
      "display",
    ].includes(initial)
      ? (initial as Page)
      : "home",
  );
  const [rawState, setState] = useState<AppState | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [offline, setOffline] = useState(!navigator.onLine),
    [connected, setConnected] = useState(true);
  const [mood, setMood] = useState<Mood>("alles"),
    [search, setSearch] = useState(""),
    [tagFilter, setTagFilter] = useState<Mood>("alles"),
    [format, setFormat] = useState("all"),
    [expanded, setExpanded] = useState<string | null>(null),
    [note, setNote] = useState(""),
    [toast, setToast] = useState(""),
    [qr, setQr] = useState("");
  const [useAnniversaries, setUseAnniversaries] = useState(true);
  const [useSeasons, setUseSeasons] = useState(true),
    [useWeather, setUseWeather] = useState(false),
    [useGenreMoods, setUseGenreMoods] = useState(true);
  const detailAttempts = useRef(new Map<string, number>());
  const [detailError, setDetailError] = useState("");
  const [clock, setClock] = useState(0);
  const state = protectState(rawState);
  const dailyCovers = homeCovers(state?.records || []);
  useEffect(() => {
    const deadline = nextExpiry(rawState);
    if (deadline === null) return;
    const timer = window.setTimeout(
      () => setClock((value) => value + 1),
      Math.max(1, deadline - Date.now() + 5),
    );
    return () => clearTimeout(timer);
  }, [rawState, clock]);
  const visibleRecord =
    page === "suggestion"
      ? rawState?.selection?.record
      : page === "listening"
        ? rawState?.activeSession?.record
        : undefined;
  const detailsExpired =
    !!visibleRecord &&
    !visibleRecord.demo &&
    (!visibleRecord.detailsFetchedAt ||
      !Number.isFinite(Date.parse(visibleRecord.detailsFetchedAt)) ||
      Date.now() - Date.parse(visibleRecord.detailsFetchedAt) >=
        6 * 60 * 60 * 1000);
  useEffect(() => {
    if (
      !visibleRecord ||
      !detailsExpired ||
      offline ||
      recordExpired(visibleRecord)
    )
      return;
    const signature = `${visibleRecord.id}:${visibleRecord.detailsFetchedAt || "none"}`;
    const last = detailAttempts.current.get(signature) || 0;
    if (Date.now() - last < 120000) return;
    detailAttempts.current.set(signature, Date.now());
    setDetailError("");
    let cancelled = false;
    void fetch(`/api/records/${encodeURIComponent(visibleRecord.id)}/details`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    })
      .then(async (response) => {
        if (!response.ok) {
          const data = await response.json();
          throw Error(
            data.error || "Persingsdetails konden niet worden bijgewerkt.",
          );
        }
      })
      .catch((error) => {
        if (!cancelled)
          setDetailError(
            error instanceof Error
              ? error.message
              : "Persingsdetails worden later opnieuw geprobeerd.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [
    visibleRecord?.id,
    visibleRecord?.detailsFetchedAt,
    visibleRecord?.fetchedAt,
    detailsExpired,
    offline,
    clock,
  ]);
  const detailNotice = detailsExpired ? (
    <p className="detail-refresh-status" role="status">
      {offline
        ? "Actuele persingsdetails verschijnen zodra er weer verbinding is."
        : detailError ||
          "Tracks en credits worden op de achtergrond bijgewerkt."}
    </p>
  ) : null;
  const go = (p: Page) => {
    setPage(p);
    window.history.pushState({}, "", p === "home" ? "/" : `/${p}`);
    window.scrollTo({ top: 0, behavior: "instant" });
    setError("");
  };
  async function fetchState() {
    try {
      const r = await fetch("/api/state");
      if (!r.ok) throw Error("De collectie kan niet worden geladen.");
      setState(await r.json());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verbinding mislukt.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void fetchState();
    const es = new EventSource("/api/events");
    es.addEventListener("state", (e) => {
      try {
        setState(JSON.parse((e as MessageEvent).data));
        setConnected(true);
      } catch {}
    });
    es.onopen = () => {
      setConnected(true);
      void fetchState();
    };
    es.onerror = () => setConnected(false);
    const online = () => {
        setOffline(false);
        void fetchState();
      },
      off = () => setOffline(true);
    window.addEventListener("online", online);
    window.addEventListener("offline", off);
    const pop = () => {
      const p = window.location.pathname.slice(1) || "home";
      setPage(p as Page);
    };
    window.addEventListener("popstate", pop);
    const poll = window.setInterval(() => {
      setClock((value) => value + 1);
      void fetchState();
    }, 60000);
    const visibility = () => {
      if (document.visibilityState === "visible") {
        setClock((value) => value + 1);
        void fetchState();
      }
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      es.close();
      clearInterval(poll);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", off);
      window.removeEventListener("popstate", pop);
    };
  }, []);
  useEffect(() => {
    setNote(state?.activeSession?.note || "");
  }, [state?.activeSession?.id]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(timer);
  }, [toast]);
  const phoneUrl = window.location.origin;
  const validPhoneUrl = (() => {
    try {
      return (
        !!phoneUrl &&
        !["localhost", "127.0.0.1", "::1", "[::1]"].includes(
          new URL(phoneUrl).hostname,
        )
      );
    } catch {
      return false;
    }
  })();
  useEffect(() => {
    if (validPhoneUrl)
      void QRCode.toDataURL(phoneUrl, {
        margin: 1,
        color: { dark: "#eee9de", light: "#20221f" },
        width: 180,
      })
        .then(setQr)
        .catch(() => setQr(""));
  }, [phoneUrl, validPhoneUrl]);
  async function mutate(path: string, body: unknown = {}, method = "POST") {
    if (busy) return false;
    setBusy(true);
    setError("");
    try {
      const r = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok)
        throw Error(data.error || "Dit lukte niet. Probeer het opnieuw.");
      setState(data);
      return true;
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Geen verbinding met Draai. Probeer het opnieuw.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function select(recordId?: string) {
    if (
      await mutate("/api/select", {
        mood,
        useAnniversaries,
        useWeather,
        useSeasons,
        useGenreMoods,
        ...(recordId ? { recordId } : {}),
      })
    )
      go("suggestion");
  }
  const active = state?.activeSession,
    chosen = state?.selection;
  const records = state?.records || [];
  const demo = state?.mode === "demo";
  const actionDisabled = busy || offline;
  const occasion = state?.occasions?.find((event) =>
    records.some((record) => record.id === event.recordId),
  );
  const occasionRecord = occasion
    ? records.find((record) => record.id === occasion.recordId)
    : undefined;
  const linkedAlbums = records.filter(
    (record) => record.albumInfo?.status === "ready",
  ).length;
  const wikiAllowed = demo || !!state?.settings.wikiEnabled;
  const storyFor = (record: RecordItem) => (
    <AlbumStory
      record={record}
      busy={busy || !!state?.enrichment?.running}
      needsWikiSetup={!wikiAllowed}
      disabled={
        actionDisabled ||
        !!state?.enrichment?.running ||
        recordExpired(record) ||
        !wikiAllowed
      }
      onRefresh={async () => {
        if (
          await mutate(`/api/records/${encodeURIComponent(record.id)}/enrich`)
        )
          setToast("Albuminformatie wordt op de achtergrond opgehaald.");
      }}
    />
  );
  const stale = !!state?.settings.collectionStale;
  const eligible = records.filter((r) => r.available && !r.excluded && r.isLP);
  const filtered = records.filter(
    (r) =>
      `${r.title} ${r.artist} ${r.label}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()) &&
      (tagFilter === "alles" || r.tags.includes(tagFilter)) &&
      (format === "all" || (format === "lp" ? r.isLP : !r.isLP)),
  );
  const Badge = () =>
    demo ? (
      <span className="demo-badge">
        <span /> Voorbeeldcollectie
      </span>
    ) : (
      <span className="live-badge">
        <span /> Jouw Discogs-collectie
      </span>
    );
  const Source = ({ record }: { record: RecordItem }) =>
    record.demo ? (
      <p className="source">
        Fictieve plaat · illustratie en gegevens ter demonstratie
      </p>
    ) : (
      <p className="source">
        <a
          href={
            record.sourceUrl ||
            `https://www.discogs.com/release/${record.releaseId}`
          }
          target="_blank"
          rel="noreferrer"
        >
          Data provided by Discogs <ArrowUpRight size={12} />
        </a>{" "}
        ·{" "}
        {recordExpired(record)
          ? "Vernieuwing nodig"
          : `Bijgewerkt ${stamp(record.fetchedAt)}`}
      </p>
    );
  const Button = ({
    children,
    onClick,
    secondary = false,
    disabled = false,
    className = "",
  }: {
    children: React.ReactNode;
    onClick: () => void;
    secondary?: boolean;
    disabled?: boolean;
    className?: string;
  }) => (
    <button
      type="button"
      className={`${secondary ? "button secondary" : "button"} ${className}`}
      onClick={onClick}
      disabled={disabled || actionDisabled}
    >
      {busy ? <RefreshCw size={18} className="spin" /> : null}
      {children}
    </button>
  );
  const Empty = ({ title, text }: { title: string; text: string }) => (
    <div className="empty">
      <Disc3 size={42} />
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
  );
  const nav = [
    { id: "home", label: "Thuis", icon: House },
    { id: "collection", label: "Collectie", icon: Library },
    { id: "history", label: "Geschiedenis", icon: History },
    { id: "settings", label: "Instellingen", icon: Settings },
  ] as const;
  if (page === "display")
    return (
      <div className="display-screen">
        {(offline || !connected) && (
          <div className="display-connection">
            <WifiOff size={16} /> Verbinding herstellen…
          </div>
        )}
        <div className="display-brand">
          draai<span>·</span>
        </div>
        {active ? (
          <>
            <div className="display-content">
              <Cover record={active.record} />
              <div>
                <span className="eyebrow">
                  NU LUISTEREN {demo ? " / DEMO" : ""}
                </span>
                <h1>{active.record.title}</h1>
                <h2>{active.record.artist}</h2>
                <div className="display-rule" />
                <p>
                  {active.record.formats.join(" · ")}
                  {active.record.year ? ` / ${active.record.year}` : ""}
                </p>
                <p className="muted">
                  Handmatig bevestigd · geen trackdetectie
                </p>
                <Source record={active.record} />
              </div>
            </div>
          </>
        ) : (
          <div className="display-idle">
            <div className="idle-disc">
              <Disc3 size={100} strokeWidth={0.6} />
            </div>
            <span className="eyebrow">DE AVOND IS VAN JOU</span>
            <h1>
              Tijd voor
              <br />
              <em>een plaat.</em>
            </h1>
            <p>Kies op je telefoon. Luister hier mee.</p>
            {validPhoneUrl && qr ? (
              <div className="qr">
                <img src={qr} alt="QR-code naar Draai op je telefoon" />
                <span>{phoneUrl}</span>
              </div>
            ) : (
              <p className="setup-guide">
                Open Draai op het lokale netwerkadres van je server.
                <br />
                Open ook deze schermweergave via dat netwerkadres om de QR-code
                te tonen.
              </p>
            )}
            <a className="display-back" href="/">
              Open de telefooninterface <ArrowUpRight size={16} />
            </a>
          </div>
        )}
        <div className="display-footer">
          <span>Een plaat. Alle aandacht.</span>
          <span>
            {demo
              ? "Voorbeeldcollectie · fictieve platen"
              : "Je eigen collectie, opnieuw ontdekt"}
          </span>
        </div>
      </div>
    );
  return (
    <>
      <header className="header">
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            go("home");
          }}
          aria-label="Draai thuis"
        >
          draai<span>·</span>
        </a>
        <nav className="desktop-nav" aria-label="Hoofdnavigatie">
          {nav.map((n) => (
            <button
              key={n.id}
              className={page === n.id ? "nav-active" : ""}
              onClick={() => go(n.id)}
            >
              {n.label}
            </button>
          ))}
        </nav>
        <div className="header-side">
          <span className="header-motto">MINDER ZOEKEN. MEER LUISTEREN.</span>
          <button
            className="icon-button"
            title="Open schermweergave"
            aria-label="Open schermweergave"
            onClick={() => go("display")}
          >
            <Monitor size={20} />
          </button>
        </div>
      </header>
      <main>
        {(offline || !connected) && (
          <div className="connection-note" role="status">
            <WifiOff size={16} />
            {offline
              ? "Je bent offline. Verbinden is nodig om wijzigingen op te slaan."
              : "Liveverbinding herstellen. Draai controleert opnieuw op wijzigingen."}
          </div>
        )}
        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button onClick={() => void fetchState()}>
              <RefreshCw size={16} /> Opnieuw
            </button>
            <button aria-label="Melding sluiten" onClick={() => setError("")}>
              <X size={18} />
            </button>
          </div>
        )}
        {loading && !state ? (
          <div className="loading">
            <Disc3 size={44} className="spin" />
            <span>De platenkast gaat open…</span>
          </div>
        ) : !state ? (
          <Empty
            title="Even geen verbinding"
            text="Draai kan de collectie niet bereiken. Probeer het hierboven opnieuw."
          />
        ) : (
          <>
            {stale && (
              <div className="stale-note">
                <CircleHelp size={18} />
                <span>
                  Je Discogs-gegevens moeten worden vernieuwd. Synchroniseer om
                  de collectie weer te bekijken.
                </span>
                <button onClick={() => go("settings")}>
                  Naar instellingen <ArrowRight size={16} />
                </button>
              </div>
            )}
            {page === "home" && (
              <>
                <div className="section-kicker">
                  <Badge />
                  <span className="issue">VOL. 01 — JOUW LUISTERMOMENT</span>
                </div>
                <section className="home-hero">
                  <div className="hero-copy">
                    <span className="eyebrow">
                      HAAL IETS MOOIS UIT JE PLATENKAST
                    </span>
                    <h1>
                      Tijd voor
                      <br />
                      een <em>plaat.</em>
                      <BrandStar className="headline-star" />
                    </h1>
                    <p className="hero-intro">
                      Je hebt de platen. Neem de tijd.
                      <br />
                      Draai kiest iets uit je collectie voor je.
                    </p>
                    <button
                      className="button hero-cta"
                      disabled={
                        actionDisabled ||
                        (!active && (stale || !eligible.length))
                      }
                      onClick={() => (active ? go("listening") : void select())}
                    >
                      {busy ? (
                        <RefreshCw size={20} className="spin" />
                      ) : (
                        <Shuffle size={20} />
                      )}{" "}
                      {active ? "Verder luisteren" : "Wat gaat er op?"}
                      <ArrowUpRight size={23} />
                    </button>
                    <div className="hero-footnote">
                      <span className="small-dot" />
                      {active
                        ? "Er staat een luistersessie voor je klaar."
                        : demo
                          ? "Probeer het met 6 fictieve platen."
                          : "Een nieuwe blik op je eigen platenkast."}
                    </div>
                  </div>
                  <div
                    className="hero-art"
                    aria-label="Een greep uit de collectie"
                  >
                    <div className="art-orbit" />
                    <span className="art-note">
                      UIT DE KAST.
                      <br />
                      OP DE DRAAITAFEL.
                    </span>
                    {dailyCovers.length ? (
                      <>
                        {dailyCovers[1] && (
                          <div className="sleeve-back">
                            <Cover record={dailyCovers[1]} priority />
                          </div>
                        )}
                        <div className="vinyl">
                          <div className="vinyl-label">
                            <span>DRAAI</span>
                            <i />
                            <span>SIDE A</span>
                          </div>
                        </div>
                        <div className="sleeve-main">
                          <Cover record={dailyCovers[0]} priority />
                        </div>
                        <div className="art-caption">
                          <span>HERONTDEK WAT JE AL HEBT</span>
                          <ArrowUpRight size={22} />
                        </div>
                        {!demo && (
                          <div className="hero-art-source">
                            <span>Data provided by Discogs</span>
                            {dailyCovers.map((record, i) => (
                              <a
                                key={record.id}
                                href={
                                  record.sourceUrl ||
                                  `https://www.discogs.com/release/${record.releaseId}`
                                }
                                target="_blank"
                                rel="noreferrer"
                              >
                                Hoes {i + 1} ↗
                              </a>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="empty-art">
                        <Disc3 size={100} />
                        <span>Ruimte voor je volgende ontdekking</span>
                      </div>
                    )}
                  </div>
                </section>
                <section className="mood-section">
                  <div>
                    <span className="eyebrow">HOE KLINKT VANDAAG?</span>
                    <h2>Volg je stemming.</h2>
                  </div>
                  <div
                    className="mood-options"
                    role="group"
                    aria-label="Kies een stemming"
                  >
                    {moods.map((m, i) => (
                      <button
                        className={`mood-chip ${mood === m.id ? "selected" : ""}`}
                        key={m.id}
                        onClick={() => setMood(m.id)}
                        aria-pressed={mood === m.id}
                        aria-label={m.label}
                      >
                        <span aria-hidden="true">
                          {i === 0 ? (
                            <BrandStar />
                          ) : (
                            ["", "◒", "☀", "ϟ", "↗", "↶"][i]
                          )}
                        </span>
                        {m.label}
                        {mood === m.id && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                  <details className="choice-options">
                    <summary>
                      Geef je keuze een richting <ChevronDown size={15} />
                    </summary>
                    <div className="choice-options-body">
                      {" "}
                      <label className="anniversary-toggle">
                        <input
                          type="checkbox"
                          checked={useAnniversaries}
                          onChange={(event) =>
                            setUseAnniversaries(event.target.checked)
                          }
                        />
                        <CalendarDays size={17} />
                        <span>
                          Laat deze dag meebeslissen
                          <small>
                            Alleen bij een bekende release-, geboorte- of
                            overlijdensdatum.
                          </small>
                        </span>
                      </label>
                      <label className="anniversary-toggle">
                        <input
                          type="checkbox"
                          checked={useSeasons}
                          onChange={(event) =>
                            setUseSeasons(event.target.checked)
                          }
                        />
                        <span>
                          Volg het seizoen
                          <small>
                            Jouw seizoenslabels wegen mee. Kerstplaten alleen
                            van 15 november tot en met 6 januari; zelf kiezen
                            kan altijd.
                          </small>
                        </span>
                      </label>
                      <label className="anniversary-toggle">
                        <input
                          type="checkbox"
                          checked={useGenreMoods}
                          onChange={(event) =>
                            setUseGenreMoods(event.target.checked)
                          }
                        />
                        <span>
                          Neem stijl- en genreverbanden mee
                          <small>
                            Bewerkbare startverbanden bij Instellingen. Je eigen
                            plaatlabels gaan altijd voor.
                          </small>
                        </span>
                      </label>
                      <label className="anniversary-toggle">
                        <input
                          type="checkbox"
                          checked={useWeather}
                          disabled={state.weather.status !== "fresh"}
                          onChange={(event) =>
                            setUseWeather(event.target.checked)
                          }
                        />
                        <span>
                          Neem het weer mee
                          <small>
                            {state.weather.status === "fresh"
                              ? "Alleen actuele metingen en je eigen weerverbanden bij Instellingen."
                              : "Geen actuele meting; het weer heeft geen invloed."}
                          </small>
                        </span>
                      </label>
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => go("settings")}
                      >
                        Mijn genre- en weervoorkeuren <ArrowRight size={14} />
                      </button>
                    </div>
                  </details>
                  <div className="weather-option">
                    <CloudSun size={18} />
                    <span>
                      {state.weather.status === "fresh"
                        ? `${state.weather.temperature ?? "—"} °C · ${state.weather.rainRate ?? "—"} mm/uur regen`
                        : "Het weer buiten"}
                      <small>
                        {state.weather.status === "fresh"
                          ? `${state.weather.stationId} · invloed alleen met je eigen voorkeuren`
                          : state.weather.status === "unconfigured"
                            ? "Weerstation nog niet gekoppeld"
                            : "Geen actuele meting beschikbaar"}
                      </small>
                    </span>
                  </div>
                </section>
                <section
                  className="today-music"
                  aria-labelledby="today-heading"
                >
                  <div className="today-heading">
                    <span className="eyebrow">
                      <CalendarDays size={15} /> EEN DATUM, EEN NIEUWE
                      LUISTERTIP
                    </span>
                    <h2 id="today-heading">
                      Vandaag in de <em>muziek.</em>
                    </h2>
                  </div>
                  {occasion && occasionRecord ? (
                    <article className="occasion-card">
                      <Cover record={occasionRecord} />
                      <div className="occasion-copy">
                        <span className="eyebrow">
                          {occasion.demo
                            ? "DEMO · FICTIEF KALENDERVOORBEELD"
                            : occasion.kind === "release"
                              ? "RELEASEDAG"
                              : occasion.kind === "birth"
                                ? "GEBOORTEDAG"
                                : "TER HERINNERING"}
                        </span>
                        <h3>{occasion.title}</h3>
                        <p>{occasion.description}</p>
                        <span className="occasion-album">
                          {occasionRecord.title} · {occasionRecord.artist}
                        </span>
                        {!occasion.demo && occasion.sourceUrl && (
                          <a
                            className="occasion-source"
                            href={occasion.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Bron: Wikidata <ArrowUpRight size={12} />
                          </a>
                        )}
                        {!occasionRecord.demo && (
                          <Source record={occasionRecord} />
                        )}
                      </div>
                      <Button
                        secondary
                        disabled={
                          !!active ||
                          !occasionRecord.available ||
                          occasionRecord.excluded ||
                          !occasionRecord.isLP ||
                          stale
                        }
                        onClick={() => void select(occasionRecord.id)}
                      >
                        Deze plaat ontdekken <ArrowUpRight size={17} />
                      </Button>
                    </article>
                  ) : (
                    <div className="occasion-empty">
                      <BrandStar className="empty-star" />
                      <p>
                        Vandaag even geen bekende muziekdatum.
                        <small>
                          Na het ophalen van albuminformatie verschijnen hier
                          alleen datums die vandaag vallen en bij je collectie
                          horen. De platenkast blijft vol mogelijkheden.
                        </small>
                      </p>
                    </div>
                  )}
                </section>
                <section className="home-bottom">
                  <div className="shelf-teaser">
                    <span className="eyebrow">
                      {demo ? "EEN VOORPROEFJE" : "JOUW PLATENKAST"}
                    </span>
                    <h2>
                      {demo
                        ? "Een kleine kast.\nGroot luisterplezier."
                        : `${records.length} platen.\nNieuwe ontdekkingen.`}
                    </h2>
                    <button
                      className="text-link"
                      onClick={() => go("collection")}
                    >
                      Blader door{" "}
                      {demo ? "de voorbeeldcollectie" : "je collectie"}{" "}
                      <ArrowRight size={19} />
                    </button>
                  </div>
                  <div className="recent-card">
                    <span className="eyebrow">
                      {active ? "OP DE DRAAITAFEL" : "LAATST GEDRAAID"}
                    </span>
                    {active || state.history[0] ? (
                      (() => {
                        const s = active || state.history[0];
                        return (
                          <>
                            <button
                              className="recent-record"
                              onClick={() =>
                                go(active ? "listening" : "history")
                              }
                            >
                              <Cover record={s.record} />
                              <span>
                                <strong>{s.record.title}</strong>
                                <small>{s.record.artist}</small>
                                <small>
                                  {active ? "Sessie loopt" : day(s.startedAt)}
                                </small>
                              </span>
                              <ArrowUpRight size={23} />
                            </button>
                            {!s.record.demo && <Source record={s.record} />}
                          </>
                        );
                      })()
                    ) : (
                      <div className="first-listen">
                        <Disc3 size={32} />
                        <p>
                          Je eerste luistermoment
                          <br />
                          begint met een plaat.
                        </p>
                        <span>Bevestigde sessies verschijnen hier.</span>
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}
            {page === "suggestion" &&
              (chosen ? (
                <section className="record-page">
                  <button className="back-link" onClick={() => go("home")}>
                    <ArrowLeft size={16} /> Terug naar thuis
                  </button>
                  <div className="record-layout">
                    <div className="record-visual">
                      <Cover record={chosen.record} />
                      <Source record={chosen.record} />
                    </div>
                    <div className="record-copy">
                      <div className="record-top">
                        <span className="eyebrow">
                          GESELECTEERD — NOG NIET AAN HET LUISTEREN
                        </span>
                        <Badge />
                      </div>
                      <h1>{chosen.record.title}</h1>
                      <p className="artist">{chosen.record.artist}</p>
                      <p className="record-meta">
                        {chosen.record.year || "Jaar onbekend"} <span>/</span>{" "}
                        {chosen.record.formats.join(", ")}
                      </p>
                      <div className="why">
                        <span className="eyebrow">
                          <Shuffle size={15} /> WAAROM DEZE PLAAT?
                        </span>
                        {chosen.reasons.map((r, i) => (
                          <p key={i}>{r}</p>
                        ))}
                      </div>
                      <Button
                        disabled={
                          !!active ||
                          !chosen.record.available ||
                          chosen.record.excluded ||
                          !chosen.record.isLP ||
                          stale
                        }
                        onClick={async () => {
                          if (
                            await mutate("/api/sessions/start", {
                              selectionId: chosen.id,
                            })
                          )
                            go("listening");
                        }}
                      >
                        <Disc3 size={19} /> Deze zet ik op{" "}
                        <ArrowUpRight size={21} />
                      </Button>
                      <Button
                        secondary
                        disabled={!!active || stale || !eligible.length}
                        onClick={() => void select()}
                      >
                        <Shuffle size={18} /> Andere plaat
                      </Button>
                      <p className="fineprint">
                        Pak de plaat, leg de naald neer en bevestig hier je
                        luistersessie. Draai detecteert geen muziek.
                      </p>
                      {detailNotice}
                      {storyFor(chosen.record)}
                    </div>
                  </div>
                </section>
              ) : (
                <Empty
                  title="Wat gaat er op?"
                  text="Kies eerst een plaat op de startpagina."
                />
              ))}
            {page === "listening" &&
              (active ? (
                <section className="listening-page">
                  <div className="page-heading">
                    <div>
                      <span className="eyebrow">
                        <span className="small-dot coral" /> HANDMATIG BEVESTIGD
                      </span>
                      <h1>
                        Nu <em>luisteren.</em>
                      </h1>
                    </div>
                    <Badge />
                  </div>
                  <div className="listen-grid">
                    <div className="listen-cover">
                      <Cover record={active.record} />
                      <div className="listen-release">
                        <h2>{active.record.title}</h2>
                        <p>{active.record.artist}</p>
                        <span>
                          {active.record.year || "Jaar onbekend"} ·{" "}
                          {active.record.formats.join(" / ")}
                        </span>
                      </div>
                      <Source record={active.record} />
                    </div>
                    <div className="listen-info">
                      <div className="session-line">
                        <Radio size={18} />
                        <span>
                          Gestart om{" "}
                          {new Date(active.startedAt).toLocaleTimeString(
                            "nl-NL",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </span>
                        <span className="no-track">Geen trackdetectie</span>
                      </div>
                      {detailNotice}
                      {storyFor(active.record)}
                      <details className="detail-section" open>
                        <summary>
                          Op deze plaat <ChevronDown size={19} />
                        </summary>
                        {active.record.tracks.length ? (
                          <ol className="track-list">
                            {active.record.tracks.map((t, i) => (
                              <li key={`${t.position}-${i}`}>
                                <span>
                                  {t.position || String(i + 1).padStart(2, "0")}
                                </span>
                                <strong>{t.title}</strong>
                                <span>{t.duration || "—"}</span>
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="muted detail-text">
                            Er is nog geen tracklijst beschikbaar voor deze
                            persing.
                          </p>
                        )}
                      </details>
                      <details className="detail-section">
                        <summary>
                          Achter de muziek <Plus size={19} />
                        </summary>
                        {active.record.credits.length ? (
                          <div className="credits">
                            {active.record.credits.map((c, i) => (
                              <div key={i}>
                                <strong>{c.name}</strong>
                                <span>
                                  {c.role}
                                  {c.tracks ? ` · ${c.tracks}` : ""}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="muted detail-text">
                            Voor deze persing zijn geen credits beschikbaar.
                          </p>
                        )}
                      </details>
                      <details className="detail-section">
                        <summary>
                          Over deze persing <Plus size={19} />
                        </summary>
                        <dl className="release-details">
                          <dt>Label</dt>
                          <dd>{active.record.label || "Niet bekend"}</dd>
                          <dt>Catalogus</dt>
                          <dd>
                            {active.record.catalogNumber || "Niet bekend"}
                          </dd>
                          <dt>Land</dt>
                          <dd>{active.record.country || "Niet bekend"}</dd>
                          <dt>Stijlen</dt>
                          <dd>
                            {active.record.styles.join(", ") || "Niet bekend"}
                          </dd>
                        </dl>
                        {active.record.notes && (
                          <p className="detail-text">{active.record.notes}</p>
                        )}
                      </details>
                      <div className="note-box">
                        <label htmlFor="session-note">
                          Een gedachte om te bewaren.
                        </label>
                        <textarea
                          id="session-note"
                          value={note}
                          maxLength={4000}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Die ene baslijn. Die mooie kant B. Wat blijft je bij?"
                        />
                        <span>
                          Je notitie wordt opgeslagen bij het afronden.
                        </span>
                      </div>
                      <Button
                        onClick={async () => {
                          if (
                            await mutate("/api/sessions/finish", {
                              sessionId: active.id,
                              note,
                            })
                          ) {
                            setToast("Een mooi luistermoment bewaard.");
                            go("history");
                          }
                        }}
                      >
                        <CheckCheck size={20} /> Sessie afronden{" "}
                        <ArrowRight size={20} />
                      </Button>
                    </div>
                  </div>
                </section>
              ) : (
                <Empty
                  title="De draaitafel is nog vrij."
                  text="Kies een plaat en bevestig met ‘Deze zet ik op’ om te beginnen."
                />
              ))}
            {page === "collection" && (
              <section className="collection-page">
                <div className="page-heading">
                  <div>
                    <span className="eyebrow">
                      {demo
                        ? "FICTIEVE PLATEN, ECHT ONTDEKKEN"
                        : "HERONTDEK WAT JE AL HEBT"}
                    </span>
                    <h1>
                      De <em>platenkast.</em>
                    </h1>
                  </div>
                  <Badge />
                </div>
                <div className="collection-toolbar">
                  <label className="search-field">
                    <Search size={19} />
                    <input
                      aria-label="Zoeken in de collectie"
                      placeholder="Zoek artiest, album of label"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                      <button
                        aria-label="Zoekopdracht wissen"
                        onClick={() => setSearch("")}
                      >
                        <X size={17} />
                      </button>
                    )}
                  </label>
                  <select
                    aria-label="Filter op formaat"
                    value={format}
                    onChange={(e) => setFormat(e.target.value)}
                  >
                    <option value="all">Alle formaten</option>
                    <option value="lp">Alleen LP’s</option>
                    <option value="other">Andere formaten</option>
                  </select>
                  <span className="record-count">
                    {filtered.length}{" "}
                    {filtered.length === 1 ? "plaat" : "platen"}
                  </span>
                </div>
                <div className="filter-tags">
                  {moods.map((m) => (
                    <button
                      className={tagFilter === m.id ? "selected" : ""}
                      key={m.id}
                      onClick={() => setTagFilter(m.id)}
                    >
                      {m.id === "alles" ? "Alles" : m.label}
                    </button>
                  ))}
                </div>
                {filtered.length ? (
                  <div className="record-grid">
                    {filtered.map((r, i) => (
                      <article
                        className={`collection-record ${r.excluded ? "excluded" : ""}`}
                        key={r.id}
                      >
                        <button
                          className="cover-button"
                          onClick={() =>
                            setExpanded(expanded === r.id ? null : r.id)
                          }
                          aria-expanded={expanded === r.id}
                        >
                          <Cover record={r} />
                          <span className="cover-index">
                            {String(i + 1).padStart(2, "0")} /{" "}
                            {r.formats[0] || "RELEASE"}
                          </span>
                          <span className="cover-plus" aria-hidden="true">
                            {expanded === r.id ? (
                              <X size={23} />
                            ) : (
                              <Plus size={23} />
                            )}
                          </span>
                          {r.excluded && (
                            <span className="excluded-badge">
                              Tijdelijk overgeslagen
                            </span>
                          )}
                        </button>
                        <div className="record-name">
                          <h2>{r.title}</h2>
                          <p>{r.artist}</p>
                          <span>
                            {r.year || "Jaar onbekend"} · {r.formats.join(", ")}
                          </span>
                          {!r.demo && <Source record={r} />}
                        </div>
                        {expanded === r.id && (
                          <div className="record-editor">
                            <span className="eyebrow">JOUW SFEERLABELS</span>
                            <div className="edit-tags">
                              {moods
                                .filter((m) => m.id !== "alles")
                                .map((m) => (
                                  <button
                                    key={m.id}
                                    disabled={actionDisabled}
                                    className={
                                      r.tags.includes(m.id) ? "selected" : ""
                                    }
                                    onClick={() =>
                                      void mutate(
                                        `/api/records/${encodeURIComponent(r.id)}`,
                                        {
                                          tags: r.tags.includes(m.id)
                                            ? r.tags.filter((t) => t !== m.id)
                                            : [...r.tags, m.id],
                                        },
                                        "PATCH",
                                      )
                                    }
                                  >
                                    {m.label}
                                    {r.tags.includes(m.id) && (
                                      <Check size={12} />
                                    )}
                                  </button>
                                ))}
                            </div>
                            <SeasonEditor
                              record={r}
                              disabled={actionDisabled}
                              onChange={(seasons) =>
                                void mutate(
                                  `/api/records/${encodeURIComponent(r.id)}`,
                                  { seasons },
                                  "PATCH",
                                )
                              }
                            />
                            <label className="exclude-switch">
                              <input
                                type="checkbox"
                                checked={r.excluded}
                                disabled={actionDisabled}
                                onChange={(e) =>
                                  void mutate(
                                    `/api/records/${encodeURIComponent(r.id)}`,
                                    { excluded: e.target.checked },
                                    "PATCH",
                                  )
                                }
                              />
                              Tijdelijk uitsluiten bij kiezen
                            </label>
                            <Button
                              secondary
                              disabled={
                                !!active ||
                                !r.available ||
                                !r.isLP ||
                                r.excluded ||
                                stale
                              }
                              onClick={() => void select(r.id)}
                            >
                              Deze plaat kiezen <ArrowUpRight size={17} />
                            </Button>
                            {(active ||
                              !r.available ||
                              !r.isLP ||
                              r.excluded) && (
                              <small>
                                {active
                                  ? "Rond eerst je huidige sessie af."
                                  : r.excluded
                                    ? "Haal deze plaat uit de uitsluiting om hem te kiezen."
                                    : !r.available
                                      ? "Deze plaat is momenteel niet beschikbaar."
                                      : "Draai kiest in deze versie alleen LP’s."}
                              </small>
                            )}
                            <Source record={r} />
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <Empty
                    title={
                      search || tagFilter !== "alles"
                        ? "Even verder zoeken."
                        : "De kast is nog leeg."
                    }
                    text={
                      search || tagFilter !== "alles"
                        ? "Geen platen met deze zoekopdracht of filters."
                        : "Koppel Discogs en synchroniseer je collectie via instellingen."
                    }
                  />
                )}
                <div className="collection-end">
                  <BrandStar className="empty-star" />
                  <p>
                    {demo
                      ? "Deze zes platen zijn speciaal voor deze demo verzonnen."
                      : "Een goede plaat verdient het om weer uit de kast te komen."}
                  </p>
                </div>
              </section>
            )}
            {page === "history" && (
              <section className="history-page">
                <div className="page-heading">
                  <div>
                    <span className="eyebrow">BEWAAR HET MOMENT</span>
                    <h1>
                      Mooi <em>gedraaid.</em>
                    </h1>
                  </div>
                  <Badge />
                </div>
                <ListeningStats
                  history={state.history}
                  records={records}
                  demo={demo}
                />
                {active && (
                  <button
                    className="active-history"
                    onClick={() => go("listening")}
                  >
                    <Radio size={20} />
                    <span>
                      Je luistert nu naar <strong>{active.record.title}</strong>
                    </span>
                    <ArrowRight size={20} />
                  </button>
                )}
                {active && !active.record.demo && (
                  <Source record={active.record} />
                )}{" "}
                {state.history.length ? (
                  <div className="history-list">
                    {state.history.map((s, i) => (
                      <article className="history-entry" key={s.id}>
                        <div className="history-number">
                          {String(state.history.length - i).padStart(2, "0")}
                        </div>
                        <Cover record={s.record} />
                        <div className="history-details">
                          <span className="eyebrow">{day(s.startedAt)}</span>
                          <h2>{s.record.title}</h2>
                          <p>{s.record.artist}</p>
                          {s.note && <blockquote>“{s.note}”</blockquote>}
                          <span className="history-time">
                            {s.endedAt
                              ? `${formatRegisteredDuration(Date.parse(s.endedAt) - Date.parse(s.startedAt))} geregistreerd`
                              : "Sessie loopt"}
                          </span>
                          {!s.record.demo && <Source record={s.record} />}
                        </div>
                        <button
                          className="history-replay icon-button"
                          title={`Kies ${s.record.title} opnieuw`}
                          disabled={
                            actionDisabled ||
                            !!active ||
                            stale ||
                            !s.record.available ||
                            s.record.excluded ||
                            !s.record.isLP
                          }
                          onClick={() => void select(s.record.id)}
                        >
                          <ArrowUpRight size={23} />
                        </button>
                      </article>
                    ))}
                  </div>
                ) : (
                  <Empty
                    title="De eerste kant moet nog beginnen."
                    text="Je bevestigde luistersessies verschijnen hier. Met ruimte voor de gedachten die je wilt bewaren."
                  />
                )}
              </section>
            )}
            {page === "settings" && (
              <section className="settings-page">
                <div className="page-heading">
                  <div>
                    <span className="eyebrow">EEN GOEDE BASIS</span>
                    <h1>
                      Achter de <em>schermen.</em>
                    </h1>
                  </div>
                  <Badge />
                </div>
                <div className="settings-grid">
                  <section className="settings-block">
                    <div className="settings-block-head">
                      <Disc3 size={24} />
                      <h2>Je Discogs-collectie</h2>
                      <span
                        className={`status-pill ${state.settings.discogsConfigured ? "good" : ""}`}
                      >
                        {state.settings.discogsConfigured
                          ? "Gekoppeld"
                          : "Niet gekoppeld"}
                      </span>
                    </div>
                    <p>
                      {demo
                        ? "Je kijkt nu rond met zes fictieve platen. Koppel je eigen collectie om Draai persoonlijk te maken."
                        : `Verbonden met de collectie van ${state.settings.username}.`}
                    </p>
                    <dl className="settings-data">
                      <dt>Gebruikersnaam</dt>
                      <dd>{state.settings.username}</dd>
                      <dt>Laatste synchronisatie</dt>
                      <dd>{stamp(state.sync.lastSuccess)}</dd>
                      <dt>Collectiegegevens</dt>
                      <dd>
                        {demo
                          ? "Voorbeeldgegevens"
                          : stale
                            ? "Vernieuwing nodig"
                            : "Actueel"}
                      </dd>
                    </dl>
                    {!state.settings.discogsConfigured && (
                      <div className="setup-note">
                        Stel <code>DISCOGS_TOKEN</code> en{" "}
                        <code>DISCOGS_USERNAME</code> in op de server en
                        herstart Draai. Je persoonlijke token blijft op de
                        server.
                      </div>
                    )}
                    {state.sync.error && (
                      <p className="inline-error">{state.sync.error}</p>
                    )}
                    {state.sync.running && (
                      <p className="sync-progress" role="status">
                        <RefreshCw size={15} className="spin" />
                        {state.sync.progress || "Collectie synchroniseren…"}
                      </p>
                    )}
                    <Button
                      secondary
                      disabled={
                        !state.settings.discogsConfigured || state.sync.running
                      }
                      onClick={() => void mutate("/api/sync")}
                    >
                      <RefreshCw size={17} />{" "}
                      {state.sync.running
                        ? "Bezig met synchroniseren"
                        : "Collectie synchroniseren"}
                    </Button>
                    <p className="fineprint">
                      Draai probeert de basis van je collectie elke 5 uur te
                      vernieuwen. Tracks en credits worden met voorrang
                      opgehaald wanneer je een plaat kiest of de luistersessie
                      opent. Verouderde Discogs-gegevens worden verborgen totdat
                      ze opnieuw zijn opgehaald.
                    </p>
                  </section>
                  <section className="settings-block">
                    <div className="settings-block-head">
                      <CloudSun size={24} />
                      <h2>Het weer buiten</h2>
                      <span
                        className={`status-pill ${state.weather.status === "fresh" ? "good" : ""}`}
                      >
                        {state.weather.status === "fresh"
                          ? "Actueel"
                          : state.weather.status === "unconfigured"
                            ? "Niet gekoppeld"
                            : "Niet actueel"}
                      </span>
                    </div>
                    <p>
                      Bekijk hier je stationsmeting. Het weer weegt alleen mee
                      als je dit zelf op de startpagina inschakelt én hieronder
                      eigen weerverbanden hebt ingesteld. Regen betekent niet
                      automatisch jazz.
                    </p>
                    <dl className="settings-data">
                      <dt>Weerstation</dt>
                      <dd>{state.weather.stationId}</dd>
                      <dt>Laatste meting</dt>
                      <dd>{stamp(state.weather.observedAt)}</dd>
                      {state.weather.status === "fresh" && (
                        <>
                          <dt>Temperatuur</dt>
                          <dd>{state.weather.temperature ?? "—"} °C</dd>
                          <dt>Regen</dt>
                          <dd>{state.weather.rainRate ?? "—"} mm/uur</dd>
                        </>
                      )}
                    </dl>
                    <div className="setup-note">
                      {state.weather.message ||
                        "Geen actuele weergegevens beschikbaar."}
                      {!state.settings.weatherConfigured && (
                        <p>
                          Stel een Weather Underground-leessleutel in als{" "}
                          <code>WU_API_KEY</code> op de server.
                        </p>
                      )}
                    </div>
                    <Button
                      secondary
                      disabled={!state.settings.weatherConfigured}
                      onClick={() => void mutate("/api/weather/refresh")}
                    >
                      <RefreshCw size={17} /> Meting vernieuwen
                    </Button>
                  </section>
                  <section className="settings-block">
                    <div className="settings-block-head">
                      <Monitor size={24} />
                      <h2>Een scherm voor de muziek</h2>
                    </div>
                    <p>
                      Open de rustige schermweergave op een tweede scherm. Een
                      bevestigde luistersessie verschijnt daar vanzelf.
                    </p>
                    <Button secondary onClick={() => go("display")}>
                      Open schermweergave <ArrowUpRight size={18} />
                    </Button>
                    <p className="fineprint">
                      Geen automatische afspeel- of trackdetectie. Draai volgt
                      wat je hier bevestigt.
                    </p>
                  </section>
                  <PreferencesEditor
                    preferences={state.preferences}
                    styles={[
                      ...new Set(records.flatMap((record) => record.styles)),
                    ].sort((a, b) => a.localeCompare(b, "nl"))}
                    genres={[
                      ...new Set(records.flatMap((record) => record.genres)),
                    ].sort((a, b) => a.localeCompare(b, "nl"))}
                    disabled={actionDisabled}
                    onSave={(preferences) =>
                      mutate("/api/preferences", preferences, "PATCH")
                    }
                  />
                  <section className="settings-block enrichment-settings">
                    <div className="settings-block-head">
                      <BookOpen size={24} />
                      <h2>Verhalen &amp; muziekkalender</h2>
                      <span
                        className={`status-pill ${linkedAlbums ? "good" : ""}`}
                      >
                        {state.enrichment?.running
                          ? "Bezig"
                          : !wikiAllowed
                            ? "Niet ingeschakeld"
                            : state.mode === "demo"
                              ? "Fictieve voorbeelden"
                              : `${linkedAlbums} gekoppeld`}
                      </span>
                    </div>
                    <p>
                      Een albumverhaal van Wikipedia, met echte muziekdatums uit
                      Wikidata. Geboorte- en overlijdensdagen of een releasedag
                      kunnen de keuze van vandaag een klein extra gewicht geven.
                      Je kunt dat op de startpagina uitzetten.
                    </p>
                    <dl className="settings-data">
                      <dt>
                        {state.mode === "demo"
                          ? "Voorbeeldverhalen"
                          : "Gekoppelde albums"}
                      </dt>
                      <dd>{linkedAlbums}</dd>
                      <dt>Nog zonder koppeling</dt>
                      <dd>{records.length - linkedAlbums}</dd>
                      <dt>Laatste achtergrondcontrole</dt>
                      <dd>{stamp(state.enrichment?.lastSuccess || null)}</dd>
                    </dl>
                    <div className="setup-note">
                      Draai koppelt via het exacte Discogs-master-ID en de
                      exacte Discogs-artiest-ID’s in Wikidata. Dezelfde titel of
                      artiestnaam is geen bewijs. Ontbrekende of dubbelzinnige
                      koppelingen blijven leeg; er worden geen verhalen of
                      verjaardagen verzonnen. Geen API-sleutel nodig.
                    </div>
                    <div className="setup-note">
                      Voor deze koppeling stuurt Draai Discogs-album- en
                      artiest-ID’s naar Wikidata en vraagt artikeltekst op bij
                      Wikipedia. Je luistergeschiedenis en notities blijven
                      hier.
                      {!wikiAllowed && (
                        <p>
                          Schakel deze koppeling bewust in met{" "}
                          <code>WIKI_ENABLED=true</code> op de server en
                          herstart Draai. Tot die tijd worden er geen
                          Wiki-aanvragen gedaan.
                        </p>
                      )}
                    </div>
                    {demo && (
                      <p className="fineprint">
                        De voorbeeldcollectie gebruikt fictieve verhalen en een
                        vast fictief kalendervoorbeeld op 28 oktober. De demo
                        doet geen echte Wikipedia-koppelingen.
                      </p>
                    )}
                    {state.enrichment?.running && (
                      <p className="sync-progress" role="status">
                        <RefreshCw size={15} className="spin" />
                        {state.enrichment.progress ||
                          "Albuminformatie bijwerken…"}
                      </p>
                    )}
                    {state.enrichment?.error && (
                      <p className="inline-error">{state.enrichment.error}</p>
                    )}
                    <Button
                      secondary
                      disabled={
                        !!state.enrichment?.running ||
                        !records.length ||
                        !wikiAllowed
                      }
                      onClick={() => void mutate("/api/enrichment/refresh")}
                    >
                      <RefreshCw size={17} />
                      {state.enrichment?.running
                        ? "Informatie wordt opgehaald"
                        : "Albumverhalen bijwerken"}
                    </Button>
                    <p className="fineprint">
                      De achtergrondcontrole ververst Wiki-informatie met een
                      eigen bewaartermijn. Samenvattingen linken naar het
                      artikel, de auteursgeschiedenis en CC BY-SA. Een
                      albumdatum volgens Wikidata is niet automatisch de datum
                      van je specifieke persing.
                    </p>
                  </section>
                  <section className="settings-block about-block">
                    <span className="brand">
                      draai<span>·</span>
                    </span>
                    <h2>Een plaat. Alle aandacht.</h2>
                    <p>
                      Gemaakt om je eigen platen opnieuw te ontdekken. Zonder
                      algoritmische haast.
                    </p>
                    <p className="fineprint">
                      {demo
                        ? "De huidige collectie, hoesillustraties, tracks en credits zijn fictieve voorbeeldgegevens. "
                        : ""}
                      <a
                        href="https://www.discogs.com"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Data provided by Discogs <ArrowUpRight size={12} />
                      </a>
                      . This application uses Discogs’ API but is not affiliated
                      with, sponsored or endorsed by Discogs. ‘Discogs’ is a
                      trademark of Zink Media, LLC.
                    </p>
                    <button
                      className="text-link"
                      disabled={actionDisabled}
                      onClick={async () => {
                        setBusy(true);
                        try {
                          const r = await fetch("/api/health");
                          if (!r.ok) throw Error();
                          setToast("Verbinding met Draai werkt.");
                        } catch {
                          setError("De server is niet bereikbaar.");
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Verbinding testen <ArrowRight size={17} />
                    </button>
                  </section>
                </div>
              </section>
            )}
          </>
        )}
      </main>
      <footer className="footer">
        <span className="brand">
          draai<span>·</span>
        </span>
        <span>Je platen verdienen aandacht.</span>
        <span>
          {demo ? (
            "DEMO · FICTIEVE VOORBEELDCOLLECTIE"
          ) : (
            <a href="https://www.discogs.com" target="_blank" rel="noreferrer">
              Data provided by Discogs ↗
            </a>
          )}
        </span>
      </footer>
      <nav className="mobile-nav" aria-label="Hoofdnavigatie">
        {nav.map((n) => (
          <button
            key={n.id}
            onClick={() => go(n.id)}
            className={
              page === n.id ||
              (n.id === "home" && ["suggestion", "listening"].includes(page))
                ? "nav-active"
                : ""
            }
          >
            <n.icon size={21} />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
      {toast && (
        <div role="status" className="toast">
          <Check size={18} />
          {toast}
        </div>
      )}
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
