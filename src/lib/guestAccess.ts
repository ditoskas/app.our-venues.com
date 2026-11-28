import { Collection } from "mongodb";
import { randomInt } from "node:crypto";
import { getDb } from "./mongodb";
import type { Celebration, GuestItem } from "./celebrations";
import { TWO_FACTOR_CODE_EXPIRATION_MINUTES } from "./twoFactorEmail";

export const GUEST_ACCESS_CODES_COLLECTION = "GuestAccessCodes";

// How long a requested code stays valid before it must be re-requested —
// independent of the guest session token's own expiry (see
// lib/guestSession.ts), which instead runs until the celebration's access
// window closes (celebrationDate + 1 day). Derived from
// TWO_FACTOR_CODE_EXPIRATION_MINUTES so the code's actual expiry and the
// "expires in 10 minutes" text in the delivered email can never drift apart.
const CODE_TTL_SECONDS = TWO_FACTOR_CODE_EXPIRATION_MINUTES * 60;

export const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface GuestAccessCode {
  celebrationId: string;
  guestId: string;
  contact: string;
  code: string;
  expiresAt: Date;
  createdAt: Date;
}

async function guestAccessCodesCollection(): Promise<Collection<GuestAccessCode>> {
  const db = await getDb();
  return db.collection<GuestAccessCode>(GUEST_ACCESS_CODES_COLLECTION);
}

// TTL index: Mongo auto-deletes a code once its own expiresAt passes, so an
// unused/expired code never needs manual cleanup. Also indexed by
// celebrationId+guestId, the lookup key every read/write below uses.
export async function ensureGuestAccessCodeIndexes(): Promise<void> {
  const col = await guestAccessCodesCollection();
  await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await col.createIndex({ celebrationId: 1, guestId: 1 });
}

// A celebration is "active" for guest 2FA purposes while the current time is
// still before the day after the event — the same window the issued guest
// session token itself expires at (see lib/guestSession.ts). A celebration
// with no celebrationDate set yet is never active.
export function isCelebrationActive(celebration: Celebration): boolean {
  if (!celebration.celebrationDate) return false;
  return Date.now() < celebration.celebrationDate.getTime() + ONE_DAY_MS;
}

// Same phone-exact/email-case-insensitive match GET
// /api/public/reservations/confirm uses (see that route) — collapsed to a
// single `contact` field standing in for either, per PUBLIC-API.md.
export function findGuestByContact(
  celebration: Celebration,
  contact: string
): GuestItem | undefined {
  return (celebration.guests ?? []).find(
    (g) => g.phone === contact || g.email?.toLowerCase() === contact.toLowerCase()
  );
}

function generateSixDigitCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

// Generates and stores a fresh code for this guest, replacing any code
// requested earlier (upsert on celebrationId+guestId — only the most
// recently requested code is ever valid). Always returned to the caller —
// the route (app/api/public/access/confirm/route.ts) only echoes it back
// in the response when it couldn't deliver it by email (i.e. a phone
// contact, where there's still no SMS integration); for an email contact
// it's sent via sendTwoFactorCodeEmail() (lib/twoFactorEmail.ts) instead
// and withheld from the response. See PUBLIC-API.md.
export async function createGuestAccessCode(
  celebrationId: string,
  guestId: string,
  contact: string
): Promise<string> {
  const code = generateSixDigitCode();
  const col = await guestAccessCodesCollection();
  await col.updateOne(
    { celebrationId, guestId },
    {
      $set: {
        celebrationId,
        guestId,
        contact,
        code,
        expiresAt: new Date(Date.now() + CODE_TTL_SECONDS * 1000),
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
  return code;
}

// Single-use: a matching, unexpired code is deleted immediately on success
// so it can't be replayed.
export async function consumeGuestAccessCode(
  celebrationId: string,
  guestId: string,
  code: string
): Promise<boolean> {
  const col = await guestAccessCodesCollection();
  const deleted = await col.findOneAndDelete({
    celebrationId,
    guestId,
    code,
    expiresAt: { $gt: new Date() },
  });
  return deleted !== null;
}
