import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  timerTargets,
  timerProgress,
  DEFAULT_SIDE_TIMER_SETTINGS,
} from "../shared/sideTimer.ts";
import { DEFAULT_PREFERENCES } from "../shared/selection.ts";
import { demoRecords } from "../server/demo.ts";
import { Service } from "../server/service.ts";
import { Store } from "../server/store.ts";
import { buildApp } from "../server/app.ts";
import { enrich, MAX_AGE } from "../server/discogs.ts";
import type {
  RecordItem,
  Track,
  SelectionPreferences,
} from "../shared/types.ts";

const instant = Date.parse("2026-10-30T12:00:00Z");
const fixture = (tracks: Track[], patch: Partial<RecordItem> = {}) => ({
  ...demoRecords(new Date(instant).toISOString())[0],
  tracks,
  ...patch,
});
const track = (position: string, duration?: string): Track => ({
  position,
  title: "Fixture",
  duration,
});
const config = () => ({
  dataDir: mkdtempSync(join(tmpdir(), "draai-timer-")),
  username: "fixture",
  stationId: "fixture",
});
const oldPreferences: SelectionPreferences = {
  genreMoods: [],
  styleMoods: [],
  weatherMoods: { rain: ["rust"], cold: [], warm: [] },
  weatherThresholds: { coldBelow: 4, warmFrom: 25 },
};

test("targets use complete sides, whole-side tracks, and multi-LP positions without inventing missing lengths", () => {
  const result = timerTargets(
    fixture([
      track("A1", "3:20"),
      track("A2", "4:40"),
      track("B1"),
      track("B2", "2:00"),
      track("C1", "1:02:03"),
      track("D1", "5:00"),
    ]),
  );
  assert.deepEqual(result.targets, [
    { id: "side-A", kind: "side", label: "Kant A", durationSeconds: 480 },
    { id: "side-C", kind: "side", label: "Kant C", durationSeconds: 3723 },
    { id: "side-D", kind: "side", label: "Kant D", durationSeconds: 300 },
  ]);
  assert.match(result.reason, /Alleen kanten/);
  assert.deepEqual(
    timerTargets(
      fixture([track("A", "20:00"), track("B", "21:00")]),
    ).targets.map((target) => target.durationSeconds),
    [1200, 1260],
  );
  assert.equal(
    timerTargets(
      fixture([track("A1", "1:00"), track("A3", "2:00"), track("B1", "5:00")]),
    ).targets[0]!.id,
    "side-B",
  );
});

test("album fallback requires complete numeric positions and rejects ambiguous, index, mixed-media and unreasonable times", () => {
  assert.deepEqual(
    timerTargets(fixture([track("1", "03:20"), track("2", "1:00:00")])).targets,
    [{ id: "album", kind: "album", label: "Album", durationSeconds: 3800 }],
  );
  for (const tracks of [
    [],
    [track("1", "3:00"), track("2")],
    [track("1", "3:00"), track("3", "2:00")],
    [track("1", "3:00"), track("1", "2:00")],
    [track("A1", "3:00"), track("A1", "2:00")],
    [track("A", "3:00"), track("B1", "2:00")],
    [track("A1", "3:00"), track("2", "2:00")],
    [track("A1.1", "3:00")],
    [track("1.1", "3:00")],
    [{ ...track("A1", "3:00"), type: "index" as const }],
  ])
    assert.equal(
      timerTargets(fixture(tracks)).targets.length,
      0,
      JSON.stringify(tracks),
    );
  for (const duration of [
    "",
    "0:00",
    "3",
    "3:5",
    "3:60",
    "1:60:00",
    "-1:00",
    "~3:00",
    "3:00:01",
    "Infinity",
    "1:2:03",
    "3:00 (approx.)",
  ])
    assert.equal(
      timerTargets(fixture([track("A", duration)])).targets.length,
      0,
      duration,
    );
  assert.equal(
    timerTargets(
      fixture([
        track("A1", "3:00:00"),
        track("A2", "3:00:00"),
        track("A3", "0:01"),
      ]),
    ).targets.length,
    0,
  );
  assert.equal(
    timerTargets(
      fixture([
        track("1", "3:00:00"),
        track("2", "3:00:00"),
        track("3", "0:01"),
      ]),
    ).targets.length,
    0,
  );
  for (const format of ["CD", "DVD", "Blu-ray", "Cassette"])
    assert.equal(
      timerTargets(
        fixture([track("A1", "3:00")], { formats: ["Vinyl", "LP", format] }),
      ).targets.length,
      0,
    );
  const normalized = enrich(fixture([]), {
    tracklist: [
      {
        type_: "index",
        position: "A1",
        title: "Suite",
        duration: "20:00",
        sub_tracks: [{ position: "A1a", duration: "10:00" }],
      },
    ],
  });
  assert.equal(normalized.tracks[0]!.type, "index");
  assert.equal(timerTargets(normalized).targets.length, 0);
});

