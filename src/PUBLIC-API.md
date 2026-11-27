# Public API

Every endpoint under `/api/public/**` is **unauthenticated by design** —
these are the only routes in this repo meant to be called directly by the
public-facing frontend (`frontend.our-venues.com`, see `CLAUDE.md` "What
this is") or by anything else outside the admin session. They sit outside
`[locale]`, so `proxy.ts` doesn't gate them (its matcher excludes `/api`),
and unlike the authenticated `/api/professionals/[id]/logo` and
`/api/celebrations/[id]/timeline/[itemId]/image` routes, they don't call
`getCurrentUser()`/`getCurrentUserId()` at all.

**Every new public endpoint must be documented here when it's added** —
this file is the contract for what the public frontend can rely on, so
treat undocumented behavior as a bug. `CLAUDE.md` points here; keep both
in sync.

## Authorization model

There's no API key or session. The **`guid`** on a `Celebration` (see
`CLAUDE.md` "Celebrations" — `randomUUID()`, generated server-side,
unique-indexed) is the entire access control: whoever has a celebration's
guid (handed to them via a link, e.g. in an invitation) can read its
public data and act as one of its guests.

**`isSitePublic`** (set from the admin's Celebration Info tab) does **not**
gate the read routes below (`GET /api/public/celebration/{guid}` and its
`timeline/{itemId}/image` / `hero-background` / `invitation` sub-routes) — a valid guid
alone is sufficient, regardless of that flag. It's still enforced by
`GET /api/public/reservations/confirm` (see that section below) — RSVPs
aren't accepted for a celebration that hasn't been switched public, even
if you know its guid. Every route below returns a generic 404 for "no such
guid" and (on the confirm endpoint) "not currently eligible", so a caller
can never distinguish those cases from the outside.

## CORS

`next.config.ts` sets `Access-Control-Allow-Origin: *` on `/api/public/:path*`
only (not the rest of `/api/**`) — these routes are meant to be called
cross-origin, directly from the browser, by `frontend.our-venues.com`
running on a different port/domain, and since there's no session to leak
(see "Authorization model" above) a wildcard origin doesn't widen access to
anything. The frontend's `apiClient` (`src/lib/apiClient.ts` there) doesn't
send credentials — keep it that way, since `Access-Control-Allow-Origin: *`
is invalid together with credentialed requests.

## `GET /api/public/celebration/{guid}`

Returns the public-facing content for one celebration.

**Path param**: `guid` — the celebration's `guid`.

**200 response body**:

```json
{
  "guid": "3fe69f43-ef7c-4aef-9ba1-0e68275e0d98",
  "type": "Marriage",
  "activeLanguages": ["el", "en", "ru"],
  "celebrationInfo": {
    "title": "Dimitris & Maria Marriage",
    "celebrationDate": "2032-09-12T00:00:00.000Z",
    "headline": { "el": "...", "en": "...", "ru": null },
    "quote": { "el": "...", "en": "...", "ru": null },
    "countdownParagraph": { "el": "...", "en": "...", "ru": null },
    "heroBackgroundUrl": "/api/public/celebration/{guid}/hero-background",
    "invitationUrl": "/api/public/celebration/{guid}/invitation",
    "maxGuestsPerInvitation": 5,
    "showMaxGuests": false,
    "showSeating": false,
    "showLive": false,
    "showReservation": false,
    "isSitePublic": false
  },
  "coupleInfo": {
    "husband": { "firstName": "...", "lastName": "...", "email": "...", "mobile": "..." },
    "wife": { "firstName": "...", "lastName": "...", "email": "...", "mobile": "..." }
  },
  "story": {
    "title": { "el": "...", "en": "...", "ru": null },
    "subtitle": { "el": "...", "en": "...", "ru": null },
    "paragraph": { "el": "...", "en": "...", "ru": null }
  },
  "timeline": [
    {
      "id": "...",
      "title": { "el": "...", "en": "...", "ru": null },
      "description": { "el": "...", "en": "...", "ru": null },
      "date": "2019-01-01T00:00:00.000Z",
      "imageUrl": "/api/public/celebration/{guid}/timeline/{itemId}/image"
    }
  ],
  "events": [
    {
      "id": "...",
      "title": { "el": "...", "en": "...", "ru": null },
      "description": { "el": "...", "en": "...", "ru": null },
      "area": "...",
      "date": "...",
      "city": "...",
      "address": "...",
      "postCode": "...",
      "country": "...",
      "mapLat": 43.7746,
      "mapLng": 11.2492
    }
  ]
}
```

Any field that isn't set on the underlying document is returned as
`null` (not omitted) so the frontend can rely on every key always being
present. This applies per-language too: `headline`/`quote`/
`countdownParagraph` (on `celebrationInfo`), `title`/`subtitle`/
`paragraph` (on `story`), and `title`/`description` (on `timeline` and
`events` items) are **translatable** — see `CLAUDE.md` "Celebrations" →
"Translatable fields" — so each is always an object with one key per
locale in `i18n/routing.ts` (currently `el`/`en`/`ru`), `null` for any
language that hasn't been filled in yet on the admin side. `el` is the
primary language and, in practice, the one most likely to be set.
Everything else on this response (including `celebrationInfo.title`) is
single-language, as entered in the admin.

**`activeLanguages`** (top-level, next to `guid`/`type`) is the
celebration's own "Active Languages" setting (see `CLAUDE.md`
"Celebrations" → "Translatable fields" → "Active Languages") — the list of
locales the admin is actually maintaining translations in for this
celebration, e.g. `["el", "en"]` if Russian was never turned on. It does
**not** filter anything else in this response — every `LocalizedText`
field above still returns all locales regardless, `null` for whichever
weren't filled in — this is purely a hint for the frontend's own language
switcher (e.g. don't offer a language tab the admin hasn't opted this
celebration into). A language deactivated in the admin still returns
whatever text was last saved for it elsewhere in this response; nothing
here is deleted or hidden by deactivating a language, only by never having
filled it in.

