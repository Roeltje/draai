import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  existsSync,
  statSync,
  chmodSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const updater = fileURLToPath(
  new URL("../scripts/update-lxc.sh", import.meta.url),
);
function shell(body: string, args: string[] = []) {
  return spawnSync(
    "bash",
    ["-c", 'source "$1"; shift; ' + body, "test", updater, ...args],
    { encoding: "utf8", env: { ...process.env, SUDO_USER: "" } },
  );
}
function fixture(fn: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), "draai-update-test-"));
  try {
    for (const part of ["app", "data", "stage", "stage/app"])
      mkdirSync(join(dir, part), { recursive: true });
    writeFileSync(join(dir, "app/version"), "old");
    writeFileSync(join(dir, "stage/app/version"), "new");
    writeFileSync(join(dir, "data/demo.sqlite"), "old-demo");
    writeFileSync(join(dir, "data/live.sqlite"), "old-live");
    writeFileSync(
      join(dir, "config"),
      "HOST=127.0.0.1\nPORT='4321'\nDATA_DIR=/var/lib/draai\nAPP_ORIGIN=https://draai.example.com\nDISCOGS_TOKEN=private-fixture\n",
    );
    writeFileSync(join(dir, "unit"), "old-unit");
    writeFileSync(join(dir, "stage/new.service"), "new-unit");
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const setup = `
  ROOT=$1; UPDATE_APP="$ROOT/app"; UPDATE_ENV="$ROOT/config";
  UPDATE_UNIT="$ROOT/unit"; UPDATE_DATA="$ROOT/data";
  UPDATE_BACKUP_ROOT="$ROOT/backups"; DRAAI_TMP="$ROOT/stage"; DRAAI_COMMIT=abcdef;
  systemctl() { printf '%s\\n' "$*" >> "$ROOT/actions"; }
  install() { if [[ $1 == -d ]]; then mkdir -p "\${@: -1}"; chmod 700 "\${@: -1}"; else cp "\${@: -2:1}" "\${@: -1}"; fi; }
  update_render_unit() { :; }
`;

test("updater help and unsupported platform never stop the service", () => {
  assert.equal(spawnSync("bash", [updater, "--help"]).status, 0);
  const r = shell(
    "uname() { echo Darwin; }; systemctl() { echo UNEXPECTED; }; update_main",
  );
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Alleen Linux/);
  assert.doesNotMatch(r.stdout, /UNEXPECTED/);
});

test("updater parses network values without evaluating config or exposing tokens", () => {
  fixture((dir) => {
    let r = shell(
      'UPDATE_ENV=$1; update_read_environment; echo "$UPDATE_PORT"',
      [join(dir, "config")],
    );
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /4321/);
    assert.doesNotMatch(r.stdout + r.stderr, /private-fixture/);
    writeFileSync(
      join(dir, "config"),
      `HOST=0.0.0.0\nPORT=$(touch ${join(dir, "executed")})\nDATA_DIR=/var/lib/draai\n`,
    );
    r = shell("UPDATE_ENV=$1; update_read_environment", [join(dir, "config")]);
    assert.notEqual(r.status, 0);
    assert.equal(existsSync(join(dir, "executed")), false);
  });
});

test("failed build leaves running code, both databases and config untouched", () => {
  fixture((dir) => {
    const r = shell(
      setup + "update_build() { return 7; }; update_transaction",
      [dir],
    );
    assert.equal(r.status, 7, r.stderr);
    assert.equal(existsSync(join(dir, "actions")), false);
    assert.equal(existsSync(join(dir, "backups")), false);
    assert.equal(readFileSync(join(dir, "app/version"), "utf8"), "old");
    assert.equal(
      readFileSync(join(dir, "data/live.sqlite"), "utf8"),
      "old-live",
    );
  });
});

test("successful update cold-backs up both database modes and preserves private config", () => {
  fixture((dir) => {
    const original = readFileSync(join(dir, "config"), "utf8");
    const r = shell(
      setup +
        'update_build() { :; }; update_health() { :; }; update_transaction; printf "%s" "$UPDATE_BACKUP" > "$ROOT/backup-path"',
      [dir],
    );
    assert.equal(r.status, 0, r.stderr);
    const backup = readFileSync(join(dir, "backup-path"), "utf8");
    assert.equal(statSync(backup).mode & 0o777, 0o700);
    assert.equal(
      readFileSync(join(backup, "data/demo.sqlite"), "utf8"),
      "old-demo",
    );
    assert.equal(
      readFileSync(join(backup, "data/live.sqlite"), "utf8"),
      "old-live",
    );
    assert.ok(existsSync(join(backup, "app.tar")));
    assert.equal(readFileSync(join(dir, "app/version"), "utf8"), "new");
    assert.equal(readFileSync(join(dir, "config"), "utf8"), original);
    assert.equal(
      readFileSync(join(dir, "actions"), "utf8").split("\n")[0],
      "stop draai.service",
    );
    assert.doesNotMatch(r.stdout + r.stderr, /private-fixture/);
  });
});

