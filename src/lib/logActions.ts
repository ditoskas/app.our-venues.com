import { ObjectId } from "mongodb";
import { getDb } from "./mongodb";

export const LOG_ACTIONS_COLLECTION = "LogActions";

export type LogActionType = "info" | "success" | "warning" | "error";

export type LogActionCategory =
  | "Security"
  | "Weddings"
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
  createdAt: Date;
}

export type LogActionInput = Omit<LogAction, "_id" | "createdAt">;

// Every action that writes data or is security-sensitive must call this — see CLAUDE.md "Action logging".
export async function logAction(entry: LogActionInput): Promise<void> {
  const db = await getDb();
  await db.collection<LogAction>(LOG_ACTIONS_COLLECTION).insertOne({
    ...entry,
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
