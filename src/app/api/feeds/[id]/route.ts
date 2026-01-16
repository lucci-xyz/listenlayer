import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  feedUrl: z.string().url().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const feed = await prisma.feed.findFirst({
      where: { id, userId: user.id },
      include: {
        episodes: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            title: true,
            status: true,
            sourceUrl: true,
            publicId: true,
            createdAt: true,
          },
        },
      },
    });

    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    return NextResponse.json({ feed });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const existing = await prisma.feed.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    const feed = await prisma.feed.update({
      where: { id },
      data: {
        name: parsed.data.name ?? existing.name,
        feedUrl: parsed.data.feedUrl ?? existing.feedUrl,
      },
    });

    return NextResponse.json({ feed });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const existing = await prisma.feed.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    await prisma.feed.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
