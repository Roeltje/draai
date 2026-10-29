import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WorkQueue } from "../server/queue.ts";
import { Service } from "../server/service.ts";
import { buildApp } from "../server/app.ts";
import { demoRecords } from "../server/demo.ts";
import { MAX_AGE, REFRESH_INTERVAL } from "../server/discogs.ts";
const instant = Date.parse("2026-10-28T12:00:00Z");
const tick = () => new Promise((r) => setTimeout(r, 5));
const json = (v: unknown, status = 200) =>
  new Response(JSON.stringify(v), { status });
const config = () => ({
  dataDir: mkdtempSync(join(tmpdir(), "draai-queue-")),
  token: "fixture",
  username: "fixture",
  stationId: "FIXTURE",
});
const item = (i: number) => ({
  ...demoRecords(new Date(instant).toISOString())[0],
  id: String(i),
  releaseId: i,
  masterId: i,
  artistIds: [],
  demo: false,
  albumInfo: undefined,
});
const noWait = async () => {};

test("one worker promotes priority and deduplicates queued and in-flight jobs", async () => {
  const waits: number[] = [],
    events: number[] = [];
  const queue = new WorkQueue(async (ms) => {
    waits.push(ms);
  });
  let release!: () => void;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const first = queue.enqueue("first", 0, async () => {
    events.push(1);
    await gate;
  });
  await tick();
  assert.equal(
    queue.enqueue("first", 100, async () => assert.fail("duplicate in-flight")),
    first,
  );
  const second = queue.enqueue("second", 0, async () => {
    events.push(2);
  });
  const third = queue.enqueue("third", 0, async () => {
    events.push(3);
  });
  assert.equal(
    queue.enqueue("third", 100, async () => assert.fail("duplicate queued")),
    third,
  );
  release();
  await Promise.all([first, second, third]);
  await queue.idle();
  assert.deepEqual(events, [1, 3, 2]);
  assert.deepEqual(waits, [3000, 3000]);
  await queue.close();
});

test("shutdown discards the remaining bulk queue and waits only for the in-flight item", async () => {
  const queue = new WorkQueue(noWait);
  let release!: () => void;
  let calls = 0;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  queue.enqueue("active", 0, async () => {
    calls++;
    await gate;
  });
  for (let i = 0; i < 400; i++)
    queue.enqueue(`remaining-${i}`, 0, async () => {
      calls++;
    });
  await tick();
  const closed = queue.close();
  release();
  await closed;
  assert.equal(calls, 1);
  await queue.enqueue("too-late", 100, async () => {
    calls++;
  });
  assert.equal(calls, 1);
});

test("422 old releases cause five collection calls and only a selected release refresh, never422 detail refreshes", async () => {
  const c = config();
  let now = instant;
  let collections = 0;
  const details: number[] = [];
  const service = new Service(c, {
    now: () => now,
    wait: noWait,
    fetcher: (async (url: unknown) => {
      const u = new URL(String(url));
      if (u.pathname.startsWith("/releases/")) {
        const id = Number(u.pathname.split("/").pop());
        details.push(id);
        return json({
          country: "NL",
          tracklist: [{ position: "A1", title: "Fresh" }],
        });
      }
      collections++;
      const p = Number(u.searchParams.get("page"));
      return json({
        pagination: { pages: 5 },
        releases: Array.from({ length: p === 5 ? 22 : 100 }, (_, n) => ({
          instance_id: (p - 1) * 100 + n + 1,
          basic_information: {
            id: (p - 1) * 100 + n + 1,
            title: "Fixture",
            artists: [],
            formats: [{ name: "Vinyl", descriptions: ["LP"] }],
          },
        })),
      });
    }) as typeof fetch,
  });
  try {
    for (let i = 1; i <= 422; i++)
      service.store.put(item(i), new Date(instant - MAX_AGE - 1).toISOString());
    await service.synchronize();
    await service.waitForBackground();
    assert.equal(collections, 5);
    assert.equal(details.length, 0);
    assert.equal(service.state().records[0].tracks.length, 0);
    service.select("alles", false, "1");
    await service.waitForBackground();
    assert.deepEqual(details, [1]);
    assert.equal(service.state().selection!.record.tracks[0].title, "Fresh");
    now += REFRESH_INTERVAL;
    await service.synchronize();
    await service.waitForBackground();
    assert.equal(collections, 10);
    assert.deepEqual(details, [1, 1]);
  } finally {
    await service.close();
    rmSync(c.dataDir, { recursive: true, force: true });
  }
});

