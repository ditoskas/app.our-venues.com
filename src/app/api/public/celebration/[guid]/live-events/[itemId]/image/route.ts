import { NextResponse } from "next/server";
import path from "node:path";
import { getCelebrationByGuid } from "@/lib/celebrations";
import { readLiveEventImage, MIME_BY_EXT } from "@/lib/uploads";

// Public, unauthenticated counterpart to
// /api/celebrations/[id]/live-events/[itemId]/image — see PUBLIC-API.md.
// The Live Events / "Happening Now" feed (see the live-events route above)
// is only useful publicly if its images are too, so this exists purely to
// make `imageUrl` in that response actually loadable from a visitor's
// browser. Same access model as the other public image routes (guid alone,
// no isSitePublic check): 404 if the guid doesn't exist, or the item doesn't.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ guid: string; itemId: string }> }
) {
  const { guid, itemId } = await params;
  const celebration = await getCelebrationByGuid(guid);

  if (!celebration) {
    return new NextResponse(null, { status: 404 });
  }

  const item = celebration.liveEvents?.find((e) => e.id === itemId);
  if (!item) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const data = await readLiveEventImage(
      celebration.professionalId,
      celebration._id.toString(),
      item.imageFilename
    );
    const ext = path.extname(item.imageFilename);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
