"use server";

import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import {
  createMarriage,
  deleteMarriage,
  getMarriageById,
  updateMarriage,
  type Marriage,
  type MarriageInput,
  type Spouse,
} from "@/lib/marriages";
import { createUser, getUserByUsername, PROFESSIONAL_USER_PASSWORD } from "@/lib/users";
import { logAction } from "@/lib/logActions";
import { getCurrentUser, getCurrentUserId } from "@/lib/auth";
import type { User } from "@/lib/users";

export interface MarriageFormState {
  error?: string;
}

// Root and Professional only. A Professional may only touch their own
// marriages (professionalId must match their own) — checked whenever an
// existing marriage is involved (update/delete).
async function assertAccess(existing?: Marriage): Promise<{ error: string } | { user: User }> {
  const t = await getTranslations("weddings.errors");
  const user = await getCurrentUser();
  if (!user || (user.role !== "Root" && user.role !== "Professional")) {
    return { error: t("forbidden") };
  }
  if (existing && user.role === "Professional" && existing.professionalId !== user.professionalId) {
    return { error: t("forbidden") };
  }
  return { user };
}

// Root picks the professional explicitly (form field); a Professional is
// always scoped to their own linked professional record, regardless of
// what (if anything) the form submitted — never trust client input for this.
function resolveProfessionalId(
  user: User,
  formData: FormData
): { error: "forbidden" | "professionalRequired" } | { professionalId: string } {
  if (user.role === "Professional") {
    return user.professionalId
      ? { professionalId: user.professionalId }
      : { error: "forbidden" };
  }
  const professionalId = String(formData.get("professionalId") ?? "").trim();
  return professionalId ? { professionalId } : { error: "professionalRequired" };
}

function readSpouse(formData: FormData, prefix: "husband" | "wife"):
  | { error: string }
  | Spouse {
  const firstName = String(formData.get(`${prefix}FirstName`) ?? "").trim();
  const lastName = String(formData.get(`${prefix}LastName`) ?? "").trim();
  const email = String(formData.get(`${prefix}Email`) ?? "").trim() || undefined;
  const mobile = String(formData.get(`${prefix}Mobile`) ?? "").trim() || undefined;

  if (!firstName || !lastName) {
    return { error: "required" };
  }

  return { firstName, lastName, ...(email ? { email } : {}), ...(mobile ? { mobile } : {}) };
}

function readMarriageForm(
  formData: FormData
): { error: string } | Omit<MarriageInput, "professionalId"> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "required" };

  const husband = readSpouse(formData, "husband");
  if ("error" in husband) return { error: "required" };

  const wife = readSpouse(formData, "wife");
  if ("error" in wife) return { error: "required" };

  return { title, husband, wife };
}

function toLoggable(marriage: Marriage) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to omit them
  const { _id, createdAt, ...rest } = marriage;
  return rest;
}

// Creates the spouse's login only if one doesn't already exist for that
// email — best-effort, matches the Professional linked-user pattern: a
// failure (duplicate email) is logged, not thrown, so it never blocks
// saving the marriage itself.
async function createSpouseUserIfMissing(
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

export async function createMarriageAction(
  _prevState: MarriageFormState,
  formData: FormData
): Promise<MarriageFormState> {
  const access = await assertAccess();
  if ("error" in access) return { error: access.error };

  const t = await getTranslations("weddings.errors");
  const parsed = readMarriageForm(formData);
  if ("error" in parsed) return { error: t("required") };

  const professional = resolveProfessionalId(access.user, formData);
  if ("error" in professional) return { error: t(professional.error) };

  let marriage;
  try {
    marriage = await createMarriage({ ...parsed, professionalId: professional.professionalId });
  } catch {
    return { error: t("createFailed") };
  }

  const actorId = (await getCurrentUserId()) ?? "system";

  await logAction({
    userId: actorId,
    type: "success",
    category: "Weddings",
    message: `Created marriage "${marriage.title}"`,
    dataTo: toLoggable(marriage),
  });

  await createSpouseUserIfMissing(marriage._id.toString(), marriage.husband, actorId);
  await createSpouseUserIfMissing(marriage._id.toString(), marriage.wife, actorId);

  revalidatePath("/weddings");
  return redirect({ href: "/weddings", locale: await getLocale() });
}

export async function updateMarriageAction(
  id: string,
  _prevState: MarriageFormState,
  formData: FormData
): Promise<MarriageFormState> {
  const before = await getMarriageById(id);
  const t = await getTranslations("weddings.errors");
  if (!before) return { error: t("notFound") };

  const access = await assertAccess(before);
  if ("error" in access) return { error: access.error };

  const parsed = readMarriageForm(formData);
  if ("error" in parsed) return { error: t("required") };

  const professional = resolveProfessionalId(access.user, formData);
  if ("error" in professional) return { error: t(professional.error) };

  try {
    await updateMarriage(id, { ...parsed, professionalId: professional.professionalId });
  } catch {
    return { error: t("updateFailed") };
  }

  const actorId = (await getCurrentUserId()) ?? "system";

  await logAction({
    userId: actorId,
    type: "info",
    category: "Weddings",
    message: `Updated marriage "${before.title}"`,
    dataFrom: toLoggable(before),
    dataTo: { ...parsed, professionalId: professional.professionalId },
  });

  await createSpouseUserIfMissing(id, parsed.husband, actorId);
  await createSpouseUserIfMissing(id, parsed.wife, actorId);

  revalidatePath("/weddings");
  return redirect({ href: "/weddings", locale: await getLocale() });
}

export async function deleteMarriageAction(id: string): Promise<void> {
  const marriage = await getMarriageById(id);
  if (!marriage) return;

  const access = await assertAccess(marriage);
  if ("error" in access) return;

  await deleteMarriage(id);

  await logAction({
    userId: (await getCurrentUserId()) ?? "system",
    type: "warning",
    category: "Weddings",
    message: `Deleted marriage "${marriage.title}"`,
    dataFrom: toLoggable(marriage),
  });

  revalidatePath("/weddings");
}
