import { getTranslations } from "next-intl/server";
import type { Spouse } from "@/lib/celebrations";
import { createUser, getUserByUsername } from "@/lib/users";
import { logAction } from "@/lib/logActions";
import { isPasswordLongEnough, MIN_PASSWORD_LENGTH } from "@/lib/passwordRules";

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

// The login password typed for a spouse (`${prefix}Password`). Never stored on
// the celebration — only used to create that spouse's Couple login.
export function readSpousePassword(formData: FormData, prefix: "husband" | "wife"): string {
  return String(formData.get(`${prefix}Password`) ?? "");
}

export interface SpouseLogin {
  spouse: Spouse;
  password: string;
}

// Run BEFORE saving: every spouse whose save will create a new login (email
// set, no user with that username yet) needs a valid password typed for them.
// Returns a translated error, or null when nothing is missing. A spouse whose
// login already exists needs no password — and a typed one is ignored, never
// applied to that existing account (the email could belong to anyone).
export async function validateSpouseLogins(logins: SpouseLogin[]): Promise<string | null> {
  const t = await getTranslations("celebrations.spouseLogin");
  for (const { spouse, password } of logins) {
    if (!spouse.email || (await getUserByUsername(spouse.email))) continue;
    const name = `${spouse.firstName} ${spouse.lastName}`;
    if (!password) return t("passwordRequired", { name, email: spouse.email });
    if (!isPasswordLongEnough(password)) {
      return t("passwordTooShort", { name, min: MIN_PASSWORD_LENGTH });
    }
  }
  return null;
}

// Creates the spouse's login only if one doesn't already exist for that
// email, with the password typed in the form (validateSpouseLogins() has
// already ensured there is one). Best-effort, matches the Professional
// linked-user pattern: a failure is logged, not thrown, so it never blocks
// saving the celebration itself.
export async function createSpouseUserIfMissing(
  coupleId: string,
  { spouse, password }: SpouseLogin,
  actorId: string
): Promise<void> {
  if (!spouse.email || !password) return;

  const existing = await getUserByUsername(spouse.email);
  if (existing) return;

  try {
    const user = await createUser({
      displayName: `${spouse.firstName} ${spouse.lastName}`,
      username: spouse.email,
      password,
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
