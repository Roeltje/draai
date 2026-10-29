import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildApp } from "../server/app.ts";
import { Service, type Config } from "../server/service.ts";
import {
  DiscogsClient,
  MAX_AGE,
  REFRESH_INTERVAL,
  isLP,
} from "../server/discogs.ts";

const instant = Date.parse("2026-10-27T10:00:00Z");
function setup(extra: Partial<Config> = {}) {
  const dir = mkdtempSync(join(tmpdir(), "draai-test-"));
  return {
    config: {
      dataDir: dir,
      username: "fixture-user",
      stationId: "FIXTURE",
      ...extra,
    },
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
}
const item = (id: number, release = 100) => ({
  instance_id: id,
  date_added: "2026-10-01T10:00:00Z",
  basic_information: {
    id: release,
    title: `Fixture ${release}`,
    year: 1990,
    artists: [{ id: 8, name: "Fixture Artist" }],
    labels: [{ name: "Fixture Label", catno: "F1" }],
    formats: [{ name: "Vinyl", descriptions: ["LP", "Album"] }],
    genres: ["Rock"],
    styles: [],
  },
});
const page = (releases: unknown[], pages = 1) => ({
  pagination: { pages },
  releases,
});
const details = JSON.parse(
  readFileSync(
    new URL("./fixtures/discogs-release.json", import.meta.url),
    "utf8",
  ),
);
const json = (
  value: unknown,
  status = 200,
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
const mockFetch = (handler: (url: string) => Response | Promise<Response>) =>
  (async (url: unknown) => handler(String(url))) as typeof fetch;

test("LP format parser excludes singles, CDs and vinyl box sets", () => {
  assert.equal(isLP([{ name: "Vinyl", descriptions: ["LP", "Album"] }]), true);
  for (const formats of [
    [{ name: "Vinyl", descriptions: ['7"', "Single"] }],
    [{ name: "CD", descriptions: ["Album"] }],
    [{ name: "Vinyl" }],
    [{ name: "Vinyl", descriptions: ["LP"] }, { name: "Box Set" }],
  ])
    assert.equal(isLP(formats), false);
});

test("demo sessions are idempotent and survive reopening; live data never mixes", async () => {
  const { config, cleanup } = setup();
  let service = new Service(config, { now: () => instant, random: () => 0 });
  try {
    assert.equal(service.state().records.length, 6);
    assert.equal(service.state().history.length, 0);
    service.select();
    const selection = service.state().selection!;
    assert.equal(service.state().activeSession, null);
    service.start(selection.id);
    const session = service.state().activeSession!;
    service.start(selection.id);
    assert.equal(service.state().activeSession?.id, session.id);
    assert.throws(() => service.select(), /actieve/);
    service.finish(session.id, "Mijn eigen notitie");
    service.finish(session.id, "Overschrijven mag niet");
    assert.equal(service.state().history.length, 1);
    assert.equal(service.state().history[0].note, "Mijn eigen notitie");
    await service.close();
    service = new Service(config);
    assert.equal(service.state().history[0].note, "Mijn eigen notitie");
    const live = new Service({ ...config, token: "test-token" });
    assert.equal(live.state().records.length, 0);
    assert.equal(live.state().history.length, 0);
    await live.close();
  } finally {
    await service.close();
    cleanup();
  }
});

test("selection avoids recent proposals, relaxes small collection, respects explicit exclusions", async () => {
  const { config, cleanup } = setup();
  const service = new Service(config, { now: () => instant, random: () => 0 });
  try {
    service.select();
    const first = service.state().selection!.record.id;
    service.select();
    assert.notEqual(service.state().selection!.record.id, first);
    for (const r of service.state().records)
      if (r.id !== first) service.patch(r.id, { excluded: true });
    service.select();
    assert.equal(service.state().selection!.record.id, first);
    service.select();
    assert.equal(service.state().selection!.record.id, first);
    service.patch(first, { excluded: true });
    assert.throws(() => service.select(), /Geen geschikte/);
    assert.throws(
      () => service.select("alles", false, first),
      /Geen geschikte/,
    );
  } finally {
    await service.close();
    cleanup();
  }
});

test("mood changes weighted probability using personal tags with truthful reasons", async () => {
  const { config, cleanup } = setup();
  const service = new Service(config, { now: () => instant, random: () => 0 });
  try {
    service.select("warm");
    assert.match(
      service.state().selection!.reasons.join(" "),
      /Jouw sfeerlabel/,
    );
    service.select("energie", true, "demo-2");
    assert.doesNotMatch(
      service.state().selection!.reasons.join(" "),
      /weer|sfeerlabel/i,
    );
  } finally {
    await service.close();
    cleanup();
  }
});

test("a small two-record collection alternates proposals without getting stuck", async () => {
  const { config, cleanup } = setup();
  const service = new Service(config, { now: () => instant, random: () => 0 });
  try {
    service
      .state()
      .records.slice(2)
      .forEach((r) => service.patch(r.id, { excluded: true }));
    const chosen: string[] = [];
    for (let i = 0; i < 7; i++) {
      service.select();
      chosen.push(service.state().selection!.record.id);
    }
    for (let i = 1; i < chosen.length; i++)
      assert.notEqual(chosen[i], chosen[i - 1]);
  } finally {
    await service.close();
    cleanup();
  }
});

test("full collection pagination preserves duplicate copies and artist IDs, removes only after success", async () => {
  const { config, cleanup } = setup({ token: "fixture" });
  let fail = false;
  let detailsCalls = 0;
  const service = new Service(config, {
    now: () => instant,
    wait: async () => {},
    fetcher: mockFetch((url) => {
      if (url.includes("/releases/100")) {
        detailsCalls++;
        return json(details);
      }
      if (new URL(url).searchParams.get("page") === "1")
        return json(page([item(1), item(2)], 2));
      if (fail) return json({}, 503);
      return json(page([item(3)], 2));
    }),
  });
  try {
    await service.synchronize();
    await service.waitForBackground();
    assert.equal(service.state().records.length, 3);
    assert.equal(detailsCalls, 1);
    assert.deepEqual(
      service.state().records[0].credits.map((c) => c.artistId),
      [42, 43],
    );
    fail = true;
    await service.synchronize();
    await service.waitForBackground();
    assert.equal(
      service.state().records.find((r) => r.id === "3")?.available,
      true,
    );
    assert.match(service.state().sync.error!, /tijdelijk/);
    assert.equal(service.state().sync.running, false);
  } finally {
    await service.close();
    cleanup();
  }
});

test("partial first scan saves arrived pages and does not claim a successful collection", async () => {
  const { config, cleanup } = setup({ token: "fixture" });
  const service = new Service(config, {
    now: () => instant,
    wait: async () => {},
    fetcher: mockFetch((url) =>
      new URL(url).searchParams.get("page") === "1"
        ? json(page([item(1)], 2))
        : json({}, 503),
    ),
  });
  try {
    await service.synchronize();
    await service.waitForBackground();
    assert.equal(service.state().records.length, 1);
    assert.equal(service.state().sync.lastSuccess, null);
    assert.equal(service.state().settings.collectionStale, true);
  } finally {
    await service.close();
    cleanup();
  }
});

test("successful full scan marks missing copies unavailable but preserves private history", async () => {
  const { config, cleanup } = setup({ token: "fixture" });
  let releases = [item(1), item(2)];
  const service = new Service(config, {
    now: () => instant,
    wait: async () => {},
    fetcher: mockFetch((url) =>
      json(url.includes("/releases/100") ? details : page(releases)),
    ),
  });
  try {
    await service.synchronize();
    await service.waitForBackground();
    service.select("alles", false, "2");
    service.start(service.state().selection!.id);
    service.finish(service.state().activeSession!.id, "Bewaren");
    releases = [item(1)];
    await service.synchronize();
    await service.waitForBackground();
    assert.equal(
      service.state().records.find((r) => r.id === "2")?.available,
      false,
    );
    assert.equal(service.state().history[0].note, "Bewaren");
    assert.throws(() => service.select("alles", false, "2"), /Geen geschikte/);
  } finally {
    await service.close();
    cleanup();
  }
});

test("stale API metadata is hidden everywhere; basic refresh does not freshen old release details", async () => {
  const { config, cleanup } = setup({ token: "fixture" });
  let now = instant;
  let detailFailure = false;
  const service = new Service(config, {
    now: () => now,
    wait: async () => {},
    fetcher: mockFetch((url) =>
      url.includes("/releases/100")
        ? detailFailure
          ? json({}, 503)
          : json(details)
        : json(page([item(1)])),
    ),
  });
  try {
    await service.synchronize();
    await service.waitForBackground();
    service.select();
    service.start(service.state().selection!.id);
    service.finish(service.state().activeSession!.id, "Eigen tekst");
    now += MAX_AGE + 1;
    assert.equal(
      service.state().history[0].record.title,
      "Releasegegevens verversen",
    );
    assert.equal(service.state().records[0].tracks.length, 0);
    assert.equal(service.state().history[0].note, "Eigen tekst");
    assert.throws(() => service.select(), /Geen geschikte/);
    detailFailure = true;
    await service.synchronize();
    await service.waitForBackground();
    assert.equal(service.state().records[0].title, "Fixture 100");
    assert.equal(service.state().records[0].tracks.length, 0);
    assert.equal(service.state().records[0].country, "");
    service.requestRecord(service.state().records[0].id);
    await service.waitForBackground();
    assert.match(service.state().sync.error!, /tijdelijk/);
  } finally {
    await service.close();
    cleanup();
  }
});

test("five-hour scans leave bulk details alone while the selected record renews before expiry", async () => {
  const { config, cleanup } = setup({ token: "fixture" });
  let now = instant,
    calls = 0;
  const service = new Service(config, {
    now: () => now,
    wait: async () => {},
    fetcher: mockFetch((url) => {
      if (url.includes("/releases/100")) {
        calls++;
        return json({
          ...details,
          tracklist: [{ position: "A1", title: `Version ${calls}` }],
        });
      }
      return json(page([item(1)]));
    }),
  });
  try {
    await service.synchronize();
    await service.waitForBackground();
    assert.equal(calls, 1);
    now += REFRESH_INTERVAL;
    await service.synchronize();
    await service.waitForBackground();
    assert.equal(calls, 1);
    service.select();
    await service.waitForBackground();
    assert.equal(calls, 2);
    now = instant + MAX_AGE + 1;
    assert.equal(service.state().records[0].tracks[0].title, "Version 2");
    now += REFRESH_INTERVAL;
    service.refreshActive();
    await service.waitForBackground();
    assert.equal(calls, 3);
  } finally {
    await service.close();
    cleanup();
  }
});

test("confirmation revalidates an old proposal after exclusions, removal, format changes or expiry", async () => {
  const { config, cleanup } = setup({ token: "fixture" });
  let now = instant;
  const service = new Service(config, {
    now: () => now,
    wait: async () => {},
    fetcher: mockFetch((url) =>
      json(url.includes("/releases/100") ? details : page([item(1)])),
    ),
  });
  try {
    await service.synchronize();
    await service.waitForBackground();
    service.select();
    const selection = service.state().selection!;
    const original = service.store.record(selection.record.id)!;
    for (const change of [
      { excluded: true },
      { available: false },
      { isLP: false },
    ]) {
      service.store.put({ ...original, ...change });
      assert.throws(() => service.start(selection.id), /niet meer beschikbaar/);
      assert.equal(service.state().activeSession, null);
    }
    service.store.put(original);
    now += MAX_AGE + 1;
    assert.throws(() => service.start(selection.id), /verlopen/);
    await service.synchronize();
    await service.waitForBackground();
    service.start(selection.id);
    const session = service.state().activeSession!;
    service.patch(original.id, { excluded: true });
    service.start(selection.id);
    assert.equal(service.state().activeSession!.id, session.id);
  } finally {
    await service.close();
    cleanup();
  }
});

test("concurrent synchronization starts only one collection scan", async () => {
  const { config, cleanup } = setup({ token: "fixture" });
  let calls = 0;
  let release!: () => void;
  const barrier = new Promise<void>((r) => {
    release = r;
  });
  const service = new Service(config, {
    now: () => instant,
    wait: async () => {},
    fetcher: mockFetch(async () => {
      calls++;
      await barrier;
      return json(page([]));
    }),
  });
  try {
    const a = service.synchronize();
    const b = service.synchronize();
    await new Promise((r) => setImmediate(r));
    assert.equal(calls, 1);
    release();
    await Promise.all([a, b]);
    assert.equal(calls, 1);
  } finally {
    await service.close();
    cleanup();
  }
});

test("Discogs rate limit honors retry-after with bounded retries and sends server-side auth", async () => {
  const delays: number[] = [];
  let calls = 0;
  const fetcher = (async (_url: unknown, init: RequestInit) => {
    assert.equal(
      (init.headers as Record<string, string>).Authorization,
      "Discogs token=secret",
    );
    calls++;
    return calls === 1
      ? json({}, 429, { "Retry-After": "2" })
      : json({ ok: true }, 200, { "X-Discogs-Ratelimit-Remaining": "1" });
  }) as typeof fetch;
  const client = new DiscogsClient("secret", fetcher, async (ms) => {
    delays.push(ms);
  });
  assert.deepEqual(await client.get("/fixture"), { ok: true });
  assert.deepEqual(delays, [2000, 60000]);
  calls = 0;
  const broken = new DiscogsClient(
    "secret",
    mockFetch(() => {
      calls++;
      return json({}, 503);
    }),
    async () => {},
  );
  await assert.rejects(broken.get("/fixture"), /tijdelijk/);
  assert.equal(calls, 3);
  calls = 0;
  const denied = new DiscogsClient(
    "secret",
    mockFetch(() => {
      calls++;
      return json({}, 401);
    }),
    async () => {
      assert.fail("Authentication errors must not retry");
    },
  );
  await assert.rejects(denied.get("/fixture"), /401/);
  assert.equal(calls, 1);
});

test("successful Discogs calls are proactively paced and retry waits stay bounded", async () => {
  const events: string[] = [];
  const client = new DiscogsClient(
    "fixture",
    mockFetch(() => {
      events.push("request");
      return json({ ok: true });
    }),
    async (ms) => {
      events.push(`wait:${ms}`);
    },
  );
  for (let i = 0; i < 3; i++) await client.get("/fixture");
  assert.deepEqual(events, [
    "request",
    "wait:1100",
    "request",
    "wait:1100",
    "request",
    "wait:1100",
  ]);
  const delays: number[] = [];
  const limited = new DiscogsClient(
    "fixture",
    mockFetch(() => json({}, 429, { "Retry-After": "3600" })),
    async (ms) => {
      delays.push(ms);
    },
  );
  await assert.rejects(limited.get("/fixture"), /tijdelijk/);
  assert.deepEqual(delays, [60000, 60000]);
});

test("WU validates station and measured time; stale observations never pretend to be current", async () => {
  const { config, cleanup } = setup({ weatherKey: "not-real" });
  let wrong = false;
  let now = instant;
  const service = new Service(config, {
    now: () => now,
    wait: async () => {},
    fetcher: mockFetch(() =>
      json({
        observations: [
          {
            stationID: wrong ? "OTHER" : "FIXTURE",
            obsTimeUtc: new Date(instant).toISOString(),
            metric: { temp: 14, windSpeed: 4 },
          },
        ],
      }),
    ),
  });
  try {
    await service.refreshWeather();
    assert.equal(service.state().weather.status, "fresh");
    assert.equal(service.state().weather.rainRate, null);
    now += 31 * 60000;
    assert.equal(service.state().weather.status, "stale");
    wrong = true;
    await service.refreshWeather();
    assert.equal(service.state().weather.status, "error");
    assert.equal(service.state().weather.temperature, null);
  } finally {
    await service.close();
    cleanup();
  }
});

test("HTTP contract validates origins, bodies, idempotent flow and keeps credentials out of state", async () => {
  const { config, cleanup } = setup();
  const { app } = await buildApp(
    config,
    { now: () => instant, random: () => 0 },
    { schedule: false },
  );
  try {
    const post = (url: string, payload: Record<string, unknown>) =>
      app.inject({ method: "POST", url, payload });
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/select",
          payload: {},
          headers: { origin: "https://evil.example" },
        })
      ).statusCode,
      403,
    );
    assert.equal(
      (await post("/api/select", { mood: "bogus" })).statusCode,
      400,
    );
    assert.equal(
      (
        await app.inject({
          method: "PATCH",
          url: "/api/records/demo-1",
          payload: { title: "overwrite" },
        })
      ).statusCode,
      400,
    );
    const selected = (await post("/api/select", {})).json();
    assert.ok(selected.selection);
    assert.equal(selected.activeSession, null);
    const start = await post("/api/sessions/start", {
      selectionId: selected.selection.id,
    });
    assert.equal(start.statusCode, 200);
    const active = start.json().activeSession;
    assert.equal((await post("/api/select", {})).statusCode, 409);
    await post("/api/sessions/start", { selectionId: selected.selection.id });
    await post("/api/sessions/finish", {
      sessionId: active.id,
      note: "HTTP test",
    });
    await post("/api/sessions/finish", { sessionId: active.id });
    const state = (await app.inject("/api/state")).json();
    assert.equal(state.history.length, 1);
    assert.equal(state.history[0].note, "HTTP test");
    assert.equal(state.settings.discogsConfigured, false);
    assert.equal((await post("/api/sync", {})).statusCode, 400);
    assert.equal((await app.inject("/api/health")).json().ok, true);
  } finally {
    await app.close();
    cleanup();
  }
});

