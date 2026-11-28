import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { SESSION_COOKIE_NAME, verifySessionToken } from "./lib/session";
import { matchPermanentPath, parseCelebrationHost } from "./lib/siteDomains";
import { marketingUrl, SITE_GUID_HEADER, SITE_HOST_HEADER, siteHostSuffix } from "./lib/siteConfig";

const intlMiddleware = createIntlMiddleware(routing);

function splitLocale(pathname: string): { locale: string; rest: string } {
  const segments = pathname.split("/").filter(Boolean);
  const [maybeLocale, ...others] = segments;
  if ((routing.locales as readonly string[]).includes(maybeLocale)) {
    return { locale: maybeLocale, rest: `/${others.join("/")}` };
  }
  return { locale: routing.defaultLocale, rest: pathname };
}

// Rewrites to /api/site/entry, passing what was matched as request headers:
// the route handler sees the *original* URL after a proxy rewrite, so query
// params added here never reach it. Always overwritten here, so a client
// can't smuggle in its own values on these paths.
function rewriteToSiteEntry(request: NextRequest, values: { guid?: string; host?: string }): NextResponse {
  const headers = new Headers(request.headers);
  headers.delete(SITE_GUID_HEADER);
  headers.delete(SITE_HOST_HEADER);
  if (values.guid) headers.set(SITE_GUID_HEADER, values.guid);
  if (values.host) headers.set(SITE_HOST_HEADER, values.host);
  return NextResponse.rewrite(new URL("/api/site/entry", request.url), { request: { headers } });
}

// Public celebration sites (docs/CELEBRATION-SUBDOMAINS.md) are routed
// before any locale/auth handling: they're public, unprefixed, and served by
// /api/site/entry (which decides between the SPA shell and a 302).
function routeCelebrationSite(request: NextRequest): NextResponse | null {
  const host = parseCelebrationHost(request.headers.get("host"), siteHostSuffix());
  if (host?.kind === "bare") {
    // In production nginx serves a landing page for the bare domains; this
    // is only the fallback if a bare-domain request ever reaches the app.
    return NextResponse.redirect(marketingUrl(), 302);
  }
  if (host?.kind === "subdomain") {
    const siteHost = `${host.label}.${host.domain}${siteHostSuffix()}`;
    return rewriteToSiteEntry(request, { host: siteHost });
  }

  const permanent = matchPermanentPath(request.nextUrl.pathname);
  if (permanent) {
    return rewriteToSiteEntry(request, { guid: permanent.guid });
  }
  return null;
}

export default async function proxy(request: NextRequest) {
  const site = routeCelebrationSite(request);
  if (site) return site;

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
  // `site/` = the frontend SPA's static assets (/site/*), proxied to the
  // frontend by next.config.ts locally and served by nginx in production.
  matcher: ["/((?!api|_next|_vercel|site/|.*\\..*).*)"],
};
