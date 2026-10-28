import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Mood } from "../shared/types.ts";
import {
  AppError,
  Service,
  type Config,
  type Dependencies,
} from "./service.ts";
import { REFRESH_INTERVAL } from "./discogs.ts";

const moods: Mood[] = ["alles", "rust", "warm", "energie", "avontuur"];
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
  const app = Fastify({ logger: false, bodyLimit: 16384 });
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
        typeof b.useAnniversaries !== "boolean")
    )
      throw new AppError(400, "Ongeldige stemming of weerkeuze.");
    service.select(
      b.mood as Mood | undefined,
      b.useWeather as boolean | undefined,
      b.recordId === undefined ? undefined : requiredString(b.recordId),
      b.useAnniversaries as boolean | undefined,
    );
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
      Object.keys(b).some((k) => !["tags", "excluded"].includes(k)) ||
      (b.tags !== undefined &&
        (!Array.isArray(b.tags) ||
          b.tags.length > 4 ||
          b.tags.some((v) => !moods.includes(v) || v === "alles"))) ||
      (b.excluded !== undefined && typeof b.excluded !== "boolean")
    )
      throw new AppError(400, "Ongeldige labels of uitsluiting.");
    service.patch(
      request.params.id,
      b as { tags?: Mood[]; excluded?: boolean },
    );
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
    async (request) => {
      await service.enrichRecords(request.params.id);
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
      if (config.token) void service.synchronize(true);
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
