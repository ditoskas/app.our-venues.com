import { listUsers } from "@/lib/users";
import UsersManager, { type SerializedUser } from "./UsersManager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
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
