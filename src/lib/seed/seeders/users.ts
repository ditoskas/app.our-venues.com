import { ObjectId } from "mongodb";
import { routing } from "@/i18n/routing";
import { logAction } from "../../logActions";
import { getCelebrationById } from "../../celebrations";
import {
  createUser,
  getUserByUsername,
  updateUser,
  PROFESSIONAL_USER_PASSWORD,
} from "../../users";
import { ROOT_SEED } from "../data/root";
import type { SeededLogin, SpouseSeed } from "../types";

// Every seeded non-Root login uses this one password. It's the same constant
// the app uses for auto-provisioned Professional/Couple logins.
export const SEED_USER_PASSWORD = PROFESSIONAL_USER_PASSWORD;

export async function seedRootUser(): Promise<SeededLogin> {
  const existing = await getUserByUsername(ROOT_SEED.username);
  if (!existing) {
    const user = await createUser(ROOT_SEED);
    await logAction({
      userId: user._id.toString(),
      type: "info",
      category: "Security",
      message: `Seeded root user "${user.username}"`,
      dataTo: { username: user.username, role: user.role },
    });
  }
  return {
    email: ROOT_SEED.username,
    password: ROOT_SEED.password,
    role: "Root",
    name: ROOT_SEED.displayName,
  };
}

export async function seedProfessionalUser(
  professionalId: string,
  companyName: string,
  email: string
): Promise<SeededLogin> {
  const existing = await getUserByUsername(email);
  if (!existing) {
    const user = await createUser({
      displayName: companyName,
      username: email,
      password: SEED_USER_PASSWORD,
      role: "Professional",
      professionalId,
      defaultLocale: routing.defaultLocale,
    });
    await logAction({
      userId: "system",
      type: "info",
      category: "Security",
      message: `Seeded user account for professional "${companyName}"`,
      dataTo: { username: user.username, role: user.role },
    });
  }
  return { email, password: SEED_USER_PASSWORD, role: "Professional", name: companyName };
}

// Creates the spouse's Couple login if missing. If it exists but points at a
// celebration that no longer exists (deleted and re-seeded), it's re-linked;
// a link to a celebration that still exists is never touched.
export async function seedSpouseUser(
  coupleId: string,
  spouse: SpouseSeed
): Promise<SeededLogin | null> {
  if (!spouse.email) return null;
  const displayName = `${spouse.firstName} ${spouse.lastName}`;
  const login: SeededLogin = {
    email: spouse.email,
    password: SEED_USER_PASSWORD,
    role: "Couple",
    name: displayName,
  };

  const existing = await getUserByUsername(spouse.email);
  if (existing) {
    if (existing.role !== "Couple" || existing.coupleId === coupleId) return login;
    const linked =
      existing.coupleId && ObjectId.isValid(existing.coupleId)
        ? await getCelebrationById(existing.coupleId)
        : null;
    if (linked) return login;

    await updateUser(existing._id.toString(), {
      displayName: existing.displayName,
      username: existing.username,
      role: "Couple",
      coupleId,
      defaultLocale: existing.defaultLocale ?? routing.defaultLocale,
    });
    await logAction({
      userId: "system",
      type: "warning",
      category: "Security",
      message: `Re-linked seeded user "${existing.username}" to its celebration (old link was dangling)`,
      dataFrom: { coupleId: existing.coupleId },
      dataTo: { coupleId },
    });
    return login;
  }

  const user = await createUser({
    displayName,
    username: spouse.email,
    password: SEED_USER_PASSWORD,
    role: "Couple",
    coupleId,
    defaultLocale: routing.defaultLocale,
  });
  await logAction({
    userId: "system",
    type: "info",
    category: "Security",
    message: `Seeded user account for "${user.displayName}"`,
    dataTo: { username: user.username, role: user.role, coupleId },
  });
  return login;
}
