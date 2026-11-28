// Client-safe shared constants — no runtime imports (only a type-only import
// below, which TypeScript fully erases), so this can be pulled into Client
// Components without dragging in server-only code (e.g. the `mongodb`
// driver imported by lib/celebrations.ts, which errors in the browser
// bundle with "Module not found: Can't resolve 'net'").
import type { CelebrationType } from "./celebrations";

// The fixed base domain each celebration's public site's subdomain (see
// Celebration.subdomain in lib/celebrations.ts) is served under, chosen by
// the celebration's type — e.g. a Marriage's subdomain "dimitris-maria"
// resolves to "dimitris-maria.o-gamos-mas.com", a Christening's to
// "...vaftizomai.com".
export const CELEBRATION_BASE_DOMAINS: Record<CelebrationType, string> = {
  Marriage: "o-gamos-mas.com",
  Christening: "vaftizomai.com",
};

export function getCelebrationBaseDomain(type: CelebrationType): string {
  return CELEBRATION_BASE_DOMAINS[type];
}
