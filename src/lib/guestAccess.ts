// Guest identity for the public site (PUBLIC-API.md → access/confirm and
// POST /api/public/live-events): a visitor proves they're one of a
// celebration's guests by contact (phone/email) + a one-time code, and gets
// a signed guest token for guest-only actions (uploading Live Events photos).
//
// There's no email/SMS delivery yet: the code is returned by step 1 itself and
// the frontend shows it. That makes this a convenience gate, not strong
// identity — anyone who knows a guest's phone/email can sign in as them. When
// delivery exists, stop returning the code (see issueAccessCode()).
import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { Collection, ObjectId } from "mongodb";
import { getDb } from "./mongodb";
import type { Celebration, GuestItem } from "./celebrations";
import { samePhone } from "./invitationMessage";

export const GUEST_ACCESS_CODES_COLLECTION = "GuestAccessCodes";
const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

interface GuestAccessCode {
  _id: ObjectId;
  celebrationId: string;
  guestId: string;
  codeHash: string;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

async function codesCollection(): Promise<Collection<GuestAccessCode>> {
  const db = await getDb();
  return db.collection<GuestAccessCode>(GUEST_ACCESS_CODES_COLLECTION);
}

export async function ensureGuestAccessIndexes(): Promise<void> {
  const col = await codesCollection();
  // MongoDB deletes expired codes on its own.
  await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await col.createIndex({ celebrationId: 1, guestId: 1 });
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

// Guests can sign in until the end of the day after the celebration (its
// date + 1 day); also when the guest token expires. No date → not active.
export function guestAccessExpiry(celebration: Pick<Celebration, "celebrationDate">): Date | null {
  return celebration.celebrationDate
    ? new Date(celebration.celebrationDate.getTime() + DAY_MS)
    : null;
}

export function isGuestAccessOpen(celebration: Pick<Celebration, "celebrationDate">, now = new Date()): boolean {
  const expiry = guestAccessExpiry(celebration);
  return !!expiry && now < expiry;
}

// Phone: same number in any common format (samePhone — "+30…", "0030…",
// plain Greek 10 digits). Email: case-insensitive.
export function findGuestByContact(
  celebration: Pick<Celebration, "guests">,
  rawContact: string
): GuestItem | null {
  const contact = rawContact.trim();
  if (!contact) return null;
  const lower = contact.toLowerCase();
  return (
    (celebration.guests ?? []).find(
      (g) => samePhone(g.phone, contact) || (g.email && g.email.toLowerCase() === lower)
    ) ?? null
  );
}

// ---------------------------------------------------------------------------
// One-time codes
// ---------------------------------------------------------------------------

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

// A fresh 6-digit code for this guest, replacing any previous one. Only its
// hash is stored. Returned so the caller can hand it back (no delivery yet).
export async function issueAccessCode(celebrationId: string, guestId: string): Promise<string> {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const col = await codesCollection();
  await col.deleteMany({ celebrationId, guestId });
  const now = new Date();
  await col.insertOne({
    _id: new ObjectId(),
    celebrationId,
    guestId,
    codeHash: hashCode(code),
    attempts: 0,
    expiresAt: new Date(now.getTime() + CODE_TTL_MS),
    createdAt: now,
  });
  return code;
}

// Single-use: a correct code is deleted. A wrong one counts an attempt; after
// MAX_CODE_ATTEMPTS the code is discarded and the guest must request a new one.
export async function verifyAccessCode(celebrationId: string, guestId: string, code: string): Promise<boolean> {
  const col = await codesCollection();
  const record = await col.findOne({ celebrationId, guestId, expiresAt: { $gt: new Date() } });
  if (!record) return false;

  const given = Buffer.from(hashCode(code.trim()), "hex");
  const stored = Buffer.from(record.codeHash, "hex");
  if (given.length === stored.length && timingSafeEqual(given, stored)) {
    await col.deleteOne({ _id: record._id });
    return true;
  }

  if (record.attempts + 1 >= MAX_CODE_ATTEMPTS) {
    await col.deleteOne({ _id: record._id });
  } else {
    await col.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
  }
  return false;
}

// ---------------------------------------------------------------------------
// Guest tokens
// ---------------------------------------------------------------------------

interface GuestTokenPayload {
  typ: "guest";
  cid: string; // celebration _id
  gid: string; // guest id
  exp: number; // unix ms
}

// Same SESSION_SECRET as admin sessions, but domain-separated: a guest token
// can never be accepted as an admin session (different key derivation and a
// "typ" check) and vice versa.
function guestKey(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('Missing environment variable: "SESSION_SECRET"');
  return createHmac("sha256", secret).update("our-venues:guest-token:v1").digest();
}

function sign(payloadB64: string): string {
  return createHmac("sha256", guestKey()).update(payloadB64).digest("base64url");
}

export function createGuestToken(celebrationId: string, guestId: string, expiresAt: Date): string {
  const payload: GuestTokenPayload = { typ: "guest", cid: celebrationId, gid: guestId, exp: expiresAt.getTime() };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${payloadB64}.${sign(payloadB64)}`;
}

// Never throws: returns null for anything malformed, tampered or expired.
export function verifyGuestToken(token: string | null | undefined): { celebrationId: string; guestId: string } | null {
  if (!token) return null;
  try {
    const [payloadB64, sig] = token.split(".");
    if (!payloadB64 || !sig) return null;
    const expected = Buffer.from(sign(payloadB64));
    const given = Buffer.from(sig);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as GuestTokenPayload;
    if (payload.typ !== "guest" || typeof payload.exp !== "number" || Date.now() >= payload.exp) return null;
    if (typeof payload.cid !== "string" || typeof payload.gid !== "string") return null;
    return { celebrationId: payload.cid, guestId: payload.gid };
  } catch {
    return null;
  }
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1].trim() : null;
}