test("failed new healthcheck restores old app, unit, config and both databases", () => {
  fixture((dir) => {
    const original = readFileSync(join(dir, "config"), "utf8");
    const r = shell(
      setup +
        `
      update_build() { :; }
      update_health() {
        if [[ $(cat "$UPDATE_APP/version") == new ]]; then
          echo migrated > "$UPDATE_DATA/live.sqlite";
          echo new-wal > "$UPDATE_DATA/live.sqlite-wal";
          echo modified > "$UPDATE_ENV";
          return 1;
        fi
      }
      trap update_cleanup EXIT
      update_transaction
    `,
      [dir],
    );
    assert.notEqual(r.status, 0);
    assert.equal(readFileSync(join(dir, "app/version"), "utf8"), "old");
    assert.equal(readFileSync(join(dir, "unit"), "utf8"), "old-unit");
    assert.equal(readFileSync(join(dir, "config"), "utf8"), original);
    assert.equal(
      readFileSync(join(dir, "data/live.sqlite"), "utf8"),
      "old-live",
    );
    assert.equal(
      readFileSync(join(dir, "data/demo.sqlite"), "utf8"),
      "old-demo",
    );
    assert.equal(existsSync(join(dir, "data/live.sqlite-wal")), false);
    assert.doesNotMatch(r.stdout + r.stderr, /private-fixture/);
  });
});

test("backup failure restarts old service without replacing data or code", () => {
  fixture((dir) => {
    const r = shell(
      setup +
        `
      update_build() { :; }; update_backup() { return 8; }; update_health() { :; }
      trap update_cleanup EXIT
      update_transaction
    `,
      [dir],
    );
    assert.equal(r.status, 8, r.stderr);
    assert.equal(readFileSync(join(dir, "app/version"), "utf8"), "old");
    assert.equal(
      readFileSync(join(dir, "data/live.sqlite"), "utf8"),
      "old-live",
    );
    assert.match(
      readFileSync(join(dir, "actions"), "utf8"),
      /start draai.service/,
    );
  });
});

test("updater preserves the working manual runtime and renders only the tsx entrypoint", () => {
  fixture((dir) => {
    const bin = join(dir, "bin");
    mkdirSync(bin);
    const node = join(bin, "node"),
      pnpm = join(bin, "pnpm");
    writeFileSync(node, "#!/bin/sh\necho v24.14.0\n");
    chmodSync(node, 0o755);
    writeFileSync(pnpm, "#!/bin/sh\necho 11.25.0\n");
    chmodSync(pnpm, 0o755);
    writeFileSync(
      join(dir, "unit"),
      `User=draai\nGroup=draai\nWorkingDirectory=${join(dir, "app")}\nEnvironmentFile=${join(dir, "config")}\nExecStart=${node} node_modules/tsx/dist/cli.mjs server/index.ts\nProtectSystem=strict\n`,
    );
    const r = shell(
      setup.replace("update_render_unit() { :; }", "") +
        'PATH="$ROOT/bin:$PATH"; update_detect_node; update_render_unit; printf "%s" "$UPDATE_NODE"',
      [dir],
    );
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, node);
    assert.match(
      readFileSync(join(dir, "stage/new.service"), "utf8"),
      /--import tsx server\/index.ts/,
    );
    assert.match(
      readFileSync(join(dir, "stage/new.service"), "utf8"),
      /ProtectSystem=strict/,
    );
  });
});

test("updater refuses dirty or unknown local Git source and in-app data", () => {
  fixture((dir) => {
    const app = join(dir, "app");
    const git = (...args: string[]) => execFileSync("git", args, { cwd: app });
    git("init", "-q");
    git("add", ".");
    git(
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.invalid",
      "commit",
      "-qm",
      "fixture",
    );
    let r = shell(setup + "update_check_local_code", [dir]);
    assert.equal(r.status, 0, r.stderr);
    writeFileSync(join(app, "personal.ts"), "untracked source");
    r = shell(setup + "update_check_local_code", [dir]);
    assert.notEqual(r.status, 0);
    rmSync(join(app, "personal.ts"));
    mkdirSync(join(app, "data"));
    r = shell(setup + "update_check_local_code", [dir]);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /Appmap bevat/);
  });
});

test("failure between the two code renames restores the old app", () => {
  fixture((dir) => {
    const r = shell(
      setup +
        `
      update_build() { :; }; update_health() { :; }
      mv() { if [[ $2 == "$DRAAI_TMP/app" ]]; then return 9; fi; command mv "$@"; }
      trap update_cleanup EXIT
      update_transaction
    `,
      [dir],
    );
    assert.equal(r.status, 9, r.stderr);
    assert.equal(readFileSync(join(dir, "app/version"), "utf8"), "old");
    assert.equal(
      readFileSync(join(dir, "data/live.sqlite"), "utf8"),
      "old-live",
    );
  });
});
