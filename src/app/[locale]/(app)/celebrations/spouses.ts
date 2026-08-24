import type { Spouse } from "@/lib/celebrations";
import { createUser, getUserByUsername, PROFESSIONAL_USER_PASSWORD } from "@/lib/users";
import { logAction } from "@/lib/logActions";

// Shared by the create/edit dialog (celebrations/actions.ts) and the View
// page's Couple Info tab (celebrations/[id]/actions.ts) — both submit
// husband/wife fields under the same `${prefix}FirstName` etc. naming.
export function readSpouse(
  formData: FormData,
  prefix: "husband" | "wife"
): { error: string } | Spouse {
  const firstName = String(formData.get(`${prefix}FirstName`) ?? "").trim();
  const lastName = String(formData.get(`${prefix}LastName`) ?? "").trim();
  const email = String(formData.get(`${prefix}Email`) ?? "").trim() || undefined;
  const mobile = String(formData.get(`${prefix}Mobile`) ?? "").trim() || undefined;

  if (!firstName || !lastName) {
    return { error: "required" };
  }

  return { firstName, lastName, ...(email ? { email } : {}), ...(mobile ? { mobile } : {}) };
}

// Creates the spouse's login only if one doesn't already exist for that
// email — best-effort, matches the Professional linked-user pattern: a
// failure (duplicate email) is logged, not thrown, so it never blocks
// saving the celebration itself.
export async function createSpouseUserIfMissing(
  coupleId: string,
  spouse: Spouse,
  actorId: string
): Promise<void> {
  if (!spouse.email) return;

  const existing = await getUserByUsername(spouse.email);
  if (existing) return;

  try {
    const user = await createUser({
      displayName: `${spouse.firstName} ${spouse.lastName}`,
      username: spouse.email,
      password: PROFESSIONAL_USER_PASSWORD,
      role: "Couple",
      coupleId,
      defaultLocale: "el",
    });
    await logAction({
      userId: actorId,
      type: "success",
      category: "Security",
      message: `Created user account for "${user.displayName}"`,
      dataTo: { username: user.username, role: "Couple", coupleId },
    });
  } catch (err) {
    await logAction({
      userId: actorId,
      type: "warning",
      category: "Security",
      message: `Could not create a user account for "${spouse.firstName} ${spouse.lastName}"`,
      dataTo: { username: spouse.email, error: err instanceof Error ? err.message : String(err) },
    });
  }
}
