import { requirePageRole } from "@/lib/auth";
import { canManageUser, listOwnCelebrationOptions, listUsersInScope } from "@/lib/userScope";
import UsersManager, { type SerializedUser } from "../settings/users/UsersManager";

export const dynamic = "force-dynamic";

// A Professional's own Users page: their own login (read-only) plus the
// Couple users of their own celebrations (full CRUD). Same Manager/actions as
// Root's /settings/users — the actions re-derive scope from the session.
export default async function ProfessionalUsersPage() {
  const user = await requirePageRole(["Professional"]);

  const celebrationOptions = await listOwnCelebrationOptions(user.professionalId);
  const ownCelebrationIds = new Set(celebrationOptions.map((c) => c.id));
  const users = await listUsersInScope(user, ownCelebrationIds);

  const serialized: SerializedUser[] = users.map((u) => ({
    _id: u._id.toString(),
    displayName: u.displayName,
    username: u.username,
    role: u.role,
    professionalId: u.professionalId,
    coupleId: u.coupleId,
    defaultLocale: u.defaultLocale,
  }));

  const manageableIds = users
    .filter((u) => canManageUser(user, u, ownCelebrationIds))
    .map((u) => u._id.toString());

  return (
    <UsersManager
      users={serialized}
      celebrationOptions={celebrationOptions}
      manageableIds={manageableIds}
    />
  );
}
