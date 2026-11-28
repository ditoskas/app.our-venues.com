// runSeeders() — idempotent demo data, run at every server boot from
// src/instrumentation.ts. Never deletes anything: each record is matched by a
// natural key (username / companyName / celebration title / package name)
// and only created when missing. To start over, run `npm run seed:reset`
// (scripts/seed-reset.mjs) and restart the server.
//
// What gets seeded:
//   - Root user
//   - 1 Professional (+ its login) owning 3 fully-populated celebrations:
//       * "Dimitris & Maria Marriage"  — showcase wedding, both spouses get
//                                         Couple logins
//       * "Nikos & Eleni Wedding"      — public site on, no logins
//       * "Christening of Alexandros"  — the Christening type, no logins
//   - 2 subscription packages
// Every non-Root login shares SEED_USER_PASSWORD; the Root password comes from
// the SEED_ROOT_PASSWORD env var (never from code — the repo is public).
// The credentials table is printed at the end (outside production) and
// mirrored in README.md.
import { ensureUserIndexes } from "../users";
import { ensureCelebrationIndexes } from "../celebrations";
import { PROFESSIONAL_SEED } from "./data/professional";
import { WEDDING_DIMITRIS_MARIA } from "./data/celebrations/weddingDimitrisMaria";
import { WEDDING_NIKOS_ELENI } from "./data/celebrations/weddingNikosEleni";
import { CHRISTENING_ALEXANDROS } from "./data/celebrations/christeningAlexandros";
import { seedProfessional } from "./seeders/professional";
import { seedProfessionalUser, seedRootUser } from "./seeders/users";
import { seedCelebration } from "./seeders/celebration";
import { seedSubscriptionPackages } from "./seeders/subscriptionPackages";
import type { SeededLogin } from "./types";

export { SEED_USER_PASSWORD } from "./seeders/users";

const CELEBRATION_SEEDS = [WEDDING_DIMITRIS_MARIA, WEDDING_NIKOS_ELENI, CHRISTENING_ALEXANDROS];

export async function runSeeders(): Promise<void> {
  await ensureUserIndexes();
  await ensureCelebrationIndexes();

  const logins: SeededLogin[] = [];
  const root = await seedRootUser();
  if (root) logins.push(root);

  const professionalId = await seedProfessional(PROFESSIONAL_SEED);
  logins.push(
    await seedProfessionalUser(professionalId, PROFESSIONAL_SEED.companyName, PROFESSIONAL_SEED.email)
  );

  for (const seed of CELEBRATION_SEEDS) {
    logins.push(...(await seedCelebration(professionalId, seed)));
  }

  await seedSubscriptionPackages();

  // Credentials in logs are a dev convenience only.
  if (process.env.NODE_ENV !== "production") {
    console.log("\nSeeded logins:");
    console.table(
      logins.map(({ email, password, role, name }) => ({ Email: email, Password: password, Role: role, Name: name }))
    );
  }
}
