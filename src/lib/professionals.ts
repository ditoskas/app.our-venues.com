import { Collection, ObjectId } from "mongodb";
import { getDb } from "./mongodb";

export const PROFESSIONALS_COLLECTION = "Professionals";

const OPTIONAL_FIELDS = ["website", "country", "city", "address", "postCode"] as const;
type OptionalField = (typeof OPTIONAL_FIELDS)[number];

export interface Professional {
  _id: ObjectId;
  companyName: string;
  contactPerson: string;
  phone: string;
  mobile: string;
  email: string;
  website?: string;
  country?: string;
  city?: string;
  address?: string;
  postCode?: string;
  logoFilename?: string;
  createdAt: Date;
}

export interface ProfessionalInput {
  companyName: string;
  contactPerson: string;
  phone: string;
  mobile: string;
  email: string;
  website?: string;
  country?: string;
  city?: string;
  address?: string;
  postCode?: string;
}

async function professionalsCollection(): Promise<Collection<Professional>> {
  const db = await getDb();
  return db.collection<Professional>(PROFESSIONALS_COLLECTION);
}

export async function listProfessionals(): Promise<Professional[]> {
  const col = await professionalsCollection();
  return col.find().sort({ companyName: 1 }).toArray();
}

export async function getProfessionalById(id: string): Promise<Professional | null> {
  const col = await professionalsCollection();
  return col.findOne({ _id: new ObjectId(id) });
}

export async function createProfessional(
  input: ProfessionalInput
): Promise<Professional> {
  const doc: Omit<Professional, "_id"> = { ...input, createdAt: new Date() };
  const col = await professionalsCollection();
  const result = await col.insertOne(doc as Professional);
  return { ...doc, _id: result.insertedId } as Professional;
}

export async function updateProfessional(
  id: string,
  input: ProfessionalInput
): Promise<void> {
  const set: Partial<Professional> = {
    companyName: input.companyName,
    contactPerson: input.contactPerson,
    phone: input.phone,
    mobile: input.mobile,
    email: input.email,
  };
  const unset: Partial<Record<OptionalField, "">> = {};

  for (const field of OPTIONAL_FIELDS) {
    const value = input[field];
    if (value) {
      set[field] = value;
    } else {
      unset[field] = "";
    }
  }

  const col = await professionalsCollection();
  await col.updateOne(
    { _id: new ObjectId(id) },
    Object.keys(unset).length ? { $set: set, $unset: unset } : { $set: set }
  );
}

export async function setProfessionalLogo(id: string, filename: string): Promise<void> {
  const col = await professionalsCollection();
  await col.updateOne({ _id: new ObjectId(id) }, { $set: { logoFilename: filename } });
}

export async function deleteProfessional(id: string): Promise<void> {
  const col = await professionalsCollection();
  await col.deleteOne({ _id: new ObjectId(id) });
}
