/**
 * Generates plausible synthetic responses so the management dashboard can be
 * demonstrated before real data is collected. Every row is marked `isDemo`.
 *
 *   npm run seed          -- add demo responses
 *   npm run seed:purge    -- delete every demo response
 *   npm run seed -- 400   -- add a specific number of demo responses
 */

import "dotenv/config";
import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { ALL_ITEMS, SCALE_MAX, SCALE_MIN } from "../src/config/framework";
import { FUNCTION_ROLES, ORGANIZATIONS } from "../src/config/segments";
import { scoreResponse } from "../src/lib/scoring";

function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  if (!url.startsWith("file:")) return url;
  const filePath = url.slice("file:".length);
  if (path.isAbsolute(filePath)) return url;
  return `file:${path.resolve(process.cwd(), filePath)}`;
}

const prisma = new PrismaClient({
  adapter: new PrismaBetterSqlite3({ url: resolveDatabaseUrl() }),
});

/** Relative AI maturity of each operating company, in scale points. */
const ORGANIZATION_OFFSET: Record<string, number> = {
  JCorp: 0.45,
  KPJ: 0.1,
  JPG: -0.2,
  JLG: -0.35,
  QSR: 0.05,
  Waqaf: -0.5,
  Kulim: -0.3,
  JCG: 0.2,
  "Yayasan JCorp": -0.45,
};

/** Relative readiness of each cross-functional role. */
const ROLE_OFFSET: Record<string, number> = {
  "Head of Company": 0.35,
  Strategy: 0.3,
  Finance: -0.15,
  "People / HR": 0.05,
  Digital: 0.75,
  Operations: -0.25,
  "Procurement / Supply Chain": -0.35,
  "Governance / Risk": -0.05,
  "Sales and Marketing": 0.2,
  Investment: 0.0,
  "Corporate Services": -0.2,
};

/**
 * Sub-dimensions that typically run ahead of or behind the average in a group
 * at the start of an AI programme.
 */
const SUB_DIMENSION_OFFSET: Record<string, number> = {
  "understanding-conviction": 0.35,
  "leader-commitment": 0.15,
  "tools-systems": -0.2,
  "support-training": -0.5,
  "daily-work-adaptation": -0.55,
  "risk-compliance": -0.1,
  experimentation: -0.15,
  "trust-in-organization": 0.05,
  "self-efficacy": 0.1,
  "ai-usage": -0.35,
  "responsible-ai-usage": 0.3,
  "intention-to-use-ai": 0.85,
  "readiness-for-ai-centric-work": 0.6,
  "road-map": -0.25,
  "resource-allocation": -0.45,
  "workflow-redesign": -0.75,
  "strategic-workforce-planning": -0.6,
  "organizational-redesign": -0.5,
  governance: -0.05,
  "leader-fluency": -0.3,
  "behavior-shifts": -0.4,
  "hr-transformation": -0.7,
};

const BASE = 3.85;

/** Box-Muller normal sample. */
function gaussian(mean: number, stdDev: number): number {
  const u = 1 - Math.random();
  const v = Math.random();
  return (
    mean +
    stdDev * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  );
}

function clampToScale(value: number): number {
  return Math.max(SCALE_MIN, Math.min(SCALE_MAX, Math.round(value)));
}

function pickWeighted<T>(values: readonly T[], weights: number[]): T {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = Math.random() * total;
  for (let index = 0; index < values.length; index += 1) {
    roll -= weights[index];
    if (roll <= 0) return values[index];
  }
  return values[values.length - 1];
}

function buildResponse() {
  // Larger companies contribute more responses than the smaller entities.
  const organization = pickWeighted(ORGANIZATIONS, [
    14, 18, 10, 8, 12, 5, 9, 8, 5,
  ]);
  const functionRole = pickWeighted(FUNCTION_ROLES, [
    5, 9, 10, 10, 9, 12, 7, 7, 9, 6, 8,
  ]);

  // Individual disposition, shared across every statement for this person.
  const personTrait = gaussian(0, 0.6);
  // A leader's personal readiness and their read of the organisation are
  // related but not identical.
  const pillarTilt = gaussian(0, 0.35);

  const answers: Record<string, number> = {};
  for (const item of ALL_ITEMS) {
    const raw =
      BASE +
      (ORGANIZATION_OFFSET[organization] ?? 0) +
      (ROLE_OFFSET[functionRole] ?? 0) +
      (SUB_DIMENSION_OFFSET[item.subDimensionId] ?? 0) +
      personTrait +
      (item.pillarId === "personal" ? pillarTilt : -pillarTilt) +
      gaussian(0, 0.55);
    answers[item.id] = clampToScale(raw);
  }

  return { organization, functionRole, answers };
}

function randomDateWithinDays(days: number): Date {
  const now = Date.now();
  return new Date(now - Math.floor(Math.random() * days * 24 * 60 * 60 * 1000));
}

async function purge() {
  const { count } = await prisma.response.deleteMany({
    where: { isDemo: true },
  });
  console.log(`Removed ${count} demo response(s).`);
}

async function seed(total: number) {
  let created = 0;
  for (let index = 0; index < total; index += 1) {
    const { organization, functionRole, answers } = buildResponse();
    const scored = scoreResponse(answers);

    await prisma.response.create({
      data: {
        organization,
        functionRole,
        createdAt: randomDateWithinDays(45),
        durationSec: Math.round(gaussian(760, 190)),
        personalScore: scored.pillars.personal,
        organizationalScore: scored.pillars.organizational,
        overallScore: scored.overall,
        band: scored.band,
        straightLined: scored.straightLined,
        isDemo: true,
        scoresJson: JSON.stringify({
          subDimensions: scored.subDimensions,
          categories: scored.categories,
          pillars: scored.pillars,
          overall: scored.overall,
        }),
        answers: {
          create: Object.entries(answers).map(([itemId, value]) => ({
            itemId,
            value,
          })),
        },
      },
    });
    created += 1;
  }
  console.log(`Created ${created} demo response(s).`);
}

async function main() {
  const args = process.argv.slice(2);
  const shouldPurge = args.includes("--purge");
  const count = Number(args.find((arg) => /^\d+$/.test(arg)) ?? 260);

  if (shouldPurge) {
    await purge();
    return;
  }

  await purge();
  await seed(count);

  const total = await prisma.response.count();
  console.log(`Database now holds ${total} response(s) in total.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
