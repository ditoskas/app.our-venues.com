import { notFound } from "next/navigation";
import { getCelebrationById, type LiveEventItem } from "@/lib/celebrations";
import LiveEventsManager, { type SerializedLiveEventItem } from "../LiveEventsManager";
import { localizedLabel } from "../localizedText";

function serialize(
  item: LiveEventItem,
  celebration: NonNullable<Awaited<ReturnType<typeof getCelebrationById>>>
): SerializedLiveEventItem {
  const event = celebration.events?.find((e) => e.id === item.eventId);
  const guest = celebration.guests?.find((g) => g.id === item.uploadedByGuestId);

  return {
    id: item.id,
    imageFilename: item.imageFilename,
    locationLabel: event ? localizedLabel(event.title) : "",
    uploadedByName: guest?.name ?? "",
    uploadedAt: item.uploadedAt.toISOString(),
    publishedAt: item.publishedAt?.toISOString(),
    title: item.title,
    description: item.description,
  };
}

export default async function LiveEventsTabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const celebration = await getCelebrationById(id);
  if (!celebration) {
    notFound();
  }

  const liveEvents = celebration.liveEvents ?? [];

  // "Pending Requests" — oldest submission first, a FIFO moderation queue.
  const pendingItems = liveEvents
    .filter((item) => item.status === "pending")
    .sort((a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime())
    .map((item) => serialize(item, celebration));

  // "Live Feed" — newest published first. Falls back to uploadedAt for any
  // legacy/seeded item that ended up "published" without a publishedAt.
  const publishedItems = liveEvents
    .filter((item) => item.status === "published")
    .sort(
      (a, b) =>
        (b.publishedAt ?? b.uploadedAt).getTime() - (a.publishedAt ?? a.uploadedAt).getTime()
    )
    .map((item) => serialize(item, celebration));

  return (
    <LiveEventsManager celebrationId={id} pendingItems={pendingItems} publishedItems={publishedItems} />
  );
}
