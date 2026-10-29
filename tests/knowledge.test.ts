import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  KnowledgeClient,
  KNOWLEDGE_TTL,
  exactDates,
  occasionsFor,
} from "../server/knowledge.ts";
import { demoRecords } from "../server/demo.ts";
import { basicRecord } from "../server/discogs.ts";
import { Service } from "../server/service.ts";
import { buildApp } from "../server/app.ts";
import type { AlbumInfo, RecordItem } from "../shared/types.ts";

const now = Date.parse("2026-10-28T10:00:00Z");
const fixture = () =>
  JSON.parse(
    readFileSync(
      new URL("./fixtures/wikidata-entities.json", import.meta.url),
      "utf8",
    ),
  );
const record = (): RecordItem => ({
  ...demoRecords(new Date(now).toISOString())[0],
  demo: false,
  masterId: 123,
  artistIds: [42],
  albumInfo: undefined,
});
const binding = (p: string, id: string, q: string) => ({
  property: { value: `http://www.wikidata.org/prop/direct/${p}` },
  discogsId: { value: id },
  entity: { value: `http://www.wikidata.org/entity/${q}` },
});
const matches = () => ({
  results: {
    bindings: [binding("P1954", "123", "Q100"), binding("P1953", "42", "Q200")],
  },
});
const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
const fetcher = (handler: (url: URL) => Response | Promise<Response>) =>
  (async (url: unknown) => handler(new URL(String(url)))) as typeof fetch;
const noWait = async () => {};
const info = (dates: AlbumInfo["dates"]): AlbumInfo => ({
  status: "ready",
  summary: "",
  wikipediaUrl: "",
  wikidataUrl: "https://www.wikidata.org/wiki/Q100",
  language: "",
  checkedAt: new Date(now).toISOString(),
  dates,
  artists: [],
});
const date = (
  kind: "release" | "birth" | "death",
  value: string,
  subject = "Muzikant",
) => ({
  kind,
  date: value,
  subject,
  sourceUrl: "https://www.wikidata.org/wiki/Q100",
});
const setup = () => {
  const dir = mkdtempSync(join(tmpdir(), "draai-knowledge-"));
  return {
    config: { dataDir: dir, username: "fixture", stationId: "FIXTURE" },
    cleanup: () => rmSync(dir, { recursive: true, force: true }),
  };
};

test("long Retry-After aborts bounded lookup without retrying prematurely", async () => {
  let calls = 0;
  const waits: number[] = [];
  const client = new KnowledgeClient(
    fetcher(() => {
      calls++;
      return new Response("", {
        status: 429,
        headers: { "Retry-After": "60" },
      });
    }),
    async (ms) => {
      waits.push(ms);
    },
    () => now,
  );
  assert.equal((await client.lookup(record())).status, "error");
  assert.equal(calls, 1);
  assert.deepEqual(waits, []);
});

test("date mapping rejects approximate, deprecated, non-Gregorian and imprecise claims", () => {
  const entity = fixture().entities.Q200;
  const original = entity.claims.P569[0];
  assert.equal(
    exactDates(entity, "P569", "birth", "Artist")[0].date,
    "1940-10-28",
  );
  for (const mutate of [
    (c: any) => {
      c.rank = "deprecated";
    },
    (c: any) => {
      c.qualifiers = { P1480: [{}] };
    },
    (c: any) => {
      c.mainsnak.datavalue.value.precision = 10;
    },
    (c: any) => {
      c.mainsnak.datavalue.value.before = 1;
    },
    (c: any) => {
      c.mainsnak.datavalue.value.calendarmodel =
        "http://www.wikidata.org/entity/Q1985786";
    },
    (c: any) => {
      c.mainsnak.datavalue.value.time = "+1940-02-30T00:00:00Z";
    },
  ]) {
    const c = structuredClone(original);
    mutate(c);
    entity.claims.P569 = [c];
    assert.deepEqual(exactDates(entity, "P569", "birth", "Artist"), []);
  }
  const conflict = structuredClone(original);
  conflict.mainsnak.datavalue.value.time = "+1941-10-28T00:00:00Z";
  entity.claims.P569 = [original, conflict];
  assert.deepEqual(exactDates(entity, "P569", "birth", "Artist"), []);
  const album = fixture().entities.Q100;
  album.claims.P577[0].qualifiers = { P291: [{}] };
  assert.equal(exactDates(album, "P577", "release", "Album").length, 1);
});

