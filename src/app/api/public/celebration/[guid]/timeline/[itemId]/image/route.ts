import { NextResponse } from "next/server";
import path from "node:path";
import { getCelebrationByGuid } from "@/lib/celebrations";
import { readTimelineImage, MIME_BY_EXT } from "@/lib/uploads";

// Public, unauthenticated counterpart to
// /api/celebrations/[id]/timeline/[itemId]/image — see PUBLIC-API.md. A
// celebration's timeline (see the celebration route above) is only useful
// publicly if its images are too, so this exists purely to make
// `imageUrl` in that response actually loadable from a visitor's browser.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ guid: string; itemId: string }> }
) {
  const { guid, itemId } = await params;
  const celebration = await getCelebrationByGuid(guid);

  if (!celebration) {
    return new NextResponse(null, { status: 404 });
  }

  const item = celebration.timeline?.find((t) => t.id === itemId);
  if (!item?.imageFilename) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const data = await readTimelineImage(
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