test("explicit timer lifecycle persists, pauses elapsed time, snoozes from server now, and leaves sessions untouched", async () => {
  const c = config();
  let now = instant;
  let service = new Service(c, { now: () => now });
  try {
    service.setPreferences({
      ...oldPreferences,
      sideTimer: { enabled: true, graceMinutes: 1 },
    });
    const record = service.store.record("demo-1")!;
    service.store.put({
      ...record,
      tracks: [track("A", "1:00"), track("B", "2:00")],
    });
    service.select("alles", false, record.id);
    service.start(service.state().selection!.id);
    const session = service.state().activeSession!;
    assert.equal(service.state().sideTimer, null);
    let emissions = 0;
    service.listeners.add(() => emissions++);
    service.timer({
      action: "start",
      sessionId: session.id,
      expectedTimerId: null,
      targetId: "side-A",
    });
    let timer = service.state().sideTimer!;
    const firstId = timer.id;
    now += 30000;
    assert.equal(timerProgress(timer, now).elapsedSeconds, 30);
    service.timer({
      action: "pause",
      sessionId: session.id,
      expectedTimerId: timer.id,
    });
    timer = service.state().sideTimer!;
    assert.notEqual(timer.id, firstId);
    now += 600000;
    assert.equal(timerProgress(timer, now).elapsedSeconds, 30);
    assert.equal(timerProgress(timer, now).due, false);
    const paused = timer;
    await service.close();
    service = new Service(c, { now: () => now });
    assert.deepEqual(service.state().sideTimer, paused);
    service.timer({
      action: "resume",
      sessionId: session.id,
      expectedTimerId: paused.id,
    });
    timer = service.state().sideTimer!;
    assert.equal(timer.pausedSeconds, 600);
    now += 89999;
    assert.equal(timerProgress(timer, now).remainingSeconds, 0);
    assert.equal(timerProgress(timer, now).progress, 1);
    assert.equal(timerProgress(timer, now).due, false);
    now += 1;
    assert.equal(timerProgress(timer, now).due, true);
    service.timer({
      action: "snooze",
      sessionId: session.id,
      expectedTimerId: timer.id,
    });
    timer = service.state().sideTimer!;
    assert.equal(Date.parse(timer.snoozedUntil!), now + 300000);
    now += 299999;
    assert.equal(timerProgress(timer, now).due, false);
    now += 1;
    assert.equal(timerProgress(timer, now).due, true);
    service.timer({
      action: "dismiss",
      sessionId: session.id,
      expectedTimerId: timer.id,
    });
    now += 3600000;
    assert.equal(timerProgress(service.state().sideTimer!, now).due, false);
    assert.equal(service.state().history.length, 0);
    assert.deepEqual(service.state().activeSession, session);
    assert.ok(emissions >= 2);
    service.finish(session.id, "Eigen notitie");
    assert.equal(service.state().sideTimer, null);
    assert.equal(service.state().history[0]!.note, "Eigen notitie");
    assert.throws(
      () =>
        service.timer({
          action: "start",
          sessionId: session.id,
          expectedTimerId: null,
          targetId: "side-A",
        }),
      /niet meer actief/,
    );
  } finally {
    await service.close();
    rmSync(c.dataDir, { recursive: true, force: true });
  }
});

