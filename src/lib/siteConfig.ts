// Env-driven settings for serving the celebration sites (phase 2 of
// docs/CELEBRATION-SUBDOMAINS.md). Pure — safe to import from proxy.ts.

// Where visitors go when a subdomain isn't active (or a link is unknown).
export function marketingUrl(): string {
  return process.env.MARKETING_URL || "https://our-venues.com";
}

// "" in production. ".localhost" for local dev: appended to the full domain,
// so http://{label}.o-gamos-mas.com.localhost:3000 works without DNS
// (Chrome resolves any *.localhost name to 127.0.0.1).
export function siteHostSuffix(): string {
  return process.env.CELEBRATION_SITE_HOST_SUFFIX ?? "";
}

// Where the backend gets the frontend SPA's index.html: an absolute file
// path (production — the built file in the celebration-domain vhost, e.g.
// /data/customers/{user}/vhosts/o-gamos-mas.com/www/frontend/index.html) or
// an http(s) URL (local — the Vite dev server).
export function siteIndexUrl(): string {
  return process.env.SITE_INDEX_URL || "http://localhost:3001/site/";
}

// Request headers proxy.ts sets when rewriting to /api/site/entry.
export const SITE_GUID_HEADER = "x-celebration-site-guid";
export const SITE_HOST_HEADER = "x-celebration-site-host";
