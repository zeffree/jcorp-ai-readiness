/**
 * Builds the database-free showcase (static export for GitHub Pages).
 *
 * The server-only parts of the app (API routes, admin login, Prisma) are
 * removed from a staged copy in .static-build/, the static overrides are laid
 * on top, and `next build` produces a plain-HTML export in .static-build/out.
 * The real working tree is never modified.
 *
 *   BASE_PATH=/jcorp-ai-readiness npm run build:static
 */

import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const stage = join(root, ".static-build");
const basePath = process.env.BASE_PATH ?? "";

rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });

for (const entry of [
  "src",
  "public",
  "package.json",
  "tsconfig.json",
  "next.config.ts",
  "postcss.config.mjs",
]) {
  if (existsSync(join(root, entry))) {
    cpSync(join(root, entry), join(stage, entry), { recursive: true });
  }
}

// Server-only code that cannot exist in a static export.
for (const path of [
  "src/app/api",
  "src/app/admin/login",
  "src/app/results/[id]",
  "src/generated",
  "src/lib/auth.ts",
  "src/lib/prisma.ts",
  "src/lib/responses.ts",
  "src/lib/filters.ts",
  "src/components/SignOutButton.tsx",
]) {
  rmSync(join(stage, path), { recursive: true, force: true });
}

cpSync(join(root, "static-overrides", "src"), join(stage, "src"), {
  recursive: true,
});
mkdirSync(join(stage, "public"), { recursive: true });
cpSync(
  join(root, "static-overrides", "demo-data.json"),
  join(stage, "public", "demo-data.json"),
);
writeFileSync(join(stage, "public", ".nojekyll"), "");

symlinkSync(join(root, "node_modules"), join(stage, "node_modules"), "junction");

const result = spawnSync("npx", ["next", "build", "--webpack"], {
  cwd: stage,
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    NEXT_PUBLIC_STATIC_DEMO: "1",
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
});

process.exit(result.status ?? 1);
