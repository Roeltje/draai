import { DatabaseSync, backup } from "node:sqlite";
import { existsSync, mkdirSync, chmodSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { resolve, dirname, join } from "node:path";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const envAt = args.indexOf("--env");
const envFile = envAt >= 0 ? args.splice(envAt, 2)[1] : ".env";
if (envFile && existsSync(envFile)) loadEnvFile(envFile);
else if (envAt >= 0) throw new Error("Configuratiebestand niet gevonden.");
if (args.length !== 1)
  throw new Error(
    "Gebruik: pnpm backup -- [--env /etc/draai.env] /pad/naar/nieuwe-backup.sqlite",
  );
const source = join(
  resolve(process.env.DATA_DIR ?? "data"),
  process.env.DISCOGS_TOKEN ? "live.sqlite" : "demo.sqlite",
);
const target = resolve(args[0]);
if (!existsSync(source))
  throw new Error(
    "Geen database voor deze modus gevonden. Controleer de configuratie.",
  );
if (existsSync(target))
  throw new Error("Doel bestaat al. Kies een nieuwe bestandsnaam.");
mkdirSync(dirname(target), { recursive: true, mode: 0o700 });
const db = new DatabaseSync(source, { readOnly: true });
try {
  await backup(db, target);
  chmodSync(target, 0o600);
  const check = new DatabaseSync(target, { readOnly: true });
  try {
    if (check.prepare("PRAGMA integrity_check").get().integrity_check !== "ok")
      throw new Error("Back-upcontrole mislukt.");
  } finally {
    check.close();
  }
  console.log(`Consistente back-up gemaakt: ${target}`);
} finally {
  db.close();
}
