import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AlbumInfo,
  ListeningSession,
  WeatherState,
} from "../shared/types";
import {
  displayCredits,
  formatDisplayDate,
  formatDisplayTime,
  groupTracks,
  playStats,
  recordMeta,
} from "./displayInfo";
import { wholeSentences } from "./wikiText";

function Tracklist({
  tracks,
  limit,
  className,
}: {
  tracks: ListeningSession["record"]["tracks"];
  limit: number;
  className: string;
}) {
  const { groups, hidden } = groupTracks(tracks, limit);
  if (!groups.length) return null;
  const count = groups.reduce((sum, group) => sum + group.tracks.length, 0);
  return (
    <div className={`display-tracks ${count > 14 ? "dense" : ""} ${className}`}>
      {groups.map((group, i) => (
        <section key={`${group.side}-${i}`}>
          {group.side && <h3>Kant {group.side}</h3>}
          <ol>
            {group.tracks.map((track, j) => (
              <li key={`${track.position}-${j}`}>
                <span>{track.position}</span>
                <span>{track.title}</span>
                <span>{track.duration}</span>
              </li>
            ))}
          </ol>
        </section>
      ))}
      {hidden > 0 && <p className="display-more">+ {hidden} meer</p>}
    </div>
  );
}

export function DisplayNowPlaying({
  session,
  albumInfo,
  history,
  weather,
  demo,
  cover,
  source,
}: {
  session: ListeningSession;
  albumInfo?: AlbumInfo;
  history: ListeningSession[];
  weather: WeatherState;
  demo: boolean;
  cover: ReactNode;
  source: ReactNode;
}) {
  const { record } = session;
  const meta = recordMeta(record);
  const { credits, hidden: moreCredits } = displayCredits(record.credits);
  const stats = playStats(history, record, session.id);
  const story =
    albumInfo?.status === "ready" ? wholeSentences(albumInfo.summary, 320) : "";
  // Extras drop out whole, least important first, until everything fits:
  // story, then credits, then weather and play count. The tracklist always wins.
  const textRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(() => `${innerWidth}x${innerHeight}`);
  useEffect(() => {
    const onResize = () => setSize(`${innerWidth}x${innerHeight}`);
    addEventListener("resize", onResize);
    return () => removeEventListener("resize", onResize);
  }, []);
  const fitKey = `${record.id}|${size}|${story}`;
  const [dropped, setDropped] = useState({ key: "", level: 0 });
  const level = dropped.key === fitKey ? dropped.level : 0;
  const showStory = !!story && level < 1;
  useLayoutEffect(() => {
    const text = textRef.current;
    if (level < 3 && text && text.scrollHeight > text.clientHeight + 1)
      setDropped({ key: fitKey, level: level + 1 });
  });
  const fresh = weather.status === "fresh";
  const rain = weather.rainRate ?? 0;
  const weatherText = fresh
    ? [
        weather.temperature !== null
          ? `${Math.round(weather.temperature * 10) / 10} °C`
          : "",
        rain > 0 ? `${rain} mm/uur regen` : "",
      ]
        .filter(Boolean)
        .join(" · ")
    : "";
  return (
    <div className="display-content">
      {cover}
      <div className="display-text" ref={textRef}>
        <span className="eyebrow">NU LUISTEREN {demo ? " / DEMO" : ""}</span>
        <h1>{record.title}</h1>
        <h2>{record.artist}</h2>
        {meta && <p className="display-meta display-layer-medium">{meta}</p>}
        <Tracklist
          tracks={record.tracks}
          limit={32}
          className="display-layer-medium display-layer-not-large"
        />
        <Tracklist
          tracks={record.tracks}
          limit={48}
          className="display-layer-large"
        />
        {showStory && (
          <div className="display-story display-layer-large">
            <p>{story}</p>
            <p className="display-story-source">
              {albumInfo?.demo
                ? "Fictief albumverhaal (demo)"
                : `Wikipedia${albumInfo?.language ? ` (${albumInfo.language})` : ""} · CC BY-SA 4.0`}
            </p>
          </div>
        )}
        <div className="display-extra display-layer-large">
          {level < 2 && credits.length > 0 && (
            <div className="display-credits">
              <h3>Credits</h3>
              <ul>
                {credits.map((c, i) => (
                  <li key={`${c.name}-${c.role}-${i}`}>
                    {c.role ? `${c.role} — ` : ""}
                    {c.name}
                  </li>
                ))}
                {moreCredits > 0 && <li>+ {moreCredits} meer</li>}
              </ul>
            </div>
          )}
          {level < 3 && weatherText && weather.observedAt && (
            <p>
              Buiten: {weatherText} · gemeten om{" "}
              {formatDisplayTime(weather.observedAt)}
            </p>
          )}
          {level < 3 && stats.count > 0 && stats.lastAt && (
            <p>
              Eerder gedraaid: {stats.count}×, laatst op{" "}
              {formatDisplayDate(stats.lastAt)}
            </p>
          )}
        </div>
        <p className="muted display-note">
          Handmatig bevestigd · geen trackdetectie
        </p>
        {source}
      </div>
    </div>
  );
}
