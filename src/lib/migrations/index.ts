// Data migrations: ordered, run-once changes to existing data (the seeder
// only ever creates what's missing, so it can't fix records that already
// exist). Run at every server boot right after the seeders
// (instrumentation.ts); each one runs once per database and is recorded in
// the `Migrations` collection.
//
// Adding one: create `lib/migrations/<YYYYMMDD>-<NN>-<slug>.ts` exporting a
// `Migration`, append it to MIGRATIONS below (never reorder or rename applied
// ones), and write `up` so it's safe on any database — match records by
// natural keys (titles, names, emails) and skip quietly when they don't exist,
// since production data may differ from the seed.
import type { Db } from "mongodb";
import { MongoServerError } from "mongodb";
import { getDb } from "../mongodb";
import { logAction } from "../logActions";
import { seedGuestPhones } from "./20261128-01-seed-guest-phones";
import { testGuestDimitris } from "./20261128-02-test-guest-dimitris";
import { seatingDemo } from "./20261128-03-seating-demo";

export interface Migration {
  id: string; // unique and stable — it's the record's _id
  description: string;
  // Returns a short human summary of what changed (stored + logged).
  up(db: Db): Promise<string>;
}

export const MIGRATIONS: Migration[] = [seedGuestPhones, testGuestDimitris, seatingDemo];

interface MigrationRecord {
  _id: string;
  description: string;
  status: "running" | "done";
  startedAt: Date;
  finishedAt?: Date;
  result?: string;
}

export async function runMigrations(): Promise<void> {
  const db = await getDb();
  const col = db.collection<MigrationRecord>("Migrations");

  for (const migration of MIGRATIONS) {
    // Claim it: inserting the record first means two processes booting at the
    // same time can't both run it (the second gets a duplicate key).
    try {
      await col.insertOne({
        _id: migration.id,
        description: migration.description,
        status: "running",
        startedAt: new Date(),
      });
    } catch (err) {
      if (err instanceof MongoServerError && err.code === 11000) continue; // done or in progress
      throw err;
    }

    try {
      const result = await migration.up(db);
      await col.updateOne(
        { _id: migration.id },
        { $set: { status: "done", finishedAt: new Date(), result } }
      );
      await logAction({
        userId: "system",
        type: "info",
        category: "Settings",
        message: `Migration ${migration.id}: ${result}`,
      });
      console.log(`Migration ${migration.id} applied: ${result}`);
    } catch (err) {
      // Release the claim so it's retried on the next boot, then stop: later
      // migrations may depend on this one.
      await col.deleteOne({ _id: migration.id });
      throw err;
    }
  }
}
