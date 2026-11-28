import { NextResponse } from "next/server";
import {
  getCelebrationById,
  addLiveEventItem,
  isLiveEventConfirmationRequired,
  type LiveEventItem,
} from "@/lib/celebrations";
import { verifyGuestSessionToken } from "@/lib/guestSession";
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

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : null;
}

// CORS preflight — a request carrying `Authorization` isn't a CORS "simple
// request" (unlike the guid+contact endpoint below, whose plain
// multipart/form-data POST never triggers one), so the browser sends this
// before the real POST. next.config.ts's headers() still attaches the
// actual Access-Control-* values to this response; this handler only needs
// to answer with a 2xx so the browser accepts the preflight.
export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

// Public, unauthenticated *by API key* — but requires a logged-in guest,
// unlike POST /api/public/celebration/{guid}/live-events (which re-matches
// a `contact` form field against the celebration's guest list on every
// call, no real session involved). This endpoint requires
// `Authorization: Bearer <token>`, the guest session token issued by the
// verify step of GET /api/public/access/confirm (see lib/guestSession.ts)
// — celebrationId/guestId/contact all come from that token, not from the
// request body, so there's no `guid` or `contact` field here at all. See
// PUBLIC-API.md.
//
// multipart/form-data: eventId, title, description (optional), image.
export async function POST(request: Request) {
  const session = await verifyGuestSessionToken(getBearerToken(request));
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const celebration = await getCelebrationById(session.celebrationId);
  // Same "site must be public" gate as the guid+contact endpoint — guests
  // shouldn't be able to post to the feed before the couple has switched
  // the site public, even with a valid login.
  if (!celebration || !celebration.isSitePublic) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Re-checked against the celebration's current guest list rather than
  // trusted from the token alone — the token can outlive an admin removing
  // this guest from the celebration.
  const guest = (celebration.guests ?? []).find((g) => g.id === session.guestId);
  if (!guest) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const eventId = String(formData.get("eventId") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const image = formData.get("image");

  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
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

  const celebrationId = celebration._id.toString();
  const imageFilename = await saveLiveEventImage(celebration.professionalId, celebrationId, image);
  const now = new Date();

  // Same Celebration.isConfirmationRequiredOnLiveEvents gate as the
  // guid+contact endpoint (default true, see isLiveEventConfirmationRequired()):
  // "pending" when confirmation is required, "published" (publishedAt set
  // to now) when the celebration has opted out of moderation.
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
    message: `Guest "${guest.name}" (logged in) added a live event photo "${title}" to "${celebration.title}"`,
    dataTo: newItem,
  });

  return NextResponse.json(serialize(celebration.guid, newItem), { status: 201 });
}
