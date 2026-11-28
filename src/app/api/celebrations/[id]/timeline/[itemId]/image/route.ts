import { NextResponse } from "next/server";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { canAccessCelebration } from "@/lib/celebrationAccess";
import { getCelebrationById } from "@/lib/celebrations";
import { readTimelineImage, MIME_BY_EXT } from "@/lib/uploads";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  // Not covered by proxy.ts (API routes are excluded from its matcher), so
  // the auth check happens here instead.
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse(null, { status: 401 });
  }

  const { id, itemId } = await params;
  const celebration = await getCelebrationById(id);
  if (!celebration) {
    return new NextResponse(null, { status: 404 });
  }
  if (!canAccessCelebration(user, celebration)) {
    return new NextResponse(null, { status: 404 });
  }

  const item = celebration.timeline?.find((t) => t.id === itemId);
  if (!item?.imageFilename) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const data = await readTimelineImage(celebration.professionalId, id, item.imageFilename);
    const ext = path.extname(item.imageFilename);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
