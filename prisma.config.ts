import "dotenv/config";
import { defineConfig } from "prisma/config";

// Allow prisma generate to succeed during builds even if DATABASE_URL is not provided.
// Runtime still requires DATABASE_URL (see src/lib/prisma.ts).
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  migrations: {
    seed: "pnpm tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
