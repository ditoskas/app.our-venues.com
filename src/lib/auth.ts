import { cache } from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { ObjectId } from "mongodb";
import { redirect } from "@/i18n/navigation";
import { getUserById, type Role, type User } from "./users";
import {
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  createSessionToken,
  verifySessionPayload,
  type SessionPayload,
} from "./session";

async function writeSessionCookie(token: string, maxAge: number): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function setSessionCookie(userId: string): Promise<void> {
  await writeSessionCookie(await createSessionToken(userId), SESSION_TTL_SECONDS);
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

async function readSessionPayload(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionPayload(store.get(SESSION_COOKIE_NAME)?.value);
}

async function safeGetUserById(id: string): Promise<User | null> {
  return ObjectId.isValid(id) ? getUserById(id) : null;
}

export interface ResolvedSession {
  // The user who actually logged in (owns the session cookie).
  realUser: User;
  // The user the app runs as: the "act as" target when a Root user is
  // impersonating someone, otherwise the same as realUser.
  effectiveUser: User;
  isActingAs: boolean;
}

// Memoized per request (React cache) — every getCurrentUser()/getCurrentUserId()
// call in one render/action shares a single cookie read + DB lookup.
//
// "Act as" is only honored while the real user is still Root and the target
// still exists and isn't Root — re-checked on every request, so demoting the
// Root user or deleting the target silently ends the impersonation.
export const resolveSession = cache(async (): Promise<ResolvedSession | null> => {
  const payload = await readSessionPayload();
  if (!payload) return null;

  const realUser = await safeGetUserById(payload.sub);
  if (!realUser) return null;

  if (payload.act && realUser.role === "Root") {
    const target = await safeGetUserById(payload.act);
    if (target && target.role !== "Root") {
      return { realUser, effectiveUser: target, isActingAs: true };
    }
  }

  return { realUser, effectiveUser: realUser, isActingAs: false };
});

// The effective user id — the "act as" target while impersonating. Everything
// permission/data-related should use this (or getCurrentUser()), so the app
// behaves exactly as if the target had logged in.
export async function getCurrentUserId(): Promise<string | null> {
  return (await resolveSession())?.effectiveUser._id.toString() ?? null;
}

export async function getCurrentUser(): Promise<User | null> {
  return (await resolveSession())?.effectiveUser ?? null;
}

// The user who actually logged in, regardless of "act as". Only for the
// "act as" feature itself (Profile section, banner, audit trail).
export async function getRealUser(): Promise<User | null> {
  return (await resolveSession())?.realUser ?? null;
}

// Re-issues the session cookie with (or without) an "act as" target, keeping
// the original login's expiry so impersonating can't extend a session.
export async function setActingAs(targetUserId: string | null): Promise<void> {
  const payload = await readSessionPayload();
  if (!payload) return;
  const token = await createSessionToken(payload.sub, {
    act: targetUserId ?? undefined,
    exp: payload.exp,
  });
  const maxAge = Math.max(0, Math.floor((payload.exp - Date.now()) / 1000));
  await writeSessionCookie(token, maxAge);
}

// For use in a page/layout Server Component only — notFound()/redirect() rely on
// the render tree's boundaries, which a Server Action doesn't have. Actions should
// check `(await getCurrentUser())?.role` themselves and return a form error instead.
export async function requirePageRole(roles: Role[]): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    return redirect({ href: "/login", locale: await getLocale() });
  }
  if (!roles.includes(user.role)) {
    return notFound();
  }
  return user;
}
