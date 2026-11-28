import { NextResponse } from "next/server";
import {
  getCelebrationByGuid,
  addLiveEventItem,
  isLiveEventConfirmationRequired,
  type LiveEventItem,
} from "@/lib/celebrations";
import { saveLiveEventImage } from "@/lib/uploads";
import { logAction } from "@/lib/logActions";

function serialize(guid: string, item: LiveEventItem) {
  return {
    id: item.id,
    eventId: item.eventId,
    title: item.title,
    description: item.description ?? null,
    uploadedAt: item.uploadedAt,
    imageUrl: `/api/public/celebration/${guid}/live-events/${item.id}/image`,
    status: item.status,
  };
}

// Public, unauthenticated — see PUBLIC-API.md. Guid-gated only, same as the
// main celebration route above it (isSitePublic isn't checked for reading
// the feed) — whether a visitor should be looking at this page at all is
// the frontend's PrivacySiteGate's job, same as every other page nested
// under it.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ guid: string }> }
) {
  const { guid } = await params;
  const celebration = await getCelebrationByGuid(guid);
  if (!celebration) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const liveEvents = (celebration.liveEvents ?? [])
    .slice()
    .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
    .map((item) => serialize(guid, item));

  return NextResponse.json({ liveEvents });
}

// Public, unauthenticated — lets a verified guest add a photo to the
// celebration's "Live Events" / "Happening Now" feed (see LiveEventItem in
// lib/celebrations.ts — this is the "public/guest endpoint" its comment,
// and actions.ts's deleteLiveEventItemAction comment, anticipated). See
// PUBLIC-API.md.
//
// multipart/form-data: eventId (must be one of this celebration's own
// EventItem ids — the "location" is a closed set), contact (email or
// phone — matched against this celebration's guests, same lookup rule as
// GET /api/public/reservations/confirm, since guest identity for this
// endpoint is established the same way: by matching contact, not by
// trusting whatever the — currently stubbed — access/confirm code step
// returned), title, description (optional), image (file).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ guid: string }> }
) {
  const { guid } = await params;
  const celebration = await getCelebrationByGuid(guid);
  // Same generic 404 for "no such guid" and "not public yet" as
  // reservations/confirm — guests shouldn't be able to post to the feed
  // before the couple has switched the site public, even if they somehow
  // have the guid.
  if (!celebration || !celebration.isSitePublic) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const eventId = String(formData.get("eventId") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const image = formData.get("image");

  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }
  if (!contact) {
    return NextResponse.json({ error: "contact is required" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!(image instanceof File) || image.size === 0) {
    return NextResponse.json({ error: "image is required" }, { status: 400 });
  }

  const event = (celebration.events ?? []).find((e) => e.id === eventId);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 400 });
  }

  // Same matching rule as GET /api/public/reservations/confirm: phone
  // exact, email case-insensitive.
  const isEmail = contact.includes("@");
  const guest = (celebration.guests ?? []).find((g) =>
    isEmail ? g.email?.toLowerCase() === contact.toLowerCase() : g.phone === contact
  );
  if (!guest) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  const celebrationId = celebration._id.toString();
  const imageFilename = await saveLiveEventImage(celebration.professionalId, celebrationId, image);
  const now = new Date();

  // Celebration.isConfirmationRequiredOnLiveEvents (default true, see
  // isLiveEventConfirmationRequired()) gates whether a freshly-submitted
  // photo needs to be reviewed before it counts as approved: "pending"
  // (shown in the admin's "Pending Requests" section) when confirmation is
  // required, "published" (shown in "Live Feed" immediately, publishedAt
  // set to now) when the celebration has opted out of moderation.
  const requiresConfirmation = isLiveEventConfirmationRequired(celebration);
  const status = requiresConfirmation ? "pending" : "published";

  const newItem = await addLiveEventItem(celebrationId, {
    eventId,
    imageFilename,
    uploadedByGuestId: guest.id,
    uploadedAt: now,
    title,
    ...(description ? { description } : {}),
    status,
    ...(requiresConfirmation ? {} : { publishedAt: now }),
  });

  await logAction({
    userId: "public",
    type: "success",
    category: "Celebrations",
    message: `Guest "${guest.name}" added a live event photo "${title}" to "${celebration.title}"`,
    dataTo: newItem,
  });

  return NextResponse.json(serialize(guid, newItem), { status: 201 });
}
