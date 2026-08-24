import { notFound } from "next/navigation";
import { requirePageRole } from "@/lib/auth";
import { getCelebrationById, type Celebration } from "@/lib/celebrations";
import type { User } from "@/lib/users";

export async function requireCelebrationAccess(
  id: string
): Promise<{ user: User; celebration: Celebration }> {
  const user = await requirePageRole(["Root", "Professional"]);

  const celebration = await getCelebrationById(id);
  if (!celebration) {
    notFound();
  }
  if (user.role === "Professional" && celebration.professionalId !== user.professionalId) {
    notFound();
  }

  return { user, celebration };
}
