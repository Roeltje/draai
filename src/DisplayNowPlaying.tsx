import type { ReactNode } from "react";
import type { ListeningSession, WeatherState } from "../shared/types";
import {
  displayCredits,
  formatDisplayDate,
  formatDisplayTime,
  groupTracks,
  playStats,
  recordMeta,
} from "./displayInfo";

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
  return (
    <div className={`display-tracks ${className}`}>
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
  history,
  weather,
  demo,
  cover,
  source,
}: {
  session: ListeningSession;
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
      <div className="display-text">
        <span className="eyebrow">NU LUISTEREN {demo ? " / DEMO" : ""}</span>
        <h1>{record.title}</h1>
        <h2>{record.artist}</h2>
        {meta && <p className="display-meta display-layer-medium">{meta}</p>}
        <Tracklist
          tracks={record.tracks}
          limit={12}
          className="display-layer-medium display-layer-not-large"
        />
        <Tracklist
          tracks={record.tracks}
          limit={24}
          className="display-layer-large"
        />
        <div className="display-extra display-layer-large">
          {credits.length > 0 && (
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
          {weatherText && weather.observedAt && (
            <p>
              Buiten: {weatherText} · gemeten om{" "}
              {formatDisplayTime(weather.observedAt)}
            </p>
          )}
          {stats.count > 0 && stats.lastAt && (
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
