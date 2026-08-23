import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./lib/session";

const intlMiddleware = createIntlMiddleware(routing);

function splitLocale(pathname: string): { locale: string; rest: string } {
  const segments = pathname.split("/").filter(Boolean);
  const [maybeLocale, ...others] = segments;
  if ((routing.locales as readonly string[]).includes(maybeLocale)) {
    return { locale: maybeLocale, rest: `/${others.join("/")}` };
  }
  return { locale: routing.defaultLocale, rest: pathname };
}

export default async function proxy(request: NextRequest) {
  const intlResponse = intlMiddleware(request);

  // Let next-intl's own locale redirect/rewrite happen first (e.g. adding
  // the default locale prefix to "/") before applying the auth gate.
  if (intlResponse.headers.get("location")) {
    return intlResponse;
  }

  const { locale, rest } = splitLocale(request.nextUrl.pathname);
  const isLoginPage = rest === "/login";

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = (await verifySessionToken(token)) !== null;

  if (!isAuthenticated && !isLoginPage) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("redirect", rest);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }

  return intlResponse;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
