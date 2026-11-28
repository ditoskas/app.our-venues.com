"use server";

import { canAccessCelebration } from "@/lib/celebrationAccess";
import { deleteCelebrationSubdomain, followCelebrationChange } from "@/lib/subdomainReservations";
import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import {
  createCelebration,
  deleteCelebration,
  getCelebrationById,
  updateCelebration,
  type Celebration,
  type CelebrationInput,
  type CelebrationType,
} from "@/lib/celebrations";
import { deleteCelebrationUploads } from "@/lib/uploads";
import { logAction } from "@/lib/logActions";
import { getCurrentUser, getCurrentUserId } from "@/lib/auth";
import type { User } from "@/lib/users";
import {
  createSpouseUserIfMissing,
  readSpouse,
  readSpousePassword,
  validateSpouseLogins,
  type SpouseLogin,
} from "./spouses";

const CELEBRATION_TYPES: CelebrationType[] = ["Marriage", "Christening"];

export interface CelebrationFormState {
  error?: string;
}

// Create: Root and Professional only. Update/delete of an existing
// celebration: anyone canAccessCelebration() allows — Root, the owning
// Professional, or the Couple whose coupleId points at it.
async function assertAccess(existing?: Celebration): Promise<{ error: string } | { user: User }> {
  const t = await getTranslations("celebrations.errors");
  const user = await getCurrentUser();
  if (!user) return { error: t("forbidden") };
  if (existing) {
    if (!canAccessCelebration(user, existing)) return { error: t("forbidden") };
  } else if (user.role !== "Root" && user.role !== "Professional") {
    return { error: t("forbidden") };
  }
  return { user };
}

// Root picks the professional explicitly (form field); a Professional is
// always scoped to their own linked professional record, and a Couple always
// keeps the celebration's existing professional, regardless of what (if
// anything) the form submitted — never trust client input for this.
function resolveProfessionalId(
  user: User,
  formData: FormData,
  existing?: Celebration
): { error: "forbidden" | "professionalRequired" } | { professionalId: string } {
  if (user.role === "Couple") {
    return existing ? { professionalId: existing.professionalId } : { error: "forbidden" };
  }
  if (user.role === "Professional") {
    return user.professionalId
      ? { professionalId: user.professionalId }
      : { error: "forbidden" };
  }
  const professionalId = String(formData.get("professionalId") ?? "").trim();
  return professionalId ? { professionalId } : { error: "professionalRequired" };
}

function readCelebrationForm(
  formData: FormData
): { error: string } | Omit<CelebrationInput, "professionalId"> {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "required" };

  const type = String(formData.get("type") ?? "").trim();
  if (!CELEBRATION_TYPES.includes(type as CelebrationType)) return { error: "required" };

  const husband = readSpouse(formData, "husband");
  if ("error" in husband) return { error: "required" };

  const wife = readSpouse(formData, "wife");
  if ("error" in wife) return { error: "required" };

  return { title, type: type as CelebrationType, husband, wife };
}

function spouseLogins(
  formData: FormData,
  parsed: Pick<CelebrationInput, "husband" | "wife">
): SpouseLogin[] {
  return [
    { spouse: parsed.husband, password: readSpousePassword(formData, "husband") },
    { spouse: parsed.wife, password: readSpousePassword(formData, "wife") },
  ];
}

function toLoggable(celebration: Celebration) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to omit them
  const { _id, createdAt, ...rest } = celebration;
  return rest;
}

export async function createCelebrationAction(
  _prevState: CelebrationFormState,
  formData: FormData
): Promise<CelebrationFormState> {
  const access = await assertAccess();
  if ("error" in access) return { error: access.error };

  const t = await getTranslations("celebrations.errors");
  const parsed = readCelebrationForm(formData);
  if ("error" in parsed) return { error: t("required") };

  const professional = resolveProfessionalId(access.user, formData);
  if ("error" in professional) return { error: t(professional.error) };

  const logins = spouseLogins(formData, parsed);
  const loginError = await validateSpouseLogins(logins);
  if (loginError) return { error: loginError };

  let celebration;
  try {
    celebration = await createCelebration({ ...parsed, professionalId: professional.professionalId });
  } catch {
    return { error: t("createFailed") };
  }

  const actorId = (await getCurrentUserId()) ?? "system";

  await logAction({
    userId: actorId,
    type: "success",
    category: "Celebrations",
    message: `Created celebration "${celebration.title}"`,
    dataTo: toLoggable(celebration),
  });

  for (const login of logins) {
    await createSpouseUserIfMissing(celebration._id.toString(), login, actorId);
  }

  revalidatePath("/celebrations");
  return redirect({ href: "/celebrations", locale: await getLocale() });
}

export async function updateCelebrationAction(
  id: string,
  _prevState: CelebrationFormState,
  formData: FormData
): Promise<CelebrationFormState> {
  const before = await getCelebrationById(id);
  const t = await getTranslations("celebrations.errors");
  if (!before) return { error: t("notFound") };

  const access = await assertAccess(before);
  if ("error" in access) return { error: access.error };

  const parsed = readCelebrationForm(formData);
  if ("error" in parsed) return { error: t("required") };

  const professional = resolveProfessionalId(access.user, formData, before);
  if ("error" in professional) return { error: t(professional.error) };

  const logins = spouseLogins(formData, parsed);
  const loginError = await validateSpouseLogins(logins);
  if (loginError) return { error: loginError };

  // A reserved subdomain follows the type (its domain); a clash rejects it.
  const actorId = (await getCurrentUserId()) ?? "system";
  const follow = await followCelebrationChange(
    id,
    parsed.title,
    { type: parsed.type, celebrationDate: before.celebrationDate },
    actorId
  );
  if (!follow.ok) return { error: t("subdomainClash", { label: follow.label }) };

  try {
    await updateCelebration(id, { ...parsed, professionalId: professional.professionalId });
  } catch {
    await followCelebrationChange(id, before.title, before, actorId); // move it back
    return { error: t("updateFailed") };
  }

  await logAction({
    userId: actorId,
    type: "info",
    category: "Celebrations",
    message: `Updated celebration "${before.title}"`,
    dataFrom: toLoggable(before),
    dataTo: { ...parsed, professionalId: professional.professionalId },
  });

  for (const login of logins) {
    await createSpouseUserIfMissing(id, login, actorId);
  }

  revalidatePath("/celebrations");
  return redirect({ href: "/celebrations", locale: await getLocale() });
}

export async function deleteCelebrationAction(id: string): Promise<void> {
  const celebration = await getCelebrationById(id);
  if (!celebration) return;

  const access = await assertAccess(celebration);
  if ("error" in access) return;

  await deleteCelebration(id);
  await deleteCelebrationUploads(celebration.professionalId, id);
  await deleteCelebrationSubdomain(id);

  await logAction({
    userId: (await getCurrentUserId()) ?? "system",
    type: "warning",
    category: "Celebrations",
    message: `Deleted celebration "${celebration.title}"`,
    dataFrom: toLoggable(celebration),
  });

  revalidatePath("/celebrations");
}
