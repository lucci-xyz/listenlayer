import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  engine: "classic",
  migrations: {
    seed: "pnpm tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