`celebrationInfo.showSeating`/`showLive`/`showReservation` (also `?? false`,
same as `showMaxGuests`) are plain per-celebration feature toggles for the
frontend's "Reception Seating", "Happening Now", and "Reservation" nav
items/pages — show that nav item and its page only when the corresponding
flag is `true`. Nothing on the backend enforces this; it's the frontend's
responsibility to
read the flag and hide the nav item/route accordingly.

`celebrationInfo.isSitePublic` **is** included (unlike most fields on this
response, this one isn't defaulted through `?? null` — it's `?? false`,
since it's a boolean the frontend branches on, not display content). It
does **not** gate this route (see "Authorization model" above) — it's
informational, for the frontend's own access-gate logic: `false` means the
frontend shows a contact/code gate (see `/api/public/access/confirm`
below) instead of the real site until the visitor verifies, even though
the data in this very response is already sitting in their browser. That's
a client-side-only gate, not a real security boundary — see the note on
that endpoint below.

**Deliberately excluded**:
- `guests` — the guest list is never exposed publicly, on any route. Only
  the confirm endpoints touch guest data, and only one guest record at a
  time, scoped by the phone/email the caller already supplied.
- The celebration's Mongo `_id` and `professionalId` — internal-only,
  `guid` is the public identifier.

**Errors**: `404` if the guid doesn't exist (`{ "error": "Not found" }`).
`isSitePublic` is not checked — see "Authorization model" above.

### `GET /api/public/celebration/{guid}/timeline/{itemId}/image`

Serves one timeline item's image — the public counterpart to
`/api/celebrations/[id]/timeline/[itemId]/image` (see `CLAUDE.md`
"Celebrations" → "Story tab"), added alongside the route above purely so
`timeline[].imageUrl` in that response is actually loadable from a
visitor's browser (the authenticated route 401s for anyone not logged
into the admin). Same access model as the route above (guid alone, no
`isSitePublic` check): 404 if the guid doesn't exist, or if the item has
no image.

### `GET /api/public/celebration/{guid}/hero-background`

Serves the celebration's hero background image — the public counterpart
to `/api/celebrations/[id]/hero-background` (see `CLAUDE.md`
"Celebrations" → "View page"), the same way the timeline-image route
above is the public counterpart to its authenticated equivalent. This is
what `celebrationInfo.heroBackgroundUrl` in the celebration route's
response points at. Same access model as the route above (guid alone, no
`isSitePublic` check): 404 if the guid doesn't exist, or if no hero
background has been uploaded.

### `GET /api/public/celebration/{guid}/invitation`

Serves the celebration's invitation image — the public counterpart to
`/api/celebrations/[id]/invitation` (see `CLAUDE.md` "Celebrations" →
"View page"), the same way the hero-background route above is the public
counterpart to its authenticated equivalent, and stored alongside it (same
`celebrationImagesDir()`, different fixed filename). This is what
`celebrationInfo.invitationUrl` in the celebration route's response points
at. Same access model as the route above (guid alone, no `isSitePublic`
check): 404 if the guid doesn't exist, or if no invitation has been
uploaded.