test("timer commands reject stale clients and arbitrary targets; pause/resume reset snooze, stop and disable never resurrect", async () => {
  const c = config();
  let now = instant;
  const service = new Service(c, { now: () => now });
  try {
    service.setPreferences({
      ...oldPreferences,
      sideTimer: { enabled: true, graceMinutes: 0 },
    });
    service.select("alles", false, "demo-1");
    service.start(service.state().selection!.id);
    const sessionId = service.state().activeSession!.id;
    assert.throws(
      () =>
        service.timer({
          action: "start",
          sessionId,
          expectedTimerId: null,
          targetId: "invented",
        }),
      /betrouwbare speeltijd/,
    );
    assert.throws(
      () =>
        service.timer({
          action: "start",
          sessionId: "wrong",
          expectedTimerId: null,
          targetId: "side-A",
        }),
      /niet meer actief/,
    );
    service.timer({
      action: "start",
      sessionId,
      expectedTimerId: null,
      targetId: "side-A",
    });
    const initial = service.state().sideTimer!;
    assert.throws(
      () =>
        service.timer({
          action: "start",
          sessionId,
          expectedTimerId: null,
          targetId: "side-B",
        }),
      /intussen gewijzigd/,
    );
    service.timer({
      action: "start",
      sessionId,
      expectedTimerId: initial.id,
      targetId: "side-B",
    });
    assert.equal(service.state().sideTimer!.target.id, "side-B");
    assert.throws(
      () =>
        service.timer({
          action: "stop",
          sessionId,
          expectedTimerId: initial.id,
        }),
      /intussen gewijzigd/,
    );
    service.timer({
      action: "snooze",
      sessionId,
      expectedTimerId: service.state().sideTimer!.id,
    });
    service.timer({
      action: "pause",
      sessionId,
      expectedTimerId: service.state().sideTimer!.id,
    });
    assert.equal(service.state().sideTimer!.snoozedUntil, null);
    now += 1000;
    service.timer({
      action: "resume",
      sessionId,
      expectedTimerId: service.state().sideTimer!.id,
    });
    assert.equal(service.state().sideTimer!.snoozedUntil, null);
    service.timer({
      action: "stop",
      sessionId,
      expectedTimerId: service.state().sideTimer!.id,
    });
    assert.equal(service.state().sideTimer, null);
    service.timer({
      action: "start",
      sessionId,
      expectedTimerId: null,
      targetId: "side-A",
    });
    service.setPreferences({
      ...oldPreferences,
      sideTimer: { enabled: false, graceMinutes: 0 },
    });
    assert.equal(service.state().sideTimer, null);
    service.setPreferences({
      ...oldPreferences,
      sideTimer: { enabled: true, graceMinutes: 0 },
    });
    assert.equal(service.state().sideTimer, null);
  } finally {
    await service.close();
    rmSync(c.dataDir, { recursive: true, force: true });
  }
});

test("stale detail metadata blocks new starts while an existing generic timer may continue", async () => {
  const c = config();
  const service = new Service(
    { ...c, token: "fixture-token" },
    { now: () => instant },
  );
  try {
    service.setPreferences({
      ...oldPreferences,
      sideTimer: { enabled: true, graceMinutes: 0 },
    });
    const record = fixture([track("A", "20:00")], {
      demo: false,
      fetchedAt: new Date(instant).toISOString(),
    });
    service.store.put(record, new Date(instant - MAX_AGE).toISOString());
    service.store.db
      .prepare(
        "INSERT INTO sessions(id,selection_id,record_id,started_at) VALUES (?,?,?,?)",
      )
      .run(
        "live-session",
        "fixture",
        record.id,
        new Date(instant).toISOString(),
      );
    const command = {
      action: "start" as const,
      sessionId: "live-session",
      expectedTimerId: null,
      targetId: "side-A",
    };
    assert.throws(() => service.timer(command), /Ververs de releasegegevens/);
    service.store.put(record, new Date(instant).toISOString());
    service.timer(command);
    const timer = service.state().sideTimer!;
    service.store.put(record, new Date(instant - MAX_AGE).toISOString());
    assert.deepEqual(service.state().activeSession!.record.tracks, []);
    assert.deepEqual(service.state().sideTimer, timer);
    assert.equal(timer.target.label, "Kant A");
    assert.equal(JSON.stringify(timer).includes("Fixture"), false);
    assert.throws(
      () => service.timer({ ...command, expectedTimerId: timer.id }),
      /Ververs de releasegegevens/,
    );
    service.timer({
      action: "pause",
      sessionId: "live-session",
      expectedTimerId: timer.id,
    });
    assert.ok(service.state().sideTimer!.pausedAt);
    service.store.put(
      { ...record, fetchedAt: new Date(instant - MAX_AGE).toISOString() },
      new Date(instant).toISOString(),
    );
    assert.throws(
      () =>
        service.timer({
          ...command,
          expectedTimerId: service.state().sideTimer!.id,
        }),
      /Ververs de releasegegevens/,
    );
  } finally {
    await service.close();
    rmSync(c.dataDir, { recursive: true, force: true });
  }
});

