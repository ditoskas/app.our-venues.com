import { randomBytes } from "node:crypto";
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

export async function seedRootUser(): Promise<SeededLogin | null> {
  const login = (password: string): SeededLogin => ({
    email: ROOT_SEED.username,
    password,
    role: "Root",
    name: ROOT_SEED.displayName,
  });

  if (await getUserByUsername(ROOT_SEED.username)) {
    // Never touch an existing Root user, and never claim to know its password.
    return login("(existing user — unchanged)");
  }

  let password = process.env.SEED_ROOT_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "SEED_ROOT_PASSWORD is not set — the Root user was NOT created. Set it and restart."
      );
      return null;
    }
    // Dev convenience: a one-off random password, shown once in the table.
    password = randomBytes(9).toString("base64url");
  }

  const user = await createUser({ ...ROOT_SEED, password });
  await logAction({
    userId: user._id.toString(),
    type: "info",
    category: "Security",
    message: `Seeded root user "${user.username}"`,
    dataTo: { username: user.username, role: user.role },
  });
  return login(process.env.SEED_ROOT_PASSWORD ? "(from SEED_ROOT_PASSWORD)" : password);
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
