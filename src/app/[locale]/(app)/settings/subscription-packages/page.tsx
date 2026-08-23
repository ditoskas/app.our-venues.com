import { listSubscriptionPackages } from "@/lib/subscriptionPackages";
import { requirePageRole } from "@/lib/auth";
import SubscriptionPackagesManager, {
  type SerializedSubscriptionPackage,
} from "./SubscriptionPackagesManager";

export const dynamic = "force-dynamic";

export default async function SubscriptionPackagesPage() {
  await requirePageRole(["Root"]);

  const packages = await listSubscriptionPackages();
  const serialized: SerializedSubscriptionPackage[] = packages.map((p) => ({
    _id: p._id.toString(),
    name: p.name,
    description: p.description,
    maxUsers: p.maxUsers,
    maxBronzeMarriages: p.maxBronzeMarriages,
    maxSilverMarriages: p.maxSilverMarriages,
    maxGoldMarriages: p.maxGoldMarriages,
  }));

  return <SubscriptionPackagesManager packages={serialized} />;
}
