// Client-safe (no DB / Node imports): celebration-subdomain rules shared by
// the server (reservations, site routing) and the Domain tab UI (live label
// validation, URL + period preview). See docs/CELEBRATION-SUBDOMAINS.md.
import type { CelebrationType } from "./celebrations";

// Each celebration type gets its subdomain under its own brand domain.
export const CELEBRATION_DOMAINS: Record<CelebrationType, string> = {
  Marriage: "o-gamos-mas.com",
  Christening: "vaftizomai.com",
};

export function domainForType(type: CelebrationType): string {
  return CELEBRATION_DOMAINS[type];
}

// Permanent, never-expiring public link (works for every celebration).
export const PERMANENT_LINK_ORIGIN = "https://app.our-venues.com";

export function permanentCelebrationUrl(guid: string): string {
  return `${PERMANENT_LINK_ORIGIN}/celebrations/${guid}`;
}

export function subdomainUrl(label: string, domain: string): string {
  return `https://${label}.${domain}`;
}

// ---------------------------------------------------------------------------
// Label validation
// ---------------------------------------------------------------------------

export const LABEL_MIN_LENGTH = 3;
export const LABEL_MAX_LENGTH = 63;

// Hostnames we use (or may use) ourselves, plus a few that invite confusion
// or abuse. Compared after normalization.
const RESERVED_LABELS = new Set([
  "www", "api", "app", "admin", "administrator", "mail", "email", "smtp",
  "imap", "pop", "ftp", "static", "assets", "site", "cdn", "dev", "test",
  "staging", "beta", "demo", "status", "help", "support", "blog", "shop",
  "login", "account", "accounts", "billing", "secure", "root", "ns1", "ns2",
  "autodiscover", "autoconfig", "localhost", "our-venues", "o-gamos-mas",
  "vaftizomai",
]);

export type LabelError = "length" | "characters" | "hyphenEdge" | "punycode" | "reserved";

export function normalizeLabel(raw: string): string {
  return raw.trim().toLowerCase();
}

// Returns the first rule the (normalized) label breaks, or null if valid.
export function validateLabel(label: string): LabelError | null {
  if (label.length < LABEL_MIN_LENGTH || label.length > LABEL_MAX_LENGTH) return "length";
  if (!/^[a-z0-9-]+$/.test(label)) return "characters";
  if (label.startsWith("-") || label.endsWith("-")) return "hyphenEdge";
  if (label.startsWith("xn--")) return "punycode";
  if (RESERVED_LABELS.has(label)) return "reserved";
  return null;
}

// Greek → Latin (ELOT 743-ish, simplified) for suggesting a label from names.
const GREEK_TO_LATIN: Record<string, string> = {
  α: "a", β: "v", γ: "g", δ: "d", ε: "e", ζ: "z", η: "i", θ: "th", ι: "i",
  κ: "k", λ: "l", μ: "m", ν: "n", ξ: "x", ο: "o", π: "p", ρ: "r", σ: "s",
  ς: "s", τ: "t", υ: "y", φ: "f", χ: "ch", ψ: "ps", ω: "o",
};

export function slugifyForLabel(text: string): string {
  const latin = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents (Greek tonos included)
    .toLowerCase()
    .replace(/[α-ω]/g, (c) => GREEK_TO_LATIN[c] ?? "");
  return latin
    .replace(/&/g, "-and-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, LABEL_MAX_LENGTH)
    .replace(/-+$/g, "");
}

// ---------------------------------------------------------------------------
// Reservation period (Europe/Athens)
// ---------------------------------------------------------------------------

export const PERIOD_TIME_ZONE = "Europe/Athens";

// Offset (ms) of `timeZone` from UTC at instant `utcMs`.
function timeZoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - utcMs;
}

// The UTC instant of 00:00 local time in `timeZone` on the given calendar day.
// Month/day overflow is normalized like Date.UTC does.
function zonedMidnight(year: number, month: number, day: number, timeZone: string): Date {
  const guess = Date.UTC(year, month, day);
  let result = guess - timeZoneOffsetMs(guess, timeZone);
  // Second pass corrects the rare case where the offset differs at `result`
  // (a DST switch between the guess and the real instant).
  result = guess - timeZoneOffsetMs(result, timeZone);
  return new Date(result);
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export interface ReservationPeriod {
  startsAt: Date; // inclusive
  endsAt: Date; // exclusive
}

// celebrationDate is stored as UTC midnight of the chosen calendar day
// (from <input type="date">), so its UTC y/m/d *is* the event's local day.
// Period: 00:00 Athens one month before → end of the day one week after
// (stored as the exclusive 00:00 of the following day).
export function reservationPeriod(celebrationDate: Date): ReservationPeriod {
  const y = celebrationDate.getUTCFullYear();
  const m = celebrationDate.getUTCMonth();
  const d = celebrationDate.getUTCDate();

  // "Same day last month", clamped (e.g. 31 March → 28/29 February).
  const prevMonthYear = m === 0 ? y - 1 : y;
  const prevMonth = m === 0 ? 11 : m - 1;
  const startDay = Math.min(d, daysInMonth(prevMonthYear, prevMonth));

  return {
    startsAt: zonedMidnight(prevMonthYear, prevMonth, startDay, PERIOD_TIME_ZONE),
    endsAt: zonedMidnight(y, m, d + 8, PERIOD_TIME_ZONE),
  };
}

export function periodsOverlap(a: ReservationPeriod, b: ReservationPeriod): boolean {
  return a.startsAt < b.endsAt && b.startsAt < a.endsAt;
}

export function isPeriodActive(period: ReservationPeriod, at: Date = new Date()): boolean {
  return period.startsAt <= at && at < period.endsAt;
}
