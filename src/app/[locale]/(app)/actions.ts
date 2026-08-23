"use server";

import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { clearSessionCookie, getCurrentUserId } from "@/lib/auth";
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
