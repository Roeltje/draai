import { spawn } from "node:child_process";
const processes = [
  spawn(
    process.execPath,
    ["node_modules/tsx/dist/cli.mjs", "watch", "server/index.ts"],
    { stdio: "inherit" },
  ),
  spawn(process.execPath, ["node_modules/vite/bin/vite.js"], {
    stdio: "inherit",
  }),
];
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    processes.forEach((p) => p.kill(signal));
    process.exit();
  });
processes.forEach((p) =>
  p.on("exit", (code) => {
    processes.forEach((other) => {
      if (other !== p) other.kill();
    });
    process.exit(code ?? 0);
  }),
);
