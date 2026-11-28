// Client-safe (no DB / next/headers imports) role → visible-section map.
// The single source of truth for which top-level sections each role gets —
// used by Navbar (menu items) and the dashboard (section cards). Pages and
// actions still enforce access themselves (requirePageRole + action checks);
// hiding a link here is presentation only, never the security boundary.
import type { Role } from "./users";

export type NavKey = "celebrations" | "professionals" | "users" | "settings";

export const NAV_KEYS_BY_ROLE: Record<Role, readonly NavKey[]> = {
  Root: ["celebrations", "professionals", "settings"],
  Professional: ["celebrations", "users"],
  Couple: ["celebrations"],
};

export type DashboardSectionKey =
  | "celebrations"
  | "professionals"
  | "users"
  | "couples"
  | "story"
  | "events"
  | "guests"
  | "settings";

export const DASHBOARD_SECTIONS_BY_ROLE: Record<Role, readonly DashboardSectionKey[]> = {
  Root: ["celebrations", "professionals", "couples", "story", "events", "guests", "settings"],
  Professional: ["celebrations", "users"],
  Couple: ["celebrations"],
};
