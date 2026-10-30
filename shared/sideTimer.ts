import type { RecordItem, SideTimerState, TimerTarget } from "./types.ts";

export const DEFAULT_SIDE_TIMER_SETTINGS = { enabled: false, graceMinutes: 3 };
const MAX_TRACK_SECONDS = 3 * 60 * 60;
const MAX_TARGET_SECONDS = 6 * 60 * 60;

function durationSeconds(value: string | undefined): number | null {
  if (!value) return null;
  const text = value.trim();
  if (!/^\d{1,3}:\d{2}$/.test(text) && !/^\d{1,2}:\d{2}:\d{2}$/.test(text))
    return null;
  const parts = text.split(":").map(Number);
  if (parts.at(-1)! >= 60 || (parts.length === 3 && parts[1]! >= 60))
    return null;
  const seconds = parts.reduce((total, part) => total * 60 + part, 0);
  return seconds > 0 && seconds <= MAX_TRACK_SECONDS ? seconds : null;
}

export function timerTargets(record: RecordItem): {
  targets: TimerTarget[];
  reason: string;
} {
  const unavailable = (reason: string) => ({ targets: [], reason });
  if (
    !record.isLP ||
    !record.formats.some((format) => /^vinyl$/i.test(format)) ||
    record.formats.some((format) =>
      /\b(?:cd|dvd|blu[ -]?ray|cassette|shellac)\b/i.test(format),
    )
  )
    return unavailable("Alleen eenduidige vinyl-LP’s ondersteunen een timer.");
  if (!record.tracks.length)
    return unavailable("Er zijn nog geen betrouwbare speeltijden beschikbaar.");
  if (record.tracks.some((track) => track.type === "index"))
    return unavailable(
      "Trackgroepen geven geen betrouwbare afzonderlijke speeltijden.",
    );
  const positions = record.tracks.map((track) =>
    track.position.trim().toUpperCase(),
  );
  const sidePositions = positions.map((position) =>
    /^([A-Z])([1-9]\d*)?$/.exec(position),
  );
  if (sidePositions.some(Boolean)) {
    if (sidePositions.some((position) => !position))
      return unavailable(
        "De kantindeling bevat gemengde of onduidelijke trackposities.",
      );
    const numbered = sidePositions[0]![2] !== undefined;
    if (
      sidePositions.some(
        (position) => (position![2] !== undefined) !== numbered,
      ) ||
      new Set(positions).size !== positions.length
    )
      return unavailable("De kantindeling bevat dubbele of gemengde posities.");
    const sides = new Map<string, number[]>();
    sidePositions.forEach((position, index) =>
      sides.set(position![1]!, [...(sides.get(position![1]!) ?? []), index]),
    );
    const targets: TimerTarget[] = [];
    for (const [side, indices] of sides) {
      if (
        numbered &&
        indices.some(
          (index, offset) => Number(sidePositions[index]![2]) !== offset + 1,
        )
      )
        continue;
      const durations = indices.map((index) =>
        durationSeconds(record.tracks[index]!.duration),
      );
      if (durations.some((duration) => duration === null)) continue;
      const duration = durations.reduce<number>(
        (total, seconds) => total + seconds!,
        0,
      );
      if (duration <= MAX_TARGET_SECONDS)
        targets.push({
          id: `side-${side}`,
          kind: "side",
          label: `Kant ${side}`,
          durationSeconds: duration,
        });
    }
    return {
      targets,
      reason: targets.length
        ? targets.length < sides.size
          ? "Alleen kanten met complete, betrouwbare speeltijden zijn beschikbaar."
          : "Gebaseerd op de opgegeven speeltijden per kant."
        : "Geen kant heeft complete, betrouwbare speeltijden.",
    };
  }
  if (
    positions.some(
      (position, index) =>
        !/^[1-9]\d*$/.test(position) || Number(position) !== index + 1,
    )
  )
    return unavailable(
      "De trackposities geven geen betrouwbare kant- of albumindeling.",
    );
  const durations = record.tracks.map((track) =>
    durationSeconds(track.duration),
  );
  if (durations.some((duration) => duration === null))
    return unavailable(
      "Een albumtimer vereist een betrouwbare speeltijd voor iedere track.",
    );
  const duration = durations.reduce<number>(
    (total, seconds) => total + seconds!,
    0,
  );
  if (duration > MAX_TARGET_SECONDS)
    return unavailable(
      "De opgegeven albumspeelduur is te lang voor een betrouwbare timer.",
    );
  return {
    targets: [
      { id: "album", kind: "album", label: "Album", durationSeconds: duration },
    ],
    reason:
      "Geen kantindeling bekend; alleen de complete albumspeelduur is beschikbaar.",
  };
}

export function timerProgress(
  timer: SideTimerState,
  now: number,
): {
  elapsedSeconds: number;
  remainingSeconds: number;
  progress: number;
  due: boolean;
} {
  const effectiveNow = timer.pausedAt ? Date.parse(timer.pausedAt) : now;
  const elapsedSeconds = Math.max(
    0,
    (effectiveNow - Date.parse(timer.startedAt)) / 1000 - timer.pausedSeconds,
  );
  const remainingSeconds = Math.max(
    0,
    timer.target.durationSeconds - elapsedSeconds,
  );
  const progress = Math.min(1, elapsedSeconds / timer.target.durationSeconds);
  const due =
    !timer.pausedAt &&
    !timer.dismissed &&
    elapsedSeconds >= timer.target.durationSeconds + timer.graceMinutes * 60 &&
    (!timer.snoozedUntil || now >= Date.parse(timer.snoozedUntil));
  return { elapsedSeconds, remainingSeconds, progress, due };
}