test("preference migration, old-client PATCHes and timer API validate without resetting private rules", async () => {
  const c = config();
  const store = new Store(join(c.dataDir, "demo.sqlite"));
  store.set("preferences", oldPreferences);
  store.close();
  const { app } = await buildApp(
    c,
    { now: () => instant },
    { schedule: false },
  );
  try {
    assert.deepEqual((await app.inject("/api/state")).json().preferences, {
      ...oldPreferences,
      sideTimer: DEFAULT_SIDE_TIMER_SETTINGS,
    });
    const patch = (sideTimer: unknown) =>
      app.inject({
        method: "PATCH",
        url: "/api/preferences",
        payload: { ...oldPreferences, sideTimer },
      });
    for (const invalid of [
      null,
      [],
      "on",
      {},
      { enabled: true },
      { graceMinutes: 3 },
      { enabled: "true", graceMinutes: 3 },
      { enabled: true, graceMinutes: "3" },
      { enabled: true, graceMinutes: 0.5 },
      { enabled: true, graceMinutes: -1 },
      { enabled: true, graceMinutes: 31 },
      { enabled: true, graceMinutes: NaN },
      { enabled: true, graceMinutes: Infinity },
      { enabled: true, graceMinutes: 3, extra: true },
    ])
      assert.equal(
        (await patch(invalid)).statusCode,
        400,
        JSON.stringify(invalid),
      );
    assert.equal(
      (await patch({ enabled: true, graceMinutes: 30 })).statusCode,
      200,
    );
    const legacy = await app.inject({
      method: "PATCH",
      url: "/api/preferences",
      payload: oldPreferences,
    });
    assert.deepEqual(legacy.json().preferences, {
      ...oldPreferences,
      sideTimer: { enabled: true, graceMinutes: 30 },
    });
    const selected = await app.inject({
      method: "POST",
      url: "/api/select",
      payload: { recordId: "demo-1" },
    });
    const started = await app.inject({
      method: "POST",
      url: "/api/sessions/start",
      payload: { selectionId: selected.json().selection.id },
    });
    const sessionId = started.json().activeSession.id;
    assert.equal(started.json().sideTimer, null);
    const timerPost = (payload: unknown) =>
      app.inject({
        method: "POST",
        url: "/api/timer",
        payload: payload as any,
      });
    const command = {
      action: "start",
      sessionId,
      expectedTimerId: null,
      targetId: "side-A",
    };
    for (const payload of [
      { ...command, durationSeconds: 1 },
      { ...command, action: "unknown" },
      { ...command, expectedTimerId: undefined },
      { ...command, expectedTimerId: 1 },
      { ...command, targetId: undefined },
      { ...command, sessionId: "" },
      { ...command, action: "pause" },
    ])
      assert.equal(
        (await timerPost(payload)).statusCode,
        400,
        JSON.stringify(payload),
      );
    assert.equal((await timerPost(command)).statusCode, 200);
    assert.equal((await timerPost(command)).statusCode, 409);
    const before = (await app.inject("/api/state")).json();
    assert.equal(
      (
        await timerPost({
          action: "stop",
          sessionId,
          expectedTimerId: before.sideTimer.id,
        })
      ).statusCode,
      200,
    );
    assert.equal((await app.inject("/api/state")).json().sideTimer, null);
    await app.close();
    const reopened = new Service(c, { now: () => instant });
    try {
      assert.equal(reopened.state().sideTimer, null);
      assert.deepEqual(reopened.preferences(), {
        ...oldPreferences,
        sideTimer: { enabled: true, graceMinutes: 30 },
      });
      assert.equal(reopened.state().activeSession!.id, sessionId);
      assert.equal(reopened.state().history.length, 0);
      assert.deepEqual(
        DEFAULT_PREFERENCES.sideTimer,
        DEFAULT_SIDE_TIMER_SETTINGS,
      );
    } finally {
      await reopened.close();
    }
  } finally {
    await app.close();
    rmSync(c.dataDir, { recursive: true, force: true });
  }
});
