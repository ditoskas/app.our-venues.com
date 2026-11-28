import { NextResponse } from "next/server";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { canAccessCelebration } from "@/lib/celebrationAccess";
import { getCelebrationById } from "@/lib/celebrations";
import { readCelebrationImage, MIME_BY_EXT } from "@/lib/uploads";

// Authenticated counterpart to the public invitation route under
// /api/public/celebration/[guid]/invitation — used by the admin's
// Celebration Info tab to preview the current image. Same shape as the
// hero-background route in the sibling directory.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse(null, { status: 401 });
  }

  const { id } = await params;
  const celebration = await getCelebrationById(id);
  if (!celebration) {
    return new NextResponse(null, { status: 404 });
  }
  if (!canAccessCelebration(user, celebration)) {
    return new NextResponse(null, { status: 404 });
  }
  if (!celebration.invitationFilename) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const data = await readCelebrationImage(
      celebration.professionalId,
      id,
      celebration.invitationFilename
    );
    const ext = path.extname(celebration.invitationFilename);
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
