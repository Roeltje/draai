import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { resolve } from "node:path";
import { buildApp } from "./app.ts";

if (existsSync(".env")) loadEnvFile(".env");

const token = process.env.DISCOGS_TOKEN?.trim() ?? "";
const username = process.env.DISCOGS_USERNAME?.trim() ?? "";
const weatherKey = process.env.WU_API_KEY?.trim() ?? "";
const stationId = process.env.WU_STATION_ID?.trim() ?? "";
const missingConfiguration: string[] = [];
if (token && !username)
  missingConfiguration.push(
    "DISCOGS_TOKEN is ingesteld, maar DISCOGS_USERNAME ontbreekt. Vul lokaal je eigen Discogs-gebruikersnaam in.",
  );
if (weatherKey && !stationId)
  missingConfiguration.push(
    "WU_API_KEY is ingesteld, maar WU_STATION_ID ontbreekt. Vul lokaal je eigen Weather Underground-station-ID in.",
  );
if (missingConfiguration.length) {
  console.error(`Draai kan niet starten:\n${missingConfiguration.join("\n")}`);
  process.exit(1);
}

const { app } = await buildApp({
  dataDir: resolve(process.env.DATA_DIR ?? "./data"),
  token: token || undefined,
  username,
  weatherKey: weatherKey || undefined,
  stationId,
  origin: process.env.APP_ORIGIN?.trim() || undefined,
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
