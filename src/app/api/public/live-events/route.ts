import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { addLiveEventItem, getCelebrationById } from "@/lib/celebrations";
import { saveLiveEventImage, StorageQuotaExceededError } from "@/lib/uploads";
import { logAction } from "@/lib/logActions";
import { bearerToken, verifyGuestToken } from "@/lib/guestAccess";
import { toPublicLiveEvent } from "@/lib/publicLiveEvents";

// A signed-in guest posts a Live Events photo — see PUBLIC-API.md.
// multipart/form-data: eventId, title, description?, image.
// Authorization: Bearer <guest token from access/confirm>. The celebration and
// the guest come from the token only (no guid/contact in the request); 401 if
// it's missing/invalid/expired or the guest is no longer on the guest list.
export const dynamic = "force-dynamic";

// Raster images only: an SVG could carry script and is served back from this
// origin. Same 10 MB ceiling for every upload; the professional's storage
// quota applies on top (saveLiveEventImage).
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 10 * 1024 * 1024;
const TITLE_MAX = 120;
const DESCRIPTION_MAX = 1000;

const json = (body: unknown, status: number) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  const claims = verifyGuestToken(bearerToken(request));
  if (!claims || !ObjectId.isValid(claims.celebrationId)) return json({ error: "Unauthorized" }, 401);

  const celebration = await getCelebrationById(claims.celebrationId);
  const guest = celebration?.guests?.find((g) => g.id === claims.guestId);
  if (!celebration || !guest) return json({ error: "Unauthorized" }, 401);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "Expected multipart/form-data" }, 400);
  }

  const eventId = String(form.get("eventId") ?? "").trim();
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const image = form.get("image");

  if (!celebration.events?.some((e) => e.id === eventId)) return json({ error: "Unknown eventId" }, 400);
  if (!title || title.length > TITLE_MAX) return json({ error: `title is required (max ${TITLE_MAX} characters)` }, 400);
  if (description.length > DESCRIPTION_MAX) {
    return json({ error: `description is too long (max ${DESCRIPTION_MAX} characters)` }, 400);
  }
  if (!(image instanceof File) || image.size === 0) return json({ error: "image is required" }, 400);
  if (!ALLOWED_TYPES.has(image.type)) return json({ error: "image must be JPEG, PNG, WebP or GIF" }, 415);
  if (image.size > MAX_BYTES) return json({ error: "image is larger than 10 MB" }, 413);

  const celebrationId = celebration._id.toString();
  let imageFilename: string;
  try {
    imageFilename = await saveLiveEventImage(celebration.professionalId, celebrationId, image);
  } catch (err) {
    if (err instanceof StorageQuotaExceededError) return json({ error: "Storage quota exceeded" }, 413);
    throw err;
  }

  const item = await addLiveEventItem(celebrationId, {
    eventId,
    imageFilename,
    uploadedByGuestId: guest.id,
    uploadedAt: new Date(),
    title,
    ...(description ? { description } : {}),
  });

  await logAction({
    userId: `guest:${guest.id}`,
    type: "success",
    category: "Celebrations",
    message: `Guest "${guest.name}" posted a Live Events photo to "${celebration.title}"`,
    dataTo: { id: item.id, eventId, title, imageFilename },
  });

  return json(toPublicLiveEvent(celebration, item), 201);
}
