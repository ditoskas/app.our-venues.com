# O Gamos Mas — Backend / Admin

## What this is

The backend/admin application for **o-gamos-mas.com**, a wedding and
christening ("baptism") planning platform. This app is the internal
**admin interface** used to manage weddings, the professionals and couples
involved, event schedules, guest lists, and the couple's "story" content
that gets published on the public-facing site.

There is no public-facing UI in this repo — this is admin-only.

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
        weddings/              Full CRUD, Root + Professional only — see
                               "Marriages / Weddings" below
          page.tsx               Server: fetches + serializes (+ professionals
                                 list for Root), renders Manager
          MarriagesManager.tsx     Client: PageHeader (title + search + New)
                                   + table + FormDialog
          MarriageForm.tsx          Create/edit form: title, ProfessionalPicker
                                    (Root only), husband/wife fieldsets
          DeleteMarriageButton.tsx  Icon + two-step confirm
          actions.ts              Server actions: create/update/delete, each
                                   re-checking role + professional ownership
                                   and best-effort provisioning Couple users
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
                             real `professionalId`; used by Weddings' form
                             for the Root role — see "Marriages / Weddings"
  assets/
    seed/                  Source files for seed data (e.g. a logo image) —
                            not served to the browser, only read by seed.ts
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
    marriages.ts               Marriage/Spouse type + CRUD (see
                               "Marriages / Weddings")
    subscriptionPackages.ts    SubscriptionPackage type + CRUD (see
                               "Subscription Packages")
    uploads.ts                 Filesystem helpers for uploaded files under
                               UPLOADS_DIR — see "File uploads"
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
  .env.local.example, README.md, AGENTS.md
