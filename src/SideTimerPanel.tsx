import { useEffect, useState } from "react";
import { Clock3, Pause, Play, Square, Timer } from "lucide-react";
import type { RecordItem, SideTimerState } from "../shared/types";
import { timerProgress, timerTargets } from "../shared/sideTimer";

type TimerAction = "start" | "pause" | "resume" | "snooze" | "dismiss" | "stop";
const duration = (seconds: number) => {
  const total = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};
export function SideTimerPanel({
  record,
  sessionId,
  timer,
  graceMinutes,
  disabled,
  onCommand,
}: {
  record: RecordItem;
  sessionId: string;
  timer: SideTimerState | null;
  graceMinutes: number;
  disabled: boolean;
  onCommand: (body: {
    action: TimerAction;
    sessionId: string;
    expectedTimerId: string | null;
    targetId?: string;
  }) => Promise<boolean>;
}) {
  const { targets, reason } = timerTargets(record);
  const defaultTarget =
    targets.find((target) => target.id === "side-A") || targets[0];
  const [targetId, setTargetId] = useState(defaultTarget?.id || "");
  const [now, setNow] = useState(Date.now);
  const active = timer?.sessionId === sessionId ? timer : null;
  const running = !!active && !active.pausedAt && !active.dismissed;
  useEffect(() => {
    if (!targets.some((target) => target.id === targetId))
      setTargetId(defaultTarget?.id || "");
  }, [targets, targetId, defaultTarget]);
  useEffect(() => {
    setNow(Date.now());
    if (!running) return;
    const tick = () => setNow(Date.now());
    const interval = window.setInterval(tick, 1000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [running, active?.id]);
  const progress = active ? timerProgress(active, now) : null;
  const selected =
    targets.find((target) => target.id === targetId) || defaultTarget;
  const command = (action: TimerAction, nextTargetId?: string) =>
    void onCommand({
      action,
      sessionId,
      expectedTimerId: active?.id || null,
      ...(nextTargetId ? { targetId: nextTargetId } : {}),
    });
  return (
    <section
      className={`side-timer ${progress?.due ? "side-timer-due" : ""}`}
      aria-label="Handmatige kanttimer"
    >
      <div className="side-timer-heading">
        <Timer size={20} />
        <h2>Een seintje voor je plaat</h2>
        <span>Optioneel</span>
      </div>
      <p className="side-timer-description">
        Start zelf wanneer je de naald neerzet. De timer volgt bekende
        tracktijden, zonder afspeeldetectie.
      </p>
      {active && progress && (
        <>
          <div className="side-timer-reading">
            <div>
              <span>
                {active.target.label}
                {active.target.kind === "album" ? " · hele album" : ""}
              </span>
              <strong>
                {active.dismissed
                  ? "Herinnering uitgezet"
                  : active.pausedAt
                    ? "Gepauzeerd"
                    : progress.remainingSeconds > 0
                      ? "Geschatte speeltijd over"
                      : "Geschatte speeltijd verstreken"}
              </strong>
            </div>
            {!active.dismissed && (
              <span className="side-timer-time">
                {duration(progress.remainingSeconds)}
              </span>
            )}
          </div>
          <div className="side-timer-progress" aria-hidden="true">
            <span
              style={{
                width: `${Math.max(0, Math.min(100, progress.progress * 100))}%`,
              }}
            />
          </div>
          {progress.due ? (
            <div className="side-timer-reminder" role="status">
              <strong>Misschien tijd om even bij de plaat te kijken.</strong>
              <p>
                {active.target.kind === "side"
                  ? "Is de kant afgelopen? Je kunt zelf de volgende kant starten of je sessie afronden wanneer je klaar bent."
                  : "Is het album afgelopen? Rond je sessie af wanneer je klaar bent."}
              </p>
              <div className="side-timer-controls">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => command("snooze")}
                >
                  <Clock3 size={15} /> Over 5 minuten
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => command("dismiss")}
                >
                  Herinnering uitzetten
                </button>
              </div>
            </div>
          ) : (
            !active.dismissed && (
              <p className="side-timer-description">
                {active.snoozedUntil && Date.parse(active.snoozedUntil) > now
                  ? `Herinnering uitgesteld tot ${new Date(active.snoozedUntil).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" })}.`
                  : `Herinnering na de geschatte speeltijd + ${active.graceMinutes} ${active.graceMinutes === 1 ? "minuut" : "minuten"}.`}
              </p>
            )
          )}
          <div className="side-timer-controls">
            {!active.dismissed && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => command(active.pausedAt ? "resume" : "pause")}
              >
                {active.pausedAt ? <Play size={15} /> : <Pause size={15} />}
                {active.pausedAt ? "Timer hervatten" : "Timer pauzeren"}
              </button>
            )}
            <button
              type="button"
              disabled={disabled}
              onClick={() => command("stop")}
            >
              <Square size={14} /> Timer stoppen
            </button>
          </div>
        </>
      )}
      {selected ? (
        <div className="side-timer-start">
          {targets.length > 1 && (
            <label>
              Kies de kant die je zelf start
              <select
                value={selected.id}
                disabled={disabled}
                onChange={(event) => setTargetId(event.target.value)}
              >
                {targets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {target.label} · {duration(target.durationSeconds)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {selected.kind === "side" && (
            <p className="side-timer-description">{reason}</p>
          )}
          {selected.kind === "album" && (
            <p className="side-timer-description">
              Alleen de totale albumduur is bekend (
              {duration(selected.durationSeconds)}). Er wordt geen kantduur
              afgeleid.
            </p>
          )}
          <button
            type="button"
            className="side-timer-start-button"
            disabled={disabled}
            onClick={() => command("start", selected.id)}
          >
            <Play size={16} />
            {active?.target.id === selected.id
              ? `Herstart ${selected.label.replace(/^Kant /, "kant ").replace(/^Album$/, "album")}`
              : `Start ${selected.label.replace(/^Kant /, "kant ").replace(/^Album$/, "album")}`}
          </button>
          <p className="side-timer-description">
            {active ? "Starten vervangt de huidige timer. " : ""}Nieuwe timers
            gebruiken {graceMinutes} {graceMinutes === 1 ? "minuut" : "minuten"}{" "}
            extra wachttijd.
          </p>
        </div>
      ) : (
        <p className="side-timer-description">
          {reason ||
            "Er zijn nog geen volledige tracktijden beschikbaar voor een timer. Ontbrekende tijden worden niet geschat."}
        </p>
      )}
      <p className="side-timer-footnote">
        Het seintje verschijnt alleen terwijl de app open is of wanneer je
        terugkeert. Geen melding op de achtergrond. Timer stoppen of een
        herinnering uitzetten rondt je luistersessie niet af.
      </p>
    </section>
  );
}
