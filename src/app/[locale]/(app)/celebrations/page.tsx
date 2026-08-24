import { listCelebrations } from "@/lib/celebrations";
import { listProfessionals } from "@/lib/professionals";
import { requirePageRole } from "@/lib/auth";
import CelebrationsManager, { type SerializedCelebration } from "./CelebrationsManager";
import type { ProfessionalOption } from "@/components/ProfessionalPicker";

export const dynamic = "force-dynamic";

export default async function CelebrationsPage() {
  const user = await requirePageRole(["Root", "Professional"]);

  const [allCelebrations, professionalDocs] = await Promise.all([
    listCelebrations(),
    user.role === "Root" ? listProfessionals() : Promise.resolve([]),
  ]);

  const visibleCelebrations =
    user.role === "Professional"
      ? allCelebrations.filter((c) => c.professionalId === user.professionalId)
      : allCelebrations;

  const serialized: SerializedCelebration[] = visibleCelebrations.map((c) => ({
    _id: c._id.toString(),
    guid: c.guid,
    title: c.title,
    type: c.type,
    professionalId: c.professionalId,
    husband: c.husband,
    wife: c.wife,
  }));

  const professionals: ProfessionalOption[] = professionalDocs.map((p) => ({
    _id: p._id.toString(),
    companyName: p.companyName,
  }));

  return (
    <CelebrationsManager
      celebrations={serialized}
      role={user.role}
      professionals={professionals}
    />
  );
}
