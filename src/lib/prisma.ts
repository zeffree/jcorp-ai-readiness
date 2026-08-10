import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and point it at a PostgreSQL database.",
    );
  }
  return url;
}

function createClient(): PrismaClient {
  // A small pool keeps the app inside the connection limit of a Burstable
  // PostgreSQL tier even when App Service runs several Node workers.
  const adapter = new PrismaPg({ connectionString: databaseUrl(), max: 5 });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
