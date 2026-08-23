import path from "node:path";
import {
  ensureUserIndexes,
  createUser,
  getUserByUsername,
  PROFESSIONAL_USER_PASSWORD,
} from "./users";
import {
  createProfessional,
  listProfessionals,
  setProfessionalLogo,
} from "./professionals";
import { saveProfessionalLogoFromPath } from "./uploads";
import {
  createSubscriptionPackage,
  getSubscriptionPackageByName,
} from "./subscriptionPackages";
import { createMarriage, listMarriages } from "./marriages";
import { logAction } from "./logActions";
import { routing } from "@/i18n/routing";

const ROOT_SEED = {
  displayName: "Dimitris Toskas",
  username: "ditoskas@gmail.com",
  password: "2521020995",
  role: "Root" as const,
  defaultLocale: "el" as const,
};

const TEST_PROFESSIONAL_SEED = {
  companyName: "Test Company",
  contactPerson: "Test Person",
  phone: "0123456789",
  mobile: "9876543210",
  email: "test@o-gamos-mas.com",
};

const TEST_PROFESSIONAL_LOGO = path.join(
  process.cwd(),
  "assets",
  "seed",
  "test-company-logo.png"
);

const TEST_MARRIAGE_SEED = {
  title: "Dimitris & Maria Marriage",
  husband: {
    firstName: "Dimitris",
    lastName: "Toskas",
    mobile: "6938699188",
    email: "dimitris-husband@o-gamos-mas.com",
  },
  wife: {
    firstName: "Maria",
    lastName: "Test",
    mobile: "99138271",
    email: "maria-wife@o-gamos-mas.com",
  },
};

const SUBSCRIPTION_PACKAGE_SEEDS = [
  {
    name: "Free",
    description: "Free subscription",
    maxUsers: 1,
    maxBronzeMarriages: 5,
    maxSilverMarriages: 3,
    maxGoldMarriages: 2,
  },
  {
    name: "Basic",
    description: "Basic Subscription",
    maxUsers: 2,
    maxBronzeMarriages: 30,
    maxSilverMarriages: 15,
    maxGoldMarriages: 5,
  },
];

async function seedRootUser(): Promise<void> {
  const existing = await getUserByUsername(ROOT_SEED.username);
  if (existing) return;

  const user = await createUser(ROOT_SEED);
  await logAction({
    userId: user._id.toString(),
    type: "info",
    category: "Security",
    message: `Seeded root user "${user.username}"`,
    dataTo: { username: user.username, role: user.role },
  });
}

// Returns the seeded (or already-existing) Test Company professional's id,
// so seedTestMarriage() can link to it without a second lookup.
async function seedTestProfessional(): Promise<string> {
  const existing = await listProfessionals();
  const existingMatch = existing.find(
    (p) => p.companyName === TEST_PROFESSIONAL_SEED.companyName
  );
  if (existingMatch) {
    return existingMatch._id.toString();
  }

  const professional = await createProfessional(TEST_PROFESSIONAL_SEED);
  const filename = await saveProfessionalLogoFromPath(
    professional._id.toString(),
    TEST_PROFESSIONAL_LOGO
  );
  await setProfessionalLogo(professional._id.toString(), filename);

  await logAction({
    userId: "system",
    type: "info",
    category: "Professionals",
    message: `Seeded professional "${professional.companyName}"`,
    dataTo: { ...TEST_PROFESSIONAL_SEED, logoFilename: filename },
  });

  const existingUser = await getUserByUsername(TEST_PROFESSIONAL_SEED.email);
  if (!existingUser) {
    const user = await createUser({
      displayName: TEST_PROFESSIONAL_SEED.companyName,
      username: TEST_PROFESSIONAL_SEED.email,
      password: PROFESSIONAL_USER_PASSWORD,
      role: "Professional",
      professionalId: professional._id.toString(),
      defaultLocale: routing.defaultLocale,
    });
    await logAction({
      userId: "system",
      type: "info",
      category: "Security",
      message: `Seeded user account for professional "${professional.companyName}"`,
      dataTo: { username: user.username, role: user.role },
    });
  }

  return professional._id.toString();
}

async function seedSpouseUser(
  coupleId: string,
  spouse: { firstName: string; lastName: string; email: string }
): Promise<void> {
  const existing = await getUserByUsername(spouse.email);
  if (existing) return;

  const user = await createUser({
    displayName: `${spouse.firstName} ${spouse.lastName}`,
    username: spouse.email,
    password: PROFESSIONAL_USER_PASSWORD,
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
}

async function seedTestMarriage(professionalId: string): Promise<void> {
  const existing = await listMarriages();
  if (existing.some((m) => m.title === TEST_MARRIAGE_SEED.title)) {
    return;
  }

  const marriage = await createMarriage({ ...TEST_MARRIAGE_SEED, professionalId });
  await logAction({
    userId: "system",
    type: "info",
    category: "Weddings",
    message: `Seeded marriage "${marriage.title}"`,
    dataTo: { ...TEST_MARRIAGE_SEED, professionalId },
  });

  const coupleId = marriage._id.toString();
  await seedSpouseUser(coupleId, TEST_MARRIAGE_SEED.husband);
  await seedSpouseUser(coupleId, TEST_MARRIAGE_SEED.wife);
}

async function seedSubscriptionPackages(): Promise<void> {
  for (const seed of SUBSCRIPTION_PACKAGE_SEEDS) {
    const existing = await getSubscriptionPackageByName(seed.name);
    if (existing) continue;

    const pkg = await createSubscriptionPackage(seed);
    await logAction({
      userId: "system",
      type: "info",
      category: "Settings",
      message: `Seeded subscription package "${pkg.name}"`,
      dataTo: seed,
    });
  }
}

export async function runSeeders(): Promise<void> {
  await ensureUserIndexes();
  await seedRootUser();
  const testProfessionalId = await seedTestProfessional();
  await seedTestMarriage(testProfessionalId);
  await seedSubscriptionPackages();
}
