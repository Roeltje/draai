import type { ListeningSession, RecordItem } from "../shared/types";

export function formatRegisteredDuration(durationMs: number): string {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return "0 min";
  if (durationMs < 60000) return "<1 min";
  const minutes = Math.round(durationMs / 60000);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)} u ${minutes % 60} min`
    : `${minutes} min`;
}

export function listeningStats(
  history: ListeningSession[],
  collection: RecordItem[],
) {
  const completed = history.filter((session) => session.endedAt !== null);
  const listenedIds = new Set(completed.map((session) => session.record.id));
  const eligibleIds = new Set(
    collection
      .filter((record) => record.available && record.isLP)
      .map((record) => record.id),
  );
  const discovered = [...eligibleIds].filter((id) =>
    listenedIds.has(id),
  ).length;
  const durationMs = completed.reduce((sum, session) => {
    const start = Date.parse(session.startedAt),
      end = Date.parse(session.endedAt!);
    return (
      sum +
      (Number.isFinite(start) && Number.isFinite(end)
        ? Math.max(0, end - start)
        : 0)
    );
  }, 0);
  return {
    sessions: completed.length,
    uniqueRecords: listenedIds.size,
    durationMs,
    collectionSize: eligibleIds.size,
    discovered,
    discoveryPercent: eligibleIds.size
      ? Math.round((discovered / eligibleIds.size) * 100)
      : null,
  };
}
