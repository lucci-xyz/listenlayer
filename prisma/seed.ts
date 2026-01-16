import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const demoEmail = "demo@listenlayer.local";
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const user = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: { email: demoEmail, passwordHash },
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

  console.log("Seeded demo user:", demoEmail, "password: demo1234");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
