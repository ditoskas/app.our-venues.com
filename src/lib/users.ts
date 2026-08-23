import { Collection, ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { getDb } from "./mongodb";
import type { AppLocale } from "@/i18n/routing";

export const USERS_COLLECTION = "Users";

// Default login password for the user account auto-created alongside a new
// Professional. Same value used by both the create action and the seeder.
export const PROFESSIONAL_USER_PASSWORD = "Test123456!";

export type Role = "Root" | "Professional" | "Couple";

export interface User {
  _id: ObjectId;
  displayName: string;
  username: string;
  passwordHash: string;
  role: Role;
  professionalId?: string;
  coupleId?: string;
  defaultLocale: AppLocale;
  createdAt: Date;
}

export interface CreateUserInput {
  displayName: string;
  username: string;
  password: string;
  role: Role;
  professionalId?: string;
  coupleId?: string;
  defaultLocale: AppLocale;
}

export interface UpdateUserInput {
  displayName: string;
  username: string;
  password?: string;
  role: Role;
  professionalId?: string;
  coupleId?: string;
  defaultLocale: AppLocale;
}

export interface UpdateProfileInput {
  displayName: string;
  defaultLocale: AppLocale;
}

async function usersCollection(): Promise<Collection<User>> {
  const db = await getDb();
  return db.collection<User>(USERS_COLLECTION);
}

export async function ensureUserIndexes(): Promise<void> {
  const col = await usersCollection();
  await col.createIndex({ username: 1 }, { unique: true });
}

export async function listUsers(): Promise<User[]> {
  const col = await usersCollection();
  return col.find().sort({ createdAt: -1 }).toArray();
}

export async function getUserById(id: string): Promise<User | null> {
  const col = await usersCollection();
  return col.findOne({ _id: new ObjectId(id) });
}

export async function getUserByUsername(username: string): Promise<User | null> {
  const col = await usersCollection();
  return col.findOne({ username });
}

export async function getUserByProfessionalId(professionalId: string): Promise<User | null> {
  const col = await usersCollection();
  return col.findOne({ professionalId });
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const passwordHash = await bcrypt.hash(input.password, 10);
  const doc: Omit<User, "_id"> = {
    displayName: input.displayName,
    username: input.username,
    passwordHash,
    role: input.role,
    defaultLocale: input.defaultLocale,
    createdAt: new Date(),
    ...(input.role === "Professional" && input.professionalId
      ? { professionalId: input.professionalId }
      : {}),
    ...(input.role === "Couple" && input.coupleId
      ? { coupleId: input.coupleId }
      : {}),
  };
  const col = await usersCollection();
  const result = await col.insertOne(doc as User);
  return { ...doc, _id: result.insertedId } as User;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<void> {
  const set: Partial<User> = {
    displayName: input.displayName,
    username: input.username,
    role: input.role,
    defaultLocale: input.defaultLocale,
  };
  const unset: Partial<Record<"professionalId" | "coupleId", "">> = {};

  if (input.role === "Professional" && input.professionalId) {
    set.professionalId = input.professionalId;
  } else {
    unset.professionalId = "";
  }

  if (input.role === "Couple" && input.coupleId) {
    set.coupleId = input.coupleId;
  } else {
    unset.coupleId = "";
  }

  if (input.password) {
    set.passwordHash = await bcrypt.hash(input.password, 10);
  }

  const col = await usersCollection();
  await col.updateOne(
    { _id: new ObjectId(id) },
    Object.keys(unset).length ? { $set: set, $unset: unset } : { $set: set }
  );
}

export async function deleteUser(id: string): Promise<void> {
  const col = await usersCollection();
  await col.deleteOne({ _id: new ObjectId(id) });
}

export async function updateProfile(id: string, input: UpdateProfileInput): Promise<void> {
  const col = await usersCollection();
  await col.updateOne(
    { _id: new ObjectId(id) },
    { $set: { displayName: input.displayName, defaultLocale: input.defaultLocale } }
  );
}

export async function changePassword(id: string, newPassword: string): Promise<void> {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const col = await usersCollection();
  await col.updateOne({ _id: new ObjectId(id) }, { $set: { passwordHash } });
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