```

Import alias `@/*` resolves to `src/*` (i.e. `src/app`, `src/components`,
`src/lib`, `src/i18n`, relative to the `src/` project root).

## Application shape

Every page requires login except `/login` itself (enforced by `proxy.ts`
— see "Authentication" below). Once authenticated: a full-width sticky top
**navbar** + a **body** region (`<main>`) that each route renders into.
Navbar sections, in order:

Weddings · Professionals · Couples · Story · Events · Guests · Settings

...plus, on the right: a **user menu** (display name with a dropdown —
`UserMenu.tsx`) containing **Profile** and **Log out**. There is no
standalone language switcher in the navbar — language is a per-user
preference (`defaultLocale`) changed on the Profile page, not a per-visit
toggle. (If a temporary "view in another language" switcher is wanted
later, that's a deliberate reintroduction, not a bug fix — it was removed
on purpose.)

Weddings and Professionals have full CRUD UIs. Couples/Story/Events/Guests
each currently render a placeholder page (`<PlaceholderPage pageKey="..." />`)
— real data/CRUD UIs still need to be built out per section, following the
pattern already used for Weddings/Professionals/Users.

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
new section (Weddings, Couples, etc.) when it graduates from a
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
  haystack string) — no server round-trip. Professionals and Weddings
  both do this (`ProfessionalsManager.tsx`, `MarriagesManager.tsx`) —
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
  Weddings (see "Marriages / Weddings" below): a Professional user is
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
  is the standard way to display contact info in any list table — Weddings'
  husband/wife cells (`SpouseCell` in `MarriagesManager.tsx`) reuse the
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

## Marriages / Weddings

- Collection: `Marriages` (`src/lib/marriages.ts`). Fields: `title` (e.g.
  "Dimitris & Maria Marriage"), `professionalId`, `husband`/`wife` (each a
  `Spouse`: `firstName`, `lastName` required, `email`/`mobile` optional),
  `createdAt`. This is a starting model — much more will be added to a
  marriage record later via other actions, so don't assume this shape is
  final.
- **`/weddings` is Root + Professional only** (Couple is excluded), same
  double-enforcement pattern as Professionals (see "Professionals" and
  "Authentication" above): page-level `requirePageRole(["Root",
  "Professional"])` in `weddings/page.tsx`, plus each Server Action in
  `weddings/actions.ts` independently re-checking via `assertAccess()`.
- **Professional scoping differs by role** — this is the first section
  with per-row ownership, not just an all-or-nothing role gate:
  - **Root** sees every marriage and must explicitly pick the owning
    professional via the searchable `ProfessionalPicker` in
    `MarriageForm.tsx` — submitted as `professionalId` in the form data.
  - **Professional** only sees/manages marriages where
    `marriage.professionalId === user.professionalId`; the picker is
    hidden entirely and `professionalId` is **never read from the
    submitted form** for this role — `resolveProfessionalId()` in
    `weddings/actions.ts` always derives it from the session instead.
    Never trust client input for this field; a Professional user could
    otherwise submit an arbitrary `professionalId` and take over another
    professional's marriage.
  - `weddings/page.tsx` applies the same filter server-side when listing
    (`allMarriages.filter(m => m.professionalId === user.professionalId)`
    for Professional) so a scoped user never even receives another
    professional's rows in the payload — the action-level check is
    defense in depth, not the only gate.
  - The table only shows the "Professional" column when `role === "Root"`
    — a scoped Professional user already knows which professional it is.
- **Setting a spouse's email auto-provisions a Couple-role login for
  them**, mirroring the Professional-linked-user pattern: on create (and
  on update, when an email is newly added), `createSpouseUserIfMissing()`
  in `weddings/actions.ts` checks `getUserByUsername(email)` first, and if
  none exists, creates a `role: "Couple"` user with `coupleId` set to the
  marriage's own `_id` (husband and wife of the same marriage share one
  `coupleId`), `displayName` = full name, `username` = the spouse's email,
  password `PROFESSIONAL_USER_PASSWORD` (`src/lib/users.ts` — the same
  shared `"Test123456!"` constant used for Professional logins). This is
  **best-effort**, same as the professional-linked-user flow: failures are
  logged as a `Security`/`warning` action and never block the marriage
  save.
- List table (`MarriagesManager.tsx`) shows husband/wife as name + stacked
  clickable `tel:`/`mobile` and `mailto:`/`email` links (`SpouseCell`),
  the same Communication-column contact pattern as Professionals (see
  above), plus the search box described in "Page structure" — the search
  matches on title, both spouses' full contact info, and the resolved
  professional's company name.
- **Seeding**: `runSeeders()` (`src/lib/seed.ts`) creates one "Dimitris &
  Maria Marriage" test marriage (idempotent by `title`) attached to the
  seeded Test Company professional, plus its two Couple-role user logins
  (`dimitris-husband@o-gamos-mas.com` / `maria-wife@o-gamos-mas.com`,
  same shared password) — mirrors `createSpouseUserIfMissing()`'s logic
  inline since the seeder runs outside a request context.

## Subscription Packages

- Collection: `SubscriptionPackages` (`src/lib/subscriptionPackages.ts`).
  Fields: `name`, `description`, `maxUsers`, `maxBronzeMarriages`,
  `maxSilverMarriages`, `maxGoldMarriages` (all required; the four limits
  are plain `number`s, parsed/validated server-side as non-negative
  integers in `settings/subscription-packages/actions.ts`), `createdAt`.
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
  app (no wedding/professional count is checked against a package) —
  this is master-data management only, not yet wired into any quota
  logic. Don't assume the limits do anything beyond being stored.

## File uploads

- Uploaded files (currently: professional logos) are **not** stored in
  Mongo and **not** under `public/`. They live on disk under
  `<UPLOADS_DIR>/professionals/<professionalId>/images/`, path-joined by
  `src/lib/uploads.ts`. Only the filename (e.g. `"logo.png"`) is stored
  on the Mongo document; the directory structure carries the rest.
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
- Logos are served (not read directly by the browser) via
  `GET /api/professionals/[id]/logo` (`src/app/api/professionals/[id]/logo/route.ts`).
  This route sits outside `[locale]`, so `proxy.ts` doesn't gate it (its
  matcher excludes `/api`) — the route does its own
  `getCurrentUserId()` check and returns 401 if unauthenticated, 404 if
  the professional has no logo or the file is missing on disk.
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
  "error"`), `category` (the nav section it belongs to — `"Weddings"`,
  `"Professionals"`, `"Couples"`, `"Story"`, `"Events"`, `"Guests"`,
  `"Settings"` — or `"Security"` for auth/permission actions), `message`
  (human-readable summary), `dataFrom`/`dataTo` (previous/new state —
  omit `dataFrom` on create, omit `dataTo` on delete), `createdAt` (set
  automatically by `logAction()`).
- Example: updating a wedding's date calls
  `logAction({ userId, type: "info", category: "Weddings", message: "Updated wedding date", dataFrom: { date: oldDate }, dataTo: { date: newDate } })`.

## Internationalization (i18n)

**The whole app must be fully translated in all 3 supported languages —
Greek (`el`, default), English (`en`), Russian (`ru`). This is a standing
requirement for every new page/component, not something to ask about
per-feature.**

- Library: **next-intl**, with **locale-prefixed URLs**
  (`/el/weddings`, `/en/weddings`, `/ru/weddings`) — routing is defined in
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

`docker-compose.yml` (repo root) runs two services for local dev:

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

## Conventions

- App Router only; no `pages/` directory.
- Client components only where interactivity is needed (e.g. `Navbar.tsx`
  for active-route highlighting) — pages default to server components.
- Keep new nav sections' route folders under
  `src/app/[locale]/(app)/<section>/page.tsx` (inside the authenticated
  route group, so they get the navbar and the auth gate automatically),
  matching the `NAV_KEYS` list in `src/components/Navbar.tsx` (each key
  doubles as both the route segment and the `nav.<key>` translation key).
