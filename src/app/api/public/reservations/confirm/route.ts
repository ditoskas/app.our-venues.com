import { NextResponse } from "next/server";
import { getCelebrationByGuid, updateGuestItem, type GuestItem } from "@/lib/celebrations";
import { logAction } from "@/lib/logActions";

// Public, unauthenticated — see PUBLIC-API.md. GET (not POST) is
// deliberate: this is meant to work as a one-click link in an RSVP email/
// SMS, the same pattern most "confirm your email" links use.
//
// ?guid=&phone=&email=&confirmationAttendies=&action=confirm|denied
export async function GET(request: Request) {
  const url = new URL(request.url);
  const guid = url.searchParams.get("guid")?.trim() ?? "";
  const phone = url.searchParams.get("phone")?.trim() ?? "";
  const email = url.searchParams.get("email")?.trim() ?? "";
  const action = url.searchParams.get("action")?.trim();
  const confirmationAttendiesRaw = url.searchParams.get("confirmationAttendies");

  if (!guid) {
    return NextResponse.json({ error: "guid is required" }, { status: 400 });
  }
  if (!phone && !email) {
    return NextResponse.json({ error: "phone or email is required" }, { status: 400 });
  }
  if (action !== "confirm" && action !== "denied") {
    return NextResponse.json({ error: 'action must be "confirm" or "denied"' }, { status: 400 });
  }

  const celebration = await getCelebrationByGuid(guid);
  // Same 404 for "no such guid", "not public", and "no longer upcoming" —
  // never confirm to a caller which case it is (same reasoning as the
  // celebration GET route).
  if (!celebration || !celebration.isSitePublic) {
    return NextResponse.json({ error: "Celebration not found" }, { status: 404 });
  }
  if (!celebration.celebrationDate || celebration.celebrationDate.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Celebration not found" }, { status: 404 });
  }

  const guest = (celebration.guests ?? []).find(
    (g) =>
      (phone && g.phone === phone) || (email && g.email?.toLowerCase() === email.toLowerCase())
  );
  if (!guest) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  const now = new Date();
  // Rebuild the whole guest item (updateGuestItem replaces it wholesale —
  // see lib/celebrations.ts) preserving the fields this endpoint doesn't
  // touch, and letting confirmationDate/deniedDate be mutually exclusive:
  // whichever action just ran wins, simply by not carrying the other one
  // forward — this is what lets the guests table below show a guest as
  // either confirmed or denied, never both.
  const updated: Omit<GuestItem, "id"> = {
    name: guest.name,
    ...(guest.phone ? { phone: guest.phone } : {}),
    ...(guest.email ? { email: guest.email } : {}),
    ...(guest.expectedAttendees !== undefined ? { expectedAttendees: guest.expectedAttendees } : {}),
    ...(guest.confirmedAttendees !== undefined ? { confirmedAttendees: guest.confirmedAttendees } : {}),
  };

  if (action === "confirm") {
    updated.confirmationDate = now;
    const confirmationAttendies = Number(confirmationAttendiesRaw);
    if (confirmationAttendiesRaw && Number.isFinite(confirmationAttendies) && confirmationAttendies > 0) {
      updated.confirmedAttendees = confirmationAttendies;
    }
    // Confirming attendance doesn't change where a guest is already
    // seated — carry any existing table assignment(s) forward (updateGuestItem()
    // replaces the whole item, so this would otherwise silently drop them).
    if (guest.tableAssignments) {
      updated.tableAssignments = guest.tableAssignments;
    }
  } else {
    updated.deniedDate = now;
    // A denied guest can't hold a table assignment (see
    // updateGuestTableAssignmentsAction() in [id]/actions.ts, which blocks
    // creating one in the first place) — leaving tableAssignments out of
    // `updated` here removes any that already existed before the guest
    // denied, since updateGuestItem() replaces the whole item.
  }

  await updateGuestItem(celebration._id.toString(), guest.id, updated);

  await logAction({
    userId: "public",
    type: action === "confirm" ? "success" : "warning",
    category: "Celebrations",
    message: `Guest "${guest.name}" ${action === "confirm" ? "confirmed" : "denied"} attendance for "${celebration.title}" via public RSVP`,
    dataFrom: {
      confirmationDate: guest.confirmationDate,
      deniedDate: guest.deniedDate,
      confirmedAttendees: guest.confirmedAttendees,
    },
    dataTo: updated,
  });

  return NextResponse.json({ success: true, action });
}
