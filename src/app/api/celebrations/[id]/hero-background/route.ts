import { NextResponse } from "next/server";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { getCelebrationById } from "@/lib/celebrations";
import { readCelebrationImage, MIME_BY_EXT } from "@/lib/uploads";

// Authenticated counterpart to the public hero-background route under
// /api/public/celebration/[guid]/hero-background — used by the admin's
// Celebration Info tab to preview the current image. Same outside-proxy.ts,
// do-your-own-auth pattern as the other /api/celebrations/[id]/... routes,
// plus the Professional-ownership check (celebrations are per-row scoped).
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
  if (user.role === "Professional" && celebration.professionalId !== user.professionalId) {
    return new NextResponse(null, { status: 404 });
  }
  if (!celebration.heroBackgroundFilename) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const data = await readCelebrationImage(
      celebration.professionalId,
      id,
      celebration.heroBackgroundFilename
    );
    const ext = path.extname(celebration.heroBackgroundFilename);
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
