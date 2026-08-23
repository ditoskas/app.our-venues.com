"use server";

import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import {
  createProfessional,
  deleteProfessional,
  getProfessionalById,
  setProfessionalLogo,
  updateProfessional,
  type Professional,
  type ProfessionalInput,
} from "@/lib/professionals";
import {
  deleteProfessionalImages,
  saveProfessionalLogo,
} from "@/lib/uploads";
import { logAction } from "@/lib/logActions";
import { getCurrentUser, getCurrentUserId } from "@/lib/auth";
import {
  createUser,
  getUserByProfessionalId,
  updateUser,
  PROFESSIONAL_USER_PASSWORD,
} from "@/lib/users";
import { routing } from "@/i18n/routing";

export interface ProfessionalFormState {
  error?: string;
}

async function assertRoot(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "Root") {
    const t = await getTranslations("professionals.errors");
    return t("forbidden");
  }
  return null;
}

function readProfessionalForm(formData: FormData):
  | { error: string }
  | ProfessionalInput {
  const companyName = String(formData.get("companyName") ?? "").trim();
  const contactPerson = String(formData.get("contactPerson") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const mobile = String(formData.get("mobile") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim() || undefined;
  const country = String(formData.get("country") ?? "").trim() || undefined;
  const city = String(formData.get("city") ?? "").trim() || undefined;
  const address = String(formData.get("address") ?? "").trim() || undefined;
  const postCode = String(formData.get("postCode") ?? "").trim() || undefined;

  if (!companyName || !contactPerson || !phone || !mobile || !email) {
    return { error: "required" };
  }

  return {
    companyName,
    contactPerson,
    phone,
    mobile,
    email,
    ...(website ? { website } : {}),
    ...(country ? { country } : {}),
    ...(city ? { city } : {}),
    ...(address ? { address } : {}),
    ...(postCode ? { postCode } : {}),
  };
}

function getLogoFile(formData: FormData): File | null {
  const file = formData.get("logo");
  return file instanceof File && file.size > 0 ? file : null;
}

function toLoggable(professional: Professional) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to omit them
  const { _id, createdAt, ...rest } = professional;
  return rest;
}

// Every Professional gets a matching login (role "Professional", linked via
// professionalId) so they can sign in themselves. Best-effort: a failure here
// (e.g. the email is already taken by another user) must not undo the
// professional that was just created — it's logged instead.
async function createLinkedUser(
  professionalId: string,
  companyName: string,
  email: string
): Promise<void> {
  const actorId = (await getCurrentUserId()) ?? "system";
  try {
    await createUser({
      displayName: companyName,
      username: email,
      password: PROFESSIONAL_USER_PASSWORD,
      role: "Professional",
      professionalId,
      defaultLocale: routing.defaultLocale,
    });
    await logAction({
      userId: actorId,
      type: "success",
      category: "Security",
      message: `Created user account for professional "${companyName}"`,
      dataTo: { username: email, role: "Professional", professionalId },
    });
  } catch (err) {
    await logAction({
      userId: actorId,
      type: "warning",
      category: "Security",
      message: `Could not create a user account for professional "${companyName}"`,
      dataTo: { username: email, error: err instanceof Error ? err.message : String(err) },
    });
  }
}

// Keeps the linked user's display name/login email in step with the
// professional's own record. Same best-effort behavior as createLinkedUser.
async function syncLinkedUser(
  professionalId: string,
  companyName: string,
  email: string
): Promise<void> {
  const linkedUser = await getUserByProfessionalId(professionalId);
  if (!linkedUser) return;

  const actorId = (await getCurrentUserId()) ?? "system";
  try {
    await updateUser(linkedUser._id.toString(), {
      displayName: companyName,
      username: email,
      role: "Professional",
      professionalId,
      defaultLocale: linkedUser.defaultLocale,
    });
    await logAction({
      userId: actorId,
      type: "info",
      category: "Security",
      message: `Synced user account for professional "${companyName}"`,
      dataFrom: { displayName: linkedUser.displayName, username: linkedUser.username },
      dataTo: { displayName: companyName, username: email },
    });
  } catch (err) {
    await logAction({
      userId: actorId,
      type: "warning",
      category: "Security",
      message: `Could not sync the user account for professional "${companyName}"`,
      dataTo: { username: email, error: err instanceof Error ? err.message : String(err) },
    });
  }
}

export async function createProfessionalAction(
  _prevState: ProfessionalFormState,
  formData: FormData
): Promise<ProfessionalFormState> {
  const forbidden = await assertRoot();
  if (forbidden) return { error: forbidden };

  const t = await getTranslations("professionals.errors");
  const parsed = readProfessionalForm(formData);
  if ("error" in parsed) return { error: t("required") };

  let professional;
  try {
    professional = await createProfessional(parsed);
  } catch {
    return { error: t("createFailed") };
  }

  const logo = getLogoFile(formData);
  if (logo) {
    const filename = await saveProfessionalLogo(professional._id.toString(), logo);
    professional.logoFilename = filename;
    await setProfessionalLogo(professional._id.toString(), filename);
  }

  await logAction({
    userId: (await getCurrentUserId()) ?? "system",
    type: "success",
    category: "Professionals",
    message: `Created professional "${professional.companyName}"`,
    dataTo: { ...parsed, logoFilename: professional.logoFilename },
  });

  await createLinkedUser(professional._id.toString(), parsed.companyName, parsed.email);

  revalidatePath("/professionals");
  return redirect({ href: "/professionals", locale: await getLocale() });
}

export async function updateProfessionalAction(
  id: string,
  _prevState: ProfessionalFormState,
  formData: FormData
): Promise<ProfessionalFormState> {
  const forbidden = await assertRoot();
  if (forbidden) return { error: forbidden };

  const t = await getTranslations("professionals.errors");
  const parsed = readProfessionalForm(formData);
  if ("error" in parsed) return { error: t("required") };

  const before = await getProfessionalById(id);
  if (!before) return { error: t("notFound") };

  try {
    await updateProfessional(id, parsed);
  } catch {
    return { error: t("updateFailed") };
  }

  const logo = getLogoFile(formData);
  let logoFilename = before.logoFilename;
  if (logo) {
    logoFilename = await saveProfessionalLogo(id, logo);
    await setProfessionalLogo(id, logoFilename);
  }

  await logAction({
    userId: (await getCurrentUserId()) ?? "system",
    type: "info",
    category: "Professionals",
    message: `Updated professional "${before.companyName}"`,
    dataFrom: toLoggable(before),
    dataTo: { ...parsed, logoFilename },
  });

  await syncLinkedUser(id, parsed.companyName, parsed.email);

  revalidatePath("/professionals");
  return redirect({ href: "/professionals", locale: await getLocale() });
}

export async function deleteProfessionalAction(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== "Root") return;

  const professional = await getProfessionalById(id);
  if (!professional) return;

  await deleteProfessional(id);
  await deleteProfessionalImages(id);

  await logAction({
    userId: (await getCurrentUserId()) ?? "system",
    type: "warning",
    category: "Professionals",
    message: `Deleted professional "${professional.companyName}"`,
    dataFrom: toLoggable(professional),
  });

  revalidatePath("/professionals");
}
