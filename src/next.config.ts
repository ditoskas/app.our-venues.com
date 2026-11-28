import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // /api/public/** (see PUBLIC-API.md) is meant to be called directly from
  // frontend.o-gamos-mas.com, which runs on a different origin/port — the
  // browser blocks that without an explicit CORS allow. These routes have
  // no cookie/session auth (the guid is the only access control), so a
  // wildcard origin doesn't widen access to anything.
  //
  // POST and Allow-Headers: Authorization exist for
  // POST /api/public/live-events (see PUBLIC-API.md) — it's the one public
  // route that sends a custom `Authorization: Bearer <token>` header, which
  // makes the browser's CORS preflight non-"simple" and send an OPTIONS
  // request first; that route's own OPTIONS handler answers with a 2xx,
  // and these headers are what tell the browser POST + Authorization are
  // actually allowed once it does.
  async headers() {
    return [
      {
        source: "/api/public/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
