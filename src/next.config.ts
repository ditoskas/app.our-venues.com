import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // /api/public/** (see PUBLIC-API.md) is meant to be called directly from
  // frontend.o-gamos-mas.com, which runs on a different origin/port — the
  // browser blocks that without an explicit CORS allow. These routes have
  // no cookie/session auth (the guid is the only access control), so a
  // wildcard origin doesn't widen access to anything.
  async headers() {
    return [
      {
        source: "/api/public/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
