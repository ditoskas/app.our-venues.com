# O Gamos Mas — Backend / Admin

## What this is

The backend/admin application for **o-gamos-mas.com**, a wedding and
christening ("baptism") planning platform. This app is the internal
**admin interface** used to manage celebrations (marriages and
christenings), the professionals and couples involved, event schedules,
guest lists, and the couple's "story" content that gets published on the
public-facing site.

There is no public-facing UI in this repo — this is admin-only. The
public-facing frontend that visitors (and couples) actually see is a
**separate sibling repo/project**:
`C:\ThinkPositive\o-gamos-mas.com\frontend.o-gamos-mas.com` (React 19 +
Vite, its own `CLAUDE.md`) — it consumes this backend's unauthenticated
`/api/public/**` routes (see "Talking to the backend" in its `CLAUDE.md`,
and **`PUBLIC-API.md`** in this repo for the actual contract — read that
file alongside this one; it's the source of truth for every public
endpoint's request/response shape) rather than sharing any code with this
repo. If a task is actually about the public site's UI/UX (the couple's
story page, the guest-facing invitation, etc.) rather than the admin, it
likely belongs in that repo, not this one.

## Tech stack

- **Next.js 16** (App Router, TypeScript, Turbopack) — see `AGENTS.md` for
  version-specific API notes; this Next.js release has breaking changes
  vs. older training data, so consult `node_modules/next/dist/docs/`
  before assuming an API.
- **MongoDB** (official `mongodb` driver, no ODM) as the database.
- **Tailwind CSS v4** (CSS-first config via `@theme`, no `tailwind.config.js`).
- **next-intl** for i18n (see "Internationalization" below).
- **lucide-react** for icons — use it for any icon, don't hand-roll inline
  SVGs or reach for a different icon set.
- React 19.

## Structure

The whole Next.js project — config included — lives under `src/` at the
repo root; the true repo root only holds `.git` and `.idea`. Run all `npm`
commands from inside `src/`.

```
src/
  app/
    [locale]/            Every route lives under the locale segment
      (app)/               Route group: authenticated app shell (no URL segment)
        layout.tsx           Fetches current user, renders <Navbar/> + <main>;
                              redirects to /login if somehow reached unauthenticated
                              (defense-in-depth — the proxy already gates this)
        actions.ts            logoutAction()
        page.tsx              Dashboard
        couples/, story/, events/, guests/  Still placeholders
        celebrations/          Full CRUD, Root + Professional only — see
                               "Celebrations" below
          page.tsx               Server: fetches + serializes (+ professionals
                                 list for Root), renders Manager
          CelebrationsManager.tsx  Client: PageHeader (title + search + New)
                                   + table + FormDialog
          CelebrationForm.tsx       Create/edit form: title, type select,
                                    ProfessionalPicker (Root only), husband/wife
                                    fieldsets
          DeleteCelebrationButton.tsx  Icon + two-step confirm
          actions.ts              Server actions: create/update/delete, each
                                   re-checking role + professional ownership
                                   and best-effort provisioning Couple users
          spouses.ts               readSpouse()/createSpouseUserIfMissing() —
                                   shared by this actions.ts and [id]/actions.ts
                                   (both submit/save husband+wife fields)
          [id]/                   Full-width "View" page — tabs, see
                                  "Celebrations" below
            access.ts               requireCelebrationAccess() — role +
                                    ownership check shared by layout.tsx
            layout.tsx               Back link + title + tabs nav, wraps
                                     every tab route below
            CelebrationTabsNav.tsx    Client: horizontal tab links (real
                                      sub-routes, active state via usePathname)
            page.tsx                 Celebration Info tab (default,
                                     `/celebrations/[id]`) — real form
            CelebrationInfoForm.tsx   Client form for the Celebration Info tab
            couple-info/page.tsx      Couple Info tab — real form
            CoupleInfoForm.tsx        Client form: husband/wife fieldsets,
                                      same shape as CelebrationForm.tsx's
            story/page.tsx            Story tab — real: StoryForm + TimelineManager
            StoryForm.tsx              Client form: storyTitle/storySubtitle/
                                       storyParagraph
            TimelineManager.tsx        Client: table + FormDialog for the
                                       timeline sub-list (own Add button, no
                                       PageHeader — this is a section within
                                       a tab, not its own page)
            TimelineItemForm.tsx       Create/edit form used inside the
                                       dialog: title/description/date/image
            DeleteTimelineItemButton.tsx  Icon + two-step confirm, scoped to
                                          one timeline item
            events/page.tsx           Events tab — real: EventsManager only
                                      (no fields-above-the-list, unlike Story)
            EventsManager.tsx          Client: table + FormDialog for
                                       events: EventItem[] (own Add button,
                                       no heading — see "Events" below)
            EventItemForm.tsx          Create/edit form used inside the
                                       dialog: title/description/date, a
                                       "Location" fieldset (country/city/
                                       area/address/postCode), and the
                                       Google Maps Point fieldset
            GoogleMapPicker.tsx        Client wrapper around the Google Maps
                                       JS API — draggable-marker map +
                                       imperative geocode() (see "Events"
                                       below)
            DeleteEventItemButton.tsx  Icon + two-step confirm, scoped to
                                       one event item
            guests/page.tsx           Guests tab — real: GuestsManager only
                                      (same no-heading shape as Events)
            GuestsManager.tsx          Client: table + FormDialog for
                                       guests: GuestItem[] — Communication
                                       column (phone/email) reuses the
                                       Professionals-list pattern (see
                                       "Professionals" above)
            GuestItemForm.tsx          Create/edit form used inside the
                                       dialog: name/phone/email/
                                       expectedAttendees/confirmedAttendees/
                                       confirmationDate
            DeleteGuestItemButton.tsx  Icon + two-step confirm, scoped to
                                       one guest item
            actions.ts               updateCelebrationInfoAction(),
                                     updateCelebrationCoupleAction(),
                                     updateCelebrationStoryAction(),
                                     create/update/deleteTimelineItemAction(),
                                     create/update/deleteEventItemAction(),
                                     create/update/deleteGuestItemAction()
                                     — separate from the list's actions.ts,
                                     each saves only its own tab's fields; all
                                     share a local assertTabAccess() helper
        professionals/        Full CRUD, Root-only — the reference example
                               for the "Page structure" pattern below
          page.tsx               Server: fetches + serializes, renders Manager
          ProfessionalsManager.tsx  Client: PageHeader (title + search + New)
                                   + table + FormDialog
          ProfessionalForm.tsx      Create/edit form (used inside the dialog)
          DeleteProfessionalButton.tsx  Icon + two-step confirm
          actions.ts              Server actions: create/update/delete
                                   (each re-checks role — see "Authentication")
        profile/
          page.tsx, actions.ts, ProfileForm.tsx, ChangePasswordForm.tsx
        settings/
          layout.tsx         Two-column shell: <SettingsSidebar /> + content
          page.tsx            General settings (placeholder)
          users/               Users CRUD — same Manager+FormDialog pattern
                               as professionals/
            page.tsx, UsersManager.tsx, UserForm.tsx, DeleteUserButton.tsx,
            actions.ts
          subscription-packages/  Root-only CRUD, same pattern — no file
                                  upload, the simplest example to copy
            page.tsx, SubscriptionPackagesManager.tsx,
            SubscriptionPackageForm.tsx, DeleteSubscriptionPackageButton.tsx,
            actions.ts
          log-actions/page.tsx  Read-only LogActions audit viewer
      login/                Public — outside the (app) group, so no navbar
        page.tsx, actions.ts, LoginForm.tsx
      layout.tsx           Root layout: fonts, <NextIntlClientProvider> — sets
                            <html lang>. No Navbar here (that's (app)/layout.tsx),
                            so /login renders without the app chrome.
    api/
      professionals/[id]/logo/route.ts  Serves an uploaded logo file — outside
                                         [locale], not gated by proxy.ts (its
                                         matcher excludes /api), so it does its
                                         own auth check
      celebrations/[id]/timeline/[itemId]/image/route.ts  Serves one timeline
                                         item's image — same outside-proxy.ts
                                         auth pattern, plus the Professional-
                                         ownership check (celebrations are
                                         per-row scoped, professionals' logo
                                         route isn't)
      celebrations/[id]/hero-background/route.ts  Serves a celebration's
                                         hero background image — same
                                         pattern as the timeline-image
                                         route just above
      celebrations/[id]/invitation/route.ts  Serves a celebration's
                                         invitation image — same pattern
                                         as hero-background just above
      public/                 Unauthenticated routes — no getCurrentUser()
                              check at all. The celebration/timeline-image/
                              hero-background/invitation reads below are
                              gated by guid alone (isSitePublic isn't
                              checked); the confirm route still requires
                              isSitePublic too. See PUBLIC-API.md for the
                              full contract.
        celebration/[guid]/route.ts  GET — celebration/couple/timeline/
                                     events data for one public celebration
        celebration/[guid]/timeline/[itemId]/image/route.ts  GET — public
                                     counterpart to the authenticated
                                     timeline-image route above
        celebration/[guid]/hero-background/route.ts  GET — public
                                     counterpart to the authenticated
                                     hero-background route above
        celebration/[guid]/invitation/route.ts  GET — public counterpart
                                     to the authenticated invitation route
                                     above
        reservations/confirm/route.ts  GET (query params) — records a
                                     guest's RSVP by phone/email match
        access/confirm/route.ts  GET (query params) — STUB, always returns
                                     success, no lookup/code logic yet. See
                                     PUBLIC-API.md.
    globals.css            Tailwind import + design tokens (@theme) + .input
    favicon.ico
  components/
    Navbar.tsx             Top nav, active-link highlighting, <UserMenu />
    UserMenu.tsx             Display-name dropdown (<details>-based, no client
                              state needed): Profile link + Logout button
    SettingsSidebar.tsx     Settings sub-nav (General / Users /
                             Subscription Packages / LogActions)
    PlaceholderPage.tsx     Shared "coming soon" shell, keyed by pageKey
    PageHeader.tsx          Title + optional `middle` slot (e.g. a search
                             input, flex-1, between title and action) +
                             optional right-aligned action — see
                             "Page structure" below
    FormDialog.tsx          Native <dialog>-based modal shell for create/edit
                             forms — see "Page structure" below
    ProfessionalPicker.tsx  Dependency-free searchable combobox for picking a
                             professional by company name — text input +
                             filtered dropdown + hidden input carrying the
                             real `professionalId`; used by Celebrations' form
                             for the Root role — see "Celebrations" below
  assets/
    seed/                  Source files for seed data (a logo image,
                            timeline/ — 3 JPEGs for the seeded celebration's
                            timeline) — not served to the browser, only
                            read by seed.ts
  i18n/
    routing.ts              defineRouting: locales el|en|ru, default el
    navigation.ts            Localized Link/redirect/usePathname/useRouter — use
                              these, never next/link or next/navigation, for
                              anything that renders a URL
    request.ts                getRequestConfig — loads messages/<locale>.json
  messages/
    el.json, en.json, ru.json   Translation catalogs, kept in key-parity
  lib/
    mongodb.ts             getDb() — lazy MongoClient singleton
    logActions.ts           logAction()/listLogActions() — LogActions collection
    users.ts                 User/Role types + CRUD (bcryptjs password hashing)
    professionals.ts          Professional type + CRUD (see "Professionals")
    celebrations.ts             Celebration/CelebrationType/Spouse type + CRUD
                               (see "Celebrations")
    subscriptionPackages.ts    SubscriptionPackage type + CRUD (see
                               "Subscription Packages")
    uploads.ts                 Filesystem helpers for uploaded files under
                               UPLOADS_DIR — see "File uploads"
    googleMaps.ts               "use client" — loadGoogleMaps(apiKey), the
                               Maps JS API script-tag loader used by
                               GoogleMapPicker.tsx (see "Events")
    seed.ts                   runSeeders() — idempotent seed for the root
                               user, test professional, and the two starter
                               subscription packages
    session.ts                Pure session-token sign/verify (Web Crypto,
                               Edge-safe) — no next/headers, importable from proxy.ts
    auth.ts                    Cookie I/O + getCurrentUser()/getCurrentUserId()/
                               requirePageRole() (next/headers — Node/RSC only,
                               never import from proxy.ts)
  proxy.ts (repo src root)  Composes next-intl's locale middleware with the auth
                             gate (redirects unauthenticated requests to /login)
                             (Next 16 renamed "middleware" to "proxy")
  instrumentation.ts        register() — runs runSeeders() once at server boot
  global.d.ts               next-intl typed-messages augmentation
  public/
  package.json, tsconfig.json, next.config.ts (wrapped with
  createNextIntlPlugin), eslint.config.mjs, postcss.config.mjs, .gitignore,
  .env.local.example, README.md, AGENTS.md, PUBLIC-API.md (see "What this
  is" above — the contract for every /api/public/** route)
```

