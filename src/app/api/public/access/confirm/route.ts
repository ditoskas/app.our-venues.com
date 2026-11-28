import { NextResponse } from "next/server";
import { getCelebrationByGuid } from "@/lib/celebrations";
import {
  ONE_DAY_MS,
  consumeGuestAccessCode,
  createGuestAccessCode,
  findGuestByContact,
  isCelebrationActive,
} from "@/lib/guestAccess";
import { createGuestSessionToken } from "@/lib/guestSession";
import { logAction } from "@/lib/logActions";
import { sendTwoFactorCodeEmail } from "@/lib/twoFactorEmail";

// Public, unauthenticated — see PUBLIC-API.md. Guest 2FA: called twice by
// the frontend's guest-login form (GuestLoginForm/AccessGatePage in
// frontend.o-gamos-mas.com), same shape as always — first without `code` to
// request one, then again with it to verify and authenticate.
//
// ?guid=&contact=&code=
export async function GET(request: Request) {
  const url = new URL(request.url);
  const guid = url.searchParams.get("guid")?.trim() ?? "";
  const contact = url.searchParams.get("contact")?.trim() ?? "";
  const code = url.searchParams.get("code")?.trim();

  if (!guid || !contact) {
    return NextResponse.json({ error: "guid and contact are required" }, { status: 400 });
  }

  const celebration = await getCelebrationByGuid(guid);
  // One generic 404 for every "can't proceed" case below (no such guid, an
  // inactive celebration, no matching guest, or — on the verify call — a
  // wrong/expired code) — same "never let a caller distinguish these from
  // the outside" rule the rest of /api/public/** follows (see
  // PUBLIC-API.md "Authorization model"), so this can't be used to probe
  // whether a given contact belongs to one of a celebration's guests.
  if (!celebration || !isCelebrationActive(celebration)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const guest = findGuestByContact(celebration, contact);
  if (!guest) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const celebrationId = celebration._id.toString();

  if (!code) {
    // Step 1: generate a fresh 6-digit code. Delivered by email via Brevo
    // (see lib/twoFactorEmail.ts) when `contact` matched the guest's email —
    // withheld from the response in that case, since it's no longer the
    // only way the guest can get it. A phone contact still has no delivery
    // channel (no SMS integration yet), so it's echoed back directly as a
    // stand-in, same as before.
    const generatedCode = await createGuestAccessCode(celebrationId, guest.id, contact);
    const matchedEmail =
      guest.email && guest.email.toLowerCase() === contact.toLowerCase()
        ? guest.email
        : undefined;

    if (matchedEmail) {
      try {
        await sendTwoFactorCodeEmail(matchedEmail, generatedCode);
      } catch (error) {
        await logAction({
          userId: "public",
          type: "error",
          category: "Security",
          message: `Failed to send guest access code email for "${guest.name}" on "${celebration.title}"`,
          dataTo: { guestId: guest.id, contact: matchedEmail, error: String(error) },
        });
        return NextResponse.json({ error: "Failed to send code" }, { status: 502 });
      }

      await logAction({
        userId: "public",
        type: "info",
        category: "Security",
        message: `Emailed guest access code for "${guest.name}" on "${celebration.title}"`,
        dataTo: { guestId: guest.id, contact: matchedEmail },
      });

      return NextResponse.json({ success: true });
    }

    await logAction({
      userId: "public",
      type: "info",
      category: "Security",
      message: `Generated guest access code for "${guest.name}" on "${celebration.title}"`,
      dataTo: { guestId: guest.id, contact },
    });

    return NextResponse.json({ success: true, code: generatedCode });
  }

  // Step 2: verify the code and authenticate the guest.
  const valid = await consumeGuestAccessCode(celebrationId, guest.id, code);
  if (!valid) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // celebrationDate is guaranteed set here — isCelebrationActive() above
  // already requires it.
  const expiresAt = new Date(celebration.celebrationDate!.getTime() + ONE_DAY_MS);
  const token = await createGuestSessionToken(
    { celebrationId, guestId: guest.id, contact },
    expiresAt
  );

  await logAction({
    userId: "public",
    type: "success",
    category: "Security",
    message: `Guest "${guest.name}" authenticated on "${celebration.title}" via public 2FA`,
    dataTo: { guestId: guest.id, contact, expiresAt },
  });

  return NextResponse.json({
    success: true,
    displayName: guest.name,
    maxAttendees: guest.expectedAttendees ?? 1,
    token,
    expiresAt,
  });
}
