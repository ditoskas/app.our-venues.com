import { NextResponse } from "next/server";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { getCelebrationById } from "@/lib/celebrations";
import { readLiveEventImage, MIME_BY_EXT } from "@/lib/uploads";

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
  if (user.role === "Professional" && celebration.professionalId !== user.professionalId) {
    return new NextResponse(null, { status: 404 });
  }

  const item = celebration.liveEvents?.find((e) => e.id === itemId);
  if (!item) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const data = await readLiveEventImage(celebration.professionalId, id, item.imageFilename);
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
