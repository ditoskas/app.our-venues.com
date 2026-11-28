"use server";

import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { clearSessionCookie, getCurrentUserId } from "@/lib/auth";
import { getUserById, updateProfile } from "@/lib/users";
import { logAction } from "@/lib/logActions";

export async function logoutAction(): Promise<void> {
  const userId = await getCurrentUserId();
  await clearSessionCookie();

  if (userId) {
    await logAction({
      userId,
      type: "info",
      category: "Security",
      message: "User logged out",
    });
  }

  redirect({ href: "/login", locale: await getLocale() });
}

function parseLocale(value: FormDataEntryValue | null): AppLocale {
  return (routing.locales as readonly string[]).includes(String(value))
    ? (value as AppLocale)
    : routing.defaultLocale;
}

// Switches the current view's locale *and* persists it as the user's
// defaultLocale (per the user's own request — the navbar previously had no
// language switcher at all, since language was meant to be Profile-only;
// this reintroduces it deliberately, wired to the same defaultLocale field
// rather than being a temporary view-only toggle).
export async function switchLanguageAction(formData: FormData): Promise<void> {
  const userId = await getCurrentUserId();
  const locale = parseLocale(formData.get("locale"));
  const redirectTo = String(formData.get("redirectTo") ?? "/");

  if (userId) {
    const user = await getUserById(userId);
    if (user) {
      await updateProfile(userId, {
        displayName: user.displayName,
        defaultLocale: locale,
      });

      await logAction({
        userId,
        type: "info",
        category: "Security",
        message: `User "${user.username}" changed their language`,
        dataFrom: { defaultLocale: user.defaultLocale },
        dataTo: { defaultLocale: locale },
      });
    }
  }

  redirect({ href: redirectTo, locale });
}