Import alias `@/*` resolves to `src/*` (i.e. `src/app`, `src/components`,
`src/lib`, `src/i18n`, relative to the `src/` project root).

## Application shape

Every page requires login except `/login` itself (enforced by `proxy.ts`
— see "Authentication" below). Once authenticated: a full-width sticky top
**navbar** + a **body** region (`<main>`) that each route renders into.
Navbar sections, in order:

Celebrations · Professionals · Settings

`Navbar.tsx`'s `NAV_KEYS` deliberately does **not** list every route that
exists — Couples/Story/Events/Guests (see below) still have live pages at
`/couples`, `/story`, `/events`, `/guests`, they're just not linked from
the top nav (removed on purpose, not an oversight; don't "fix" this by
adding them back without being asked). Profile (see below) was never in
the nav to begin with, by the same logic — reachable only via the user
menu.

...plus, on the right: a **user menu** (display name with a dropdown —
`UserMenu.tsx`) containing **Profile** and **Log out**. There is no
standalone language switcher in the navbar — language is a per-user
preference (`defaultLocale`) changed on the Profile page, not a per-visit
toggle. (If a temporary "view in another language" switcher is wanted
later, that's a deliberate reintroduction, not a bug fix — it was removed
on purpose.)

Celebrations and Professionals have full CRUD UIs. Couples/Story/Events/Guests
each currently render a placeholder page (`<PlaceholderPage pageKey="..." />`)
— real data/CRUD UIs still need to be built out per section, following the
pattern already used for Celebrations/Professionals/Users. These four are no
longer in the navbar (see above) but their routes/pages are still live —
this is unrelated to whether each one eventually needs a real UI.

**Profile** (`/profile`) — the logged-in user's own self-service page: two
sections, "Account" (display name + default language, saved together via
`updateProfileAction`) and "Change password" (current + new + confirm,
via `changePasswordAction`, which re-verifies the current password before
allowing the change). Not reachable from the main navbar — only via the
user menu.

**Settings** is its own sub-area with a left sidebar
(`SettingsSidebar.tsx`) and its own routes under `settings/`:

- **General** (`/settings`) — placeholder, branding/app-wide prefs.
- **Users** (`/settings/users`) — full CRUD user management (see "Users &
  roles" below).
- **Subscription Packages** (`/settings/subscription-packages`) — full
  CRUD, **actually Root-only** (enforced — see "Subscription Packages"
  below), unlike Users/LogActions.
- **LogActions** (`/settings/log-actions`) — read-only viewer over the
  `LogActions` audit collection.

Users and LogActions are meant to be **Root/Professional only** — this
role-based restriction is **not yet enforced**. The proxy only checks
"logged in or not"; it doesn't check `role`. Any authenticated user
(including a `Couple`) can currently reach every route. Enforcing the
Root/Professional-only restriction on these two pages specifically is a
TODO — don't assume it's already gated by role.

## Page structure

**This is the standard shape for every list/CRUD page — follow it for any
new section (Celebrations, Couples, etc.) when it graduates from a
placeholder to real data.** `professionals/` is the reference
implementation; `settings/users/` follows the same pattern.

- **No eyebrow text.** Pages used to show a small "O Gamos Mas Admin"
  kicker above the title — that's gone. A page header is just
  `<PageHeader title={...} />` (`src/components/PageHeader.tsx`): the
  title on the left, and an optional `action` node right-aligned on the
  **same row** — for a CRUD page, that's the "New X" button. (The
  dashboard's own "Welcome back" greeting is a different, intentional
  thing — not this pattern — and stays as-is.)
- **List pages with more than a couple of rows get a search box.**
  `PageHeader` accepts an optional `middle` node (`flex-1`, sitting
  between the title and the action, so it stretches to fill the space up
  to the button) — pass a `<input type="search" className="input" .../>`
  there, bound to `useState` in the Manager component. Filtering itself
  is a plain client-side `useMemo` over the already-fetched records
  (lower-cased substring match joining every searchable field into one
  haystack string) — no server round-trip. Professionals and Celebrations
  both do this (`ProfessionalsManager.tsx`, `CelebrationsManager.tsx`) —
  follow the same shape for any future list page with a nontrivial
  number of rows.
- **Create and edit both happen in one modal, not separate pages.**
  There's no more `/settings/users/[id]/edit`-style route. Clicking the
  header's "New X" button, or a row's edit action, opens the *same*
  `<FormDialog>` (`src/components/FormDialog.tsx` — a native `<dialog>`
  wrapped with open/close plumbing: `showModal()`/`close()`, click-outside
  and Esc close it, no extra dependency). It's centered with explicit
  `fixed` + `top-1/2 left-1/2` + transform, **not** the browser's default
  `dialog { margin: auto }` centering — Tailwind's preflight reset zeroes
  that margin out, so relying on the UA default leaves it pinned to the
  top-left. Keep the explicit centering if you touch this component. The
  list page/section is a
  small "Manager" **Client Component** (e.g. `ProfessionalsManager.tsx`,
  `UsersManager.tsx`) holding `useState` for which mode the dialog is in
  (`{ mode: "create" }` / `{ mode: "edit", record }` / `null`); the entity
  form component (`ProfessionalForm.tsx`, `UserForm.tsx`) is reused
  as-is for both modes and rendered inside the dialog.
  - The Server Component `page.tsx` only fetches data, **serializes** it
    (Mongo `ObjectId`/`Date` aren't passable to a Client Component — map
    to a plain `Serialized<Entity>` type with `_id: string`), and renders
    `<XManager records={serialized} />`.
  - The create/update Server Actions are unchanged by this pattern — they
    still `redirect()` back to the list route on success, which (since
    you're already there) just refreshes the data and — as a side effect
    of the full page re-render — leaves the dialog closed.
- **Table's last column is "Actions"** (the `common.actions` message key,
  right-aligned header), containing **icon buttons, not text links** —
  edit (`Pencil` from lucide-react) and delete (`Trash2`). Every icon
  button carries both `title` and `aria-label` set to the same translated
  string (e.g. `t("edit")`) — the icon has no visible label, so the
  tooltip/accessible-name text is mandatory, not optional polish. Delete
  keeps its existing two-step confirm (click → `Check`/`X` icons to
  confirm/cancel) rather than a native `confirm()` dialog.
- Row thumbnails (e.g. a logo), if any, go in their own unlabeled leading
  column, before the data columns.
- **Every table body row is zebra-striped**: `<tr className="odd:bg-surface
  even:bg-accent-soft/15">` (log-actions' row keeps its own `align-top`
  alongside it — append, don't replace, if a row already has a
  className). The tint is a lighter cut of the same `accent-soft` token
  already used for the header row's `bg-accent-soft/40`, so header and
  body read as one coherent warm-gold family rather than two unrelated
  colors. Apply this to any new table's `<tr>`, not just the ones that
  existed when this was added.

## Design language

