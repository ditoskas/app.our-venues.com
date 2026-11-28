import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // /api/public/** (see PUBLIC-API.md) is meant to be called directly from
  // frontend.our-venues.com, which runs on a different origin/port — the
  // browser blocks that without an explicit CORS allow. These routes have
  // no cookie/session auth (the guid is the only access control), so a
  // wildcard origin doesn't widen access to anything.
  // The celebration-site SPA's assets live under /site/ (frontend's Vite
  // `base`). In production nginx serves them before requests reach Next; for
  // local dev (and as a fallback) proxy them to the frontend server.
  async rewrites() {
    const origin = process.env.SITE_ORIGIN;
    return origin ? [{ source: "/site/:path*", destination: `${origin}/site/:path*` }] : [];
  },
  async headers() {
    return [
      {
        source: "/api/public/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          // POST /api/public/live-events sends the guest token as a header.
          { key: "Access-Control-Allow-Headers", value: "Authorization, Content-Type" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
