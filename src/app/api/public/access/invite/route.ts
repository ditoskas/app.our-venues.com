import { NextResponse, type NextRequest } from "next/server";
import { getCelebrationByGuid } from "@/lib/celebrations";
import { logAction } from "@/lib/logActions";
import { createGuestToken, guestAccessExpiry, isGuestAccessOpen } from "@/lib/guestAccess";
import { findGuestByInviteToken, recordInviteOpened } from "@/lib/guestInvites";

// Personal invitation link sign-in — see PUBLIC-API.md. The frontend calls
// this when the page was opened with ?invite=…: the guest's invite code
// replaces the contact + one-time-code steps of access/confirm and returns
// the same guest session (plus the guest's contact, which the RSVP form
// needs). Same window as access/confirm (until celebrationDate + 1 day).
// Every failure is the same 404 {success:false}.
export const dynamic = "force-dynamic";

const fail = () => NextResponse.json({ success: false }, { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(request: NextRequest) {
  const guid = (request.nextUrl.searchParams.get("guid") ?? "").trim();
  const invite = (request.nextUrl.searchParams.get("invite") ?? "").trim();
  if (!guid || !invite) return fail();

  const celebration = await getCelebrationByGuid(guid);
  if (!celebration || !isGuestAccessOpen(celebration)) return fail();

  const guest = findGuestByInviteToken(celebration, invite);
  const contact = guest?.email || guest?.phone;
  if (!guest || !contact) return fail();

  const celebrationId = celebration._id.toString();
  if (await recordInviteOpened(celebrationId, guest.id)) {
    await logAction({
      userId: `guest:${guest.id}`,
      type: "success",
      category: "Guests",
      message: `Guest "${guest.name}" opened their invitation to "${celebration.title}"`,
    });
  }

  const expiresAt = guestAccessExpiry(celebration)!;
  return NextResponse.json(
    {
      success: true,
      contact,
      displayName: guest.name,
      maxAttendees: guest.expectedAttendees ?? 1,
      token: createGuestToken(celebrationId, guest.id, expiresAt),
      expiresAt: expiresAt.toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
