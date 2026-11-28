# Public API

Every endpoint under `/api/public/**` is **unauthenticated by design** —
these are the only routes in this repo meant to be called directly by the
public-facing frontend (`frontend.o-gamos-mas.com`, see `CLAUDE.md` "What
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
cross-origin, directly from the browser, by `frontend.o-gamos-mas.com`
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
  "childGender": null,
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
      "mapLng": 11.2492,
      "hasSeating": true,
      "seatingLayout": [
        { "id": "...", "type": "table-circle", "x": 40, "y": 40, "width": 80, "height": 80, "code": "T1", "maxPeople": 8 },
        { "id": "...", "type": "placeholder", "x": 200, "y": 40, "width": 150, "height": 50, "label": "Dance Floor" }
      ]
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

**`childGender`** (top-level, next to `guid`/`type`) is `"Boy"`, `"Girl"`,
or `null` — only ever settable (admin's Celebration Info tab) when
`type === "Christening"`, so it's always `null` for a Marriage, and also
`null` for a Christening whose gender hasn't been chosen yet. The frontend
uses it to pick a "boy"/"girl" guest-site theme for christenings instead of
the default Marriage palette (see `CLAUDE.md` "Theme" there).

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

**`events[].hasSeating`/`seatingLayout`** back the Reception Seating page:
`hasSeating` (`?? false`, same convention as the `show*` flags) marks which
events actually have a seating chart at all — an event can exist without
one. `seatingLayout` is that event's floor-plan elements as the admin's
seating-layout editor saved them (`?? []` when unset) — round/rect tables
(`type: "table-circle"`/`"table-rect"`, with `code`/`maxPeople`) or free
placeholders (`type: "placeholder"`, with `label`), each positioned by
plain `x`/`y`/`width`/`height` pixels on a fixed logical canvas (see the
admin's `EventSeatingLayoutEditor.tsx` — `1400×900`; the frontend read-only
viewer scales that canvas to fit rather than using those units as real
screen pixels). Returned for every event regardless of `hasSeating`
(`[]` when there's nothing to show) — this route doesn't filter `events`
itself, same as everything else on it.

**Deliberately excluded**:
- `guests` — the full guest list is never exposed publicly, on any route.
  The confirm endpoints only ever touch one guest record at a time, scoped
  by the phone/email/token the caller already supplied. The one deliberate,
  narrow exception is `GET /api/public/celebration/{guid}/seating` below,
  which returns guest **names** (nothing else) grouped by table — see that
  section for why and how it's scoped.
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

## `GET /api/public/celebration/{guid}/seating`

Backs the frontend's Reception Seating page: who's assigned to which table
(see `GuestTableAssignment`/`GuestItem.tableAssignments` and
`getTableReservedSeats()` in `lib/celebrations.ts` — table
capacity/position/code themselves come from `events[].seatingLayout` on
the main celebration route above, not from here). This route only ever
adds each assigned guest's **name** and **confirmed attendee count** on
top of that (`attendees`, via the same `guestSeatCount()` helper
`getTableReservedSeats()` sums — `confirmedAttendees ?? expectedAttendees
?? 1`), nothing else about a guest.

**Path param**: `guid` — the celebration's `guid`.

**Request header**: `Authorization: Bearer <token>` — optional. When
present and valid (the guest session token from the verify step of `GET
/api/public/access/confirm` below), the response also names that guest's
own table(s), so the frontend can highlight "your table" without a second
call. Omit it (or send an invalid/expired token) for an anonymous read —
`myAssignments` just comes back empty, the request doesn't fail.

**200 response body**:

```json
{
  "tables": [
    {
      "eventId": "...",
      "tableId": "...",
      "guests": [
        { "name": "Maria K.", "attendees": 2 },
        { "name": "Nikos P.", "attendees": 1 }
      ]
    }
  ],
  "myAssignments": [
    { "eventId": "...", "tableId": "..." }
  ]
}
```

`tables` only includes a `(eventId, tableId)` pair that actually has at
least one guest assigned — an empty/unassigned table simply doesn't appear
(the frontend already has every table's existence/capacity from
`seatingLayout`, so there's nothing to add for one with nobody at it).
`myAssignments` is the authenticated guest's own `tableAssignments` as-is
(same shape, no names needed — it's already "you"), `[]` when no valid
token was sent or that guest currently has no assignment for any event.

**Access model**: guid-gated **and** requires `celebrationInfo.isSitePublic
=== true` — unlike the main celebration/events/timeline/image routes above
(which are guid-alone), because unlike those this one returns guest names.
`404` (`{ "error": "Not found" }`) for a missing guid or `isSitePublic:
false`, same generic-404 convention as everywhere else in this file.

## `GET /api/public/access/confirm`

Guest 2FA — matches a visitor-supplied email/phone against one of a
celebration's own `guests`, issues a 6-digit one-time code, then verifies
that code and hands back an authenticated guest session token. Called
twice by the frontend's guest-login form (`GuestLoginForm`, shared by
`AccessGatePage`'s site-wide access gate and the reservation/RSVP page's
guest login): once without `code` to request one, again with it to verify.
Implemented in `lib/guestAccess.ts` (code generation/storage,
`GuestAccessCodes` collection, TTL-indexed) and `lib/guestSession.ts`
(the returned token — signed separately from the admin `og_session`
cookie, see `GUEST_SESSION_SECRET` in `.env.local.example`).

**Query params**:

| Param | Required | Notes |
| --- | --- | --- |
| `guid` | yes | The celebration's `guid`. |
| `contact` | yes | Email or phone the visitor entered — matched against a guest's `phone` (exact) or `email` (case-insensitive), same rule `GET /api/public/reservations/confirm` uses. |
| `code` | no | Omitted on the first call (request a code); present on the second (verify it). |

**What it checks, in order, both calls**:
1. `guid` resolves to a celebration, and that celebration is **active** —
   `celebrationDate` is set and the current time is still before
   `celebrationDate + 1 day`. `isSitePublic` is **not** checked (unlike
   `reservations/confirm`) — this endpoint is itself what implements the
   `isSitePublic: false` access gate, so it must keep working while a
   celebration isn't yet public.
2. `contact` matches exactly one of the celebration's `guests`.

Any failure at either step — no such `guid`, an inactive celebration, no
matching guest, or (verify call only) a wrong/expired code — returns the
same generic `404 { "error": "Not found" }`, so a caller can never tell
these apart from the outside (same rule as every other route in this
file — see "Authorization model").

**Step 1 — request a code** (no `code` param): generates a random 6-digit
code and stores it (10-minute expiry, replacing any code requested earlier
for the same guest — `TWO_FACTOR_CODE_EXPIRATION_MINUTES` in
`lib/twoFactorEmail.ts` is the source of truth `guestAccess.ts`'s TTL
derives from).

- **If `contact` matched the guest's `email`**, the code is delivered by
  email — `sendTwoFactorCodeEmail()` (`lib/twoFactorEmail.ts`) calls
  Brevo's transactional email API (`lib/brevo.ts`,
  `POST https://api.brevo.com/v3/smtp/email`) with `templateId: 1` and
  `params: { code, year, expirationMinutes: 10 }` (the Brevo template owns
  the actual subject/body/sender). The code is **withheld** from the
  response in this case:

  ```json
  { "success": true }
  ```

  A Brevo send failure (missing/invalid `BREVO_API_KEY`, API error, etc.)
  is logged as a `Security`/`error` action and returns
  `502 { "error": "Failed to send code" }` — the guest must retry.

- **If `contact` matched the guest's `phone`**, there's still no SMS
  delivery integration — the code is returned directly in the response
  body, same stand-in behavior as before:

  ```json
  { "success": true, "code": "042817" }
  ```

  Anyone who can reach this endpoint with a valid `guid`+phone `contact`
  can currently complete the login without possessing the actual phone,
  since the "second factor" is handed straight back to them. This gap is
  now closed for email contacts, not phone ones.

**Step 2 — verify** (`code` present): the code must match and not have
expired; it's single-use (deleted immediately on success, so it can't be
replayed). On success:

```json
{
  "success": true,
  "displayName": "Guest name",
  "maxAttendees": 2,
  "token": "<signed guest session token>",
  "expiresAt": "2032-09-13T00:00:00.000Z"
}
```

`displayName` is the matched guest's `name`; `maxAttendees` is their
`expectedAttendees` (`GuestItem` — see `CLAUDE.md` "Celebrations"),
defaulting to `1` if unset. `token` is a signed bearer token (HMAC-SHA256,
`GuestSessionPayload { celebrationId, guestId, contact, exp }`, verified
via `verifyGuestSessionToken()` in `lib/guestSession.ts`) — **not** yet
checked by any route in this repo; issuing it is as far as this endpoint's
scope goes today. `expiresAt` (also the token's own `exp`) is always
`celebrationDate + 1 day`, i.e. the same moment the celebration itself
stops being "active" per the check above.

**Errors**: `400` for a missing `guid`/`contact`. `404` per the checks
above.

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

## `GET /api/public/celebration/{guid}/live-events`

Returns the celebration's "Live Events" / "Happening Now" feed — guest-
submitted photos, each pinned to one of the celebration's own `events`
("location"). Same access model as the main celebration route: guid alone,
no `isSitePublic` check (visibility of the page itself is the frontend's
job, via `PrivacySiteGate`).

**Path param**: `guid` — the celebration's `guid`.

**200 response body**:

```json
{
  "liveEvents": [
    {
      "id": "...",
      "eventId": "...",
      "title": "First dance!",
      "description": "So much fun",
      "uploadedAt": "2032-09-12T19:04:00.000Z",
      "imageUrl": "/api/public/celebration/{guid}/live-events/{itemId}/image",
      "status": "published"
    }
  ]
}
```

Newest first. Unlike the admin's Live Events tab, this does **not** include
who uploaded each item — `uploadedByGuestId` is resolved server-side just
to attribute the write (see `POST` below), never returned here, per the
"guest list is never exposed publicly" rule (see "Deliberately excluded"
under the main celebration route). `title`/`description` are plain free
text as the guest typed them, not `LocalizedText` — unlike Events/Timeline
copy, this isn't admin-curated multilingual content. `status` is
`"pending"` or `"published"` (see `POST` below for how it's set) —
**this route does not filter by it**, every item is returned regardless
of status; there's no moderation UI yet to act on `"pending"` items, so
treat `status` as informational only for now.

**Errors**: `404` if the guid doesn't exist (`{ "error": "Not found" }`).

### `GET /api/public/celebration/{guid}/live-events/{itemId}/image`

Serves one live-event item's image — the public counterpart to
`/api/celebrations/[id]/live-events/[itemId]/image`, the same way the
timeline-image route is the public counterpart to its authenticated
equivalent. This is what `imageUrl` above points at. Same access model:
guid alone, no `isSitePublic` check. 404 if the guid or item doesn't exist.

### `POST /api/public/celebration/{guid}/live-events`

Adds one guest-submitted photo to the feed above. **POST, not GET**,
unlike the confirm endpoints — this carries a file upload and free-text
content, not something meant to be a clickable link.

**Path param**: `guid` — the celebration's `guid`.

**Request body**: `multipart/form-data`.

| Field | Required | Notes |
| --- | --- | --- |
| `eventId` | yes | Must match the `id` of one of this celebration's own `events` — the "location" dropdown is a closed set, not free text. |
| `contact` | yes | Email or phone. Matched against this celebration's guests exactly like `GET /api/public/reservations/confirm` (`phone` exact, `email` case-insensitive) — this endpoint re-matches `contact` itself on every call rather than requiring the guest to be logged in. See `POST /api/public/live-events` below for the token-authenticated equivalent. |
| `title` | yes | Free text, as typed by the guest. |
| `description` | no | Free text. |
| `image` | yes | The photo file. |

**What it checks, in order**:
1. `guid` resolves to a celebration, and that celebration's
   `isSitePublic` is `true` — otherwise `404` (same as reservations
   confirm; unlike that endpoint, there's no "celebration date must be in
   the future" check, since Live Events posts happen during/after the
   event, not before it).
2. `eventId` matches one of the celebration's `events` — otherwise `400`.
3. `contact` matches exactly one guest — otherwise `404`.

On success, stores the image (same per-celebration `live-events` upload
folder the admin's Live Events tab reads from) and appends a
`LiveEventItem` with `uploadedByGuestId` set to the matched guest and
`status` set from `celebrationInfo`'s (unexposed) `isConfirmationRequiredOnLiveEvents`
setting — `"pending"` when that flag is `true` (the default), `"published"`
when the celebration has opted out of requiring confirmation — writes a
`LogActions` entry (`category: "Celebrations"`, `userId: "public"`, same
convention as the confirm endpoints), and returns the created item.

**200 response body**: same shape as one item in the `GET` feed above,
`201` status.

**Errors**: `400` for a missing `eventId`/`contact`/`title`/`image`, or an
`eventId` that doesn't match any event. `404` per the checks above.

## `POST /api/public/live-events`

Adds one guest-submitted photo, same as `POST /api/public/celebration/{guid}/live-events`
above, but for a **logged-in guest** instead of one who re-supplies their
`contact` on every call. Identity comes entirely from the
`Authorization: Bearer <token>` header — the guest session token
`GET /api/public/access/confirm`'s verify step returns (see
`lib/guestSession.ts`) — so unlike every other route in this file, there's
no `guid` in the URL and no `contact` field in the body: `celebrationId`,
`guestId`, and `contact` are all decoded from the token itself.

**CORS note**: a request carrying `Authorization` isn't a CORS "simple
request" (unlike the guid+contact endpoint's plain `multipart/form-data`
POST, which never triggers one), so a browser sends an `OPTIONS` preflight
first — this route answers that with a bare `204`, and `next.config.ts`'s
`headers()` is what actually grants `POST` + `Authorization` for
`/api/public/:path*` (previously only `GET, OPTIONS` were allowed there).

**Headers**: `Authorization: Bearer <token>` — required. Missing, malformed,
or expired/invalid → `401 { "error": "Unauthorized" }`. A token whose
`guestId` no longer matches any of the celebration's current guests (e.g.
an admin deleted that guest after the token was issued) also `401`s the
same way.

**Request body**: `multipart/form-data`.

| Field | Required | Notes |
| --- | --- | --- |
| `eventId` | yes | Must match the `id` of one of the token's celebration's own `events`. |
| `title` | yes | Free text, as typed by the guest. |
| `description` | no | Free text. |
| `image` | yes | The photo file. |

**What it checks, in order**: token is valid and unexpired (`401` if not)
→ its `celebrationId` resolves to a celebration whose `isSitePublic` is
`true` (`404` if not — same gate as the guid+contact endpoint) → its
`guestId` still matches one of that celebration's guests (`401` if not) →
`eventId` matches one of the celebration's `events` (`400` if not).

On success: identical write behavior to `POST /api/public/celebration/{guid}/live-events`
above (same `isConfirmationRequiredOnLiveEvents`-driven `status`/`publishedAt`
logic, same upload storage, same `LogActions` entry shape) — see that
section for the details, not repeated here.

**200 response body**: same shape as one item in the `GET` feed above,
`201` status.

**Errors**: `401` for a missing/invalid/expired token or an unknown
`guestId`. `404` if the celebration isn't public. `400` for a missing
`eventId`/`title`/`image`, or an `eventId` that doesn't match any event.
