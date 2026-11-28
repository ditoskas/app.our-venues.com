// Signed bearer token issued to a guest once they verify their 2FA code
// (see lib/guestAccess.ts and app/api/public/access/confirm/route.ts) — NOT
// the admin og_session cookie (lib/session.ts). Returned in the confirm
// endpoint's JSON response, not set as a cookie: this is a public,
// cross-origin API (see PUBLIC-API.md "CORS"), consumed by
// frontend.o-gamos-mas.com directly, not this admin app. Uses its own
// secret so a leaked guest token can't be replayed against admin auth (or
// vice versa) and reuses the base64url helpers from lib/session.ts rather
// than duplicating them.
import { bytesToBase64Url, base64UrlToBytes } from "./session";

interface GuestSessionPayload {
  celebrationId: string;
  guestId: string;
  contact: string;
  exp: number; // unix ms — the celebration's own access window close (celebrationDate + 1 day)
}

export interface VerifiedGuestSession {
  celebrationId: string;
  guestId: string;
  contact: string;
}

function getSecretKey(): Promise<CryptoKey> {
  const secret = process.env.GUEST_SESSION_SECRET;
  if (!secret) {
    throw new Error('Missing environment variable: "GUEST_SESSION_SECRET"');
  }
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createGuestSessionToken(
  payload: { celebrationId: string; guestId: string; contact: string },
  expiresAt: Date
): Promise<string> {
  const fullPayload: GuestSessionPayload = { ...payload, exp: expiresAt.getTime() };
  const payloadB64 = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(fullPayload)));
  const key = await getSecretKey();
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return `${payloadB64}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

// Same "never throw" guarantee as verifySessionToken (lib/session.ts) — fed
// untrusted, possibly-tampered/malformed input, so any parse failure must
// resolve to null, never a thrown error.
export async function verifyGuestSessionToken(
  token: string | undefined | null
): Promise<VerifiedGuestSession | null> {
  if (!token) return null;

  try {
    const [payloadB64, sigB64] = token.split(".");
    if (!payloadB64 || !sigB64) return null;

    const key = await getSecretKey();
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToBytes(sigB64) as BufferSource,
      new TextEncoder().encode(payloadB64)
    );
    if (!valid) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(payloadB64))
    ) as GuestSessionPayload;
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
    if (!payload.celebrationId || !payload.guestId || !payload.contact) return null;

    return {
      celebrationId: payload.celebrationId,
      guestId: payload.guestId,
      contact: payload.contact,
    };
  } catch {
    return null;
  }
}