Premium/elegant wedding aesthetic, intentionally light-only (no dark mode):
ivory background, deep charcoal text, antique-gold accent (`#c8a241` /
`#9b7a27` — deliberately more saturated/golden than a plain muted brown,
per an explicit design note; don't drift it back toward brown). Headings use a
serif display font (`Playfair Display`, exposed as `font-serif`); body/UI
text uses `Inter` (`font-sans`). Color tokens are defined once in
`src/app/globals.css` under `@theme inline` (`--color-background`,
`--color-surface`, `--color-foreground`, `--color-muted`, `--color-border`,
`--color-accent`, `--color-accent-dark`, `--color-accent-soft`) — use these
Tailwind utility classes (`bg-surface`, `text-accent-dark`, etc.) rather
than hardcoding hex values.

## MongoDB

- Connection helper: `src/lib/mongodb.ts` — exports a `getDb()` helper only.
  The `MongoClient` is created **lazily**, on first real use — not at
  module import time — and cached (on `global` in development, so hot
  reload doesn't open new connections each save). This matters: Next.js
  imports route modules just to collect metadata (even for pages that
  opt out of static rendering), so throwing at import time when
  `MONGODB_URI` is unset breaks the production build. Keep any future
  top-level DB setup lazy for the same reason.
- Required env vars (see `.env.local.example`, copy to `.env.local`):
  `MONGODB_URI`, `MONGODB_DB`.
- Collections so far: `Users` (see "Users & roles"), `Professionals` (see
  "Professionals"), `SubscriptionPackages` (see "Subscription Packages"),
  `LogActions` (see "Action logging"). No ODM — plain typed driver calls
  in `src/lib/*.ts`.
- Pages that read live DB data (e.g. `settings/users`,
  `settings/log-actions`) export `export const dynamic = "force-dynamic";`
  so Next never tries to prerender them at build time with stale/no data.
  Do the same for any new DB-backed page.
- If the DB is unreachable, only DB-backed pages/actions should fail — the
  rest of the app (placeholder pages, etc.) must keep working. This is why
  `instrumentation.ts` wraps `runSeeders()` in try/catch: an error thrown
  from `register()` crashes the *entire* Next.js server at boot, not just
  the feature that needed the DB.

## Users & roles

- Collection: `Users` (`src/lib/users.ts`). Fields: `displayName`,
  `username` (login identifier — an email in practice, but just a unique
  string), `passwordHash` (bcryptjs, 10 rounds — never store or log the
  plaintext password), `role`, `professionalId` (set iff `role ===
  "Professional"`), `coupleId` (set iff `role === "Couple"`),
  `defaultLocale` (`"el" | "en" | "ru"` — the locale a user lands in right
  after login and always renders in; changed only via their own Profile
  page — there's no separate per-visit language toggle), `createdAt`.
  Unique index on `username` (created by `ensureUserIndexes()`).
- **A record written before `defaultLocale` existed may not have it.**
  Every read site falls back with `?? routing.defaultLocale` — keep doing
  that in new code rather than assuming the field is always present.
- Roles: `"Root" | "Professional" | "Couple"`. **Root has access
  everywhere.** Professional scoping now has a real precedent in
  Celebrations (see "Celebrations" below): a Professional user is
  restricted to records where `professionalId` matches their own — apply
  the same `resolveProfessionalId`-style pattern (never trust a
  client-submitted `professionalId`/`coupleId` for the scoped role) to
  any future section with per-row ownership. Couple scoping is still
  undefined beyond "a Couple user exists, linked via `coupleId`" — treat
  it as "to be designed" for now. (See "Application shape" above:
  role-based *route* gating for Users/LogActions is a separate
  unimplemented TODO.)
- Admin-side full CRUD (any user managing *other* users) lives at
  `/settings/users`, dialog-based per "Page structure" above, via Server
  Actions in `src/app/[locale]/(app)/settings/users/actions.ts`.
- Self-service (a user managing *their own* account — display name,
  default language, password) lives at `/profile` — see "Application
  shape" above and "Authentication" below.
- **Seeding**: `src/lib/seed.ts` → `runSeeders()` is idempotent (checks
  `getUserByUsername`/company name before inserting) and creates one Root
  user if missing: display name "Dimitris Toskas", username
  `ditoskas@gmail.com`. It's invoked automatically from
  `src/instrumentation.ts`'s `register()` hook on every server boot (dev
  and prod) — no manual seed command to remember to run. Add further
  seed data by extending `runSeeders()`.

## Professionals

- Collection: `Professionals` (`src/lib/professionals.ts`). Fields:
  `companyName`, `contactPerson`, `phone`, `mobile`, `email` (all
  required), `website`, `country`, `city`, `address`, `postCode`
  (optional), `logoFilename` (set once a logo is uploaded — see "File
  uploads"), `createdAt`.
- **`/professionals` is Root-only** — the first page in this app with
  real role gating (everything else so far only checks "logged in or
  not," per the TODO under "Application shape"). Enforced **twice**:
  - Page-level: `await requirePageRole(["Root"])` at the top of
    `professionals/page.tsx` (`src/lib/auth.ts`) — redirects to `/login`
    if unauthenticated, otherwise `notFound()` (a plain 404, not a
    "forbidden" page — deliberately doesn't confirm the route exists to
    the wrong role) if the role doesn't match.
  - Action-level: each Server Action in `professionals/actions.ts`
    independently re-checks `(await getCurrentUser())?.role === "Root"`
    before doing anything. This is **not redundant** — actions are
    directly invokable and don't go through the page's render path, so
    the page-level check alone wouldn't protect them.
  - `requirePageRole` only works in a Server Component (page/layout) —
    `notFound()`/`redirect()` rely on the render tree's error boundaries,
    which a Server Action doesn't have. Follow the same
    page-vs-action split for any future role-gated section.
- Full CRUD UI follows "Page structure" above:
  `ProfessionalsManager.tsx` (dialog state + search), `ProfessionalForm.tsx`
  (shared create/edit form, includes the logo `<input type="file">` and,
  in edit mode, a preview `<img>` of the current logo).
- **List table has a single "Communication" column**, not separate
  Phone/Email columns — it stacks phone/mobile/email vertically, each a
  clickable `tel:`/`mailto:` link with a small leading lucide icon
  (`Phone`/`Smartphone`/`Mail`), rendered only if that field is set. This
  is the standard way to display contact info in any list table — Celebrations'
  husband/wife cells (`SpouseCell` in `CelebrationsManager.tsx`) reuse the
  same pattern.
- **Seeding**: `runSeeders()` also creates one "Test Company" professional
  (contact "Test Person", phone `0123456789`, mobile `9876543210`, email
  `test@o-gamos-mas.com`) with a placeholder logo copied from
  `src/assets/seed/test-company-logo.png`. Idempotency check is by
  `companyName` (no unique index on it, unlike `Users.username` — fine
  for a single seed record, would need a proper lookup if more seed
  professionals are ever added).
- **Every Professional gets a matching login**, created alongside it —
  `createLinkedUser()`/`syncLinkedUser()` in `professionals/actions.ts`
  (and the seeder's own inline equivalent, for the seeded Test Company):
  `role: "Professional"`, `professionalId` set to the professional's own
  id, `displayName` = company name, `username` = the professional's
  email, password `PROFESSIONAL_USER_PASSWORD` (`src/lib/users.ts` —
  currently `"Test123456!"`, shared by the action and the seeder so they
  can't drift apart).
  - **Create**: inserts the linked user right after the professional.
  - **Update**: `syncLinkedUser()` looks the user up by `professionalId`
    (`getUserByProfessionalId()`) and updates its `displayName`/
    `username` to match the professional's current `companyName`/`email`
    — password and `defaultLocale` are left untouched.
  - Both are **best-effort**: a failure (most likely a duplicate
    `username` — e.g. the new email is already taken by another user)
    logs a `Security`/`warning` action but does **not** roll back or fail
    the professional create/update. Don't change this to a hard failure
    without confirming that's actually wanted — the professional record
    is the primary thing being saved.
  - **Delete does not currently delete the linked user** — deleting a
    professional leaves its Professional-role user account behind,
    `professionalId` now pointing at nothing. This is a known gap, not a
    considered decision — if you touch `deleteProfessionalAction`,
    consider whether the linked user should be deleted too.

## Celebrations

A celebration is either a **Marriage** or a **Christening** — the two are
the same entity/collection/route, distinguished only by a `type` field.
This was a rename from an earlier "Marriages" model; if you find a stray
reference to "marriage"/"wedding" as a *code identifier* (not a literal
string like a seeded title or the `"Marriage"` type value) outside a
comment or prose, it's a leftover that should be renamed to match this
section.

- Collection: `Celebrations` (`src/lib/celebrations.ts`). Every celebration
  gets a **`guid`** (`randomUUID()`, generated server-side in
  `createCelebration()` — never user-entered, not part of
  `CelebrationInput`) with a **unique index** (`ensureCelebrationIndexes()`,
  called from `runSeeders()` at boot the same way `ensureUserIndexes()`
  already is). It's shown on the list (`CelebrationsManager.tsx`) right
  under the title, in `text-accent-dark` monospace to visually separate it
  from the row's other data, as a click-to-copy button (`GuidCell`,
  `navigator.clipboard.writeText`, a `Copy`→`Check` icon swap for 1.5s
  feedback — clipboard failures are swallowed silently since the GUID
  text is still visible to select by hand) — it's also indexed into the
  list's search. Core fields (set
  from the create/edit dialog, see `CelebrationInput`): `title` (e.g.
  "Dimitris & Maria Marriage"), `type` (`CelebrationType`:
  `"Marriage" | "Christening"`), `professionalId`, `husband`/`wife` (each a
  `Spouse`: `firstName`, `lastName` required, `email`/`mobile` optional),
  `createdAt`. Plus "Celebration Info" fields (set from the View page's
  first tab, see `CelebrationInfoInput` and "View page" below, all
  optional except the six booleans): `celebrationDate`, `childGender`
  (`"Boy" | "Girl"`, only ever shown/settable on the form when
  `type === "Christening"` — drives the guest frontend's theme, see
  `PUBLIC-API.md`'s celebration route and `frontend.o-gamos-mas.com`'s
  CLAUDE.md "Theme"), `headline`,
  `quote`, `countdownParagraph` (these three are `LocalizedText` — see
  "Translatable fields" below), `activeLanguages` (`AppLocale[]`, see the
  same section), `maxGuestsPerInvitation`, `showMaxGuests`, `showSeating`,
  `showLive`, `showReservation`, `isSitePublic`. Plus
  `heroBackgroundFilename`/`invitationFilename` —
  also Celebration Info fields, but set separately from the rest via file
  upload (see "Hero Background"/"Invitation" below), the
  same way `Professional.logoFilename` is separate from the rest of
  `ProfessionalInput`. Plus "Story" fields (set from the Story tab, see
  `CelebrationStoryInput`, all optional, `LocalizedText` — see
  "Translatable fields" below): `storyTitle`,
  `storySubtitle`, `storyParagraph`, and `timeline: TimelineItem[]` (each
  item: `id`, `title: LocalizedText`, optional `description:
  LocalizedText`/`date`/`imageFilename`). Plus `events: EventItem[]` (set
  from the Events tab, no separate input type — each item: `id`, `title:
  LocalizedText`, optional `description: LocalizedText`/`area`/`date`/
  `city`/`address`/`postCode`/`country`/`mapLat`/`mapLng`). Plus `guests:
  GuestItem[]` (set from the Guests tab, no separate input type — each
  item: `id`, `name` required, optional `phone`/`email`/
  `expectedAttendees`/`confirmedAttendees`/`confirmationDate`/
  `deniedDate` — the last two are mutually exclusive in practice, see
  "Guests" below and `PUBLIC-API.md`'s reservations/confirm endpoint,
  which is what actually sets them from outside the admin). This is
  still a growing model —
  more will be added to a celebration record later via other
  actions/tabs, so don't assume this
  shape is final. In particular, `husband`/`wife` haven't been redesigned
  for the Christening type yet (no godparent/child fields) — that's
  expected, not a bug, until a future action tackles it.
- **Translatable fields**: `headline`/`quote`/`countdownParagraph` and
  `storyTitle`/`storySubtitle`/`storyParagraph` on the celebration itself,
  and `title`/`description` on each `TimelineItem`/`EventItem`, are
  `LocalizedText` (`lib/celebrations.ts`) —
  `Partial<Record<AppLocale, string>>`, i.e. `{ el?, en?, ru? }` keyed by
  the same locales `i18n/routing.ts` defines for the admin app itself. Only
  languages that have actually been filled in are stored (an object with
  just `{ el: "..." }` simply hasn't been translated to `en`/`ru` yet); `el`
  is the primary/required language wherever the field itself is required
  (event/timeline `title`) — enforced via `readLocalizedText()`'s
  `!title?.el` check in `[id]/actions.ts`, not at the database level. Every
  other field on a celebration (`title` itself, event `area`/`city`/
  `address`/`postCode`/`country`) stays single-language/admin-only —
  translation was scoped deliberately to guest-facing free text, not
  internal labels or location data.
  - **Editing**: `LocalizedField.tsx` (`celebrations/[id]/`) is the shared
    client component — one label, a ΕΛ/EN/RU tab strip
    (`celebrations.languages.{el,en,ru}` for the tooltip text) to pick
    which language is visible, and one `<input>`/`<textarea>` per locale
    always mounted (just hidden via a `hidden` class when its tab isn't
    active) named `${name}.el` / `${name}.en` / `${name}.ru` — so switching
    tabs never loses what was typed in another language, and a normal
    `FormData` submit picks up all three regardless of which tab was last
    open. `required` only applies to the `el` input. Used by
    `CelebrationInfoForm.tsx` (headline/quote/countdownParagraph),
    `StoryForm.tsx` (storyTitle/storySubtitle/storyParagraph), and
    `EventItemForm.tsx`/`TimelineItemForm.tsx` (title/description).
  - **Reading the form**: `readLocalizedText(formData, name)` in
    `[id]/actions.ts` reads those three same-named inputs back into a
    `LocalizedText`, trimming each and dropping empty languages; returns
    `undefined` if none were filled in at all (same "field entirely unset"
    convention `updateCelebrationInfo()` already used for plain strings).
  - **Displaying one value** (admin tables, `LogActions` messages, where
    only one string fits): `localizedLabel()` in `celebrations/[id]/
    localizedText.ts` — `el ?? en ?? ru ?? ""`, i.e. prefer the primary
    language, fall back to whichever other one is actually set.
  - **Public API**: `GET /api/public/celebration/{guid}` returns every
    `LocalizedText` field (`celebrationInfo.headline`/`quote`/
    `countdownParagraph`, `story.title`/`subtitle`/`paragraph`,
    `timeline[]`/`events[]` `title`/`description`) as an object with **all**
    locales as keys, `null` for any that aren't set (its own `localized()`
    helper) — not just the ones that happen to be filled in — so the public
    frontend can always read `celebrationInfo.headline.en` without an
    existence check. The response's top-level `activeLanguages` is the
    celebration's own active-languages setting (see below), also returned
    for the frontend's benefit. See `PUBLIC-API.md`.
  - **Active Languages**: `Celebration.activeLanguages: AppLocale[]` — set
    from the "Active Languages" checkbox group at the top of the
    Celebration Info tab, above Headline. `el` isn't a real checkbox (shown
    checked+disabled purely for clarity) and is always included server-side
    regardless of form input (`readActiveLanguages()` in `[id]/actions.ts`
    prepends it to whatever `en`/`ru` checkboxes came through); `en`/`ru`
    are opt-in per celebration via `<input name="activeLanguages"
    value="en"|"ru">`. `getActiveLanguages(celebration)` (`lib/
    celebrations.ts`) is the read-side helper every page.tsx under
    `celebrations/[id]/` uses — falls back to `DEFAULT_ACTIVE_LANGUAGES`
    (`["el"]`) for celebrations that predate this field or never had it
    saved. **Effect**: it's purely a UI restriction on which tabs
    `LocalizedField.tsx` offers for *that* celebration (its `activeLanguages`
    prop drives the tab strip, see "Editing" above) — deactivating a
    language doesn't clear or hide its already-saved text on the public API
    or in the database, it just removes that language's tab from the admin
    forms until reactivated. `CelebrationInfoForm.tsx` holds the live
    `activeLanguages` array in state (seeded from `initialValues.
    activeLanguages`, toggled by the two checkboxes) and passes it down to
    all three of its `LocalizedField`s so unchecking e.g. Russian hides the
    RU tab on Headline/Quote/Countdown Paragraph immediately, without a
    page reload; `StoryForm.tsx`/`EventsManager.tsx`/`TimelineManager.tsx`
    get the same array as a prop from their `page.tsx` (server-computed, not
    live-toggled there — editing Story/Events/Timeline always reflects
    whatever was last saved on the Celebration Info tab). A freshly created
    celebration gets `["el"]` at `createCelebration()` time, same as the
    fallback default.
- **`/celebrations` is Root + Professional only** (Couple is excluded),
  same double-enforcement pattern as Professionals (see "Professionals"
  and "Authentication" above): page-level `requirePageRole(["Root",
  "Professional"])` in `celebrations/page.tsx`, plus each Server Action in
  `celebrations/actions.ts` independently re-checking via `assertAccess()`.
- **Professional scoping differs by role** — this is the first section
  with per-row ownership, not just an all-or-nothing role gate:
  - **Root** sees every celebration and must explicitly pick the owning
    professional via the searchable `ProfessionalPicker` in
    `CelebrationForm.tsx` — submitted as `professionalId` in the form data.
  - **Professional** only sees/manages celebrations where
    `celebration.professionalId === user.professionalId`; the picker is
    hidden entirely and `professionalId` is **never read from the
    submitted form** for this role — `resolveProfessionalId()` in
    `celebrations/actions.ts` always derives it from the session instead.
    Never trust client input for this field; a Professional user could
    otherwise submit an arbitrary `professionalId` and take over another
    professional's celebration.
  - `celebrations/page.tsx` applies the same filter server-side when
    listing (`allCelebrations.filter(c => c.professionalId ===
    user.professionalId)` for Professional) so a scoped user never even
    receives another professional's rows in the payload — the
    action-level check is defense in depth, not the only gate.
  - The table only shows the "Professional" column when `role === "Root"`
    — a scoped Professional user already knows which professional it is.
- **Setting a spouse's email auto-provisions a Couple-role login for
  them**, mirroring the Professional-linked-user pattern: on create (and
  on update, when an email is newly added), `createSpouseUserIfMissing()`
  in `celebrations/actions.ts` checks `getUserByUsername(email)` first,
  and if none exists, creates a `role: "Couple"` user with `coupleId` set
  to the celebration's own `_id` (husband and wife of the same
  celebration share one `coupleId`), `displayName` = full name,
  `username` = the spouse's email, password `PROFESSIONAL_USER_PASSWORD`
  (`src/lib/users.ts` — the same shared `"Test123456!"` constant used for
  Professional logins). This is **best-effort**, same as the
  professional-linked-user flow: failures are logged as a
  `Security`/`warning` action and never block the celebration save.
- List table (`CelebrationsManager.tsx`) shows a "Type" column (translated
  via `celebrations.types.{Marriage,Christening}`) plus husband/wife as
  name + stacked clickable `tel:`/`mobile` and `mailto:`/`email` links
  (`SpouseCell`), the same Communication-column contact pattern as
  Professionals (see above), plus the search box described in "Page
  structure" — the search matches on title, the translated type label,
  both spouses' full contact info, and the resolved professional's
  company name.
- **Seeding**: `runSeeders()` (`src/lib/seed.ts`) creates one
  "Dimitris & Maria Marriage" test celebration (`TEST_CELEBRATION_SEED`,
  via `seedCelebration(professionalId, seed: CelebrationSeed)`, idempotent
  by `title`) attached to the seeded Test Company professional. It covers
  both fixtures in one record: husband/wife have emails
  (`dimitris-husband@o-gamos-mas.com` / `maria-wife@o-gamos-mas.com`), so
  it gets the two Couple-role logins (same shared
  `PROFESSIONAL_USER_PASSWORD`) for testing the couple-login flow, *and*
  its `info` block is fully populated (`celebrationDate`, `headline`,
  `quote`, `countdownParagraph` — the last three seeded with real `el`/
  `en`/`ru` translations, not just `en`, so the language tabs have
  something to show in every language out of the box, and `activeLanguages:
  [...routing.locales]` so all three of those tabs are actually reachable
  on the seeded celebration rather than just `el`, and `showSeating`/
  `showLive`/`showReservation` all seeded `true` — unlike
  `showMaxGuests`/`isSitePublic`, which stay `false` — so the frontend's
  Reception Seating/Happening Now/Reservation nav items have a fixture
  where they're actually turned on) via a
  follow-up `updateCelebrationInfo()` call right after creation, for
  testing the Celebration Info tab with realistic content. `seedSpouseUser()` no-ops if a spouse has no `email`
  (mirrors `createSpouseUserIfMissing()`'s own guard in the live action) —
  not exercised by this seed today, but kept since `CelebrationSeed`
  spouses are typed with optional email/mobile for any future seed that
  needs it. It also seeds 3 `timeline` items (`CelebrationSeed.timeline`)
  matching the Story tab's shape — see "Story tab" below for how their
  images get copied in from `src/assets/seed/timeline/` — and 4 `events`
  items (`CelebrationSeed.events`), each with a hand-translated `el`/`en`/
  `ru` `LocalizedText` for `title` and `description` (see "Translatable
  fields" above — `en` is the reference template's original copy, `el`/
  `ru` were added purely to exercise the language tabs with real content).
  Both the timeline and the events come
  from the **same** wedding-planner reference template the user supplied
  (`STORY` and `EVENTS`+`LOCATIONS` respectively, from its
  `src/data/weddingData.ts`) — each seeded event merges one `EVENTS` entry
  with the `LOCATIONS` entry its `locationId` points to (the location's
  `address` string hand-parsed into `address`/`city`/`postCode`/`country`,
  its `latLng` carried straight through as `mapLat`/`mapLng`). Not every
  `LOCATIONS` entry is used — only the ones an `EVENTS` entry actually
  references. It also seeds 4 `guests` items (`CelebrationSeed.guests`,
  hand-written rather than pulled from the template — its own `GUESTS`
  array is table-seating data with no phone/email/RSVP-count shape to
  reuse): 2 already confirmed (`confirmedAttendees` + `confirmationDate`
  set) and 2 still pending (neither set) — a deliberate half/half split so
  both RSVP states have a fixture in the seeded data, not just an
  incidental result of a small guest list.

### View page (`celebrations/[id]/`)

Each row's `Eye` icon action (translated `celebrations.view`) links to a
**full-width detail page** at `/celebrations/[id]`. All 5 tabs —
**Celebration Info**, **Couple Info**, **Story**, **Events**, **Guests** —
are real, saveable sections; there's no placeholder tab left, so
`CelebrationTabPlaceholder.tsx` was deleted once Guests (the last one)
landed. A future 6th tab would need to either reintroduce something like
it or just start real from day one.

- **Real sub-routes, not client-side tab state** — each tab is its own
  Next.js route under `celebrations/[id]/`, matching the
  `SettingsSidebar`/settings precedent of routed navigation over
  `useState`: `page.tsx` (Celebration Info, the default landing tab at
  `/celebrations/[id]` itself), `couple-info/page.tsx`, `story/page.tsx`,
  `events/page.tsx`, `guests/page.tsx`. This gives each tab a real,
  linkable/bookmarkable/back-button-able URL.
- **Access control lives once, in `[id]/layout.tsx`**, not repeated in
  every leaf tab page. `access.ts`'s `requireCelebrationAccess(id)` calls
  `requirePageRole(["Root", "Professional"])` then `notFound()`s if the
  celebration doesn't exist or (for a Professional) isn't theirs — calling
  `notFound()`/`redirect()` in a layout blocks rendering of every child
  route beneath it, the same mechanism `requirePageRole` relies on at the
  page level elsewhere in this app. Don't duplicate this check in the leaf
  `page.tsx` files; add it to `access.ts`/`layout.tsx` if the check itself
  needs to change.
- `layout.tsx` renders: a "back to list" link, the celebration's `title`
  as an `<h1>`, `<CelebrationTabsNav celebrationId={id} />` (client
  component, active-tab underline via `usePathname`, same visual language
  as `Navbar.tsx`'s underline-on-active but horizontal tabs instead of a
  top nav), then `{children}` for whichever tab route matched.
- All 5 tabs are real now; there's no placeholder left in this route (see
  `PlaceholderPage.tsx` for the *different* top-level nav placeholders —
  Couples/Story/Events/Guests as standalone pages — which is unrelated to
  these tabs despite the name overlap). **If you add a 6th tab**,
  Celebration Info, Couple Info, Story, Events, and Guests (below) are all
  reference examples for the shape: its own route folder, a Manager/Form
  pair (or a single form for a non-list tab), a save action in this
  route's `actions.ts` reusing `assertTabAccess()`, and — if it's a list
  like Timeline/Events/Guests — CRUD helpers in `lib/celebrations.ts`
  following the read-modify-write-the-whole-array pattern.
- `layout.tsx` fetches the celebration once (for the title + ownership
  check); a leaf tab page that needs the celebration's actual field data
  needs its own `getCelebrationById(id)` call too — there's no context
  plumbing between layout and page in the App Router, so a second cheap
  lookup per tab load is expected, not a bug to fix. `page.tsx`
  (Celebration Info) does exactly this, then serializes into
  `CelebrationInfoValues` (`CelebrationInfoForm.tsx`) — `celebrationDate`
  becomes a `"YYYY-MM-DD"` string for the native `<input type="date">`,
  and `showMaxGuests`/`showSeating`/`showLive`/`showReservation`/
  `isSitePublic` default to `false` via `?? false` (same "field may not
  exist on an older document" pattern as `defaultLocale` — see "Users &
  roles" above). `showSeating`/`showLive`/`showReservation` are plain
  boolean toggles the frontend uses to decide whether to show its
  "Reception Seating"/"Happening Now"/"Reservation" nav items and pages
  for this celebration (see `PUBLIC-API.md` — all three are echoed back on
  `celebrationInfo` next to `showMaxGuests`) — nothing in this repo reads
  them beyond passing them through; there's no seating-chart/live-feed/
  reservation feature here, just the toggle a celebration's owner uses to
  turn those sections on once they're ready.
- **Celebration Info's save action lives in its own `[id]/actions.ts`**,
  separate from the list's `celebrations/actions.ts` — it only touches
  the info fields (plus `title`, shared with the create/edit dialog) via
  `updateCelebrationInfo()`, never `type`/`professionalId`/`husband`/
  `wife`. Access check is inlined in the action itself (role +
  `professionalId` ownership, same shape as `assertAccess()` in the
  list's `actions.ts`) since Server Actions can't reuse `access.ts`'s
  `notFound()`-based helper (see "Authentication" above on why actions
  can't rely on the page/layout-level check alone). On success it
  `redirect()`s back to `/celebrations/[id]` (the same tab), matching the
  self-service `ProfileForm`/`profile/actions.ts` convention of
  redirect-after-save rather than an inline "saved" flag.
- `updateCelebrationInfo()` in `lib/celebrations.ts` uses the same
  `$set`/`$unset` pattern as `updateProfessional()` (see "Professionals"
  above) for the optional fields (`celebrationDate`, `headline`, `quote`,
  `countdownParagraph`, `maxGuestsPerInvitation`) — clearing a field in
  the form actually removes it from the document instead of leaving a
  stale value behind.
- **Hero Background** is a single uploaded image, handled the same way
  Professional logos are (see "File uploads" below for the storage
  helpers) rather than folded into `updateCelebrationInfo()`'s plain
  `$set`/`$unset`: `updateCelebrationInfoAction()` reads an optional
  `heroBackground` file off the same `FormData` (`getHeroBackgroundFile()`
  — `file instanceof File && file.size > 0`, same guard
  `getLogoFile()`/`getTimelineImageFile()` use), and only if one was
  submitted does it call `saveCelebrationHeroBackground()` then
  `setCelebrationHeroBackground()` (a dedicated one-field `$set`, kept
  separate from `updateCelebrationInfo()` for the same reason
  `setProfessionalLogo()` is separate from `updateProfessional()` — the
  filename is only known after the file is actually written). No upload
  means no change: `heroBackgroundFilename` just keeps its previous
  value. Preview + upload input live in `CelebrationInfoForm.tsx`
  (mirrors `ProfessionalForm.tsx`'s logo field, including the `Field`
  component's `hint` prop). Served two ways: authenticated
  `/api/celebrations/[id]/hero-background` (the admin preview) and public
  `/api/public/celebration/[guid]/hero-background` (what
  `celebrationInfo.heroBackgroundUrl` in the public API response points
  at — see `PUBLIC-API.md`).
- **Invitation** is a second single-uploaded-image field, byte-for-byte
  the same pattern as Hero Background right above it (own
  `invitationFilename` on `Celebration`, `getInvitationFile()`/
  `saveCelebrationInvitation()`/`setCelebrationInvitation()` mirroring the
  hero-background trio, own `Field` in `CelebrationInfoForm.tsx` right
  after Hero Background's, own authenticated
  `/api/celebrations/[id]/invitation` + public
  `/api/public/celebration/[guid]/invitation` routes serving
  `celebrationInfo.invitationUrl`) — the two fields share the same
  `celebrationImagesDir()` folder (`saveCelebrationInvitation()` only
  cleans up filenames starting with `invitation.`, not `hero-background.`,
  so they coexist), just a different fixed filename per the "File uploads"
  section below.
- **Couple Info** (`couple-info/page.tsx` + `CoupleInfoForm.tsx`) is the
  husband/wife fieldsets from `CelebrationForm.tsx` (the create/edit
  dialog), lifted onto their own tab/route so they can be edited without
  reopening the dialog — the fields and their `${prefix}FirstName` etc.
  form-field naming are identical, which is why `readSpouse()` could move
  to a shared `celebrations/spouses.ts` (see "Professionals"-style
  extraction note below) instead of staying duplicated per action.
  - Saving here goes through `updateCelebrationCoupleAction()` in
    `[id]/actions.ts`, calling `updateCelebrationCouple()` in
    `lib/celebrations.ts` — a plain `$set` on `husband`/`wife` only
    (no `$unset` dance: unlike Celebration Info's fields, `firstName`/
    `lastName` are required, and `email`/`mobile` already collapse to
    `undefined` via `readSpouse()`'s own `...(email ? {email} : {})`
    pattern before they ever reach Mongo).
  - **Editing a spouse's email here re-runs the same auto-provisioning
    as the create/edit dialog** — `createSpouseUserIfMissing()` is called
    for both spouses after every save, so adding an email from this tab
    (not just from the dialog) can still create a Couple-role login.
    This is why `createSpouseUserIfMissing()` moved out of
    `celebrations/actions.ts` into the shared `celebrations/spouses.ts`
    alongside `readSpouse()` — both this tab's action and the list's
    create/update actions need it, and it must stay byte-for-byte the
    same behavior in both places rather than drift into two copies.
  - `[id]/actions.ts`'s save actions (`updateCelebrationInfoAction`,
    `updateCelebrationCoupleAction`, `updateCelebrationStoryAction`, the
    three timeline-item actions below) all share one local
    `assertTabAccess()` helper (role + `professionalId` ownership) — add
    any future tab's save action to this same file and reuse it rather
    than re-deriving the check again.
- **Story** (`story/page.tsx` + `StoryForm.tsx` + `TimelineManager.tsx`)
  has two independent pieces on one tab: the narrative fields
  (`storyTitle`/`storySubtitle`/`storyParagraph`, saved via
  `updateCelebrationStoryAction()` → `updateCelebrationStory()`, same
  `$set`/`$unset`-on-optional-fields shape as Celebration Info) and a
  **timeline sub-list** below it, rendered by a separate client component
  (`TimelineManager.tsx`) with its own "Page structure"-style table +
  `FormDialog` + two-step-confirm delete — just scoped inside the tab
  rather than being its own top-level page (no `PageHeader`, since this
  isn't a standalone route).
  - **Timeline items live as a plain array on the `Celebration` document**
    (`timeline: TimelineItem[]`, each with its own `id` — a generated
    `ObjectId().toString()`, not the Mongo document's own `_id`), not a
    separate collection. `addTimelineItem()`/`updateTimelineItem()`/
    `deleteTimelineItem()` in `lib/celebrations.ts` all **read-modify-write
    the whole array** rather than using Mongo's positional (`$`) array
    operators — simplest-correct choice at this record's scale (a
    handful of timeline entries per celebration), and it sidesteps the
    usual footguns of conditionally `$set`/`$unset`-ing optional fields
    inside an array element by dot-notation. Revisit only if a celebration
    ever needs a genuinely large timeline.
  - **Each timeline item's image is a real uploaded file, not embedded in
    Mongo** — same "filesystem, not the DB" approach as professional
    logos (see "File uploads" below), but nested one level deeper:
    `<UPLOADS_DIR>/professionals/<professionalId>/celebrations/<celebrationId>/timeline/<randomId><ext>`.
    Unlike a professional's single fixed `logo.<ext>` filename, each
    timeline image gets a random filename (`saveTimelineImage()` in
    `lib/uploads.ts`, via `randomUUID()`) since a celebration can have
    many timeline images coexisting in the same directory.
  - Images are served via
    `GET /api/celebrations/[id]/timeline/[itemId]/image`
    (`src/app/api/celebrations/[id]/timeline/[itemId]/image/route.ts`) —
    same outside-`proxy.ts`, do-your-own-auth pattern as the professionals
    logo route (see "File uploads"), **plus** a Professional-ownership
    check (404, not 401/403, if the celebration isn't theirs) that the
    professionals logo route doesn't need, because Celebrations — unlike
    Professionals — are per-row scoped by role (see above).
  - Replacing a timeline item's image deletes the old file first
    (`updateTimelineItemAction()` calls `deleteTimelineImage()` before
    `saveTimelineImage()`), and **deleting the whole celebration deletes
    its entire upload tree in one shot** —
    `deleteCelebrationAction()` (in the list's `celebrations/actions.ts`)
    calls `deleteCelebrationUploads()`, which `rm -rf`s the celebration's
    whole `.../celebrations/<celebrationId>/` directory rather than
    tracking down each item's image individually. This closes the gap
    that Professionals still has open (see "Delete does not currently
    delete the linked user" above) — don't reintroduce an orphaned-files
    gap here if you touch this delete flow.
  - **Seeded timeline items copy their images from local files**, the same
    pattern as the professional logo seed: `src/assets/seed/timeline/`
    holds 3 JPEGs (downloaded once from the Unsplash URLs in a wedding
    template the user supplied — not committed as external links, the
    actual bytes live in the repo), and `saveTimelineImageFromPath()` in
    `lib/uploads.ts` (the seeder's variant of `saveTimelineImage()`, same
    relationship as `saveProfessionalLogoFromPath`/`saveProfessionalLogo`)
    copies each one in under a fresh random filename per seed run.
- **Events** (`events/page.tsx` + `EventsManager.tsx`) is a single
  table + `FormDialog` for a celebration's `events: EventItem[]` — no
  separate fields-above-the-list split like Story has, since the whole
  tab *is* the list. Each `EventItem`: `title` (required), optional
  `description`, `area` (free text — e.g. "ceremony"/"reception"; not an
  enum, since none was specified when this was built), `date`, `city`,
  `address`, `postCode`, `country`, `mapLat`/`mapLng` (a real Google Maps
  point set via an embedded interactive map, not typed-in numbers — see
  below). The table renders the point as a
  `https://www.google.com/maps?q=<lat>,<lng>` link when both are set,
  "—" otherwise.
  - `addEventItem()`/`updateEventItem()`/`deleteEventItem()` in
    `lib/celebrations.ts` are the read-modify-write-the-whole-array
    siblings of the timeline functions above — same reasoning, same
    shape, no image handling since events don't have one.
  - No `assets/`/upload involvement at all for this tab (unlike Story's
    timeline) — every field is either text/number or a date, so
    `createEventItemAction`/`updateEventItemAction` in `[id]/actions.ts`
    are the simplest of the tab actions: parse form, call the lib
    function, log, redirect. Same `assertTabAccess()` reuse as every
    other tab action in that file.
  - `EventsManager.tsx` deliberately has **no heading above the table**
    (unlike `TimelineManager.tsx`'s "Timeline" `<h2>`) — the tab nav
    already reads "Events" and there's no other content on this tab to
    visually separate the table from, so a second "Events" label would be
    redundant. Only the right-aligned "Add event" button sits above the
    table. If you add a second sub-section to this tab later, revisit
    this — the redundancy argument stops holding once there's more than
    one thing on the page.
  - **The "Google Maps Point" is a real embedded map, not two number
    inputs.** `celebrations/[id]/GoogleMapPicker.tsx` is a client
    component wrapping the Google Maps JavaScript API: it renders an
    interactive map with a draggable marker, exposes an imperative
    `geocode(address)` method via `forwardRef`/`useImperativeHandle`, and
    reports point changes (drag, click-to-place, or a successful geocode)
    through an `onChange(lat, lng)` prop. `EventItemForm.tsx` holds
    `address`/`city`/`postCode`/`country` as **controlled** state
    (unlike every other field in this form, which stays uncontrolled
    `defaultValue`) specifically so their `onBlur` handlers can join them
    into one query string (`[address, city, postCode, country].filter(Boolean).join(", ")`
    — country included so the geocoder has the full picture, not just a
    street name that could match multiple countries) and call the map's
    `geocode()`. `mapLat`/`mapLng` are also controlled state, submitted
    via `<input type="hidden">`s that `GoogleMapPicker`'s `onChange`
    keeps in sync — the actual submitted values, whether they came from
    typing an address, dragging the marker, or clicking the map.
  - `lib/googleMaps.ts`'s `loadGoogleMaps(apiKey)` injects the Maps
    JS `<script>` tag **once** and caches the loading promise at module
    scope, so opening/closing the create/edit dialog repeatedly (a fresh
    `GoogleMapPicker` mounts each time, same as every other dialog form in
    this app) never re-injects the script or re-fetches the API.
  - **Reads `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` directly via
    `process.env`** in the client component (Next.js inlines
    `NEXT_PUBLIC_`-prefixed vars into the client bundle at build time) —
    no prop-drilling from a Server Component needed. **Degrades
    gracefully when unset**: `GoogleMapPicker` shows a small "not
    configured" message instead of a map, and the rest of the
    Events tab (including manually-typed `mapLat`/`mapLng` — no UI for
    that anymore, but the fields still round-trip if set some other way)
    keeps working. Needs the Maps JavaScript API + Geocoding API enabled
    on a billing-enabled Google Cloud project; see `.env.local.example`
    (local dev) and root `.env.example` (Docker — see "Docker" below,
    this is the first env var in this repo that's a real secret rather
    than a fixed dev-only value, so it's the first one sourced from a
    gitignored root `.env` rather than hardcoded in `docker-compose.yml`).
  - **`hasSeating`** (a plain checkbox in `EventItemForm.tsx`, "Has
    seating") gates a per-event seating layout designer — unrelated to
    Celebration Info's `showSeating` (which gates the whole "Reception
    Seating" nav item/page for the public frontend; this is admin-only
    and per-event, not a public-facing toggle). When true,
    `EventsManager.tsx`'s Actions column gets an extra `Armchair`-icon
    link (`configureLayout`) to
    `celebrations/[id]/events/[eventId]/seating-layout/` — not shown at
    all when false, and that route itself 404s if visited directly for an
    event without the flag (`seating-layout/page.tsx` checks
    `event.hasSeating`, same "don't even confirm this exists" pattern as
    `access.ts`).
  - **The seating layout is its own field, saved separately from the rest
    of the event form.** `EventItem.seatingLayout?: SeatingLayoutElement[]`
    (`lib/celebrations.ts`) — each element is a round table
    (`type: "table-circle"`), rectangular table (`"table-rect"`, both
    with `code` + `maxPeople`), or a free-standing placeholder like "Music
    Band" (`"placeholder"`, has `label` instead), plus `x`/`y`/`width`/
    `height` in plain canvas pixels (no real-world scale — a rough visual
    floor plan, not a CAD drawing). `updateEventSeatingLayout()` replaces
    the whole array in one shot (same read-modify-write-one-field pattern
    as the rest of this file), called from `updateEventSeatingLayoutAction()`
    in `[id]/actions.ts` — **not** bound to a `<form>` like every other
    action here; `EventSeatingLayoutEditor.tsx`'s Save button calls it
    directly with a plain `SeatingLayoutElement[]` built up on the canvas
    (Server Actions can be invoked this way too, not just via
    `action={}`). Because `updateEventItem()` (the regular event form's
    save path) replaces the whole `EventItem`, `updateEventItemAction()`
    explicitly carries the existing `seatingLayout` forward — otherwise
    saving the Title/Date/Location form would silently wipe out whatever
    layout was designed.
  - **`EventSeatingLayoutEditor.tsx`** (client component) is a from-scratch
    drag/resize canvas — no library. Toolbar buttons add a new element at
    a fanned-out default position (`nextDefaultPosition()`, so repeated
    adds don't stack exactly on top of each other); clicking an element
    selects it (shows Code/Max People or Label in a right-side properties
    panel, plus a Delete button); dragging the element body moves it,
    dragging its small bottom-right handle resizes it (min `MIN_SIZE`
    32px) — both via plain Pointer Events + `setPointerCapture()` on
    `pointerdown`, tracked in a `useRef` (drag vs. resize state), applied
    on `pointermove`. **Compute new state before calling its setter, never
    inside another setState's updater callback** — an earlier version
    generated the new element's id and called `setSelectedId()` from
    inside `setElements()`'s updater function, which is impure (React can
    invoke an updater more than once) and caused exactly this: toolbar
    clicks silently doing nothing, or the tab hanging outright. If you
    touch `addElement`/`updateElement`, keep every id/value generated
    outside the updater, passed in already-computed.
  - Nothing on the public frontend reads `seatingLayout` yet — it's
    admin-only for now, not part of `GET /api/public/celebration/{guid}`'s
    response (see `PUBLIC-API.md`). Exposing it publicly (e.g. for a
    guest-facing seating chart) would be a deliberate follow-up, not
    something this feature already does.
- **Guests** (`guests/page.tsx` + `GuestsManager.tsx`) is the simplest of
  the three list tabs — plain fields only, no image (unlike Timeline) and
  no map (unlike Events). Each `GuestItem`: `name` (required), optional
  `phone`, `email`, `expectedAttendees`/`confirmedAttendees` (plain
  numbers — nothing sums or cross-checks them against
  `maxGuestsPerInvitation` from Celebration Info; that's a future
  actual-RSVP-logic concern, not built yet), `confirmationDate`.
  - `addGuestItem()`/`updateGuestItem()`/`deleteGuestItem()` in
    `lib/celebrations.ts` are the third read-modify-write-the-whole-array
    sibling (timeline, events, guests all follow the identical shape now
    — if a 4th list-shaped tab shows up, that's the pattern to copy).
  - The table's phone/email column reuses the **Communication column**
    pattern (see "Professionals" above) rather than inventing a new
    contact-display convention — same stacked `tel:`/`mailto:` links with
    `Phone`/`Mail` icons.
  - Same no-heading-above-the-table layout as `EventsManager.tsx` — see
    the reasoning under "Events" above; applies here for the same reason
    (nothing else on the tab to visually separate the table from).
  - **A guest's `email`/`phone` must be unique among that celebration's
    own guests — not globally.** Two different celebrations can invite the
    same person with no conflict; this is a per-array constraint, not a
    Mongo index (a unique index can't express "unique within one
    document's embedded array"). Enforced in `createGuestItemAction()`/
    `updateGuestItemAction()` via a local `findDuplicateGuestContact()`
    helper that scans `celebration.guests` (email compared
    case-insensitively, phone as an exact string match — no normalization
    of phone formats). `updateGuestItemAction` passes the guest's own
    `itemId` as `excludeId` so re-saving a guest unchanged doesn't flag
    itself as a duplicate of itself. This is app-layer validation, not a
    DB constraint — if you ever move guests to their own collection, this
    is the check that would become a compound unique index instead.
  - **The table color-codes a guest's RSVP status**: the whole row (not
    just one cell) tints `bg-emerald-50` if `confirmationDate` is set, or
    `bg-red-50` if `deniedDate` is set — overriding the usual zebra
    striping for that row, since RSVP status is more important
    information than the stripe. The Confirmation Date column shows the
    date with a translated "Confirmed"/"Denied" label in matching text
    color (`text-emerald-700`/`text-red-600` — same tokens `log-actions`
    already uses for its `success`/`error` `type` styling, not new
    colors). Neither `confirmationDate` nor `deniedDate` is editable from
    `GuestItemForm.tsx` (unlike every other guest field) — they're only
    ever set by `POST`-free public RSVP calls, see below, not by an admin
    typing into the create/edit dialog.
  - **A guest's RSVP itself is recorded through the public API, not this
    admin UI** — `GET /api/public/reservations/confirm` (see
    `PUBLIC-API.md`) is what actually sets `confirmationDate`/
    `confirmedAttendees` or `deniedDate` on a guest, matched by phone or
    email rather than by the admin-only guest `id`. It calls the same
    `updateGuestItem()` this tab's own save action uses, so both paths
    share one source of truth for how a guest record gets rewritten.

## Subscription Packages

- Collection: `SubscriptionPackages` (`src/lib/subscriptionPackages.ts`).
  Fields: `name`, `description`, `maxUsers`, `maxBronzeCelebrations`,
  `maxSilverCelebrations`, `maxGoldCelebrations` (all required; the four
  limits are plain `number`s, parsed/validated server-side as non-negative
  integers in `settings/subscription-packages/actions.ts`), `createdAt`.
  The three tier limits count celebrations of *either* type together (one
  shared Bronze/Silver/Gold cap, not separate marriage/christening
  limits) — renamed from `maxBronzeMarriages` etc. when the underlying
  entity was generalized to Celebrations (see "Celebrations" above).
  No unique index on `name` — `getSubscriptionPackageByName()` exists
  only for the seeder's idempotency check, not enforced at the DB level.
- Lives under **Settings** (`/settings/subscription-packages`), in the
  sidebar between Users and LogActions — **Root-only**, same
  page-level-`requirePageRole` + action-level-`assertRoot` double
  enforcement as Professionals (see "Professionals" above and
  "Authentication" below — don't rely on only one of the two checks).
- Full CRUD UI follows "Page structure" above:
  `SubscriptionPackagesManager.tsx` (dialog state), `SubscriptionPackageForm.tsx`
  (plain fields, no file upload — the simplest example of the pattern if
  you want a template smaller than Professionals').
- **Seeding**: `runSeeders()` creates two packages if missing (checked by
  `name`): **Free** ("Free subscription", 1 user, 5/3/2
  bronze/silver/gold) and **Basic** ("Basic Subscription", 2 users,
  30/15/5 bronze/silver/gold).
- Nothing currently reads or enforces these limits anywhere else in the
  app (no celebration/professional count is checked against a package) —
  this is master-data management only, not yet wired into any quota
  logic. Don't assume the limits do anything beyond being stored.

## File uploads

- Uploaded files (currently: professional logos and celebration timeline
  images) are **not** stored in Mongo and **not** under `public/`. They
  live on disk under `<UPLOADS_DIR>/professionals/<professionalId>/...`,
  path-joined by `src/lib/uploads.ts`. Only the filename (e.g.
  `"logo.png"`) is stored on the Mongo document; the directory structure
  carries the rest. Professional logos: `.../images/`. Celebration
  timeline images: `.../celebrations/<celebrationId>/timeline/` — nested
  under the *owning professional's* folder, not a top-level tree, since a
  celebration always belongs to one professional (see "Celebrations" →
  "Story tab" above).
- `UPLOADS_DIR` is a **required** env var (same fail-fast pattern as
  `MONGODB_URI` — see `.env.local.example`). In Docker it's `/shared`,
  bind-mounted from `C:/Shared/o-gamos-mas` on the host (see "Docker"
  below); for local (non-Docker) dev, point it at any writable folder.
- `saveProfessionalLogo(id, file)` always writes the file as `logo<ext>`
  and **deletes any existing `logo.*` first** — necessary because the
  extension can change between uploads (a PNG replaced with a JPG), so a
  naive overwrite-by-same-name would leave the old file behind.
  `saveProfessionalLogoFromPath(id, sourcePath)` is the seeder's variant,
  copying a local file (e.g. from `src/assets/seed/`) instead of reading
  a browser-uploaded `File`.
- `saveTimelineImage(professionalId, celebrationId, file)` writes each
  image under a **random filename** (`randomUUID()` + extension) instead
  of a fixed one like `saveProfessionalLogo` — a timeline is a list, so
  multiple images must coexist in the same directory rather than
  replacing each other. `deleteCelebrationUploads(professionalId,
  celebrationId)` removes a celebration's entire upload tree in one
  `rm -rf`-style call (used on celebration delete — see "Celebrations" →
  "Story tab" above).
- `saveCelebrationHeroBackground(professionalId, celebrationId, file)` and
  `saveCelebrationInvitation(professionalId, celebrationId, file)` are two
  single-image fields like `saveProfessionalLogo` (fixed
  `hero-background.<ext>`/`invitation.<ext>` filename respectively, old one
  deleted first — each only cleans up its own prefix, so the two coexist),
  both living under the same `celebrationImagesDir()` — a sibling of
  `celebrationTimelineDir()` under the same per-celebration folder, not
  under the professional's own `images/` — since they belong to the
  celebration, not the professional. Already covered by
  `deleteCelebrationUploads()` above without any extra code, since both are
  nested under the same directory that call already `rm -rf`s.
- Logos are served (not read directly by the browser) via
  `GET /api/professionals/[id]/logo` (`src/app/api/professionals/[id]/logo/route.ts`).
  This route sits outside `[locale]`, so `proxy.ts` doesn't gate it (its
  matcher excludes `/api`) — the route does its own
  `getCurrentUserId()` check and returns 401 if unauthenticated, 404 if
  the professional has no logo or the file is missing on disk. Timeline
  images and the celebration hero background follow the identical
  outside-`proxy.ts` pattern via
  `GET /api/celebrations/[id]/timeline/[itemId]/image`,
  `GET /api/celebrations/[id]/hero-background`, and
  `GET /api/celebrations/[id]/invitation` — see "Celebrations" →
  "Story tab"/"View page" above for the extra ownership check they layer
  on top. All three also have a **public**, unauthenticated counterpart
  under `/api/public/celebration/[guid]/...` — see `PUBLIC-API.md`.
- `src/assets/seed/` holds source assets read only by `lib/seed.ts` at
  seed time (resolved via `path.join(process.cwd(), "assets", ...)` —
  `process.cwd()` is the project root for `next dev`/`build`/`start`).
  It is **not** a runtime uploads location and isn't served to the
  browser — don't confuse it with `UPLOADS_DIR`.

## Authentication

Every page requires a logged-in session **except `/login`**. This is a
standing requirement — any new route you add is protected automatically
(it's gated centrally in `proxy.ts`, not per-page), but don't build a page
that tries to render without going through `getCurrentUser()`/
`getCurrentUserId()` if it needs to know who's asking.

That central gate only checks "logged in or not" — it does **not** check
`role`. A page that needs a specific role (so far, only `/professionals` —
see "Professionals" above) must call `requirePageRole([...roles])`
itself, and its Server Actions must independently re-check the role too.

- **Session mechanism**: a signed, stateless cookie (`og_session`, 7-day
  expiry) — not a DB-backed session table. The token is
  `base64url(JSON{sub,exp}).base64url(HMAC-SHA256 signature)`, signed with
  the `SESSION_SECRET` env var. Verification uses Web Crypto
  (`crypto.subtle`) and manual base64url helpers instead of
  `node:crypto`/`Buffer`, specifically so it works unmodified in both the
  Node runtime (Server Actions/Components) and the Edge-capable proxy.
- **File split matters**: `src/lib/session.ts` (pure token logic, no
  `next/headers` — safe to import from `proxy.ts`) vs. `src/lib/auth.ts`
  (`next/headers` cookie I/O + `getCurrentUser()`/`getCurrentUserId()` —
  Node/RSC-only, **never** import this from `proxy.ts`). Keep new
  session-related code on the correct side of that split.
- **`verifySessionToken()` must never throw** — it's fed untrusted,
  possibly-malformed cookie values (tampered, stale-format, or outright
  garbage), and `atob()`/JSON.parse on malformed input throws by default.
  The whole function body is wrapped in one try/catch that returns `null`
  on any failure. This was a real bug once (a malformed cookie 500'd the
  proxy instead of just bouncing to `/login`) — if you touch this
  function, re-verify malformed/garbage cookie values still redirect
  cleanly rather than 500ing.
- **`proxy.ts`** composes next-intl's locale middleware with the auth
  check: it runs `createMiddleware(routing)` first and honors any locale
  redirect/rewrite it wants, *then* applies the auth gate using the
  locale-stripped path. Unauthenticated → redirect to `/{locale}/login`
  with `?redirect=<path>` (consumed by the login form to return the user
  where they were headed). Authenticated user hitting `/login` → redirect
  to `/{locale}`.
- **Login** (`/login`, outside the `(app)` route group so it renders
  without the navbar): `login/actions.ts`'s `loginAction` verifies
  username/password (`getUserByUsername` + `verifyPassword`), sets the
  session cookie, logs a `Security`/`success` action, and redirects —
  using the **user's own `defaultLocale`**, not the locale the login page
  happened to be on, then falls back to `redirectTo` from the query param
  (validated to be a same-origin relative path, guarding against open
  redirects).
- **Logout**: `src/app/[locale]/(app)/actions.ts`'s `logoutAction` clears
  the cookie, logs a `Security`/`info` action, redirects to `/login`.
  Wired into `UserMenu.tsx`'s dropdown as a plain `<form action={...}>` —
  no client JS required for it to work.
- **Attributing actions to a real user is done now** — every
  `logAction()` call in Server Actions should use
  `(await getCurrentUserId()) ?? "system"` (see
  `settings/users/actions.ts` for the pattern). The `"system"` fallback
  only matters for actions truly not tied to a request (e.g. the boot-time
  seeder).
- Env var: `SESSION_SECRET` (see `.env.local.example` — generate with
  `openssl rand -base64 32`; docker-compose uses a fixed dev value).

## Action logging

**Every action you implement — create, update, delete, or any
security-sensitive operation (login, permission change, settings change,
etc.) — must write a record to the `LogActions` collection.** This is a
standing requirement, not something to ask about per-feature.

- Call `logAction()` from `src/lib/logActions.ts` immediately after the
  write it's logging succeeds (same request/handler, not fire-and-forget
  from the client).
- Fields: `userId` (who did it), `type` (`"info" | "success" | "warning" |
  "error"`), `category` (the nav section it belongs to — `"Celebrations"`,
  `"Professionals"`, `"Couples"`, `"Story"`, `"Events"`, `"Guests"`,
  `"Settings"` — or `"Security"` for auth/permission actions), `message`
  (human-readable summary), `dataFrom`/`dataTo` (previous/new state —
  omit `dataFrom` on create, omit `dataTo` on delete), `createdAt` (set
  automatically by `logAction()`).
- Example: updating a celebration's date calls
  `logAction({ userId, type: "info", category: "Celebrations", message: "Updated celebration date", dataFrom: { date: oldDate }, dataTo: { date: newDate } })`.

## Internationalization (i18n)

**The whole app must be fully translated in all 3 supported languages —
Greek (`el`, default), English (`en`), Russian (`ru`). This is a standing
requirement for every new page/component, not something to ask about
per-feature.**

- Library: **next-intl**, with **locale-prefixed URLs**
  (`/el/celebrations`, `/en/celebrations`, `/ru/celebrations`) — routing is defined in
  `src/i18n/routing.ts` (`defineRouting({ locales: ["el","en","ru"],
  defaultLocale: "el" })`). `src/proxy.ts` runs next-intl's middleware to
  detect/redirect the locale (Next.js 16 renamed the `middleware.ts`
  convention to `proxy.ts` — don't recreate a `middleware.ts` file).
- Every route lives under `src/app/[locale]/...`. The root layout
  (`src/app/[locale]/layout.tsx`) validates the `locale` param, calls
  `setRequestLocale(locale)`, sets `<html lang={locale}>`, and wraps
  children in `<NextIntlClientProvider>`.
- **Never import `Link`, `usePathname`, `useRouter`, or `redirect` from
  `next/link` / `next/navigation`** for anything that renders or navigates
  to an app URL — import them from `@/i18n/navigation` instead, so the
  current locale prefix is preserved. (`notFound` and other non-routing
  APIs are fine to import from `next/navigation` directly.)
- **Adding/changing UI text**: add the key to **all three**
  `src/messages/{el,en,ru}.json` files in the same pass — keep them in
  exact key-parity (same shape/nesting in every file). Never hardcode a
  user-facing string directly in a component.
  - Server Components / Server Actions: `getTranslations()` /
    `getFormatter()` from `next-intl/server` (async).
  - Client Components (`"use client"`): `useTranslations()` /
    `useLocale()` from `next-intl` (sync, reads context from
    `NextIntlClientProvider`).
  - Redirecting from a Server Action needs the locale explicitly:
    `redirect({ href, locale: await getLocale() })` (see
    `settings/users/actions.ts`).
- The `brand` key (`"O Gamos Mas"`) and the `settings.sidebar.logActions`
  label (`"LogActions"`) are deliberately **not translated** in any
  locale — they're proper nouns / a literal collection name, not prose.
  Role display labels (`settings.users.roles.*`) *are* translated for
  display, but the underlying stored `role` value in MongoDB (`"Root"`,
  `"Professional"`, `"Couple"`) and the `<option value>` stay the English
  enum regardless of locale — only the visible label changes.
- `LogActions` entries' `message` field is written in English at the time
  of the action (an internal/developer-facing audit string) and is not
  re-translated per viewer locale — only the LogActions *page chrome*
  (headers, empty state) is localized. This is a deliberate scope
  boundary: translating a historical audit record retroactively per
  viewer doesn't make sense the way translating live UI does.
- No standalone language-switcher component — language is the per-user
  `defaultLocale` field, changed via `/profile`'s `ProfileForm.tsx`
  (see "Users & roles"). `languageSwitcher.{el,en,ru}` message keys still
  exist and are reused there for the locale option labels.
- Typed message keys: `src/global.d.ts` augments next-intl's `AppConfig`
  from `messages/en.json` (the canonical shape) — if you restructure
  messages, `en.json` is the source of truth other locales must match.

## Docker

`docker-compose.yml` (repo root) runs three services for local dev:

- `mongodb` — Mongo 7, host port `27019` (mapped to avoid clashing with
  other local projects), root user `admin`/`password`, db `o-gamos-mas`.
- `backend` — built from `src/Dockerfile.dev`, bind-mounts `./src` into
  `/app`, host port `3000`. Runs `npm run dev:docker`
  (`next dev --webpack`) instead of the default Turbopack `dev` script,
  because bind-mounted file-change events don't reliably reach Turbopack's
  watcher on Windows/Mac — webpack + `WATCHPACK_POLLING=true` polls
  instead. Use plain `npm run dev` (no Docker) unless you specifically
  need the containerized Mongo.
  Also mounts `C:/Shared/o-gamos-mas:/shared` (host:container) for
  uploaded files, with `UPLOADS_DIR: /shared` — see "File uploads".
- `frontend` — the sibling `frontend.o-gamos-mas.com` repo (see "What this
  is" above), built via **its own** `Dockerfile` (a production-style
  multi-stage build: `npm run build` then serve `dist/` with nginx), host
  port `3001`. **Unlike `backend`, this is not a live-reload dev
  container** — it has no bind mount, so a frontend source edit needs an
  explicit rebuild (`docker compose up -d --build frontend`), not just a
  restart. `VITE_API_BASE_URL` is passed as a **build arg** (baked into
  the JS bundle at build time, not a runtime env var — Vite env vars don't
  work any other way) pointing at `http://localhost:3000/api`, since the
  built JS runs in the visitor's browser on the host, not inside the
  Docker network, so it reaches the backend via its host-mapped port.
- `docker compose up -d --build` to start; `MONGODB_URI`/`MONGODB_DB`/
  `SESSION_SECRET`/`UPLOADS_DIR` are injected via compose, so no
  `.env.local` is needed in this mode.
- **If you edit `docker-compose.yml` (new env var, new volume, etc.) and
  a `backend`/`mongodb` container from *before* your edit is still
  running, it won't pick up the change** — compose only applies edits to
  containers it (re)creates. Re-run `docker compose up -d --build` after
  editing the file. This bit us once: a stray container from an earlier
  session kept running for an hour with stale env vars, and its silent
  fallback behavior masked what was actually a working feature — don't
  leave `docker compose` stacks running across unrelated work; `docker
  compose down` (or at least `docker ps` to check) when a task's Docker
  testing is done.
- **Never run `npm run dev` (Turbopack) on the host while the `backend`
  container is also running** — both bind-mount the same `./src`, so
  both share the same `.next` directory. The container runs webpack
  (`dev:docker`); a host-side Turbopack `next dev` writes Turbopack-shaped
  chunks into that shared `.next`, and the webpack dev server then fails
  to load them ("Failed to load external module mongodb-..." was the
  actual error this produced). Before doing host-side browser
  verification, check `docker ps` first — if `backend` is up, either use
  it directly (`http://localhost:3000`) instead of starting a second dev
  server, or `docker compose stop backend` first. If this happens anyway,
  the fix is `docker compose stop backend`, delete `src/.next` (it's
  gitignored, pure build artifact — safe to remove), then `docker compose
  start backend`. Plain `npm run build`/`npm run lint` on the host are
  fine to run alongside a live container — they don't touch `.next/dev`.
- **Local dev and the Docker container use *different* `UPLOADS_DIR`
  values, even though they share the same MongoDB** — the container gets
  `UPLOADS_DIR=/shared` (→ `C:/Shared/o-gamos-mas` on the host) from
  `docker-compose.yml`; local (non-Docker) `npm run dev` reads whatever
  `UPLOADS_DIR` is set to in `.env.local`, which is a separate folder.
  Both connect to the same Mongo (`localhost:27019` from the host maps to
  the same `mongodb` container), so a Mongo document created via one
  environment references a file that **only exists on disk in that same
  environment** — open the app through the other one and its image 404s,
  even though the DB record looks correct. This isn't a bug to fix, just
  a fact to remember when uploading/seeding files: know which environment
  (local vs. Docker) you're writing through, and if you need a file to
  show up in both, copy it into both `UPLOADS_DIR`s by hand (this bit us
  once seeding celebration timeline images — the DB update alone wasn't
  enough).

## Conventions

- App Router only; no `pages/` directory.
- Client components only where interactivity is needed (e.g. `Navbar.tsx`
  for active-route highlighting) — pages default to server components.
- Route folders for any section (nav-linked or not) live under
  `src/app/[locale]/(app)/<section>/page.tsx` (inside the authenticated
  route group, so they get the navbar and the auth gate automatically).
  For a section that *is* in `Navbar.tsx`'s `NAV_KEYS` list, the segment
  name must match the key exactly (each key doubles as both the route
  segment and the `nav.<key>` translation key) — but being in `NAV_KEYS`
  is now a deliberate editorial choice, not automatic for every section
  (see "Application shape" above: Couples/Story/Events/Guests have routes
  but aren't linked from the nav).
