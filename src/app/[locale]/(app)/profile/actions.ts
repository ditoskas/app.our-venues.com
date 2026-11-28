"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import {
  changePassword,
  getUserById,
  updateProfile,
  verifyPassword,
} from "@/lib/users";
import { logAction } from "@/lib/logActions";
import { ObjectId } from "mongodb";
import { getCurrentUserId, getRealUser, resolveSession, setActingAs } from "@/lib/auth";
import { routing, type AppLocale } from "@/i18n/routing";

export interface ProfileFormState {
  error?: string;
}

function parseLocale(value: FormDataEntryValue | null): AppLocale {
  return (routing.locales as readonly string[]).includes(String(value))
    ? (value as AppLocale)
    : routing.defaultLocale;
}

export async function updateProfileAction(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const t = await getTranslations("profile.errors");
  const userId = await getCurrentUserId();
  if (!userId) return { error: t("displayNameRequired") };

  const before = await getUserById(userId);
  if (!before) return { error: t("displayNameRequired") };

  const displayName = String(formData.get("displayName") ?? "").trim();
  const defaultLocale = parseLocale(formData.get("defaultLocale"));

  if (!displayName) {
    return { error: t("displayNameRequired") };
  }

  await updateProfile(userId, { displayName, defaultLocale });

  await logAction({
    userId,
    type: "info",
    category: "Security",
    message: `User "${before.username}" updated their profile`,
    dataFrom: { displayName: before.displayName, defaultLocale: before.defaultLocale },
    dataTo: { displayName, defaultLocale },
  });

  revalidatePath("/profile");
  return redirect({ href: "/profile", locale: defaultLocale });
}

export async function changePasswordAction(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const t = await getTranslations("profile.errors");
  const userId = await getCurrentUserId();
  if (!userId) return { error: t("currentPasswordRequired") };

  const user = await getUserById(userId);
  if (!user) return { error: t("currentPasswordRequired") };

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword) return { error: t("currentPasswordRequired") };
  if (!newPassword) return { error: t("newPasswordRequired") };
  if (newPassword !== confirmPassword) return { error: t("passwordsDoNotMatch") };

  const isCurrentValid = await verifyPassword(currentPassword, user.passwordHash);
  if (!isCurrentValid) return { error: t("currentPasswordIncorrect") };

  await changePassword(userId, newPassword);

  await logAction({
    userId,
    type: "success",
    category: "Security",
    message: `User "${user.username}" changed their password`,
  });

  revalidatePath("/profile");
  return redirect({
    href: "/profile",
    locale: user.defaultLocale ?? routing.defaultLocale,
  });
}

// ---------------------------------------------------------------------------
// "Act as" — Root-only impersonation. Always checked against the *real*
// (logged-in) user, never the effective one, since while acting as someone
// getCurrentUser() returns the target.
// ---------------------------------------------------------------------------

export interface ActAsFormState {
  error?: string;
}

export async function startActingAsAction(
  _prevState: ActAsFormState,
  formData: FormData
): Promise<ActAsFormState> {
  const t = await getTranslations("profile.actAs.errors");
  const realUser = await getRealUser();
  if (!realUser || realUser.role !== "Root") return { error: t("notAllowed") };

  const targetId = String(formData.get("userId") ?? "");
  const target = ObjectId.isValid(targetId) ? await getUserById(targetId) : null;
  if (!target) return { error: t("userRequired") };
  if (target.role === "Root") return { error: t("notAllowed") };

  await setActingAs(target._id.toString());

  await logAction({
    userId: realUser._id.toString(),
    type: "warning",
    category: "Security",
    message: `Root user "${realUser.username}" started acting as "${target.username}" (${target.role})`,
    dataTo: { actingAs: target._id.toString() },
  });

  // Land exactly where the target would after logging in: their home page,
  // in their own default language.
  return redirect({
    href: "/",
    locale: target.defaultLocale ?? routing.defaultLocale,
  });
}

export async function stopActingAsAction(): Promise<void> {
  const session = await resolveSession();
  if (!session) {
    return redirect({ href: "/login", locale: routing.defaultLocale });
  }

  if (session.isActingAs) {
    await setActingAs(null);
    await logAction({
      userId: session.realUser._id.toString(),
      type: "info",
      category: "Security",
      message: `Root user "${session.realUser.username}" stopped acting as "${session.effectiveUser.username}"`,
      dataFrom: { actingAs: session.effectiveUser._id.toString() },
    });
  }

  return redirect({
    href: "/profile",
    locale: session.realUser.defaultLocale ?? routing.defaultLocale,
  });
}
