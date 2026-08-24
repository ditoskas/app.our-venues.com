import { notFound } from "next/navigation";
import { getCelebrationById, getActiveLanguages } from "@/lib/celebrations";
import EventsManager from "../EventsManager";
import type { SerializedEventItem } from "../EventItemForm";

export default async function EventsTabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const celebration = await getCelebrationById(id);
  if (!celebration) {
    notFound();
  }

  const items: SerializedEventItem[] = (celebration.events ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    area: item.area,
    date: item.date ? item.date.toISOString().slice(0, 10) : undefined,
    city: item.city,
    address: item.address,
    postCode: item.postCode,
    country: item.country,
    mapLat: item.mapLat,
    mapLng: item.mapLng,
  }));

  return (
    <EventsManager
      celebrationId={id}
      items={items}
      activeLanguages={getActiveLanguages(celebration)}
    />
  );
}
