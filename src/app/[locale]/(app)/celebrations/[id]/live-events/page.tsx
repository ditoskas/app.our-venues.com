import { notFound } from "next/navigation";
import { getCelebrationById } from "@/lib/celebrations";
import LiveEventsManager, { type SerializedLiveEventItem } from "../LiveEventsManager";
import { localizedLabel } from "../localizedText";

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

  const items: SerializedLiveEventItem[] = (celebration.liveEvents ?? []).map((item) => {
    const event = celebration.events?.find((e) => e.id === item.eventId);
    const guest = celebration.guests?.find((g) => g.id === item.uploadedByGuestId);

    return {
      id: item.id,
      imageFilename: item.imageFilename,
      locationLabel: event ? localizedLabel(event.title) : "",
      uploadedByName: guest?.name ?? "",
      uploadedAt: item.uploadedAt.toISOString(),
      title: item.title,
      description: item.description,
    };
  });

  return <LiveEventsManager celebrationId={id} items={items} />;
}
