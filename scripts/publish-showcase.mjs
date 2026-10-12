/**
 * Builds the static showcase and copies it into a checkout of the portfolio
 * repo (zeffree.github.io) under demos/jcorp-ai-readiness, which that repo's
 * build copies into the published site.
 *
 *   PAGES_REPO=../zeffree.github.io npm run publish:showcase
 *
 * Commit and push the portfolio repo afterwards to go live.
 */

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const pagesRepo = process.env.PAGES_REPO && resolve(process.env.PAGES_REPO);
if (!pagesRepo || !existsSync(join(pagesRepo, "scripts", "build.mjs"))) {
  console.error("Set PAGES_REPO to a checkout of the portfolio repo.");
  process.exit(1);
}

const build = spawnSync("node", ["scripts/build-static.mjs"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, BASE_PATH: "/jcorp-ai-readiness" },
});
if (build.status !== 0) process.exit(build.status ?? 1);

const target = join(pagesRepo, "demos", "jcorp-ai-readiness");
rmSync(target, { recursive: true, force: true });
cpSync(join(root, ".static-build", "out"), target, { recursive: true });
console.log(`Copied showcase to ${target}`);
