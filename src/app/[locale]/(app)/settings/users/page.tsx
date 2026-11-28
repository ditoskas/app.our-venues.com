import { listUsers } from "@/lib/users";
import { requirePageRole } from "@/lib/auth";
import UsersManager, { type SerializedUser } from "./UsersManager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  // Also gated by settings/layout.tsx; repeated so this page stays safe on its own.
  await requirePageRole(["Root"]);
  const users = await listUsers();
  const serialized: SerializedUser[] = users.map((u) => ({
    _id: u._id.toString(),
    displayName: u.displayName,
    username: u.username,
    role: u.role,
    professionalId: u.professionalId,
    coupleId: u.coupleId,
    defaultLocale: u.defaultLocale,
  }));

  return <UsersManager users={serialized} />;
}
