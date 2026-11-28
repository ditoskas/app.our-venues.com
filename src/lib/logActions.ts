import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";

export const LOG_ACTIONS_COLLECTION = "LogActions";

export type LogActionType = "info" | "success" | "warning" | "error";

export type LogActionCategory =
  | "Security"
  | "Celebrations"
  | "Professionals"
  | "Couples"
  | "Story"
  | "Events"
  | "Guests"
  | "Settings";

export interface LogAction {
  _id: ObjectId;
  userId: string;
  type: LogActionType;
  category: LogActionCategory;
  message: string;
  dataFrom?: unknown;
  dataTo?: unknown;
  // Set automatically when a Root user performed this while "acting as"
  // `userId` — the real (Root) user's id, so the audit trail stays honest.
  actingAsBy?: string;
  createdAt: Date;
}

export type LogActionInput = Omit<LogAction, "_id" | "createdAt" | "actingAsBy">;

// Outside a request (e.g. the boot-time seeder) there are no cookies — that's
// just "not acting as anyone", never an error.
async function currentActingAsBy(): Promise<string | undefined> {
  try {
    const { resolveSession } = await import("./auth");
    const session = await resolveSession();
    return session?.isActingAs ? session.realUser._id.toString() : undefined;
  } catch {
    return undefined;
  }
}

// Every action that writes data or is security-sensitive must call this — see CLAUDE.md "Action logging".
export async function logAction(entry: LogActionInput): Promise<void> {
  const db = await getDb();
  const actingAsBy = await currentActingAsBy();
  await db.collection<LogAction>(LOG_ACTIONS_COLLECTION).insertOne({
    ...entry,
    ...(actingAsBy ? { actingAsBy } : {}),
    createdAt: new Date(),
  } as LogAction);
}

export async function listLogActions(limit = 200): Promise<LogAction[]> {
  const db = await getDb();
  return db
    .collection<LogAction>(LOG_ACTIONS_COLLECTION)
    .find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}
