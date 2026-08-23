import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { getProfessionalById } from "@/lib/professionals";
import { readProfessionalLogo, MIME_BY_EXT } from "@/lib/uploads";
import path from "node:path";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Not covered by proxy.ts (API routes are excluded from its matcher), so
  // the auth check happens here instead.
  const userId = await getCurrentUserId();
  if (!userId) {
    return new NextResponse(null, { status: 401 });
  }

  const { id } = await params;
  const professional = await getProfessionalById(id);
  if (!professional?.logoFilename) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const data = await readProfessionalLogo(id, professional.logoFilename);
    const ext = path.extname(professional.logoFilename);
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
