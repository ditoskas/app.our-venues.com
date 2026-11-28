import { readFile } from "node:fs/promises";
import { NextResponse, type NextRequest } from "next/server";
import { getCelebrationById, getCelebrationByGuid, type Celebration } from "@/lib/celebrations";
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

  const page = injectPreviewTags(
    injectCelebration(html, resolved.guid, resolved.basePath),
    resolved.celebration,
    request
  );
  return new NextResponse(page, {
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
  celebration: Celebration;
  guid: string;
  basePath: string; // the SPA router's basename
}

async function resolveByGuid(raw: string): Promise<Resolved | null> {
  const guid = raw.toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(guid)) return null;
  const celebration = await getCelebrationByGuid(guid);
  return celebration
    ? { celebration, guid: celebration.guid, basePath: `/celebrations/${celebration.guid}` }
    : null;
}

async function resolveByHost(rawHost: string | null): Promise<Resolved | null> {
  const host = parseCelebrationHost(rawHost, siteHostSuffix());
  if (host?.kind !== "subdomain") return null;

  const celebrationId = await findActiveCelebrationIdByHost(host.domain, host.label);
  if (!celebrationId) return null;
  const celebration = await getCelebrationById(celebrationId);
  // Defensive: the reservation's domain must still match the celebration's type.
  if (!celebration || domainForType(celebration.type) !== host.domain) return null;
  return { celebration, guid: celebration.guid, basePath: "/" };
}

// The built SPA shell, fetched from wherever the frontend is served
// (SITE_INDEX_URL). Cached briefly in production; always fresh in dev, where
// it's the Vite dev server and changes on every edit.
let cached: { html: string; at: number } | null = null;
const CACHE_MS = 60_000;

async function loadSiteIndex(): Promise<string> {
  const isProd = process.env.NODE_ENV === "production";
  if (isProd && cached && Date.now() - cached.at < CACHE_MS) return cached.html;

  const source = siteIndexUrl();
  let html: string;
  if (source.startsWith("/")) {
    // Production: the built frontend's index.html on this server's disk.
    html = await readFile(source, "utf8");
  } else {
    const res = await fetch(source, { cache: "no-store", headers: { Accept: "text/html" } });
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${source}`);
    html = await res.text();
  }
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

// Link-preview tags (Open Graph): when a link to this page is sent in
// WhatsApp/Viber/etc., the app fetches it and builds a card from these —
// the couple's names, the date and the invitation image. Absolute URLs from
// the request's own host (nginx passes Host and X-Forwarded-Proto), so the
// card points at whichever domain the link used.
function injectPreviewTags(html: string, celebration: Celebration, request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return html;
  const proto = (request.headers.get("x-forwarded-proto") ?? "https").split(",")[0].trim();
  const origin = `${proto}://${host}`;
  const base = `${origin}/api/public/celebration/${celebration.guid}`;

  const title =
    celebration.type === "Marriage"
      ? `${celebration.husband.firstName} & ${celebration.wife.firstName}`
      : celebration.title;
  const date = celebration.celebrationDate
    ? new Intl.DateTimeFormat("el-GR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
        celebration.celebrationDate
      )
    : "";
  const headline = celebration.headline?.el ?? celebration.headline?.en ?? celebration.headline?.ru ?? "";
  const description = [date, headline].filter(Boolean).join(" · ");
  const image = celebration.invitationFilename
    ? `${base}/invitation`
    : celebration.heroBackgroundFilename
      ? `${base}/hero-background`
      : null;

  const attr = (v: string) =>
    v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const tags = [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${attr(title)}" />`,
    description ? `<meta property="og:description" content="${attr(description)}" />` : "",
    `<meta property="og:url" content="${attr(`${origin}${request.nextUrl.pathname}`)}" />`,
    image ? `<meta property="og:image" content="${attr(image)}" />` : "",
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />`,
    `<title>${attr(title)}</title>`,
  ]
    .filter(Boolean)
    .join("");

  // The SPA's own <title> is replaced so the browser tab and the card agree.
  const withoutTitle = html.replace(/<title>[\s\S]*?<\/title>/i, "");
  return withoutTitle.includes("</head>") ? withoutTitle.replace("</head>", `${tags}</head>`) : withoutTitle;
}
