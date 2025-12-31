import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const schema = z.object({
  siteId: z.string().min(1),
  type: z.enum(["RSS", "URL"]),
  url: z.string().url(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const site = await prisma.site.findFirst({
      where: { id: parsed.data.siteId, userId: user.id },
    });
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const source = await prisma.source.create({
      data: {
        siteId: site.id,
        type: parsed.data.type,
        url: parsed.data.url,
      },
    });

    return NextResponse.json({ source });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
