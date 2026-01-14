import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireUser();

    const episode = await prisma.episode.findFirst({
      where: { id, userId: user.id },
    });

    if (!episode) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      episode: {
        id: episode.id,
        status: episode.status,
        publicId: episode.publicId,
        title: episode.title,
        errorMessage: episode.errorMessage,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
