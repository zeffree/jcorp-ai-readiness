/**
 * Removes every response that is not marked as demo data. Useful after running
 * the smoke test or the screenshot script, both of which submit real responses.
 *
 *   npx tsx scripts/purge-test.ts
 */
import { prisma } from "../src/lib/prisma";

async function main() {
  const before = await prisma.response.count();
  const { count } = await prisma.response.deleteMany({
    where: { isDemo: false },
  });
  const after = await prisma.response.count();
  console.log(
    `Removed ${count} non-demo response(s). ${before} -> ${after} rows.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