test("configured credentials never appear in API state or upstream failure responses", async () => {
  const { config, cleanup } = setup({
    token: "discogs-private-test-token",
    weatherKey: "weather-private-test-key",
  });
  const { app, service } = await buildApp(
    config,
    {
      fetcher: mockFetch(() => {
        throw new Error("URL containing weather-private-test-key");
      }),
      wait: async () => {},
    },
    { schedule: false },
  );
  try {
    await service.refreshWeather();
    await service.synchronize();
    await service.waitForBackground();
    const response = await app.inject("/api/state");
    const state = response.json();
    assert.equal(state.settings.discogsConfigured, true);
    assert.equal(state.settings.weatherConfigured, true);
    assert.doesNotMatch(
      response.body,
      /discogs-private-test-token|weather-private-test-key/,
    );
    assert.equal(state.weather.status, "error");
  } finally {
    await app.close();
    cleanup();
  }
});

test(
  "SSE sends initial and updated state, then reconnect starts with current session",
  { timeout: 5000 },
  async () => {
    const { config, cleanup } = setup();
    const { app, service } = await buildApp(
      config,
      { now: () => instant },
      { schedule: false },
    );
    try {
      const address = await app.listen({ port: 0, host: "127.0.0.1" });
      const controller = new AbortController();
      const response = await fetch(`${address}/api/events`, {
        signal: controller.signal,
      });
      assert.match(response.headers.get("content-type")!, /event-stream/);
      const reader = response.body!.getReader();
      const initial = new TextDecoder().decode((await reader.read()).value);
      assert.match(initial, /event: state/);
      assert.match(initial, /"activeSession":null/);
      service.select();
      service.start(service.state().selection!.id);
      let update = "";
      while (!update.includes('"startedAt"'))
        update += new TextDecoder().decode((await reader.read()).value);
      assert.match(update, /"startedAt"/);
      controller.abort();
      await reader.cancel().catch(() => {});
      const reconnect = new AbortController();
      const again = await fetch(`${address}/api/events`, {
        signal: reconnect.signal,
      });
      const next = again.body!.getReader();
      assert.match(
        new TextDecoder().decode((await next.read()).value),
        /"startedAt"/,
      );
      reconnect.abort();
      await next.cancel().catch(() => {});
    } finally {
      await app.close();
      cleanup();
    }
  },
);