## `GET /api/public/access/confirm`

**⚠️ STUB — no logic yet.** Always returns success with fixed placeholder
`displayName`/`maxAttendees` for any input, including a missing/garbage
`guid` or `contact`. No lookup, no code generation, no email/SMS sending,
no verification. This exists only so the frontend's two guest-identity
flows have something to call while it gets built for real:
`celebrationInfo.isSitePublic`'s access gate (frontend `AccessGatePage`),
and the reservation/RSVP page's guest login (frontend `GuestLoginForm`,
shared by both). **Do not treat this as a real access-control or
identity boundary** — replace this doc section (and the behavior below)
once it's actually implemented.

Intended eventual shape, called twice by the frontend's guest-login form:

**Query params**:

| Param | Required | Notes |
| --- | --- | --- |
| `guid` | yes | The celebration's `guid`. |
| `contact` | yes | Email or phone the visitor entered. |
| `code` | no | Omitted on the first call (request a code); present on the second (verify it). |

**200 response body** (same shape both calls, for now — see below):

```json
{ "success": true, "displayName": "Guest", "maxAttendees": 2 }
```

Step 1 (no `code`): intended to look up `contact` against the celebration
(guests and/or the couple — not decided yet) and, if it matches, generate
and deliver a one-time code to that contact out-of-band; `displayName`/
`maxAttendees` are meaningless on this call and callers should ignore
them. Step 2 (`code` present): intended to verify the code matches and
hasn't expired, then return that guest's real display name and the number
of attendees they're allowed to bring (their `expectedAttendees` — see
`GuestItem` in `CLAUDE.md` "Celebrations"). Currently every call just
returns the same fixed values immediately, regardless of `code`.

## `GET /api/public/reservations/confirm`

Records a guest's RSVP. **GET, not POST, on purpose** — this is designed
to work as a one-click link in an RSVP email or SMS (the same pattern
"confirm your email" links use), not to be called from a form submit.

**Query params**:

| Param | Required | Notes |
| --- | --- | --- |
| `guid` | yes | The celebration's `guid`. |
| `phone` | one of `phone`/`email` | Matched against a guest's `phone` (exact string match). |
| `email` | one of `phone`/`email` | Matched against a guest's `email` (case-insensitive). |
| `confirmationAttendies` | no | A positive integer. Only applied when `action=confirm` — see below. (Spelling matches this field as specified; not a typo to "fix".) |
| `action` | yes | Exactly `confirm` or `denied` — no other values accepted. |

At least one of `phone`/`email` must be given; both empty is a `400`.

**What it checks, in order**:
1. `guid` resolves to a celebration, and that celebration's
   `isSitePublic` is `true` — otherwise `404`.
2. The celebration has a `celebrationDate` **in the future** (strictly
   after the current time) — a past or missing `celebrationDate` also
   yields `404`. RSVPs aren't accepted for a celebration that isn't
   upcoming.
3. Exactly one guest in that celebration's guest list matches the given
   `phone` and/or `email` — no match is `404`.

**On `action=confirm`**:
- Sets that guest's `confirmationDate` to the current time (UTC).
- If `confirmationAttendies` was given, is a valid number, and is `> 0`,
  also sets `confirmedAttendees` to that number. Otherwise
  `confirmedAttendees` is left as whatever it already was.
- Clears any earlier `deniedDate` on the same guest.

**On `action=denied`**:
- Sets that guest's `deniedDate` to the current time (UTC).
- Clears any earlier `confirmationDate` on the same guest.
- `confirmedAttendees` is untouched either way — `confirmationAttendies`
  is only read when `action=confirm`.

A guest's `confirmationDate` and `deniedDate` are **mutually
exclusive** — whichever action ran most recently wins, by construction
(see `lib/celebrations.ts`'s `updateGuestItem()`, which replaces the
whole guest record rather than patching individual fields — the field
that isn't set on this call simply isn't carried over). This is what lets
the admin Guests table show a guest as confirmed (green) or denied (red),
never both.

**200 response body**: `{ "success": true, "action": "confirm" }` (or
`"denied"`). No guest data is echoed back.

**Errors**: `400` for a missing `guid`, missing both `phone` and `email`,
or an `action` that isn't `confirm`/`denied`. `404` per the checks above.

Every confirm/deny call writes a `LogActions` entry (`category:
"Celebrations"`, `userId: "public"` — the same synthetic-actor convention
`"system"` uses for the seeder, see `CLAUDE.md` "Action logging") so
there's an audit trail for public RSVP activity alongside admin-driven
changes.
