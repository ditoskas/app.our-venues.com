// Pure, portable session-token logic (Web Crypto + Web-standard base64url —
// no `node:crypto`/`Buffer`) so this file can be imported from both the
// Edge-compatible src/proxy.ts and regular Node Server Components/Actions.
// Cookie I/O (which needs `next/headers`, Node/RSC-only) lives in lib/auth.ts.

export const SESSION_COOKIE_NAME = "og_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  sub: string; // user id (the user who actually logged in)
  act?: string; // "act as" target user id — Root-only impersonation, see auth.ts
  exp: number; // unix ms
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded.padEnd(padded.length + ((4 - (padded.length % 4)) % 4), "="));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function getSecretKey(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('Missing environment variable: "SESSION_SECRET"');
  }
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createSessionToken(
  userId: string,
  options: { act?: string; exp?: number } = {}
): Promise<string> {
  const payload: SessionPayload = {
    sub: userId,
    ...(options.act ? { act: options.act } : {}),
    exp: options.exp ?? Date.now() + SESSION_TTL_SECONDS * 1000,
  };
  const payloadB64 = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await getSecretKey();
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return `${payloadB64}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<string | null> {
  return (await verifySessionPayload(token))?.sub ?? null;
}

// Must never throw — see CLAUDE.md "Authentication".
export async function verifySessionPayload(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) return null;

  // Wraps everything: this parses untrusted, possibly-tampered/malformed
  // client input (base64url decoding of an arbitrary cookie value can throw
  // — e.g. invalid characters or a length that isn't a valid base64
  // block — and that must resolve to "not authenticated", never a crash).
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
    ) as SessionPayload;
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
    if (typeof payload.sub !== "string" || !payload.sub) return null;
    return {
      sub: payload.sub,
      ...(typeof payload.act === "string" && payload.act ? { act: payload.act } : {}),
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