test("exact master and artist mapping supplies sourced dates and bounded Dutch plaintext", async () => {
  const calls: URL[] = [];
  const client = new KnowledgeClient(
    fetcher((url) => {
      calls.push(url);
      if (url.hostname === "query.wikidata.org") return response(matches());
      if (url.hostname === "www.wikidata.org") return response(fixture());
      return response({
        query: {
          pages: [{ extract: `<b>Tekst</b> ${"lange tekst ".repeat(100)}` }],
        },
      });
    }),
    noWait,
    () => now,
  );
  const result = await client.lookup(record());
  assert.equal(result.status, "ready");
  assert.equal(result.language, "nl");
  assert.equal(result.dates.length, 3);
  assert.equal(result.summary.length, 600);
  assert.doesNotMatch(result.summary, /<b>/);
  assert.equal(result.wikidataUrl, "https://www.wikidata.org/wiki/Q100");
  assert.match(result.wikipediaUrl, /nl.wikipedia.org/);
  const query = calls[0].searchParams.get("query")!;
  assert.match(query, /wdt:P1954 "123"/);
  assert.match(query, /wdt:P1953 "42"/);
  assert.doesNotMatch(query, /rdfs:label|search/);
  assert.equal(calls[2].searchParams.get("explaintext"), "1");
  assert.equal(calls[2].searchParams.get("exchars"), "600");
});

test("missing identifiers perform no search and ambiguous exact matches stay unlinked", async () => {
  let calls = 0;
  const client = new KnowledgeClient(
    fetcher(() => {
      calls++;
      return response({
        results: {
          bindings: [
            binding("P1954", "123", "Q100"),
            binding("P1954", "123", "Q101"),
          ],
        },
      });
    }),
    noWait,
    () => now,
  );
  assert.equal(
    (await client.lookup({ ...record(), masterId: null, artistIds: [] }))
      .status,
    "not_found",
  );
  assert.equal(calls, 0);
  const result = await client.lookup({ ...record(), artistIds: [] });
  assert.equal(result.status, "ambiguous");
  assert.equal(result.wikidataUrl, "");
  assert.equal(calls, 1);
});

test("returned entity must still confirm exact non-deprecated external IDs; absent mappings stay not found", async () => {
  const data = fixture();
  data.entities.Q100.claims.P1954[0].rank = "deprecated";
  data.entities.Q200.claims.P1953[0].mainsnak.datavalue.value = "99";
  const client = new KnowledgeClient(
    fetcher((url) =>
      response(url.hostname === "query.wikidata.org" ? matches() : data),
    ),
    noWait,
    () => now,
  );
  assert.equal((await client.lookup(record())).status, "not_found");
  const missing = new KnowledgeClient(
    fetcher(() => response({ results: { bindings: [] } })),
    noWait,
    () => now,
  );
  assert.equal((await missing.lookup(record())).status, "not_found");
});

test("benign identifier name qualifiers are accepted while uncertain identifiers stay unlinked", async () => {
  const data = fixture();
  let uncertain = false;
  const client = new KnowledgeClient(
    fetcher((url) => {
      if (url.hostname === "query.wikidata.org")
        return response({
          results: { bindings: [binding("P1954", "123", "Q100")] },
        });
      if (url.hostname === "www.wikidata.org") {
        data.entities.Q100.claims.P1954[0].qualifiers = uncertain
          ? { P1480: [{}] }
          : { P1810: [{}], P813: [{}] };
        return response(data);
      }
      return response({ query: { pages: [{ extract: "Fixture excerpt" }] } });
    }),
    noWait,
    () => now,
  );
  assert.equal(
    (await client.lookup({ ...record(), artistIds: [] })).status,
    "ready",
  );
  uncertain = true;
  assert.equal(
    (await client.lookup({ ...record(), artistIds: [] })).status,
    "not_found",
  );
});

test("English article fallback and excerpt outages preserve verified structured dates", async () => {
  const data = fixture();
  delete data.entities.Q100.sitelinks.nlwiki;
  let fail = false;
  const client = new KnowledgeClient(
    fetcher((url) => {
      if (url.hostname === "query.wikidata.org") return response(matches());
      if (url.hostname === "www.wikidata.org") return response(data);
      assert.equal(url.hostname, "en.wikipedia.org");
      return fail
        ? response({}, 503)
        : response({ query: { pages: [{ extract: "English album story." }] } });
    }),
    noWait,
    () => now,
  );
  assert.equal((await client.lookup(record())).language, "en");
  fail = true;
  const result = await client.lookup(record());
  assert.equal(result.status, "ready");
  assert.equal(result.summary, "");
  assert.equal(result.dates.length, 3);
});

