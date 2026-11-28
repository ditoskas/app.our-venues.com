import type { Celebration } from "./celebrations";
import type { User } from "./users";

// The one ownership rule for celebrations — used by pages, layouts, Server
// Actions and the authenticated /api/celebrations/** routes alike:
//   Root         → every celebration
//   Professional → celebrations whose professionalId is theirs
//   Couple       → the celebration their coupleId points at
export function canAccessCelebration(
  user: Pick<User, "role" | "professionalId" | "coupleId">,
  celebration: Pick<Celebration, "_id" | "professionalId">
): boolean {
  switch (user.role) {
    case "Root":
      return true;
    case "Professional":
      return !!user.professionalId && celebration.professionalId === user.professionalId;
    case "Couple":
      return !!user.coupleId && celebration._id.toString() === user.coupleId;
    default:
      return false;
  }
}
