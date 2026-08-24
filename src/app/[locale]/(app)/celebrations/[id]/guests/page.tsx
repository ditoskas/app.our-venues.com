import { notFound } from "next/navigation";
import { getCelebrationById } from "@/lib/celebrations";
import GuestsManager from "../GuestsManager";
import type { SerializedGuestItem } from "../GuestItemForm";

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

  const items: SerializedGuestItem[] = (celebration.guests ?? []).map((item) => ({
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
  }));

  return <GuestsManager celebrationId={id} items={items} />;
}
