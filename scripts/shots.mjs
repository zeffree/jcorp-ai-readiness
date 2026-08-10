/**
 * Captures screenshots of the app for visual review.
 * Usage: node scripts/shots.mjs http://localhost:3100 <adminPassword>
 */

import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3100";
const password = process.argv[3] ?? "changeme";
const outDir = process.argv[4] ?? "shots";

mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: "msedge" });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();

async function shot(name, url, { full = true, before } = {}) {
  await page.goto(url, { waitUntil: "networkidle" });
  if (before) await before();
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: full });
  console.log(`captured ${name}`);
}

await shot("01-landing", `${base}/`);

await shot("02-assess-profile", `${base}/assess`);

// Fill the profile and jump to a question screen.
await page.selectOption("#organization", "KPJ");
await page.selectOption("#functionRole", "Digital");
await page.getByRole("button", { name: "Continue" }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${outDir}/03-assess-questions.png`, fullPage: true });
console.log("captured 03-assess-questions");

// Answer every statement quickly, then submit for a real results page.
for (let screen = 0; screen < 10; screen += 1) {
  const groups = await page.locator("fieldset").all();
  for (const group of groups) {
    const index = 2 + Math.floor(Math.random() * 4);
    await group.locator("label").nth(index).click();
  }
  const submit = page.getByRole("button", { name: /Submit and see my results/ });
  if (await submit.count()) {
    await submit.click();
    break;
  }
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForTimeout(200);
}

await page.waitForURL(/\/results\//, { timeout: 20000 });
await page.waitForTimeout(1600);
await page.screenshot({ path: `${outDir}/04-results.png`, fullPage: true });
console.log("captured 04-results");

// Admin dashboard.
await page.goto(`${base}/admin/login`, { waitUntil: "networkidle" });
await page.fill("#password", password);
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL(/\/admin$/, { timeout: 20000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: `${outDir}/05-dashboard.png`, fullPage: true });
console.log("captured 05-dashboard");

// Sub-dimension heatmap view.
await page.getByRole("button", { name: "Sub-dimensions" }).click();
await page.waitForTimeout(1200);
await page.screenshot({
  path: `${outDir}/06-dashboard-subdimensions.png`,
  fullPage: false,
});
console.log("captured 06-dashboard-subdimensions");

await browser.close();
