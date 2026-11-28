import type { Celebration, LiveEventItem } from "./celebrations";

// Public shape of a Live Events photo (PUBLIC-API.md). Never says who posted
// it — the guest list is never exposed publicly.
export interface PublicLiveEventItem {
  id: string;
  eventId: string;
  title: string;
  description: string | null;
  uploadedAt: string;
  imageUrl: string;
  // No moderation exists yet: every item is published as soon as it's posted.
  status: "published";
}

export function toPublicLiveEvent(
  celebration: Pick<Celebration, "guid">,
  item: LiveEventItem
): PublicLiveEventItem {
  return {
    id: item.id,
    eventId: item.eventId,
    title: item.title,
    description: item.description ?? null,
    uploadedAt: item.uploadedAt.toISOString(),
    imageUrl: `/api/public/celebration/${celebration.guid}/live-events/${item.id}/image`,
    status: "published",
  };
}
