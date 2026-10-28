import { DatabaseSync } from "node:sqlite";
import type { RecordItem } from "../shared/types.ts";

export class Store {
  db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY, data TEXT NOT NULL, details_at TEXT);
      CREATE TABLE IF NOT EXISTS state(key TEXT PRIMARY KEY, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS selections(id TEXT PRIMARY KEY, record_id TEXT NOT NULL, reasons TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, selection_id TEXT UNIQUE NOT NULL, record_id TEXT NOT NULL, started_at TEXT NOT NULL, ended_at TEXT, note TEXT NOT NULL DEFAULT '');
      PRAGMA user_version=1;`);
  }
  get<T>(key: string, fallback: T): T {
    const row = this.db
      .prepare("SELECT data FROM state WHERE key=?")
      .get(key) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as T) : fallback;
  }
  set(key: string, value: unknown) {
    this.db
      .prepare("INSERT OR REPLACE INTO state VALUES (?,?)")
      .run(key, JSON.stringify(value));
  }
  records(): RecordItem[] {
    return (
      this.db.prepare("SELECT data FROM records ORDER BY id").all() as {
        data: string;
      }[]
    ).map((r) => JSON.parse(r.data) as RecordItem);
  }
  record(id: string): RecordItem | undefined {
    const row = this.db
      .prepare("SELECT data FROM records WHERE id=?")
      .get(id) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as RecordItem) : undefined;
  }
  put(record: RecordItem, detailsAt?: string) {
    if (detailsAt !== undefined)
      this.db
        .prepare("INSERT OR REPLACE INTO records VALUES (?,?,?)")
        .run(record.id, JSON.stringify(record), detailsAt);
    else
      this.db
        .prepare(
          "INSERT INTO records(id,data) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
        )
        .run(record.id, JSON.stringify(record));
  }
  detailsAt(id: string): string | null {
    return (
      (
        this.db.prepare("SELECT details_at FROM records WHERE id=?").get(id) as
          { details_at: string | null } | undefined
      )?.details_at ?? null
    );
  }
  close() {
    this.db.close();
  }
}
