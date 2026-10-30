import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Mood, Season, SelectionPreferences } from "../shared/types.ts";
import { MOODS, SEASONS } from "../shared/selection.ts";
import {
  AppError,
  Service,
  type Config,
  type Dependencies,
} from "./service.ts";
import { REFRESH_INTERVAL } from "./discogs.ts";

const moods = MOODS;
function validatePreferences(
  value: Record<string, unknown>,
): SelectionPreferences {
  const validMoods = (v: unknown) =>
    Array.isArray(v) &&
    v.length <= 5 &&
    v.every((m) => moods.includes(m) && m !== "alles") &&
    new Set(v).size === v.length;
  const weather = value.weatherMoods as Record<string, unknown> | undefined;
  const thresholds = value.weatherThresholds as
    Record<string, unknown> | undefined;
  if (
    thresholds !== undefined &&
    (!thresholds ||
      typeof thresholds !== "object" ||
      Array.isArray(thresholds) ||
      Object.keys(thresholds).some(
        (key) => !["coldBelow", "warmFrom"].includes(key),
      ) ||
      !["coldBelow", "warmFrom"].every(
        (key) =>
          typeof thresholds[key] === "number" &&
          Number.isFinite(thresholds[key]) &&
          (thresholds[key] as number) >= -40 &&
          (thresholds[key] as number) <= 50,
      ) ||
      (thresholds.coldBelow as number) >= (thresholds.warmFrom as number))
  )
    throw new AppError(
      400,
      "Ongeldige temperatuurgrenzen: gebruik waarden tussen -40 en 50, met koud lager dan warm.",
    );
  const sideTimer = value.sideTimer as Record<string, unknown> | undefined;
  if (
    sideTimer !== undefined &&
    (!sideTimer ||
      typeof sideTimer !== "object" ||
      Array.isArray(sideTimer) ||
      Object.keys(sideTimer).some(
        (key) => !["enabled", "graceMinutes"].includes(key),
      ) ||
      typeof sideTimer.enabled !== "boolean" ||
      !Number.isInteger(sideTimer.graceMinutes) ||
      (sideTimer.graceMinutes as number) < 0 ||
      (sideTimer.graceMinutes as number) > 30)
  )
    throw new AppError(
      400,
      "Ongeldige timerinstellingen: kies een wachttijd van 0 tot en met 30 minuten.",
    );
  if (
    Object.keys(value).some(
      (k) =>
        ![
          "genreMoods",
          "styleMoods",
          "weatherMoods",
          "weatherThresholds",
          "sideTimer",
        ].includes(k),
    ) ||
    !Array.isArray(value.genreMoods) ||
    value.genreMoods.length > 100 ||
    !value.genreMoods.every(
      (g: any) =>
        g &&
        typeof g.genre === "string" &&
        g.genre.trim().length > 0 &&
        g.genre.length <= 100 &&
        Object.keys(g).every((k) => ["genre", "moods"].includes(k)) &&
        validMoods(g.moods),
    ) ||
    (value.styleMoods !== undefined &&
      (!Array.isArray(value.styleMoods) ||
        value.styleMoods.length > 200 ||
        !value.styleMoods.every(
          (rule: any) =>
            rule &&
            typeof rule.style === "string" &&
            rule.style.trim().length > 0 &&
            rule.style.length <= 100 &&
            Object.keys(rule).every((key) =>
              ["style", "moods"].includes(key),
            ) &&
            validMoods(rule.moods),
        ))) ||
    !weather ||
    typeof weather !== "object" ||
    Array.isArray(weather) ||
    Object.keys(weather).some((k) => !["rain", "cold", "warm"].includes(k)) ||
    !["rain", "cold", "warm"].every((k) => validMoods(weather[k]))
  )
    throw new AppError(400, "Ongeldige stijl-, genre- of weervoorkeuren.");
  const normalized = {
    genreMoods: value.genreMoods.map((g: any) => ({
      genre: g.genre.trim(),
      moods: g.moods,
    })),
    ...(Array.isArray(value.styleMoods)
      ? {
          styleMoods: value.styleMoods.map((rule: any) => ({
            style: rule.style.trim(),
            moods: rule.moods,
          })),
        }
      : {}),
    weatherMoods: weather,
    ...(sideTimer !== undefined ? { sideTimer } : {}),
    ...(thresholds !== undefined ? { weatherThresholds: thresholds } : {}),
  } as SelectionPreferences;
  if (
    new Set(normalized.genreMoods.map((g) => g.genre.toLocaleLowerCase()))
      .size !== normalized.genreMoods.length
  )
    throw new AppError(400, "Gebruik elk genre maar één keer.");
  if (
    normalized.styleMoods &&
    new Set(
      normalized.styleMoods.map((rule) =>
        rule.style.replace(/\s+/g, " ").toLocaleLowerCase(),
      ),
    ).size !== normalized.styleMoods.length
  )
    throw new AppError(400, "Gebruik elke stijl maar één keer.");
  return normalized;
}
const objectBody = (body: unknown): Record<string, unknown> => {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new AppError(400, "Ongeldige aanvraag.");
  return body as Record<string, unknown>;
};
const requiredString = (value: unknown) => {
  if (typeof value !== "string" || !value || value.length > 150)
    throw new AppError(400, "Een geldig ID is nodig.");
  return value;
};
export async function buildApp(
  config: Config,
  dependencies: Dependencies = {},
  options: {
    staticDir?: string;
    schedule?: boolean;
    heartbeatMs?: number;
  } = {},
) {
  const app = Fastify({ logger: false, bodyLimit: 65536 });
  const service = new Service(config, dependencies);
  app.decorate("service", service);
  app.addHook("onRequest", async (request) => {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return;
    const origin = request.headers.origin;
    const allowed = new Set([`${request.protocol}://${request.host}`]);
    if (config.origin) allowed.add(config.origin.replace(/\/$/, ""));
    if (!config.production) {
      allowed.add("http://localhost:5173");
      allowed.add("http://127.0.0.1:5173");
    }
    if (
      request.headers["sec-fetch-site"] === "cross-site" ||
      (origin && !allowed.has(origin))
    )
      throw new AppError(403, "Deze herkomst is niet toegestaan.");
    if (!request.headers["content-type"]?.startsWith("application/json"))
      throw new AppError(415, "Gebruik application/json.");
  });
  app.setErrorHandler((error, _request, reply) => {
    const statusCode =
      error instanceof Error && "statusCode" in error
        ? error.statusCode
        : undefined;
    const status =
      typeof statusCode === "number" && statusCode >= 400 && statusCode < 500
        ? statusCode
        : 500;
    reply.code(status).send({
      error:
        status === 500 || !(error instanceof Error)
          ? "Er ging iets mis op de server."
          : error.message,
    });
  });
  app.get("/api/health", async () => ({ ok: true }));
  app.get("/api/state", async () => service.state());
  app.post("/api/select", async (request) => {
    const b = objectBody(request.body);
    if (
      (b.mood !== undefined && !moods.includes(b.mood as Mood)) ||
      (b.useWeather !== undefined && typeof b.useWeather !== "boolean") ||
      (b.useAnniversaries !== undefined &&
        typeof b.useAnniversaries !== "boolean") ||
      (b.useSeasons !== undefined && typeof b.useSeasons !== "boolean") ||
      (b.useGenreMoods !== undefined && typeof b.useGenreMoods !== "boolean")
    )
      throw new AppError(400, "Ongeldige stemming of weerkeuze.");
    service.select(
      b.mood as Mood | undefined,
      b.useWeather as boolean | undefined,
      b.recordId === undefined ? undefined : requiredString(b.recordId),
      b.useAnniversaries as boolean | undefined,
      b.useSeasons as boolean | undefined,
      b.useGenreMoods as boolean | undefined,
    );
    return service.state();
  });
  app.post("/api/timer", async (request) => {
    const body = objectBody(request.body);
    const actions = [
      "start",
      "pause",
      "resume",
      "snooze",
      "dismiss",
      "stop",
    ] as const;
    if (
      !actions.includes(body.action as (typeof actions)[number]) ||
      Object.keys(body).some(
        (key) =>
          !["action", "sessionId", "expectedTimerId", "targetId"].includes(key),
      ) ||
      !(
        body.expectedTimerId === null ||
        (typeof body.expectedTimerId === "string" &&
          body.expectedTimerId.length > 0 &&
          body.expectedTimerId.length <= 150)
      ) ||
      (body.action !== "start" && body.targetId !== undefined)
    )
      throw new AppError(400, "Ongeldige timeractie.");
    service.timer({
      action: body.action as (typeof actions)[number],
      sessionId: requiredString(body.sessionId),
      expectedTimerId: body.expectedTimerId as string | null,
      ...(body.action === "start"
        ? { targetId: requiredString(body.targetId) }
        : {}),
    });
    return service.state();
  });
  app.post("/api/sessions/start", async (request) => {
    service.start(requiredString(objectBody(request.body).selectionId));
    return service.state();
  });
  app.post("/api/sessions/finish", async (request) => {
    const b = objectBody(request.body);
    if (
      b.note !== undefined &&
      (typeof b.note !== "string" || b.note.length > 10000)
    )
      throw new AppError(400, "Notitie mag maximaal 10.000 tekens bevatten.");
    service.finish(requiredString(b.sessionId), b.note as string | undefined);
    return service.state();
  });
  app.patch<{ Params: { id: string } }>("/api/records/:id", async (request) => {
    const b = objectBody(request.body);
    if (
      Object.keys(b).some(
        (k) => !["tags", "excluded", "seasons"].includes(k),
      ) ||
      (b.tags !== undefined &&
        (!Array.isArray(b.tags) ||
          b.tags.length > 5 ||
          b.tags.some((v) => !moods.includes(v) || v === "alles"))) ||
      (b.excluded !== undefined && typeof b.excluded !== "boolean") ||
      (b.seasons !== undefined &&
        b.seasons !== null &&
        (!Array.isArray(b.seasons) ||
          b.seasons.length > 5 ||
          b.seasons.some((s) => !SEASONS.includes(s))))
    )
      throw new AppError(400, "Ongeldige labels of uitsluiting.");
    service.patch(
      request.params.id,
      b as { tags?: Mood[]; excluded?: boolean; seasons?: Season[] | null },
    );
    return service.state();
  });
  app.patch("/api/preferences", async (request) => {
    service.setPreferences(validatePreferences(objectBody(request.body)));
    return service.state();
  });
  app.post("/api/sync", async (_request, reply) => {
    if (!config.token)
      throw new AppError(
        400,
        "Stel DISCOGS_TOKEN in op de server en herstart.",
      );
    void service.synchronize();
    reply.code(202);
    return service.state();
  });
  app.post("/api/weather/refresh", async () => {
    await service.refreshWeather();
    return service.state();
  });
  app.post("/api/enrichment/refresh", async (_request, reply) => {
    service.ensureWikiEnabled();
    void service.enrichRecords();
    reply.code(202);
    return service.state();
  });
  app.post<{ Params: { id: string } }>(
    "/api/records/:id/enrich",
    async (request, reply) => {
      service.ensureWikiEnabled();
      if (!service.store.record(request.params.id))
        throw new AppError(404, "Plaat niet gevonden.");
      void service.enrichRecords(request.params.id);
      reply.code(202);
      return service.state();
    },
  );
  app.post<{ Params: { id: string } }>(
    "/api/records/:id/details",
    async (request, reply) => {
      service.requestRecord(request.params.id);
      reply.code(202);
      return service.state();
    },
  );
  const streams = new Set<import("node:http").ServerResponse>();
  app.get("/api/events", (request, reply) => {
    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    const write = () => {
      if (!reply.raw.destroyed)
        reply.raw.write(
          `event: state\ndata: ${JSON.stringify(service.state())}\n\n`,
        );
    };
    streams.add(reply.raw);
    service.listeners.add(write);
    write();
    const timer = setInterval(write, options.heartbeatMs ?? 25000);
    timer.unref();
    reply.raw.on("close", () => {
      clearInterval(timer);
      service.listeners.delete(write);
      streams.delete(reply.raw);
    });
  });
  const staticDir = options.staticDir ?? resolve("dist/client");
  if (existsSync(staticDir)) {
    await app.register(fastifyStatic, { root: staticDir });
    app.setNotFoundHandler((request, reply) => {
      if (
        request.method === "GET" &&
        !request.url.startsWith("/api/") &&
        !request.url.split("?")[0].split("/").pop()?.includes(".")
      )
        return reply.sendFile("index.html");
      return reply.code(404).send({ error: "Niet gevonden." });
    });
  }
  const timers: NodeJS.Timeout[] = [];
  if (options.schedule !== false) {
    const syncTimer = setInterval(() => {
      if (config.token) void service.synchronize();
    }, REFRESH_INTERVAL);
    syncTimer.unref();
    timers.push(syncTimer);
    if (config.weatherKey) {
      const timer = setInterval(
        () => void service.refreshWeather(),
        10 * 60000,
      );
      timer.unref();
      timers.push(timer);
      void service.refreshWeather();
    }
    if (config.token) void service.synchronize();
    service.startBackground();
    const currentTimer = setInterval(() => service.refreshActive(), 60000);
    currentTimer.unref();
    timers.push(currentTimer);
  }
  app.addHook("preClose", async () => {
    streams.forEach((stream) => stream.end());
  });
  app.addHook("onClose", async () => {
    timers.forEach(clearInterval);
    await service.close();
  });
  return { app, service };
}
