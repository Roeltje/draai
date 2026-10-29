import type { ListeningSession, RecordItem } from "../shared/types";
import { listeningStats, formatRegisteredDuration } from "./listeningStats";

export function ListeningStats({
  history,
  records,
  demo,
}: {
  history: ListeningSession[];
  records: RecordItem[];
  demo: boolean;
}) {
  const stats = listeningStats(history, records);
  const duration = formatRegisteredDuration(stats.durationMs);
  return (
    <section
      className="listening-stats"
      aria-label="Je geregistreerde luistermomenten"
    >
      <div className="stats-heading">
        <span className="eyebrow">
          {demo ? "JE EIGEN SESSIES IN DE DEMO" : "JE LUISTERMOMENTEN IN BEELD"}
        </span>
        <p>
          {stats.sessions
            ? "Elke plaat telt."
            : "De eerste plaat moet nog beginnen."}
        </p>
      </div>
      <dl className="stats-values">
        <div>
          <dt>Afgeronde sessies</dt>
          <dd>{stats.sessions}</dd>
        </div>
        <div>
          <dt>Verschillende platen</dt>
          <dd>{stats.uniqueRecords}</dd>
        </div>
        <div>
          <dt>Geregistreerde sessietijd</dt>
          <dd className="stats-duration">{duration}</dd>
        </div>
        <div>
          <dt>Je LP-collectie ontdekt</dt>
          <dd>
            {stats.discoveryPercent === null
              ? "—"
              : `${stats.discoveryPercent}%`}
          </dd>
          <span>
            {stats.collectionSize
              ? `${stats.discovered} van ${stats.collectionSize} beschikbare LP’s`
              : "Nog geen beschikbare LP’s"}
          </span>
        </div>
      </dl>
      <p className="stats-note">
        Gebaseerd op handmatig bevestigde en afgeronde sessies. De
        geregistreerde tijd is geen meting van werkelijk afgespeelde muziek.
        {demo
          ? " Dit zijn alleen de sessies die je zelf in de voorbeeldcollectie hebt gemaakt."
          : ""}
      </p>
    </section>
  );
}
