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
import { getCurrentUserId } from "@/lib/auth";
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
