import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import Parser from "rss-parser";
import { validateReadableUrl } from "@/lib/source-validation";

const patchSchema = z.object({
  url: z.string().url().optional(),
  displayName: z.string().min(1).nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const source = await prisma.source.findFirst({
    where: { id, site: { userId: user.id } },
  });
  if (!source) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (parsed.data.url && parsed.data.url !== source.url) {
    try {
      if (source.type === "RSS") {
        const parser = new Parser();
        const response = await fetch(parsed.data.url);
        if (!response.ok) {
          throw new Error(`Failed to fetch RSS: ${response.status}`);
        }
        const xml = await response.text();
        const feed = await parser.parseString(xml);
        if (!feed.items || feed.items.length === 0) {
          throw new Error("RSS feed has no items");
        }
      } else {
        await validateReadableUrl(parsed.data.url);
      }
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid source URL" },
        { status: 400 }
      );
    }
  }

  const updated = await prisma.source.update({
    where: { id },
    data: {
      url: parsed.data.url ?? source.url,
      displayName: parsed.data.displayName ?? source.displayName,
    },
  });

  return NextResponse.json({ source: updated });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const source = await prisma.source.findFirst({
    where: { id, site: { userId: user.id } },
  });
  if (!source) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.source.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
