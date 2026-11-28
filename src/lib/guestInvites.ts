// Personal guest invitations — server side. Every write here is an atomic,
// per-guest update (arrayFilters), never a read-modify-write of the whole
// guests array, so it can't collide with a guest being edited or an RSVP
// arriving at the same time.
import { randomBytes } from "node:crypto";
import { Collection, ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import type { Celebration, GuestItem, InviteChannel, LocalizedText } from "./celebrations";

async function celebrations(): Promise<Collection<Celebration>> {
  const db = await getDb();
  return db.collection<Celebration>("Celebrations");
}

// 128 random bits, URL-safe — the guest's personal link is their credential.
export function newInviteToken(): string {
  return randomBytes(16).toString("base64url");
}

// Gives every guest without one an invite token. Only sets it where it's
// still missing, so two concurrent calls can't overwrite each other's token.
// Returns the guests with their tokens.
export async function ensureInviteTokens(celebration: Celebration): Promise<GuestItem[]> {
  const guests = celebration.guests ?? [];
  const missing = guests.filter((g) => !g.inviteToken);
  if (missing.length === 0) return guests;

  const col = await celebrations();
  for (const guest of missing) {
    await col.updateOne(
      { _id: celebration._id },
      { $set: { "guests.$[g].inviteToken": newInviteToken() } },
      { arrayFilters: [{ "g.id": guest.id, "g.inviteToken": { $exists: false } }] }
    );
  }
  const fresh = await col.findOne({ _id: celebration._id }, { projection: { guests: 1 } });
  return fresh?.guests ?? guests;
}

// A new token invalidates the old personal link (e.g. it was forwarded).
export async function regenerateInviteToken(celebrationId: string, guestId: string): Promise<string> {
  const token = newInviteToken();
  const col = await celebrations();
  await col.updateOne(
    { _id: new ObjectId(celebrationId) },
    { $set: { "guests.$[g].inviteToken": token } },
    { arrayFilters: [{ "g.id": guestId }] }
  );
  return token;
}

export async function recordInviteSent(celebrationId: string, guestId: string, via: InviteChannel): Promise<void> {
  const col = await celebrations();
  await col.updateOne(
    { _id: new ObjectId(celebrationId) },
    {
      $set: { "guests.$[g].invitedAt": new Date(), "guests.$[g].invitedVia": via },
      $inc: { "guests.$[g].inviteCount": 1 },
    },
    { arrayFilters: [{ "g.id": guestId }] }
  );
}

// Only the first open is recorded. Returns true if this was it.
export async function recordInviteOpened(celebrationId: string, guestId: string): Promise<boolean> {
  const col = await celebrations();
  const res = await col.updateOne(
    { _id: new ObjectId(celebrationId) },
    { $set: { "guests.$[g].inviteOpenedAt": new Date() } },
    { arrayFilters: [{ "g.id": guestId, "g.inviteOpenedAt": { $exists: false } }] }
  );
  return res.modifiedCount === 1;
}

export function findGuestByInviteToken(celebration: Pick<Celebration, "guests">, token: string): GuestItem | null {
  if (!token) return null;
  return (celebration.guests ?? []).find((g) => g.inviteToken === token) ?? null;
}

export async function setInvitationMessage(celebrationId: string, message: LocalizedText | undefined): Promise<void> {
  const col = await celebrations();
  await col.updateOne(
    { _id: new ObjectId(celebrationId) },
    message ? { $set: { invitationMessage: message } } : { $unset: { invitationMessage: "" } }
  );
}
