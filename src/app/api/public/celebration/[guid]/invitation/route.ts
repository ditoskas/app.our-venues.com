import { NextResponse } from "next/server";
import path from "node:path";
import { getCelebrationByGuid } from "@/lib/celebrations";
import { readCelebrationImage, MIME_BY_EXT } from "@/lib/uploads";

// Public, unauthenticated — see PUBLIC-API.md. Same reasoning as the public
// hero-background route: makes `celebrationInfo.invitationUrl` in the
// celebration route's response actually loadable from a visitor's browser.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ guid: string }> }
) {
  const { guid } = await params;
  const celebration = await getCelebrationByGuid(guid);

  if (!celebration) {
    return new NextResponse(null, { status: 404 });
  }
  if (!celebration.invitationFilename) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const data = await readCelebrationImage(
      celebration.professionalId,
      celebration._id.toString(),
      celebration.invitationFilename
    );
    const ext = path.extname(celebration.invitationFilename);
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
