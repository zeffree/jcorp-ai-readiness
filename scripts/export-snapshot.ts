/**
 * Writes the synthetic demo responses to static-overrides/demo-data.json so
 * the GitHub Pages showcase can render the dashboard without a database.
 * Only rows flagged isDemo are exported; no real respondent data can leak.
 *
 *   npm run export:snapshot
 */

import "dotenv/config";
import { writeFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const rows = await prisma.response.findMany({
    where: { isDemo: true },
    orderBy: { createdAt: "asc" },
  });

  const snapshot = rows.map((row, index) => {
    const scores = JSON.parse(row.scoresJson);
    return {
      id: `demo-${index + 1}`,
      organization: row.organization,
      functionRole: row.functionRole,
      createdAt: row.createdAt.toISOString(),
      personalScore: row.personalScore,
      organizationalScore: row.organizationalScore,
      overallScore: row.overallScore,
      straightLined: row.straightLined,
      isDemo: true,
      scores,
    };
  });

  writeFileSync(
    "static-overrides/demo-data.json",
    JSON.stringify(snapshot),
  );
  console.log(`Exported ${snapshot.length} synthetic response(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
