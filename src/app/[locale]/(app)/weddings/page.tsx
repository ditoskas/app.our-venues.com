import { listMarriages } from "@/lib/marriages";
import { listProfessionals } from "@/lib/professionals";
import { requirePageRole } from "@/lib/auth";
import MarriagesManager, { type SerializedMarriage } from "./MarriagesManager";
import type { ProfessionalOption } from "@/components/ProfessionalPicker";

export const dynamic = "force-dynamic";

export default async function WeddingsPage() {
  const user = await requirePageRole(["Root", "Professional"]);

  const [allMarriages, professionalDocs] = await Promise.all([
    listMarriages(),
    user.role === "Root" ? listProfessionals() : Promise.resolve([]),
  ]);

  const visibleMarriages =
    user.role === "Professional"
      ? allMarriages.filter((m) => m.professionalId === user.professionalId)
      : allMarriages;

  const serialized: SerializedMarriage[] = visibleMarriages.map((m) => ({
    _id: m._id.toString(),
    title: m.title,
    professionalId: m.professionalId,
    husband: m.husband,
    wife: m.wife,
  }));

  const professionals: ProfessionalOption[] = professionalDocs.map((p) => ({
    _id: p._id.toString(),
    companyName: p.companyName,
  }));

  return (
    <MarriagesManager
      marriages={serialized}
      role={user.role}
      professionals={professionals}
    />
  );
}
