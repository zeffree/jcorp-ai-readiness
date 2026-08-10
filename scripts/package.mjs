/**
 * Packages the Next.js standalone build for Azure App Service.
 *
 *   npm run package
 *
 * `next build` leaves static assets outside .next/standalone, so they are copied
 * in here. The .env file that Next copies into the bundle is deleted: on Azure
 * every secret comes from App Service application settings instead.
 */

import { cp, mkdir, rm, access, writeFile, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = process.cwd();
const standalone = path.join(root, ".next", "standalone");
const distDir = path.join(root, "dist");
const zipPath = path.join(distDir, "app.zip");

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (!(await exists(standalone))) {
    throw new Error("No .next/standalone found. Run `npm run build` first.");
  }

  await cp(
    path.join(root, ".next", "static"),
    path.join(standalone, ".next", "static"),
    { recursive: true },
  );

  if (await exists(path.join(root, "public"))) {
    await cp(path.join(root, "public"), path.join(standalone, "public"), {
      recursive: true,
    });
  }

  // Secrets must never travel inside the deployment artifact.
  await rm(path.join(standalone, ".env"), { force: true });

  // App Service Linux looks for a start script; point it at the standalone server.
  const pkgPath = path.join(standalone, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
  pkg.scripts = { ...(pkg.scripts ?? {}), start: "node server.js" };
  await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  // bsdtar ships with Windows and Azure App Service accepts the zip it writes.
  await run("tar", ["-a", "-c", "-f", zipPath, "-C", standalone, "."]);

  const { size } = await stat(zipPath);
  console.log(`Packaged ${zipPath} (${(size / 1024 / 1024).toFixed(1)} MB)`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
