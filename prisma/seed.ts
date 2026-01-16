import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  // Demo user for local development (use with DEV_AUTH_BYPASS=true)
  const demoEmail = "demo@listenlayer.local";

  const user = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: { email: demoEmail },
  });

  // Create a demo feed subscription
  await prisma.feed.upsert({
    where: { id: `${user.id}-demo-feed` },
    update: {},
    create: {
      id: `${user.id}-demo-feed`,
      userId: user.id,
      name: "TechCrunch",
      feedUrl: "https://feeds.feedburner.com/TechCrunch/",
      siteUrl: "https://techcrunch.com",
      faviconUrl: "https://techcrunch.com/favicon.ico",
    },
  });

  console.log("Seeded demo user:", demoEmail);
  console.log("For local dev, set DEV_AUTH_BYPASS=true to auto-login as demo user");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
