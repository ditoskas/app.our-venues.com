"use server";

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
import { readSpouse, createSpouseUserIfMissing } from "./spouses";

const CELEBRATION_TYPES: CelebrationType[] = ["Marriage", "Christening"];

export interface CelebrationFormState {
  error?: string;
}

// Root and Professional only. A Professional may only touch their own
// celebrations (professionalId must match their own) — checked whenever an
// existing celebration is involved (update/delete).
async function assertAccess(existing?: Celebration): Promise<{ error: string } | { user: User }> {
  const t = await getTranslations("celebrations.errors");
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

  await createSpouseUserIfMissing(celebration._id.toString(), celebration.husband, actorId);
  await createSpouseUserIfMissing(celebration._id.toString(), celebration.wife, actorId);

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

  const professional = resolveProfessionalId(access.user, formData);
  if ("error" in professional) return { error: t(professional.error) };

  try {
    await updateCelebration(id, { ...parsed, professionalId: professional.professionalId });
  } catch {
    return { error: t("updateFailed") };
  }

  const actorId = (await getCurrentUserId()) ?? "system";

  await logAction({
    userId: actorId,
    type: "info",
    category: "Celebrations",
    message: `Updated celebration "${before.title}"`,
    dataFrom: toLoggable(before),
    dataTo: { ...parsed, professionalId: professional.professionalId },
  });

  await createSpouseUserIfMissing(id, parsed.husband, actorId);
  await createSpouseUserIfMissing(id, parsed.wife, actorId);

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

  await logAction({
    userId: (await getCurrentUserId()) ?? "system",
    type: "warning",
    category: "Celebrations",
    message: `Deleted celebration "${celebration.title}"`,
    dataFrom: toLoggable(celebration),
  });

  revalidatePath("/celebrations");
}
