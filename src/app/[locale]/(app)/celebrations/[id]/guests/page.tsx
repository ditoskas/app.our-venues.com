import { notFound } from "next/navigation";
import { getCelebrationById, getTableReservedSeats } from "@/lib/celebrations";
import GuestsManager from "../GuestsManager";
import type { SerializedGuestItem } from "../GuestItemForm";
import type { SeatingEventOption } from "../AssignGuestTableForm";
import { localizedLabel } from "../localizedText";

export default async function GuestsTabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const celebration = await getCelebrationById(id);
  if (!celebration) {
    notFound();
  }

  const guests = celebration.guests ?? [];

  const items: SerializedGuestItem[] = guests.map((item) => ({
    id: item.id,
    name: item.name,
    phone: item.phone,
    email: item.email,
    expectedAttendees: item.expectedAttendees,
    confirmedAttendees: item.confirmedAttendees,
    confirmationDate: item.confirmationDate
      ? item.confirmationDate.toISOString().slice(0, 10)
      : undefined,
    deniedDate: item.deniedDate ? item.deniedDate.toISOString().slice(0, 10) : undefined,
    tableAssignments: item.tableAssignments,
  }));

  // Only events with hasSeating get a "table" pickable in the Guests tab's
  // "Assign to table" dialog — a celebration can have more than one (see
  // GuestTableAssignment in lib/celebrations.ts), each independently
  // assignable. Placeholders (Music Band, etc.) are excluded since they
  // aren't seatable. `reserved` is computed fresh on every load from the
  // guest list itself, never stored on the table element.
  const seatingEvents: SeatingEventOption[] = (celebration.events ?? [])
    .filter((event) => event.hasSeating)
    .map((event) => ({
      id: event.id,
      title: localizedLabel(event.title),
      tables: (event.seatingLayout ?? [])
        .filter((el) => el.type === "table-circle" || el.type === "table-rect")
        .map((el) => ({
          id: el.id,
          code: el.code || "—",
          maxPeople: el.maxPeople,
          reserved: getTableReservedSeats(guests, event.id, el.id),
        })),
    }));

  return <GuestsManager celebrationId={id} items={items} seatingEvents={seatingEvents} />;
}
