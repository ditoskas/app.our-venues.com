import { logAction } from "../../logActions";
import { createSubscriptionPackage, getSubscriptionPackageByName } from "../../subscriptionPackages";
import { SUBSCRIPTION_PACKAGE_SEEDS } from "../data/subscriptionPackages";

export async function seedSubscriptionPackages(): Promise<void> {
  for (const seed of SUBSCRIPTION_PACKAGE_SEEDS) {
    if (await getSubscriptionPackageByName(seed.name)) continue;

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
