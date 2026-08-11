/**
 * Generates a plausible completed survey round so the management dashboard can
 * be reviewed before real data is collected. Every row is marked `isDemo` and
 * can be removed with `npm run seed:purge`.
 *
 *   npm run seed           -- rebuild the demo set at the default size
 *   npm run seed -- 700    -- rebuild at a specific size
 *   npm run seed:purge     -- delete every demo response
 */

import "dotenv/config";
import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { ALL_ITEMS, SCALE_MAX, SCALE_MIN } from "../src/config/framework";
import { FUNCTION_ROLES, ORGANIZATIONS } from "../src/config/segments";
import { scoreResponse } from "../src/lib/scoring";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const DEFAULT_TOTAL = 520;

/** How long the survey has been open, in days. */
const WINDOW_DAYS = 70;

/** Share of respondents who click straight down one column. */
const STRAIGHT_LINE_RATE = 0.02;

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

/** Roughly proportional to the size of each company's leadership population. */
const ORGANIZATION_WEIGHT: Record<string, number> = {
  JCorp: 14,
  KPJ: 20,
  JPG: 11,
  JLG: 9,
  QSR: 13,
  Waqaf: 6,
  Kulim: 10,
  JCG: 9,
  "Yayasan JCorp": 6,
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

const ROLE_WEIGHT: Record<string, number> = {
  "Head of Company": 5,
  Strategy: 9,
  Finance: 11,
  "People / HR": 10,
  Digital: 9,
  Operations: 13,
  "Procurement / Supply Chain": 8,
  "Governance / Risk": 8,
  "Sales and Marketing": 10,
  Investment: 7,
  "Corporate Services": 9,
};

/**
 * Sub-dimensions that typically run ahead of or behind the average in a group
 * at the start of an AI programme: intent is high, delivery machinery is not.
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
  return mean + stdDev * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampToScale(value: number): number {
  return clamp(Math.round(value), SCALE_MIN, SCALE_MAX);
}

function pickWeighted<T extends string>(
  values: readonly T[],
  weights: Record<string, number>,
): T {
  const total = values.reduce((sum, value) => sum + (weights[value] ?? 1), 0);
  let roll = Math.random() * total;
  for (const value of values) {
    roll -= weights[value] ?? 1;
    if (roll <= 0) return value;
  }
  return values[values.length - 1];
}

/**
 * Real surveys arrive in waves: a burst at launch, a second burst after the
 * reminder, and a scramble before the deadline. A uniform spread would make
 * the date filters look artificial.
 */
function submissionDate(): Date {
  const waves = [
    { centreDaysAgo: WINDOW_DAYS - 3, spread: 2.5, share: 0.4 },
    { centreDaysAgo: WINDOW_DAYS - 34, spread: 4, share: 0.32 },
    { centreDaysAgo: 5, spread: 4, share: 0.28 },
  ];

  let roll = Math.random();
  let chosen = waves[waves.length - 1];
  for (const wave of waves) {
    if (roll < wave.share) {
      chosen = wave;
      break;
    }
    roll -= wave.share;
  }

  const daysAgo = clamp(
    gaussian(chosen.centreDaysAgo, chosen.spread),
    0,
    WINDOW_DAYS,
  );
  const date = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

  // Leaders answer during the working day, and rarely at the weekend.
  const day = date.getDay();
  if (day === 0) date.setDate(date.getDate() + 1);
  if (day === 6) date.setDate(date.getDate() + 2);
  date.setHours(
    clamp(Math.round(gaussian(14, 3)), 8, 20),
    Math.floor(Math.random() * 60),
    Math.floor(Math.random() * 60),
    0,
  );
  return date > new Date() ? new Date() : date;
}

interface GeneratedResponse {
  organization: string;
  functionRole: string;
  answers: Record<string, number>;
  durationSec: number;
  createdAt: Date;
}

function buildResponse(): GeneratedResponse {
  const organization = pickWeighted(ORGANIZATIONS, ORGANIZATION_WEIGHT);
  const functionRole = pickWeighted(FUNCTION_ROLES, ROLE_WEIGHT);
  const answers: Record<string, number> = {};

  if (Math.random() < STRAIGHT_LINE_RATE) {
    // Somebody clicked one column all the way down and submitted in two minutes.
    const value = clampToScale(gaussian(4.2, 1));
    for (const item of ALL_ITEMS) answers[item.id] = value;
    return {
      organization,
      functionRole,
      answers,
      durationSec: Math.round(clamp(gaussian(115, 35), 45, 240)),
      createdAt: submissionDate(),
    };
  }

  // Individual disposition, shared across every statement for this person.
  const personTrait = gaussian(0, 0.6);
  // A leader's personal readiness and their read of the organisation are
  // related but not identical.
  const pillarTilt = gaussian(0, 0.35);
  // How consistently this person answers within a theme.
  const noise = clamp(gaussian(0.55, 0.15), 0.25, 1);

  for (const item of ALL_ITEMS) {
    const raw =
      BASE +
      (ORGANIZATION_OFFSET[organization] ?? 0) +
      (ROLE_OFFSET[functionRole] ?? 0) +
      (SUB_DIMENSION_OFFSET[item.subDimensionId] ?? 0) +
      personTrait +
      (item.pillarId === "personal" ? pillarTilt : -pillarTilt) +
      gaussian(0, noise);
    answers[item.id] = clampToScale(raw);
  }

  return {
    organization,
    functionRole,
    answers,
    durationSec: Math.round(clamp(gaussian(760, 210), 300, 2700)),
    createdAt: submissionDate(),
  };
}

async function purge() {
  const { count } = await prisma.response.deleteMany({
    where: { isDemo: true },
  });
  console.log(`Removed ${count} demo response(s).`);
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function seed(total: number) {
  const responseRows = [];
  const answerRows = [];

  for (let index = 0; index < total; index += 1) {
    const generated = buildResponse();
    const scored = scoreResponse(generated.answers);
    const id = randomUUID();

    responseRows.push({
      id,
      organization: generated.organization,
      functionRole: generated.functionRole,
      createdAt: generated.createdAt,
      durationSec: generated.durationSec,
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
    });

    for (const [itemId, value] of Object.entries(generated.answers)) {
      answerRows.push({ id: randomUUID(), responseId: id, itemId, value });
    }
  }

  // Batched inserts keep the seed quick against a remote database.
  for (const batch of chunk(responseRows, 200)) {
    await prisma.response.createMany({ data: batch });
  }
  for (const batch of chunk(answerRows, 2000)) {
    await prisma.answer.createMany({ data: batch });
  }

  const straightLined = responseRows.filter((row) => row.straightLined).length;
  console.log(
    `Created ${responseRows.length} demo response(s) and ${answerRows.length} answers ` +
      `(${straightLined} straight-lined).`,
  );
}

async function report() {
  const total = await prisma.response.count();
  const demo = await prisma.response.count({ where: { isDemo: true } });
  const byOrganization = await prisma.response.groupBy({
    by: ["organization"],
    _count: { _all: true },
  });
  const thinCells = await prisma.response.groupBy({
    by: ["organization", "functionRole"],
    _count: { _all: true },
  });
  const thin = thinCells.filter((cell) => cell._count._all < 3).length;

  console.log(`Database now holds ${total} response(s) (${demo} demo).`);
  console.log(
    `Companies covered: ${byOrganization.length}/${ORGANIZATIONS.length}. ` +
      `Company x function cells populated: ${thinCells.length}/${
        ORGANIZATIONS.length * FUNCTION_ROLES.length
      }, of which ${thin} hold fewer than three responses.`,
  );
}

async function main() {
  const args = process.argv.slice(2);
  const shouldPurge = args.includes("--purge");
  const total = Number(args.find((arg) => /^\d+$/.test(arg)) ?? DEFAULT_TOTAL);

  if (shouldPurge) {
    await purge();
    return;
  }

  await purge();
  await seed(total);
  await report();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