test("artist excerpts use only exact Discogs artist entities, remain bounded and reuse a30day cache", async () => {
  const data = fixture();
  data.entities.Q200.sitelinks = { enwiki: { title: "Example Musician" } };
  let artistCalls = 0;
  let at = now;
  const values = new Map<string, unknown>();
  const cache = {
    get<T>(key: string, fallback: T): T {
      return values.has(key) ? (values.get(key) as T) : fallback;
    },
    set(key: string, value: unknown) {
      values.set(key, value);
    },
  };
  const client = new KnowledgeClient(
    fetcher((url) => {
      if (url.hostname === "query.wikidata.org") return response(matches());
      if (url.hostname === "www.wikidata.org") return response(data);
      if (url.searchParams.get("titles") === "Example Musician") {
        artistCalls++;
        return response({
          query: { pages: [{ extract: "Artist biography. ".repeat(100) }] },
        });
      }
      return response({ query: { pages: [{ extract: "Album." }] } });
    }),
    noWait,
    () => at,
    cache,
  );
  const first = await client.lookup(record());
  assert.equal(first.artists!.length, 1);
  assert.equal(first.artists![0].artistId, 42);
  assert.equal(first.artists![0].summary.length, 600);
  assert.equal(first.artists![0].language, "en");
  assert.match(first.artists![0].wikidataUrl, /Q200$/);
  await client.lookup(record());
  assert.equal(artistCalls, 1);
  at += KNOWLEDGE_TTL + 1;
  await client.lookup(record());
  assert.equal(artistCalls, 2);
});

test("Amsterdam calendar uses local day, truthful labels, exact leap day and no negative ages", () => {
  const r = {
    ...record(),
    albumInfo: info([
      date("release", "1970-10-28", "Album"),
      date("birth", "1940-10-28"),
      date("death", "2010-10-28"),
      date("birth", "2030-10-28"),
    ]),
  };
  assert.equal(occasionsFor([r], Date.parse("2026-10-27T22:30:00Z")).length, 0);
  const occasions = occasionsFor([r], Date.parse("2026-10-27T23:30:00Z"));
  assert.equal(occasions.length, 3);
  assert.match(occasions[0].description, /releasedatum volgens Wikidata/);
  assert.match(occasions[1].description, /geboortedag/);
  assert.match(occasions[2].description, /herdenken/);
  r.albumInfo = info([date("birth", "1940-02-29")]);
  r.albumInfo.checkedAt = "2028-02-28T00:00:00Z";
  assert.equal(occasionsFor([r], Date.parse("2028-02-29T12:00:00Z")).length, 1);
  r.albumInfo.checkedAt = "2027-02-28T00:00:00Z";
  assert.equal(occasionsFor([r], Date.parse("2027-02-28T12:00:00Z")).length, 0);
});

test("calendar rejects expired or invalid knowledge cache timestamps", () => {
  const r = { ...record(), albumInfo: info([date("release", "1970-10-28")]) };
  r.albumInfo.checkedAt = new Date(now - KNOWLEDGE_TTL).toISOString();
  assert.equal(occasionsFor([r], now).length, 0);
  r.albumInfo.checkedAt = "invalid";
  assert.equal(occasionsFor([r], now).length, 0);
});

test("date boost changes probability, caps at1.8 and never overrides exclusions or recent choices", async () => {
  const { config, cleanup } = setup();
  let random = 0.6;
  const service = new Service(config, { now: () => now, random: () => random });
  const clear = () => service.store.db.exec("DELETE FROM selections");
  try {
    service
      .state()
      .records.slice(2)
      .forEach((r) => service.patch(r.id, { excluded: true }));
    service.select("alles", false, undefined, false);
    assert.equal(service.state().selection!.record.id, "demo-2");
    clear();
    service.select();
    assert.equal(service.state().selection!.record.id, "demo-1");
    assert.match(service.state().selection!.reasons.join(" "), /1,8×/);
    service.select();
    assert.equal(service.state().selection!.record.id, "demo-2");
    clear();
    const first = service.store.record("demo-1")!;
    first.albumInfo!.dates.push(
      date("birth", "1940-10-28"),
      date("death", "2010-10-28"),
    );
    service.store.put(first);
    random = 0.7;
    service.select();
    assert.equal(service.state().selection!.record.id, "demo-2");
    clear();
    service.patch("demo-1", { excluded: true });
    service.select();
    assert.equal(service.state().selection!.record.id, "demo-2");
    service.patch("demo-1", { excluded: false });
    service.select("alles", false, "demo-1");
    assert.deepEqual(service.state().selection!.reasons, [
      "Zelf uit je collectie gekozen.",
    ]);
  } finally {
    await service.close();
    cleanup();
  }
});

