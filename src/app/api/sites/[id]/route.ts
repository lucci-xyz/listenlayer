import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const embedConfigSchema = z
  .object({
    theme: z.enum(["light", "dark", "auto"]).optional(),
    accentColor: z.string().optional(),
    radius: z.enum(["sharp", "soft", "round"]).optional(),
    size: z.enum(["compact", "standard", "tall"]).optional(),
    showChapters: z.boolean().optional(),
    showTranscript: z.boolean().optional(),
    showOpenPlayer: z.boolean().optional(),
  })
  .partial();

const schema = z.object({
  name: z.string().min(2).optional(),
  domain: z.string().optional().or(z.literal("")),
  embedConfig: embedConfigSchema.optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const site = await prisma.site.findFirst({
      where: { id, userId: user.id },
    });
    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const data: {
      name?: string;
      domain?: string | null;
      embedConfig?: unknown;
    } = {};

    if (parsed.data.name) {
      data.name = parsed.data.name;
    }
    if (parsed.data.domain !== undefined) {
      data.domain = parsed.data.domain ? parsed.data.domain : null;
    }
    if (parsed.data.embedConfig) {
      data.embedConfig = parsed.data.embedConfig;
    }

    const updated = await prisma.site.update({
      where: { id: site.id },
      data,
    });

    return NextResponse.json({ site: updated });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
