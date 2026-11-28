import { notFound } from "next/navigation";
import { getCelebrationById, getTableReservedSeats } from "@/lib/celebrations";
import { localizedLabel } from "../../../localizedText";
import EventSeatingLayoutEditor from "./EventSeatingLayoutEditor";

export default async function EventSeatingLayoutPage({
  params,
}: {
  params: Promise<{ id: string; eventId: string }>;
}) {
  const { id, eventId } = await params;
  const celebration = await getCelebrationById(id);
  if (!celebration) {
    notFound();
  }

  const event = celebration.events?.find((item) => item.id === eventId);
  // Same "don't even confirm this exists" 404, not a "forbidden" page, as
  // every other role/ownership check in this app (see access.ts) — also
  // covers an event that had hasSeating turned back off since a stale
  // link was bookmarked/shared.
  if (!event || !event.hasSeating) {
    notFound();
  }

  const elements = event.seatingLayout ?? [];
  // Snapshot of how many seats each table already has reserved (from the
  // Guests tab's "Assign to table" action — see GuestTableAssignment in
  // lib/celebrations.ts), keyed by element id so the editor can show it
  // read-only next to maxPeople. A table added in this session (not yet
  // saved) simply has no entry here, which the editor treats as 0.
  const reservedByTableId: Record<string, number> = {};
  const guests = celebration.guests ?? [];
  for (const el of elements) {
    if (el.type === "table-circle" || el.type === "table-rect") {
      reservedByTableId[el.id] = getTableReservedSeats(guests, eventId, el.id);
    }
  }

  return (
    <EventSeatingLayoutEditor
      celebrationId={id}
      eventId={eventId}
      eventTitle={localizedLabel(event.title)}
      initialElements={elements}
      reservedByTableId={reservedByTableId}
    />
  );
}