test("demo augmentation upgrades an existing database while retaining private history and tags", async () => {
  const { config, cleanup } = setup();
  let service = new Service(config, { now: () => now });
  try {
    service.select();
    service.start(service.state().selection!.id);
    service.finish(service.state().activeSession!.id, "Privénotitie");
    service.patch("demo-1", { tags: ["rust"], excluded: true });
    service.store.set("demoKnowledgeVersion", 0);
    const r = service.store.record("demo-1")!;
    delete r.albumInfo;
    service.store.put(r);
    await service.close();
    service = new Service(config, { now: () => now });
    assert.equal(service.state().history[0].note, "Privénotitie");
    const current = service.store.record("demo-1")!;
    assert.deepEqual(current.tags, ["rust"]);
    assert.equal(current.excluded, true);
    assert.equal(current.albumInfo!.demo, true);
    assert.equal(current.albumInfo!.dates[0].date, "2020-10-28");
  } finally {
    await service.close();
    cleanup();
  }
});

test("knowledge cache survives Discogs normalization and skips fresh automatic lookups", async () => {
  const { config, cleanup } = setup();
  let calls = 0;
  const service = new Service(
    { ...config, token: "fixture", wikiEnabled: true },
    {
      now: () => now,
      fetcher: fetcher(() => {
        calls++;
        return response(matches());
      }),
      wait: noWait,
    },
  );
  try {
    const original = { ...record(), albumInfo: info([]) };
    service.store.put(original);
    const updated = basicRecord(
      {
        instance_id: original.id,
        basic_information: { id: 123, master_id: 123, formats: [] },
      },
      original,
      new Date(now).toISOString(),
    );
    assert.equal(updated.masterId, 123);
    assert.deepEqual(updated.albumInfo, original.albumInfo);
    await service.enrichRecords();
    assert.equal(calls, 0);
  } finally {
    await service.close();
    cleanup();
  }
});

test("upstream outages are isolated and enrichment has a single job lock", async () => {
  const { config, cleanup } = setup();
  let release!: () => void;
  const barrier = new Promise<void>((r) => {
    release = r;
  });
  let calls = 0;
  const service = new Service(
    { ...config, token: "fixture", wikiEnabled: true },
    {
      now: () => now,
      wait: noWait,
      fetcher: fetcher(async () => {
        calls++;
        await barrier;
        return response({}, 503);
      }),
    },
  );
  try {
    service.store.put(record());
    const job = service.enrichRecords();
    const same = service.enrichRecords();
    await new Promise((r) => setTimeout(r, 5));
    assert.equal(calls, 1);
    const priority = service.enrichRecords(record().id);
    release();
    await Promise.all([job, same, priority]);
    assert.equal(calls, 2);
    assert.equal(service.state().enrichment!.running, false);
    assert.equal(service.state().records[0].albumInfo!.status, "error");
    service.select();
    assert.ok(service.state().selection);
  } finally {
    await service.close();
    cleanup();
  }
});

test("HTTP enrichment routes return state, protect job scope and validate anniversary input", async () => {
  const { config, cleanup } = setup();
  const { app } = await buildApp(
    config,
    { now: () => now },
    { schedule: false },
  );
  try {
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/enrichment/refresh",
          payload: {},
        })
      ).statusCode,
      202,
    );
    const single = await app.inject({
      method: "POST",
      url: "/api/records/demo-1/enrich",
      payload: {},
    });
    assert.equal(single.statusCode, 202);
    assert.equal(single.json().records[0].albumInfo.demo, true);
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/records/missing/enrich",
          payload: {},
        })
      ).statusCode,
      404,
    );
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/select",
          payload: { useAnniversaries: "yes" },
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: "/api/select",
          payload: { useAnniversaries: false },
        })
      ).statusCode,
      200,
    );
  } finally {
    await app.close();
    cleanup();
  }
});

test("live enrichment needs explicit opt-in and disabled endpoints make no outgoing requests", async () => {
  const { config, cleanup } = setup();
  let calls = 0;
  const { app, service } = await buildApp(
    { ...config, token: "fixture" },
    {
      now: () => now,
      wait: noWait,
      fetcher: fetcher(() => {
        calls++;
        return response(matches());
      }),
    },
    { schedule: false },
  );
  try {
    service.store.put(record());
    assert.equal(service.state().settings.wikiEnabled, false);
    for (const url of [
      "/api/enrichment/refresh",
      `/api/records/${record().id}/enrich`,
    ]) {
      const reply = await app.inject({ method: "POST", url, payload: {} });
      assert.equal(reply.statusCode, 403);
      assert.match(reply.json().error, /WIKI_ENABLED=true/);
    }
    await assert.rejects(service.enrichRecords(), /WIKI_ENABLED/);
    assert.equal(calls, 0);
    service.select();
    assert.ok(service.state().selection);
  } finally {
    await app.close();
    cleanup();
  }
});
