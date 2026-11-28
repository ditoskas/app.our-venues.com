import { NextResponse, type NextRequest } from "next/server";
import { getCelebrationById, getCelebrationByGuid } from "@/lib/celebrations";
import { findActiveCelebrationIdByHost } from "@/lib/subdomainReservations";
import { domainForType, parseCelebrationHost } from "@/lib/siteDomains";
import {
  marketingUrl,
  SITE_GUID_HEADER,
  SITE_HOST_HEADER,
  siteHostSuffix,
  siteIndexUrl,
} from "@/lib/siteConfig";

// Serves a celebration's public site (the frontend.our-venues.com SPA) for
// the two public entry points — see docs/CELEBRATION-SUBDOMAINS.md, phase 2.
// proxy.ts rewrites page requests here; static assets (/site/*) and the
// public API (/api/public/*) never come through this handler.
//
//   x-celebration-site-guid   permanent link  app.our-venues.com/celebrations/{guid}/…
//   x-celebration-site-host   subdomain       {label}.o-gamos-mas.com / .vaftizomai.com
// (request headers set by proxy.ts; ?guid= / ?host= also work for a direct call)
//
// Found (and, for a subdomain, inside its reserved period) → the SPA's
// index.html with window.celebrationId / window.celebrationBasePath
// injected, so the SPA needs no extra lookup. Otherwise → 302 (never 301:
// browsers cache 301s, and a subdomain may become active later) to the
// marketing site.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const guid = request.headers.get(SITE_GUID_HEADER) ?? params.get("guid");
  const host = request.headers.get(SITE_HOST_HEADER) ?? params.get("host");
  const resolved = guid ? await resolveByGuid(guid) : await resolveByHost(host);

  if (!resolved) {
    return NextResponse.redirect(marketingUrl(), 302);
  }

  let html: string;
  try {
    html = await loadSiteIndex();
  } catch (err) {
    console.error("Site entry: could not load the frontend index.html", err);
    return new NextResponse("The celebration site is temporarily unavailable.", {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  return new NextResponse(injectCelebration(html, resolved.guid, resolved.basePath), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Whether a subdomain is active changes over time — never cache the shell.
      "Cache-Control": "no-store",
      // Private family pages: keep them out of search engines.
      "X-Robots-Tag": "noindex, nofollow",
      "Referrer-Policy": "same-origin",
    },
  });
}

interface Resolved {
  guid: string;
  basePath: string; // the SPA router's basename
}

async function resolveByGuid(raw: string): Promise<Resolved | null> {
  const guid = raw.toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(guid)) return null;
  const celebration = await getCelebrationByGuid(guid);
  return celebration ? { guid: celebration.guid, basePath: `/celebrations/${celebration.guid}` } : null;
}

async function resolveByHost(rawHost: string | null): Promise<Resolved | null> {
  const host = parseCelebrationHost(rawHost, siteHostSuffix());
  if (host?.kind !== "subdomain") return null;

  const celebrationId = await findActiveCelebrationIdByHost(host.domain, host.label);
  if (!celebrationId) return null;
  const celebration = await getCelebrationById(celebrationId);
  // Defensive: the reservation's domain must still match the celebration's type.
  if (!celebration || domainForType(celebration.type) !== host.domain) return null;
  return { guid: celebration.guid, basePath: "/" };
}

// The built SPA shell, fetched from wherever the frontend is served
// (SITE_INDEX_URL). Cached briefly in production; always fresh in dev, where
// it's the Vite dev server and changes on every edit.
let cached: { html: string; at: number } | null = null;
const CACHE_MS = 60_000;

async function loadSiteIndex(): Promise<string> {
  const isProd = process.env.NODE_ENV === "production";
  if (isProd && cached && Date.now() - cached.at < CACHE_MS) return cached.html;

  const res = await fetch(siteIndexUrl(), { cache: "no-store", headers: { Accept: "text/html" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${siteIndexUrl()}`);
  const html = await res.text();
  if (isProd) cached = { html, at: Date.now() };
  return html;
}

function injectCelebration(html: string, guid: string, basePath: string): string {
  // JSON.stringify + escaping "<" keeps the values inert inside <script>.
  const json = (v: string) => JSON.stringify(v).replace(/</g, "\\u003c");
  const script = `<script>window.celebrationId=${json(guid)};window.celebrationBasePath=${json(basePath)};</script>`;
  // Before any other script in <head>, so it's set before the SPA boots.
  return html.includes("<head>") ? html.replace("<head>", `<head>${script}`) : script + html;
}
