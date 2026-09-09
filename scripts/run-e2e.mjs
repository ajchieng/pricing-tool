import { spawnSync } from "node:child_process";
import { remoteTestOrigin } from "./e2e-target.mjs";

const remoteOrigin = remoteTestOrigin();
if (remoteOrigin) {
  console.log(
    `Testing public demo at ${remoteOrigin} in fresh browser contexts. Local build and server are skipped.`,
  );
} else {
  const build = spawnSync("npm", ["run", "build"], { stdio: "inherit" });
  if (build.status !== 0) process.exit(build.status ?? 1);
}
const result = spawnSync(
  process.execPath,
  ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
