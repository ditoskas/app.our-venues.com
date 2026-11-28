import { NextResponse } from "next/server";
import path from "node:path";
import { getCelebrationByGuid } from "@/lib/celebrations";
import { readLiveEventImage, MIME_BY_EXT } from "@/lib/uploads";

// Public counterpart to /api/celebrations/[id]/live-events/[itemId]/image —
// makes `imageUrl` in the Live Events feed loadable. See PUBLIC-API.md.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ guid: string; itemId: string }> }
) {
  const { guid, itemId } = await params;
  const celebration = await getCelebrationByGuid(guid);
  const item = celebration?.liveEvents?.find((e) => e.id === itemId);
  if (!celebration || !item?.imageFilename) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const data = await readLiveEventImage(celebration.professionalId, celebration._id.toString(), item.imageFilename);
    const ext = path.extname(item.imageFilename).toLowerCase();
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
