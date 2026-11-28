import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { SESSION_COOKIE_NAME } from "@/lib/session";
import { resolveSession } from "@/lib/auth";

// Target of redirectToLogin() (lib/auth.ts). A Server Component can't delete
// cookies, so when a page finds a validly-signed session cookie whose user no
// longer exists (deleted, or the DB was reset), it sends the browser here to
// drop the cookie. Without this, proxy.ts (signature-only check, no DB) keeps
// bouncing /login back to the app, and the app back to /login — an infinite
// redirect loop.
//
// Only clears the cookie when it really doesn't resolve to a user, so a link
// to this URL can't be used to log a real user out.
export async function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("locale") ?? "";
  const locale = (routing.locales as readonly string[]).includes(requested)
    ? requested
    : routing.defaultLocale;

  if (await resolveSession()) {
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  const response = NextResponse.redirect(new URL(`/${locale}/login`, request.url));
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
