import { NextResponse, type NextRequest } from "next/server";
import { getCelebrationByGuid } from "@/lib/celebrations";
import { logAction } from "@/lib/logActions";
import {
  createGuestToken,
  findGuestByContact,
  guestAccessExpiry,
  isGuestAccessOpen,
  issueAccessCode,
  verifyAccessCode,
} from "@/lib/guestAccess";

// Public guest sign-in — see PUBLIC-API.md. Called twice by the frontend's
// GuestLoginForm (access gate, reservation page, Live Events upload):
//   1. ?guid&contact        → contact must be one of the guests; issues a
//                             6-digit one-time code (returned in the body —
//                             no email/SMS delivery exists yet)
//   2. ?guid&contact&code   → verifies it; returns the guest's name, party
//                             size and a signed guest token
// Every failure (unknown guid, sign-in closed, no such guest, wrong/expired
// code) is the same 404 {success:false}, so callers can't tell them apart.
export const dynamic = "force-dynamic";

const fail = () => NextResponse.json({ success: false }, { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const guid = (params.get("guid") ?? "").trim();
  const contact = (params.get("contact") ?? "").trim();
  const code = (params.get("code") ?? "").trim();
  if (!guid || !contact) return fail();

  const celebration = await getCelebrationByGuid(guid);
  if (!celebration || !isGuestAccessOpen(celebration)) return fail();

  const guest = findGuestByContact(celebration, contact);
  if (!guest) return fail();

  const celebrationId = celebration._id.toString();
  const actor = `guest:${guest.id}`;

  if (!code) {
    const issued = await issueAccessCode(celebrationId, guest.id);
    await logAction({
      userId: actor,
      type: "info",
      category: "Guests",
      message: `Guest "${guest.name}" requested a sign-in code for "${celebration.title}"`,
    });
    return NextResponse.json({ success: true, code: issued }, { headers: { "Cache-Control": "no-store" } });
  }

  if (!(await verifyAccessCode(celebrationId, guest.id, code))) return fail();

  const expiresAt = guestAccessExpiry(celebration)!;
  await logAction({
    userId: actor,
    type: "success",
    category: "Guests",
    message: `Guest "${guest.name}" signed in to "${celebration.title}"`,
  });
  return NextResponse.json(
    {
      success: true,
      displayName: guest.name,
      maxAttendees: guest.expectedAttendees ?? 1,
      token: createGuestToken(celebrationId, guest.id, expiresAt),
      expiresAt: expiresAt.toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
