import { Collection, ObjectId } from "mongodb";
import { getDb } from "./mongodb";

export const SUBSCRIPTION_PACKAGES_COLLECTION = "SubscriptionPackages";

export interface SubscriptionPackage {
  _id: ObjectId;
  name: string;
  description: string;
  maxUsers: number;
  maxBronzeMarriages: number;
  maxSilverMarriages: number;
  maxGoldMarriages: number;
  createdAt: Date;
}

export interface SubscriptionPackageInput {
  name: string;
  description: string;
  maxUsers: number;
  maxBronzeMarriages: number;
  maxSilverMarriages: number;
  maxGoldMarriages: number;
}

async function subscriptionPackagesCollection(): Promise<
  Collection<SubscriptionPackage>
> {
  const db = await getDb();
  return db.collection<SubscriptionPackage>(SUBSCRIPTION_PACKAGES_COLLECTION);
}

export async function listSubscriptionPackages(): Promise<SubscriptionPackage[]> {
  const col = await subscriptionPackagesCollection();
  return col.find().sort({ maxUsers: 1 }).toArray();
}

export async function getSubscriptionPackageById(
  id: string
): Promise<SubscriptionPackage | null> {
  const col = await subscriptionPackagesCollection();
  return col.findOne({ _id: new ObjectId(id) });
}

export async function getSubscriptionPackageByName(
  name: string
): Promise<SubscriptionPackage | null> {
  const col = await subscriptionPackagesCollection();
  return col.findOne({ name });
}

export async function createSubscriptionPackage(
  input: SubscriptionPackageInput
): Promise<SubscriptionPackage> {
  const doc: Omit<SubscriptionPackage, "_id"> = {
    ...input,
    createdAt: new Date(),
  };
  const col = await subscriptionPackagesCollection();
  const result = await col.insertOne(doc as SubscriptionPackage);
  return { ...doc, _id: result.insertedId } as SubscriptionPackage;
}

export async function updateSubscriptionPackage(
  id: string,
  input: SubscriptionPackageInput
): Promise<void> {
  const col = await subscriptionPackagesCollection();
  await col.updateOne({ _id: new ObjectId(id) }, { $set: input });
}

export async function deleteSubscriptionPackage(id: string): Promise<void> {
  const col = await subscriptionPackagesCollection();
  await col.deleteOne({ _id: new ObjectId(id) });
}
