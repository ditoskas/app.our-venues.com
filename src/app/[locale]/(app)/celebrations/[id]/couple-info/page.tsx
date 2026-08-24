import { notFound } from "next/navigation";
import { getCelebrationById } from "@/lib/celebrations";
import CoupleInfoForm from "../CoupleInfoForm";

export default async function CoupleInfoTabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const celebration = await getCelebrationById(id);
  if (!celebration) {
    notFound();
  }

  return (
    <CoupleInfoForm
      celebrationId={id}
      husband={celebration.husband}
      wife={celebration.wife}
    />
  );
}
