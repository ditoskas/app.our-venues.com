import { Collection, ObjectId } from "mongodb";
import { getDb } from "./mongodb";

export const MARRIAGES_COLLECTION = "Marriages";

export interface Spouse {
  firstName: string;
  lastName: string;
  email?: string;
  mobile?: string;
}

export interface Marriage {
  _id: ObjectId;
  title: string;
  professionalId: string;
  husband: Spouse;
  wife: Spouse;
  createdAt: Date;
}

export interface MarriageInput {
  title: string;
  professionalId: string;
  husband: Spouse;
  wife: Spouse;
}

async function marriagesCollection(): Promise<Collection<Marriage>> {
  const db = await getDb();
  return db.collection<Marriage>(MARRIAGES_COLLECTION);
}

export async function listMarriages(): Promise<Marriage[]> {
  const col = await marriagesCollection();
  return col.find().sort({ title: 1 }).toArray();
}

export async function getMarriageById(id: string): Promise<Marriage | null> {
  const col = await marriagesCollection();
  return col.findOne({ _id: new ObjectId(id) });
}

export async function createMarriage(input: MarriageInput): Promise<Marriage> {
  const doc: Omit<Marriage, "_id"> = { ...input, createdAt: new Date() };
  const col = await marriagesCollection();
  const result = await col.insertOne(doc as Marriage);
  return { ...doc, _id: result.insertedId } as Marriage;
}

export async function updateMarriage(id: string, input: MarriageInput): Promise<void> {
  const col = await marriagesCollection();
  await col.updateOne({ _id: new ObjectId(id) }, { $set: input });
}

export async function deleteMarriage(id: string): Promise<void> {
  const col = await marriagesCollection();
  await col.deleteOne({ _id: new ObjectId(id) });
}
