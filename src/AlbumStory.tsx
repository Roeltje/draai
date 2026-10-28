import { ArrowUpRight, BookOpen, RefreshCw } from "lucide-react";
import type { RecordItem, MusicDate } from "../shared/types";

const dateLabels: Record<MusicDate["kind"], string> = {
  release: "Releasedatum volgens Wikidata",
  birth: "Geboortedag",
  death: "Overlijdensdag",
};
function musicDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime())
    ? new Intl.DateTimeFormat("nl-NL", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(parsed)
    : value;
}
function historyUrl(value: string) {
  try {
    const url = new URL(value);
    url.searchParams.set("action", "history");
    return url.href;
  } catch {
    return value;
  }
}
export function AlbumStory({
  record,
  busy,
  disabled,
  needsWikiSetup,
  onRefresh,
}: {
  record: RecordItem;
  busy: boolean;
  disabled: boolean;
  needsWikiSetup: boolean;
  onRefresh: () => void;
}) {
  const info = record.albumInfo;
  const isDemo = record.demo || info?.demo;
  const statusText = !info
    ? "Nog geen gecontroleerd albumverhaal. Draai zoekt via de exacte Discogs-koppeling, zonder op artiestnaam of titel te gokken."
    : {
        ready:
          info.summary ||
          "Deze plaat is gekoppeld aan Wikidata. Er is nog geen Wikipedia-samenvatting beschikbaar.",
        not_found:
          "Nog geen betrouwbare koppeling met Wikipedia of Wikidata gevonden. Je kunt de informatie later opnieuw ophalen.",
        ambiguous:
          "Er zijn meerdere mogelijke koppelingen. Draai toont geen verhaal totdat het juiste album vaststaat.",
        error:
          "Albuminformatie kon niet worden opgehaald. Je kunt gewoon blijven luisteren en het later opnieuw proberen.",
      }[info.status];
  return (
    <section className="album-story" aria-label="Albumverhaal en muziekdatums">
      <div className="story-heading">
        <BookOpen size={18} />
        <h2>Het verhaal achter de plaat</h2>
        {isDemo && <span className="story-demo">DEMO</span>}
      </div>
      <p className="story-summary">{statusText}</p>
      {isDemo && (
        <p className="story-note">
          Fictief albumverhaal en fictieve datums, speciaal voor de
          voorbeeldcollectie. Geen Wikipedia-feiten.
        </p>
      )}
      {!!info?.dates.length && (
        <dl className="music-dates">
          {info.dates.map((entry, index) => (
            <div key={`${entry.kind}-${entry.date}-${index}`}>
              <dt>
                {isDemo && entry.kind === "release"
                  ? "Voorbeeldreleasedatum"
                  : dateLabels[entry.kind]}
                {entry.kind !== "release" && <span> · {entry.subject}</span>}
              </dt>
              <dd>
                {musicDate(entry.date)}
                {!isDemo && entry.sourceUrl && (
                  <a
                    href={entry.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Bron voor ${dateLabels[entry.kind].toLowerCase()} van ${entry.subject}`}
                  >
                    <ArrowUpRight size={13} />
                  </a>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {info?.dates.some((entry) => entry.kind === "release") && (
        <p className="story-note">
          {isDemo
            ? "Fictieve albumdatum voor deze demo."
            : "Albumdatum volgens Wikidata; kan per gebied verschillen."}{" "}
          Dit is niet de datum van deze persing
          {!isDemo && record.year
            ? ` (jaar van deze uitgave volgens Discogs: ${record.year})`
            : ""}
          .
        </p>
      )}
      {!isDemo && info?.status === "ready" && (
        <div className="wiki-sources">
          {info.wikipediaUrl && (
            <a href={info.wikipediaUrl} target="_blank" rel="noreferrer">
              Wikipedia ·{" "}
              {info.language === "nl"
                ? "Nederlands"
                : info.language === "en"
                  ? "Engels"
                  : info.language || "artikel"}{" "}
              <ArrowUpRight size={12} />
            </a>
          )}
          {info.wikidataUrl && (
            <a href={info.wikidataUrl} target="_blank" rel="noreferrer">
              Wikidata · datums <ArrowUpRight size={12} />
            </a>
          )}
          {info.summary && info.wikipediaUrl && (
            <span>
              Ingekort fragment uit Wikipedia ·{" "}
              <a
                href={historyUrl(info.wikipediaUrl)}
                target="_blank"
                rel="noreferrer"
              >
                Auteurs en bewerkingsgeschiedenis
              </a>{" "}
              ·{" "}
              <a
                href="https://creativecommons.org/licenses/by-sa/4.0/"
                target="_blank"
                rel="noreferrer"
              >
                CC BY-SA 4.0
              </a>
            </span>
          )}
          {info.checkedAt && (
            <span>
              Gecontroleerd op {musicDate(info.checkedAt.slice(0, 10))}
            </span>
          )}
        </div>
      )}
      {needsWikiSetup && (
        <p className="story-note">
          De Wiki-koppeling is nog niet ingeschakeld. Bekijk bij Instellingen
          wat er wordt gedeeld en stel daarna op de server{" "}
          <code>WIKI_ENABLED=true</code> in.
        </p>
      )}
      <button
        type="button"
        className="story-refresh"
        onClick={onRefresh}
        disabled={disabled}
      >
        <RefreshCw size={14} className={busy ? "spin" : ""} />
        {busy ? "Albuminformatie ophalen…" : "Albuminformatie ophalen"}
      </button>
    </section>
  );
}
