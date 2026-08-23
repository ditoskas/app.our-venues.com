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
- React 19.

## Structure

The whole Next.js project — config included — lives under `src/` at the
repo root; the true repo root only holds `.git` and `.idea`. Run all `npm`
commands from inside `src/`.

```
src/
  app/                 App Router routes (one folder per nav section)
    weddings/
    professionals/
    couples/
    story/
    events/
    guests/
    settings/
    layout.tsx         Root layout: fonts + <Navbar /> + <main>
    page.tsx            Dashboard (/)
    globals.css          Tailwind import + design tokens (@theme)
  components/
    Navbar.tsx           Top nav, active-link highlighting via usePathname
    PlaceholderPage.tsx   Shared "coming soon" shell used by section pages
  lib/
    mongodb.ts           MongoClient singleton (dev-safe against HMR)
  public/
  package.json, tsconfig.json, next.config.ts, eslint.config.mjs,
  postcss.config.mjs, .gitignore, .env.local.example, README.md, AGENTS.md
```

Import alias `@/*` resolves to `src/*` (i.e. `src/app`, `src/components`,
`src/lib`, relative to the `src/` project root).

## Application shape

Single admin shell: a full-width sticky top **navbar** + a **body** region
(`<main>`) that each route renders into. No sidebar. Navbar sections, in
order:

Weddings · Professionals · Couples · Story · Events · Guests · Settings

Each currently renders a placeholder page (`PlaceholderPage`) — real
data/CRUD UIs still need to be built out per section.

## Design language

Premium/elegant wedding aesthetic, intentionally light-only (no dark mode):
ivory background, deep charcoal text, muted gold accent. Headings use a
serif display font (`Playfair Display`, exposed as `font-serif`); body/UI
text uses `Inter` (`font-sans`). Color tokens are defined once in
`src/app/globals.css` under `@theme inline` (`--color-background`,
`--color-surface`, `--color-foreground`, `--color-muted`, `--color-border`,
`--color-accent`, `--color-accent-dark`, `--color-accent-soft`) — use these
Tailwind utility classes (`bg-surface`, `text-accent-dark`, etc.) rather
than hardcoding hex values.

## MongoDB

- Connection helper: `src/lib/mongodb.ts` — exports a cached
  `clientPromise` and a `getDb()` helper. Follows the standard Next.js
  pattern of stashing the client on `global` in development so hot reload
  doesn't open new connections each save.
- Required env vars (see `.env.local.example`, copy to `.env.local`):
  `MONGODB_URI`, `MONGODB_DB`.
- No schema/ODM layer yet — collections and validation will be introduced
  as each admin section (Weddings, Professionals, etc.) gets built out.

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
- `docker compose up -d --build` to start; `MONGODB_URI`/`MONGODB_DB` are
  injected via compose, so no `.env.local` is needed in this mode.

## Conventions

- App Router only; no `pages/` directory.
- Client components only where interactivity is needed (e.g. `Navbar.tsx`
  for active-route highlighting) — pages default to server components.
- Keep new nav sections' route folders under `src/app/<section>/page.tsx`,
  matching the `NAV_ITEMS` list in `src/components/Navbar.tsx`.
