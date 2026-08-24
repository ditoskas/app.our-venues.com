import { NextResponse } from "next/server";

// Public, unauthenticated — see PUBLIC-API.md. STUB: always returns
// success regardless of guid/contact/code — no lookup, no code
// generation/delivery, no verification. This exists purely so the
// frontend's access-gate and guest-login flows (contact -> code -> unlock)
// have something to call while those get built; wire up real logic
// (matching contact against the celebration's guests/couple, generating +
// sending a code, verifying it, looking up the real display name/party
// size) before relying on this for anything real.
//
// displayName/maxAttendees are only meaningful once `code` is verified —
// callers that only pass `contact` (requesting a code) should ignore them.
// Returned unconditionally here since this stub doesn't branch on `code`
// at all yet.
export async function GET() {
  return NextResponse.json({
    success: true,
    displayName: "Guest",
    maxAttendees: 2,
  });
}