test("failed detail requests pause the bulk queue and persist a negative backoff across restart", async () => {
  const c = config();
  let calls = 0;
  let now = instant;
  const fetcher = (async () => {
    calls++;
    return json({}, 503);
  }) as typeof fetch;
  let service = new Service(c, { now: () => now, wait: noWait, fetcher });
  try {
    for (let i = 1; i <= 50; i++) service.store.put(item(i));
    service.startBackground();
    await service.waitForBackground();
    assert.equal(calls, 3);
    service.requestRecord("2");
    await service.waitForBackground();
    assert.equal(calls, 3);
    await service.close();
    service = new Service(c, { now: () => now, wait: noWait, fetcher });
    service.requestRecord("3");
    await service.waitForBackground();
    assert.equal(calls, 3);
    now += 16 * 60000;
    service.requestRecord("3");
    await service.waitForBackground();
    assert.equal(calls, 6);
  } finally {
    await service.close();
    rmSync(c.dataDir, { recursive: true, force: true });
  }
});

test("select and visible-record endpoints return before deferred remote information completes", async () => {
  const c = config();
  let release!: () => void;
  let calls = 0;
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const { app, service } = await buildApp(
    c,
    {
      now: () => instant,
      wait: noWait,
      fetcher: (async () => {
        calls++;
        await gate;
        return json({ tracklist: [{ position: "A1", title: "Deferred" }] });
      }) as typeof fetch,
    },
    { schedule: false },
  );
  try {
    service.store.put(item(1));
    const response = await app.inject({
      method: "POST",
      url: "/api/select",
      payload: { recordId: "1" },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().selection.record.tracks.length, 0);
    await tick();
    assert.equal(calls, 1);
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/records/1/details",
          payload: {},
        })
      ).statusCode,
      202,
    );
    assert.equal(calls, 1);
    release();
    await service.waitForBackground();
    assert.equal(calls, 1);
    assert.equal(service.state().selection!.record.tracks[0].title, "Deferred");
  } finally {
    release();
    await app.close();
    rmSync(c.dataDir, { recursive: true, force: true });
  }
});

test("Wiki priority uses master identity filled by an earlier detail job and propagates to the correct copies", async () => {
  const c = { ...config(), wikiEnabled: true };
  const queries: string[] = [];
  const service = new Service(c, {
    now: () => instant,
    wait: noWait,
    fetcher: (async (url: unknown) => {
      const u = new URL(String(url));
      if (u.hostname === "api.discogs.com")
        return json({ master_id: 123, tracklist: [] });
      if (u.hostname === "query.wikidata.org") {
        queries.push(u.searchParams.get("query")!);
        return json({
          results: {
            bindings: [
              {
                property: {
                  value: "http://www.wikidata.org/prop/direct/P1954",
                },
                discogsId: { value: "123" },
                entity: { value: "http://www.wikidata.org/entity/Q100" },
              },
            ],
          },
        });
      }
      if (u.hostname === "www.wikidata.org")
        return json({
          entities: {
            Q100: {
              id: "Q100",
              labels: { en: { value: "Verified album" } },
              claims: {
                P1954: [
                  { rank: "normal", mainsnak: { datavalue: { value: "123" } } },
                ],
              },
            },
          },
        });
      throw new Error("Unexpected endpoint");
    }) as typeof fetch,
  });
  try {
    service.store.put({ ...item(1), masterId: null });
    service.store.put({ ...item(2), releaseId: 1, masterId: null });
    service.store.put(
      { ...item(3), masterId: 999 },
      new Date(instant).toISOString(),
    );
    service.requestRecord("1");
    await service.waitForBackground();
    assert.equal(queries.length, 1);
    assert.match(queries[0], /P1954 "123"/);
    assert.equal(
      service.store.record("1")!.albumInfo!.wikidataUrl,
      "https://www.wikidata.org/wiki/Q100",
    );
    assert.equal(
      service.store.record("2")!.albumInfo!.wikidataUrl,
      "https://www.wikidata.org/wiki/Q100",
    );
    assert.equal(service.store.record("3")!.albumInfo, undefined);
  } finally {
    await service.close();
    rmSync(c.dataDir, { recursive: true, force: true });
  }
});
