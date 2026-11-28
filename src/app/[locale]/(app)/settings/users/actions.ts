"use server";

import { revalidatePath } from "next/cache";
import { ObjectId } from "mongodb";
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
import { getCurrentUser, getCurrentUserId } from "@/lib/auth";
import { canManageUser, listOwnCelebrationOptions } from "@/lib/userScope";
import type { User } from "@/lib/users";
import { routing, type AppLocale } from "@/i18n/routing";

export interface UserFormState {
  error?: string;
}

// Shared by Root (/settings/users — every user) and Professional (/users —
// only the Couple users of their own celebrations). Every action re-derives
// the actor and scope server-side; nothing about scope comes from the client.
interface Actor {
  user: User;
  ownCelebrationIds: Set<string>;
  listPath: "/settings/users" | "/users";
}

async function getActor(): Promise<Actor | null> {
  const user = await getCurrentUser();
  if (!user || (user.role !== "Root" && user.role !== "Professional")) return null;
  const ownCelebrationIds =
    user.role === "Professional"
      ? new Set((await listOwnCelebrationOptions(user.professionalId)).map((c) => c.id))
      : new Set<string>();
  return {
    user,
    ownCelebrationIds,
    listPath: user.role === "Root" ? "/settings/users" : "/users",
  };
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

async function readUserForm(formData: FormData, actor: Actor) {
  const t = await getTranslations("settings.users.errors");

  const displayName = String(formData.get("displayName") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  // A Professional can only ever produce Couple users.
  const role = actor.user.role === "Root" ? parseRole(formData.get("role")) : "Couple";
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
  if (actor.user.role !== "Root" && (!coupleId || !actor.ownCelebrationIds.has(coupleId))) {
    return { error: t("forbidden") } as const;
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
  const actor = await getActor();
  if (!actor) return { error: t("forbidden") };
  const parsed = await readUserForm(formData, actor);
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

  revalidatePath(actor.listPath);
  return redirect({ href: actor.listPath, locale: await getLocale() });
}

export async function updateUserAction(
  id: string,
  _prevState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  const t = await getTranslations("settings.users.errors");
  const actor = await getActor();
  if (!actor) return { error: t("forbidden") };

  const before = ObjectId.isValid(id) ? await getUserById(id) : null;
  if (!before) return { error: t("notFound") };
  if (!canManageUser(actor.user, before, actor.ownCelebrationIds)) {
    return { error: t("forbidden") };
  }

  const parsed = await readUserForm(formData, actor);
  if ("error" in parsed) return { error: parsed.error };

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

  revalidatePath(actor.listPath);
  return redirect({ href: actor.listPath, locale: await getLocale() });
}

export async function deleteUserAction(id: string): Promise<void> {
  const actor = await getActor();
  if (!actor) return;
  const user = ObjectId.isValid(id) ? await getUserById(id) : null;
  if (!user) return;
  if (!canManageUser(actor.user, user, actor.ownCelebrationIds)) return;
  // Never let anyone delete the account they're currently using.
  if (user._id.equals(actor.user._id)) return;

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

  revalidatePath(actor.listPath);
}
