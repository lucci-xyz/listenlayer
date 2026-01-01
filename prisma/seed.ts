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

  const site = await prisma.site.upsert({
    where: { id: `${user.id}-demo-site` },
    update: {},
    create: {
      id: `${user.id}-demo-site`,
      userId: user.id,
      name: "Demo Site",
      domain: "techcrunch.com",
    },
  });

  await prisma.source.upsert({
    where: { id: `${site.id}-demo-source` },
    update: {},
    create: {
      id: `${site.id}-demo-source`,
      siteId: site.id,
      type: "RSS",
      url: "https://feeds.feedburner.com/TechCrunch/",
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
