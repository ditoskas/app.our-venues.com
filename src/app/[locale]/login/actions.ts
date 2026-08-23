"use server";

import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getUserByUsername, verifyPassword } from "@/lib/users";
import { setSessionCookie } from "@/lib/auth";
import { logAction } from "@/lib/logActions";
import { routing } from "@/i18n/routing";

export interface LoginFormState {
  error?: string;
}

function safeRedirectTarget(value: FormDataEntryValue | null): string {
  const target = String(value ?? "");
  // Must stay within the app: same-origin, relative path only.
  if (target.startsWith("/") && !target.startsWith("//")) {
    return target;
  }
  return "/";
}

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const t = await getTranslations("login.errors");
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = safeRedirectTarget(formData.get("redirect"));

  if (!username || !password) {
    return { error: t("required") };
  }

  const user = await getUserByUsername(username);
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !valid) {
    return { error: t("invalidCredentials") };
  }

  await setSessionCookie(user._id.toString());

  await logAction({
    userId: user._id.toString(),
    type: "success",
    category: "Security",
    message: `User "${user.username}" logged in`,
  });

  // Land in the user's own default language, not necessarily the locale
  // they happened to be on the login page in. Falls back for records
  // written before defaultLocale existed.
  return redirect({
    href: redirectTo,
    locale: user.defaultLocale ?? routing.defaultLocale,
  });
}
