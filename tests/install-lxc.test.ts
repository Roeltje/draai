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
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const installer = fileURLToPath(
  new URL("../scripts/install-lxc.sh", import.meta.url),
);
function shell(body: string, args: string[] = []) {
  return spawnSync(
    "bash",
    ["-c", 'source "$1"; shift; ' + body, "test", installer, ...args],
    {
      encoding: "utf8",
      env: { ...process.env, SUDO_USER: "" },
    },
  );
}
function temporary(fn: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), "draai-install-test-"));
  try {
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("installer help works without root; wrong platform stops before package installation", () => {
  const help = spawnSync("bash", [installer, "--help"], { encoding: "utf8" });
  assert.equal(help.status, 0, help.stderr);
  temporary((dir) => {
    const marker = join(dir, "apt-ran");
    const r = shell(
      'uname() { echo Darwin; }; apt-get() { touch "$MARKER"; }; MARKER=$1; main --origin http://192.168.1.50:3210',
      [marker],
    );
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /Alleen Linux/);
    assert.equal(existsSync(marker), false);
  });
});

test("installer rejects token URLs, invalid origins and option injection without echoing secrets", () => {
  for (const args of [
    ["--origin", "http://host:3210/path"],
    ["--origin", "http://host:99999"],
    ["--origin", "http://host:3210", "--ref", "--upload-pack=command"],
    [
      "--origin",
      "http://host:3210",
      "--repo",
      "https://test-secret@github.com/Roeltje/draai.git",
    ],
    [
      "--origin",
      "http://host:3210",
      "--repo",
      "https://github.com/Roeltje/draai.git?token=test-secret",
    ],
  ]) {
    const r = shell('parse_args "$@"', args);
    assert.notEqual(r.status, 0);
    assert.doesNotMatch(r.stdout + r.stderr, /test-secret/);
  }
  assert.equal(
    shell('parse_args "$@"', ["--origin", "http://192.168.1.50:3210"]).status,
    0,
  );
});

test("installer exports committed source rather than untracked secrets or working changes", () => {
  temporary((dir) => {
    const repo = join(dir, "repo"),
      staging = join(dir, "staging");
    mkdirSync(repo);
    mkdirSync(staging);
    const git = (...args: string[]) =>
      execFileSync("git", args, { cwd: repo, encoding: "utf8" });
    git("init", "-q", "-b", "main");
    mkdirSync(join(repo, "deploy"));
    mkdirSync(join(repo, "server"));
    writeFileSync(join(repo, "pnpm-lock.yaml"), "fixture");
    writeFileSync(join(repo, "deploy/draai.service"), "fixture");
    writeFileSync(join(repo, "server/index.ts"), "committed version");
    git("add", ".");
    git(
      "-c",
      "user.name=Installer test",
      "-c",
      "user.email=test@example.invalid",
      "commit",
      "-qm",
      "fixture",
    );
    writeFileSync(join(repo, ".env"), "SECRET=fixture");
    writeFileSync(join(repo, "server/index.ts"), "uncommitted version");
    const r = shell(
      'install() { mkdir -p "${@: -1}"; }; DRAAI_SOURCE=$1; DRAAI_TMP=$2; fetch_code',
      [repo, staging],
    );
    assert.equal(r.status, 0, r.stderr);
    assert.equal(
      readFileSync(join(staging, "app/server/index.ts"), "utf8"),
      "committed version",
    );
    assert.equal(existsSync(join(staging, "app/.env")), false);
    assert.equal(existsSync(join(staging, "app/.git")), false);
    assert.equal(
      readFileSync(join(staging, "app/INSTALL_COMMIT"), "utf8").trim(),
      git("rev-parse", "HEAD").trim(),
    );
  });
});

test("installer creates restricted demo config and preserves existing keys byte for byte", () => {
  temporary((dir) => {
    const file = join(dir, "draai.env");
    const mocks =
      "chown() { :; }; stat() { echo root:draai:640; }; DRAAI_ORIGIN=http://192.168.1.50:3210; ";
    let r = shell(mocks + 'write_environment "$1"', [file]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(statSync(file).mode & 0o777, 0o640);
    let original = readFileSync(file, "utf8").replace(
      "DISCOGS_TOKEN=",
      "DISCOGS_TOKEN=private-fixture",
    );
    writeFileSync(file, original);
    r = shell(mocks + 'write_environment "$1"', [file]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(readFileSync(file, "utf8"), original);
    assert.doesNotMatch(r.stdout + r.stderr, /private-fixture/);
    original += "PORT=3211\n";
    writeFileSync(file, original);
    r = shell(mocks + 'write_environment "$1"', [file]);
    assert.notEqual(r.status, 0);
    assert.equal(readFileSync(file, "utf8"), original);
  });
});

test("installer rejects a failed runtime checksum before installing any runtime files", () => {
  temporary((dir) => {
    const marker = join(dir, "runtime-mutated");
    const r = shell(
      `
      DRAAI_TMP=$1; MARKER=$2;
      uname() { echo x86_64; }
      curl() {
        local dest="";
        while (($#)); do if [[ $1 == -o ]]; then dest=$2; shift; fi; shift; done;
        if [[ $dest == *SHASUMS256.txt ]]; then
          printf '%064d  node-v24.19.0-linux-x64.tar.xz\\n' 0 > "$dest";
        else printf 'corrupt archive' > "$dest"; fi;
      }
      sha256sum() { return 1; }
      install() { touch "$MARKER"; }
      install_node
    `,
      [dir, marker],
    );
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /SHA256-controle mislukt/);
    assert.equal(existsSync(marker), false);
  });
});

test("installer accepts Ubuntu 24.04 and 26.04 but rejects other releases", () => {
  assert.equal(
    shell("supports_ubuntu ubuntu 24.04; supports_ubuntu ubuntu 26.04").status,
    0,
  );
  assert.notEqual(shell("supports_ubuntu ubuntu 25.10").status, 0);
  assert.notEqual(shell("supports_ubuntu debian 26.04").status, 0);
});
