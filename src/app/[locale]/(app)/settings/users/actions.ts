"use server";

import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import {
  createUser,
  deleteUser,
  getUserById,
  updateUser,
  type Role,
} from "@/lib/users";
import { logAction } from "@/lib/logActions";
import { getCurrentUserId } from "@/lib/auth";
import { routing, type AppLocale } from "@/i18n/routing";

export interface UserFormState {
  error?: string;
}

function parseRole(value: FormDataEntryValue | null): Role | null {
  if (value === "Root" || value === "Professional" || value === "Couple") {
    return value;
  }
  return null;
}

function parseLocale(value: FormDataEntryValue | null): AppLocale {
  return (routing.locales as readonly string[]).includes(String(value))
    ? (value as AppLocale)
    : routing.defaultLocale;
}

async function readUserForm(formData: FormData) {
  const t = await getTranslations("settings.users.errors");

  const displayName = String(formData.get("displayName") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = parseRole(formData.get("role"));
  const defaultLocale = parseLocale(formData.get("defaultLocale"));
  const professionalId =
    String(formData.get("professionalId") ?? "").trim() || undefined;
  const coupleId = String(formData.get("coupleId") ?? "").trim() || undefined;

  if (!displayName || !username || !role) {
    return { error: t("required") } as const;
  }
  if (role === "Professional" && !professionalId) {
    return { error: t("professionalIdRequired") } as const;
  }
  if (role === "Couple" && !coupleId) {
    return { error: t("coupleIdRequired") } as const;
  }

  return {
    displayName,
    username,
    password,
    role,
    professionalId,
    coupleId,
    defaultLocale,
  } as const;
}

export async function createUserAction(
  _prevState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  const t = await getTranslations("settings.users.errors");
  const parsed = await readUserForm(formData);
  if ("error" in parsed) return { error: parsed.error };
  if (!parsed.password) return { error: t("passwordRequired") };

  let user;
  try {
    user = await createUser(parsed);
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === 11000) {
      return { error: t("usernameTaken") };
    }
    return { error: t("createFailed") };
  }

  await logAction({
    userId: (await getCurrentUserId()) ?? "system",
    type: "success",
    category: "Security",
    message: `Created user "${user.username}" (${user.role})`,
    dataTo: {
      displayName: user.displayName,
      username: user.username,
      role: user.role,
      professionalId: user.professionalId,
      coupleId: user.coupleId,
      defaultLocale: user.defaultLocale,
    },
  });

  revalidatePath("/settings/users");
  return redirect({ href: "/settings/users", locale: await getLocale() });
}

export async function updateUserAction(
  id: string,
  _prevState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  const t = await getTranslations("settings.users.errors");
  const parsed = await readUserForm(formData);
  if ("error" in parsed) return { error: parsed.error };

  const before = await getUserById(id);
  if (!before) return { error: t("notFound") };

  try {
    await updateUser(id, parsed);
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === 11000) {
      return { error: t("usernameTaken") };
    }
    return { error: t("updateFailed") };
  }

  await logAction({
    userId: (await getCurrentUserId()) ?? "system",
    type: "info",
    category: "Security",
    message: `Updated user "${before.username}"`,
    dataFrom: {
      displayName: before.displayName,
      username: before.username,
      role: before.role,
      professionalId: before.professionalId,
      coupleId: before.coupleId,
      defaultLocale: before.defaultLocale,
    },
    dataTo: {
      displayName: parsed.displayName,
      username: parsed.username,
      role: parsed.role,
      professionalId: parsed.professionalId,
      coupleId: parsed.coupleId,
      defaultLocale: parsed.defaultLocale,
    },
  });

  revalidatePath("/settings/users");
  return redirect({ href: "/settings/users", locale: await getLocale() });
}

export async function deleteUserAction(id: string): Promise<void> {
  const user = await getUserById(id);
  if (!user) return;

  await deleteUser(id);

  await logAction({
    userId: (await getCurrentUserId()) ?? "system",
    type: "warning",
    category: "Security",
    message: `Deleted user "${user.username}"`,
    dataFrom: {
      displayName: user.displayName,
      username: user.username,
      role: user.role,
      professionalId: user.professionalId,
      coupleId: user.coupleId,
    },
  });

  revalidatePath("/settings/users");
}
