import { NextResponse } from "next/server";
import { getCelebrationByGuid } from "@/lib/celebrations";
import { toPublicLiveEvent } from "@/lib/publicLiveEvents";

// Public Live Events feed — see PUBLIC-API.md. Gated by guid alone, like the
// other public reads. Newest first.
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ guid: string }> }
) {
  const { guid } = await params;
  const celebration = await getCelebrationByGuid(guid);
  if (!celebration) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const liveEvents = [...(celebration.liveEvents ?? [])]
    .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
    .map((item) => toPublicLiveEvent(celebration, item));

  return NextResponse.json({ liveEvents }, { headers: { "Cache-Control": "no-store" } });
}
