import { listCelebrations } from "./celebrations";
import { listUsers, type User } from "./users";

// Which users an actor may see/manage:
//   Root         → every user, full CRUD (/settings/users)
//   Professional → their own Professional user(s) (read-only) plus the Couple
//                  users of their own celebrations (full CRUD, /users)
//   Couple       → nobody
// A Professional can only ever create/edit Couple users pointing at one of
// their own celebrations — enforced in settings/users/actions.ts with these.

export interface CelebrationOption {
  id: string;
  title: string;
}

export async function listOwnCelebrationOptions(
  professionalId: string | undefined
): Promise<CelebrationOption[]> {
  if (!professionalId) return [];
  return (await listCelebrations())
    .filter((c) => c.professionalId === professionalId)
    .map((c) => ({ id: c._id.toString(), title: c.title }));
}

export function canManageUser(
  actor: Pick<User, "role">,
  target: Pick<User, "role" | "coupleId">,
  ownCelebrationIds: ReadonlySet<string>
): boolean {
  if (actor.role === "Root") return true;
  if (actor.role === "Professional") {
    return target.role === "Couple" && !!target.coupleId && ownCelebrationIds.has(target.coupleId);
  }
  return false;
}

export async function listUsersInScope(
  actor: Pick<User, "role" | "professionalId">,
  ownCelebrationIds: ReadonlySet<string>
): Promise<User[]> {
  const users = await listUsers();
  if (actor.role === "Root") return users;
  if (actor.role !== "Professional" || !actor.professionalId) return [];
  return users.filter(
    (u) =>
      (u.role === "Professional" && u.professionalId === actor.professionalId) ||
      canManageUser(actor, u, ownCelebrationIds)
  );
}
