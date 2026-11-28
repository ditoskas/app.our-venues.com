import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { canAccessCelebration } from "@/lib/celebrationAccess";
import { requirePageRole } from "@/lib/auth";
import { getCelebrationById, type Celebration } from "@/lib/celebrations";
import type { User } from "@/lib/users";

export async function requireCelebrationAccess(
  id: string
): Promise<{ user: User; celebration: Celebration }> {
  const user = await requirePageRole(["Root", "Professional", "Couple"]);

  const celebration = ObjectId.isValid(id) ? await getCelebrationById(id) : null;
  if (!celebration || !canAccessCelebration(user, celebration)) {
    notFound();
  }

  return { user, celebration };
}
