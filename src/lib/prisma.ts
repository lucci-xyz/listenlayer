import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var prismaPool: Pool | undefined;
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const poolMaxRaw = process.env.PG_POOL_MAX;
const poolMax = Math.max(
  1,
  Number(poolMaxRaw ?? (process.env.NODE_ENV === "production" ? 1 : 10))
);

// Important for serverless: keep pool size small (especially with Supabase session mode / poolers)
// and reuse the pool across bundled copies of this module within the same runtime.
const pool =
  global.prismaPool ||
  new Pool({
    connectionString: databaseUrl,
    max: poolMax,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
const adapter = new PrismaPg(pool);

export const prisma =
  global.prisma ||
  new PrismaClient({
    adapter,
    log: ["error"],
  });

// Always cache in globalThis so multiple Next.js server bundles/functions inside the same
// runtime instance don't create extra pools/clients and exhaust DB connection limits.
global.prisma = prisma;
global.prismaPool = pool;
