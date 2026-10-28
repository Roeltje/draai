import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { resolve } from "node:path";
import { buildApp } from "./app.ts";

if (existsSync(".env")) loadEnvFile(".env");
const { app } = await buildApp({
  dataDir: resolve(process.env.DATA_DIR ?? "./data"),
  token: process.env.DISCOGS_TOKEN,
  username: process.env.DISCOGS_USERNAME ?? "roeltej",
  weatherKey: process.env.WU_API_KEY,
  stationId: process.env.WU_STATION_ID ?? "IWAALW30",
  origin: process.env.APP_ORIGIN,
  production: process.env.NODE_ENV === "production",
  wikiEnabled: process.env.WIKI_ENABLED === "true",
});
const port = Number(process.env.PORT ?? 3210);
const host = process.env.HOST ?? "127.0.0.1";
try {
  await app.listen({ port, host });
  console.log(`Draai luistert op http://${host}:${port}`);
} catch {
  console.error("Draai kon niet starten. Controleer de poort en configuratie.");
  process.exitCode = 1;
  await app.close();
}
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.once(signal, () => {
    void app.close().then(() => process.exit(0));
  });
