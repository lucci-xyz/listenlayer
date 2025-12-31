import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(2),
  domain: z.string().optional().or(z.literal("")),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const site = await prisma.site.create({
      data: {
        userId: user.id,
        name: parsed.data.name,
        domain: parsed.data.domain || null,
      },
    });

    return NextResponse.json({ site });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
