// Celebration subdomain reservations — see docs/CELEBRATION-SUBDOMAINS.md.
//
// One document per (domain, label), holding every celebration's period for
// that label. Reserving is a single findOneAndUpdate+upsert whose filter only
// matches when no existing period overlaps the new one: on overlap the
// upsert tries to insert a duplicate (domain, label) and the unique index
// rejects it. So two concurrent reservations can never both win.
import { Collection, MongoServerError, ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import type { Celebration } from "./celebrations";
import { getProfessionalById } from "./professionals";
import { professionalPlan } from "./plans";
import {
  domainForType,
  isPeriodActive,
  reservationPeriod,
  type ReservationPeriod,
} from "./siteDomains";

export const SUBDOMAIN_RESERVATIONS_COLLECTION = "SubdomainReservations";

export interface SubdomainPeriod extends ReservationPeriod {
  celebrationId: string;
  createdBy: string;
  createdAt: Date;
}

export interface SubdomainReservationDoc {
  _id: ObjectId;
  domain: string;
  label: string;
  reservations: SubdomainPeriod[];
  createdAt: Date;
  updatedAt: Date;
}

// A celebration's own reservation, flattened for callers/UI.
export interface CelebrationSubdomain extends ReservationPeriod {
  domain: string;
  label: string;
}

async function collection(): Promise<Collection<SubdomainReservationDoc>> {
  const db = await getDb();
  return db.collection<SubdomainReservationDoc>(SUBDOMAIN_RESERVATIONS_COLLECTION);
}

export async function ensureSubdomainReservationIndexes(): Promise<void> {
  const col = await collection();
  await col.createIndex({ domain: 1, label: 1 }, { unique: true });
  await col.createIndex({ "reservations.celebrationId": 1 });
}

// ---------------------------------------------------------------------------
// Premium rule
// ---------------------------------------------------------------------------

// Premium-only feature. Today: the celebration's professional is Premium.
// Couple-level premium will be added here as a second condition.
export async function canReserveSubdomain(
  celebration: Pick<Celebration, "professionalId">
): Promise<boolean> {
  const professional = await getProfessionalById(celebration.professionalId);
  return !!professional && professionalPlan(professional) === "Premium";
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getCelebrationSubdomain(
  celebrationId: string
): Promise<CelebrationSubdomain | null> {
  const col = await collection();
  const doc = await col.findOne({ "reservations.celebrationId": celebrationId });
  const period = doc?.reservations.find((r) => r.celebrationId === celebrationId);
  if (!doc || !period) return null;
  return {
    domain: doc.domain,
    label: doc.label,
    startsAt: period.startsAt,
    endsAt: period.endsAt,
  };
}

// Filter matching a (domain, label) doc that has NO period overlapping
// `period`, ignoring `exceptCelebrationId`'s own period (for moves).
function freeFilter(domain: string, label: string, period: ReservationPeriod, exceptCelebrationId?: string) {
  return {
    domain,
    label,
    reservations: {
      $not: {
        $elemMatch: {
          startsAt: { $lt: period.endsAt },
          endsAt: { $gt: period.startsAt },
          ...(exceptCelebrationId ? { celebrationId: { $ne: exceptCelebrationId } } : {}),
        },
      },
    },
  };
}

export async function isSubdomainAvailable(
  domain: string,
  label: string,
  period: ReservationPeriod,
  exceptCelebrationId?: string
): Promise<boolean> {
  const col = await collection();
  const doc = await col.findOne({ domain, label });
  if (!doc) return true;
  return !doc.reservations.some(
    (r) =>
      r.celebrationId !== exceptCelebrationId &&
      r.startsAt < period.endsAt &&
      period.startsAt < r.endsAt
  );
}

// The celebration whose reservation for this host is active right now.
export async function findActiveCelebrationIdByHost(
  domain: string,
  label: string,
  at: Date = new Date()
): Promise<string | null> {
  const col = await collection();
  const doc = await col.findOne({ domain, label });
  return doc?.reservations.find((r) => isPeriodActive(r, at))?.celebrationId ?? null;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export type ReserveResult = { ok: true; subdomain: CelebrationSubdomain } | { ok: false; reason: "taken" };

function isDuplicateKey(err: unknown): boolean {
  return err instanceof MongoServerError && err.code === 11000;
}

// Atomically adds `celebrationId`'s period to (domain, label). Does not touch
// any other reservation the celebration may hold — see changeSubdomain().
async function addPeriod(
  domain: string,
  label: string,
  period: ReservationPeriod,
  celebrationId: string,
  createdBy: string
): Promise<boolean> {
  const col = await collection();
  const now = new Date();
  try {
    const res = await col.findOneAndUpdate(
      freeFilter(domain, label, period),
      {
        $push: { reservations: { celebrationId, createdBy, createdAt: now, ...period } },
        $set: { updatedAt: now },
        // domain/label come from the filter's equality fields on insert.
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, returnDocument: "after" }
    );
    return !!res;
  } catch (err) {
    if (isDuplicateKey(err)) return false;
    throw err;
  }
}

async function removePeriod(domain: string, label: string, celebrationId: string): Promise<void> {
  const col = await collection();
  await col.updateOne(
    { domain, label },
    { $pull: { reservations: { celebrationId } }, $set: { updatedAt: new Date() } }
  );
  // Drop label docs that no longer hold any period, to keep the collection tidy.
  await col.deleteOne({ domain, label, reservations: { $size: 0 } });
}

// Reserve or change a celebration's subdomain. The new label is reserved
// first and the old one released only afterwards, so a failed change keeps
// the current reservation.
export async function reserveSubdomain(
  celebration: Pick<Celebration, "_id" | "type" | "celebrationDate">,
  label: string,
  createdBy: string
): Promise<ReserveResult> {
  if (!celebration.celebrationDate) throw new Error("celebrationDate is required to reserve");
  const celebrationId = celebration._id.toString();
  const domain = domainForType(celebration.type);
  const period = reservationPeriod(celebration.celebrationDate);
  const current = await getCelebrationSubdomain(celebrationId);

  if (current && current.domain === domain && current.label === label) {
    return { ok: true, subdomain: current };
  }

  if (!(await addPeriod(domain, label, period, celebrationId, createdBy))) {
    return { ok: false, reason: "taken" };
  }
  if (current) await removePeriod(current.domain, current.label, celebrationId);

  return { ok: true, subdomain: { domain, label, ...period } };
}

export async function releaseSubdomain(celebrationId: string): Promise<CelebrationSubdomain | null> {
  const current = await getCelebrationSubdomain(celebrationId);
  if (current) await removePeriod(current.domain, current.label, celebrationId);
  return current;
}

export async function deleteCelebrationSubdomain(celebrationId: string): Promise<void> {
  await releaseSubdomain(celebrationId);
}

// When a celebration's date or type changes, its reservation must follow: new
// period (date) and/or new domain (type). Returns "clash" — and changes
// nothing — if the label isn't free for the new period/domain; the caller
// must then reject the date/type change (decision: user changes the
// subdomain first).
export type MoveResult = "none" | "unchanged" | "moved" | "clash";

export async function checkSubdomainMove(
  celebrationId: string,
  next: Pick<Celebration, "type" | "celebrationDate">
): Promise<{ result: MoveResult; current: CelebrationSubdomain | null }> {
  const current = await getCelebrationSubdomain(celebrationId);
  if (!current) return { result: "none", current };
  if (!next.celebrationDate) return { result: "clash", current }; // can't clear the date while reserved

  const domain = domainForType(next.type);
  const period = reservationPeriod(next.celebrationDate);
  if (
    domain === current.domain &&
    period.startsAt.getTime() === current.startsAt.getTime() &&
    period.endsAt.getTime() === current.endsAt.getTime()
  ) {
    return { result: "unchanged", current };
  }
  const free = await isSubdomainAvailable(domain, current.label, period, celebrationId);
  return { result: free ? "moved" : "clash", current };
}

// Applies a move previously validated with checkSubdomainMove(). Re-checks
// atomically; returns false if it lost a race (caller should report a clash).
export async function applySubdomainMove(
  celebrationId: string,
  next: Pick<Celebration, "type" | "celebrationDate">,
  createdBy: string
): Promise<boolean> {
  const current = await getCelebrationSubdomain(celebrationId);
  if (!current || !next.celebrationDate) return true;
  const domain = domainForType(next.type);
  const period = reservationPeriod(next.celebrationDate);

  if (domain === current.domain) {
    // Same label doc: replace our own period in place, only if nobody else
    // overlaps the new one.
    const col = await collection();
    const res = await col.updateOne(
      {
        $and: [
          freeFilter(domain, current.label, period, celebrationId),
          { "reservations.celebrationId": celebrationId },
        ],
      },
      {
        $set: {
          "reservations.$[mine].startsAt": period.startsAt,
          "reservations.$[mine].endsAt": period.endsAt,
          updatedAt: new Date(),
        },
      },
      { arrayFilters: [{ "mine.celebrationId": celebrationId }] }
    );
    return res.matchedCount === 1;
  }

  if (!(await addPeriod(domain, current.label, period, celebrationId, createdBy))) return false;
  await removePeriod(current.domain, current.label, celebrationId);
  return true;
}

// For the celebration update actions: call BEFORE saving a changed date/type.
// Moves the reservation to the new period/domain, or returns "clash" (nothing
// changed) so the action can reject the edit. If the celebration save then
// fails, call it again with the old values to move the reservation back.
export async function followCelebrationChange(
  celebrationId: string,
  title: string,
  next: Pick<Celebration, "type" | "celebrationDate">,
  actorId: string
): Promise<{ ok: true } | { ok: false; label: string }> {
  const { result, current } = await checkSubdomainMove(celebrationId, next);
  if (result === "none" || result === "unchanged") return { ok: true };
  if (result === "clash" || !(await applySubdomainMove(celebrationId, next, actorId))) {
    return { ok: false, label: current!.label };
  }

  const moved = await getCelebrationSubdomain(celebrationId);
  const { logAction } = await import("./logActions");
  await logAction({
    userId: actorId,
    type: "info",
    category: "Celebrations",
    message: `Moved subdomain of "${title}" to follow its new date/type`,
    dataFrom: current,
    dataTo: moved,
  });
  return { ok: true };
}
