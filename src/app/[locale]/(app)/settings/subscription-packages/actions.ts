"use server";

import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import {
  createSubscriptionPackage,
  deleteSubscriptionPackage,
  getSubscriptionPackageById,
  updateSubscriptionPackage,
  type SubscriptionPackage,
  type SubscriptionPackageInput,
} from "@/lib/subscriptionPackages";
import { logAction } from "@/lib/logActions";
import { getCurrentUser, getCurrentUserId } from "@/lib/auth";

export interface SubscriptionPackageFormState {
  error?: string;
}

async function assertRoot(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== "Root") {
    const t = await getTranslations("settings.subscriptionPackages.errors");
    return t("forbidden");
  }
  return null;
}

function parseNonNegativeInt(value: FormDataEntryValue | null): number | null {
  const n = Number(String(value ?? "").trim());
  return Number.isInteger(n) && n >= 0 ? n : null;
}

function readSubscriptionPackageForm(
  formData: FormData
): { error: string } | SubscriptionPackageInput {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const maxUsers = parseNonNegativeInt(formData.get("maxUsers"));
  const maxBronzeCelebrations = parseNonNegativeInt(formData.get("maxBronzeCelebrations"));
  const maxSilverCelebrations = parseNonNegativeInt(formData.get("maxSilverCelebrations"));
  const maxGoldCelebrations = parseNonNegativeInt(formData.get("maxGoldCelebrations"));

  if (
    !name ||
    !description ||
    maxUsers === null ||
    maxBronzeCelebrations === null ||
    maxSilverCelebrations === null ||
    maxGoldCelebrations === null
  ) {
    return { error: "required" };
  }

  return {
    name,
    description,
    maxUsers,
    maxBronzeCelebrations,
    maxSilverCelebrations,
    maxGoldCelebrations,
  };
}

function toLoggable(pkg: SubscriptionPackage) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructured only to omit them
  const { _id, createdAt, ...rest } = pkg;
  return rest;
}

export async function createSubscriptionPackageAction(
  _prevState: SubscriptionPackageFormState,
  formData: FormData
): Promise<SubscriptionPackageFormState> {
  const forbidden = await assertRoot();
  if (forbidden) return { error: forbidden };

  const t = await getTranslations("settings.subscriptionPackages.errors");
  const parsed = readSubscriptionPackageForm(formData);
  if ("error" in parsed) return { error: t("required") };

  let pkg;
  try {
    pkg = await createSubscriptionPackage(parsed);
  } catch {
    return { error: t("createFailed") };
  }

  await logAction({
    userId: (await getCurrentUserId()) ?? "system",
    type: "success",
    category: "Settings",
    message: `Created subscription package "${pkg.name}"`,
    dataTo: toLoggable(pkg),
  });

  revalidatePath("/settings/subscription-packages");
  return redirect({ href: "/settings/subscription-packages", locale: await getLocale() });
}

export async function updateSubscriptionPackageAction(
  id: string,
  _prevState: SubscriptionPackageFormState,
  formData: FormData
): Promise<SubscriptionPackageFormState> {
  const forbidden = await assertRoot();
  if (forbidden) return { error: forbidden };

  const t = await getTranslations("settings.subscriptionPackages.errors");
  const parsed = readSubscriptionPackageForm(formData);
  if ("error" in parsed) return { error: t("required") };

  const before = await getSubscriptionPackageById(id);
  if (!before) return { error: t("notFound") };

  try {
    await updateSubscriptionPackage(id, parsed);
  } catch {
    return { error: t("updateFailed") };
  }

  await logAction({
    userId: (await getCurrentUserId()) ?? "system",
    type: "info",
    category: "Settings",
    message: `Updated subscription package "${before.name}"`,
    dataFrom: toLoggable(before),
    dataTo: parsed,
  });

  revalidatePath("/settings/subscription-packages");
  return redirect({ href: "/settings/subscription-packages", locale: await getLocale() });
}

export async function deleteSubscriptionPackageAction(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== "Root") return;

  const pkg = await getSubscriptionPackageById(id);
  if (!pkg) return;

  await deleteSubscriptionPackage(id);

  await logAction({
    userId: (await getCurrentUserId()) ?? "system",
    type: "warning",
    category: "Settings",
    message: `Deleted subscription package "${pkg.name}"`,
    dataFrom: toLoggable(pkg),
  });

  revalidatePath("/settings/subscription-packages");
}