test(
  "SSE heartbeat sends a new sanitized state when metadata expires without a mutation",
  { timeout: 5000 },
  async () => {
    const { config, cleanup } = setup({ token: "fixture" });
    let now = instant;
    const { app, service } = await buildApp(
      config,
      {
        now: () => now,
        wait: async () => {},
        fetcher: mockFetch((url) =>
          json(url.includes("/releases/100") ? details : page([item(1)])),
        ),
      },
      { schedule: false, heartbeatMs: 30 },
    );
    const controller = new AbortController();
    try {
      await service.synchronize();
      await service.waitForBackground();
      const address = await app.listen({ port: 0, host: "127.0.0.1" });
      const response = await fetch(`${address}/api/events`, {
        signal: controller.signal,
      });
      const reader = response.body!.getReader();
      assert.match(
        new TextDecoder().decode((await reader.read()).value),
        /Fixture 100/,
      );
      now += MAX_AGE + 1;
      let text = "";
      while (!text.includes("Releasegegevens verversen"))
        text += new TextDecoder().decode((await reader.read()).value);
      assert.match(text, /event: state/);
      assert.doesNotMatch(text, /Fixture track/);
      controller.abort();
      await reader.cancel().catch(() => {});
    } finally {
      controller.abort();
      await app.close();
      cleanup();
    }
  },
);
