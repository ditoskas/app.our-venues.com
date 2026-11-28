import { NextResponse } from "next/server";
import { getCelebrationByGuid, getActiveLanguages, type LocalizedText } from "@/lib/celebrations";
import { routing } from "@/i18n/routing";

// Normalizes a LocalizedText (only-present-languages, see lib/celebrations.ts)
// into an object with every supported locale as a key, missing ones as
// null — same "always-present, null when unset" convention this route
// already uses for its other optional fields, just per-language.
function localized(value?: LocalizedText): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const locale of routing.locales) {
    out[locale] = value?.[locale] ?? null;
  }
  return out;
}

// Public, unauthenticated — see PUBLIC-API.md. Not covered by proxy.ts
// (API routes are excluded from its matcher) and deliberately does its own
// visibility check instead of any auth check: the guid itself is the gate,
// not a session — `isSitePublic` is deliberately NOT checked here, so any
// valid guid returns data regardless of that flag (it only affects surfaces
// that don't have a specific guid to go on).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ guid: string }> }
) {
  const { guid } = await params;
  const celebration = await getCelebrationByGuid(guid);

  if (!celebration) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const timeline = (celebration.timeline ?? []).map((item) => ({
    id: item.id,
    title: localized(item.title),
    description: localized(item.description),
    date: item.date ?? null,
    imageUrl: item.imageFilename
      ? `/api/public/celebration/${guid}/timeline/${item.id}/image`
      : null,
  }));

  const events = (celebration.events ?? []).map((item) => ({
    id: item.id,
    title: localized(item.title),
    description: localized(item.description),
    area: item.area ?? null,
    date: item.date ?? null,
    city: item.city ?? null,
    address: item.address ?? null,
    postCode: item.postCode ?? null,
    country: item.country ?? null,
    mapLat: item.mapLat ?? null,
    mapLng: item.mapLng ?? null,
    // Reception Seating page: whether this event has seating, and its floor
    // plan (positions/sizes/table codes/capacity only — no guest names; those
    // come from /seating, which requires a public site).
    hasSeating: item.hasSeating ?? false,
    seatingLayout: item.seatingLayout ?? [],
  }));

  return NextResponse.json({
    guid: celebration.guid,
    type: celebration.type,
    // Which locales this celebration's translatable fields (headline/quote/
    // countdownParagraph, story, timeline/events title+description) are
    // actually being maintained in — the admin's "Active Languages"
    // checkboxes (see CLAUDE.md "Celebrations" → "Translatable fields" →
    // "Active Languages"). Doesn't gate or filter anything else in this
    // response — every LocalizedText field below still returns all locales,
    // `null` for ones that were never filled in — this is purely a hint for
    // the frontend's own language switcher (e.g. don't offer a language tab
    // the admin hasn't opted this celebration into).
    activeLanguages: getActiveLanguages(celebration),
    celebrationInfo: {
      title: celebration.title,
      celebrationDate: celebration.celebrationDate ?? null,
      headline: localized(celebration.headline),
      quote: localized(celebration.quote),
      countdownParagraph: localized(celebration.countdownParagraph),
      heroBackgroundUrl: celebration.heroBackgroundFilename
        ? `/api/public/celebration/${guid}/hero-background`
        : null,
      invitationUrl: celebration.invitationFilename
        ? `/api/public/celebration/${guid}/invitation`
        : null,
      maxGuestsPerInvitation: celebration.maxGuestsPerInvitation ?? null,
      showMaxGuests: celebration.showMaxGuests ?? false,
      // Gate the frontend's "Reception Seating" / "Happening Now" /
      // "Reservation" nav items and pages — same admin-toggle-drives-
      // frontend-visibility pattern as showMaxGuests above, just for a
      // whole page instead of one field.
      showSeating: celebration.showSeating ?? false,
      showLive: celebration.showLive ?? false,
      showReservation: celebration.showReservation ?? false,
      // Informational only here — this route itself stays guid-gated
      // regardless of this flag (see the comment above). The frontend is
      // what acts on it: false means it shows the access-code gate instead
      // of the real site until the visitor verifies via
      // /api/public/access/confirm.
      isSitePublic: celebration.isSitePublic ?? false,
    },
    coupleInfo: {
      husband: celebration.husband,
      wife: celebration.wife,
    },
    story: {
      title: localized(celebration.storyTitle),
      subtitle: localized(celebration.storySubtitle),
      paragraph: localized(celebration.storyParagraph),
    },
    timeline,
    events,
  });
}
