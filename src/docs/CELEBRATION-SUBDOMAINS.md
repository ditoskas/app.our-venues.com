# Celebration subdomains & permanent links

Status: **Phases 1–4 done.** Phase 4's playbooks are written and verified
locally (nginx configs tested end to end); the production rollout (domains in
the admin panel, Cloudflare token, first deploy) is the remaining manual step —
see "Production rollout" below.

## Decisions

### Domains

| Host | What it serves |
|---|---|
| `our-venues.com` | Marketing website (separate project). Nothing from this app. |
| `app.our-venues.com` | This app (admin), **plus** the permanent celebration link `/celebrations/{guid}`. |
| `app.our-venues.com/celebrations/{guid}` | **Permanent link**: the celebration's public site, for every celebration (free or premium). Never expires. |
| `o-gamos-mas.com`, `vaftizomai.com` (bare) | Static landing page: basic info + link to `our-venues.com`. |
| `{label}.o-gamos-mas.com` | A **Marriage**'s public site, only during its reserved period. |
| `{label}.vaftizomai.com` | A **Christening**'s public site, only during its reserved period. |

- Outside an active reservation (including unknown labels), a subdomain answers with
  **302** (not 301, so browsers don't cache it) to `https://our-venues.com`.
- The permanent link has no locale prefix and uses the celebration's UUID
  `guid`. Admin URLs always have a locale prefix (`/el/celebrations/{ObjectId}`),
  so the two never collide.
- Printed invitations/QR codes should use the permanent link; the subdomain
  only works inside its period.

### Reservations

- **Premium feature.** Allowed when the celebration's professional is on the
  `Premium` plan (`Professional.plan`). A per-couple premium flag comes later:
  it will be added as a second condition in `canReserveSubdomain()` only.
  Free celebrations only have the permanent link.
- **Who:** Root, the owning Professional, and the celebration's Couple
  (`canAccessCelebration()`).
- **One subdomain per celebration.** The domain is derived from the type
  (Marriage → `o-gamos-mas.com`, Christening → `vaftizomai.com`).
- **Period:** from 1 month before `celebrationDate` (00:00 Europe/Athens) to
  1 week after it (23:59:59 Europe/Athens). The celebration date is required
  to reserve.
- **Uniqueness:** a label can be reused by different celebrations whose
  periods don't overlap. Enforced atomically in MongoDB (see "Data model").
- **Can be changed** after reserving: the new label is reserved first, then
  the old one released, so the celebration is never left without one.
- **Date or type change that clashes** with another celebration's reservation
  of the same label is **rejected**; the user must change the subdomain first.
- **Premium → Free downgrade keeps existing reservations**; only new
  reservations/changes are blocked.
- Label rules: lowercase `a-z`, `0-9`, `-`; 3–63 chars; no leading/trailing
  hyphen; no `xn--` prefix; not in the reserved list (`www`, `api`, `app`,
  `admin`, `mail`, …).

### DNS / TLS

- `our-venues.com` stays on GoDaddy (fixed hostnames, HTTP-01 certs via the
  existing `letsencrypt.yml`).
- `o-gamos-mas.com` and `vaftizomai.com` stay registered at papaki.gr but
  their **DNS moves to Cloudflare**, so wildcard certificates can be issued
  with certbot's Cloudflare DNS plugin.

## Data model

Collection `SubdomainReservations`, one document per `(domain, label)`:

```
{ domain, label,
  reservations: [{ celebrationId, startsAt, endsAt, createdBy, createdAt }],
  createdAt, updatedAt }
```

- Unique index on `{ domain, label }`, plus an index on
  `reservations.celebrationId`.
- Reserve = one `findOneAndUpdate` with `upsert: true` whose filter only
  matches when **no** existing period overlaps the new one
  (`start < otherEnd && otherStart < end`). If a period overlaps, the filter
  doesn't match, the upsert tries to insert a duplicate `(domain, label)` and
  fails with a duplicate-key error → "not available". Race-free without
  transactions.

## Implementation plan

**Phase 1 — app: reservations** *(this repo)* — ✅ done
1. `lib/siteDomains.ts`: type → domain map, label validation, reserved
   labels, period calculation (Europe/Athens).
2. `lib/subdomainReservations.ts`: collection, indexes, availability check,
   atomic reserve, release, change, move-period (date/type change).
3. `canReserveSubdomain()` (premium rule).
4. "Domain" tab on the celebration page: availability check, reserve/change/
   release, full URL + active dates, permanent link with copy button. All
   actions logged (LogActions) and translated (el/en/ru).
5. Date/type changes re-validate the reservation and are rejected on clash.
6. Seed: the showcase wedding reserves `dimitris-and-maria-with-love`.

Where it lives: `lib/siteDomains.ts` (client-safe rules), `lib/subdomainReservations.ts`
(collection + `canReserveSubdomain`, `reserveSubdomain`, `releaseSubdomain`,
`followCelebrationChange`), `celebrations/[id]/domain/page.tsx` +
`DomainManager.tsx`, actions at the end of `celebrations/[id]/actions.ts`.
Date changes (Celebration Info) and type changes (list dialog) call
`followCelebrationChange()` before saving; deleting a celebration releases
its subdomain.

**Phase 2 — app: serving the sites** *(this repo)* — ✅ done
1. `proxy.ts`: `/celebrations/{uuid}/…` without a locale, and any request whose
   host is a celebration domain's subdomain, bypass locale/auth handling and
   are rewritten to a site-entry route handler.
2. Site-entry handler: resolves the celebration (by guid, or by host + active
   reservation). Active → returns the frontend's `index.html` with
   `window.celebrationId` / `window.celebrationBasePath` injected; inactive →
   302 to `https://our-venues.com`.
3. Env: celebration domains, marketing URL, where to fetch the frontend's
   `index.html`, and the `/site/` asset origin (proxied by `next.config` in
   dev).
4. `PUBLIC-API.md` updated.

**Phase 3 — frontend** *(frontend.our-venues.com)* — ✅ done
1. Vite `base: "/site/"` so assets load from both hosts.
2. Router `basename` from `window.celebrationBasePath` (`/celebrations/{guid}`
   on the permanent link, `/` on subdomains).
3. API base `/api` same-origin in production; local docker unchanged.

How phases 2–3 work (as built):

- `proxy.ts` → `routeCelebrationSite()` runs before locale/auth handling:
  a celebration subdomain host or `/celebrations/{uuid}/…` is rewritten to
  `/api/site/entry`, with what matched passed as the request headers
  `x-celebration-site-host` / `x-celebration-site-guid` (a rewritten route
  handler sees the *original* URL, so query params don't survive). A bare
  celebration domain → 302 to the marketing site (nginx's landing page
  normally answers first in production).
- `app/api/site/entry/route.ts`: resolves the celebration (by guid, or by
  host + active reservation + matching type) → the SPA's `index.html`
  (fetched from `SITE_INDEX_URL`) with
  `window.celebrationId` / `window.celebrationBasePath` injected, sent
  `no-store` + `X-Robots-Tag: noindex`; otherwise 302 to `MARKETING_URL`.
- Static assets: the SPA is built with Vite `base: "/site/"`. Locally,
  `next.config.ts` rewrites `/site/*` to `SITE_ORIGIN`; the proxy matcher
  skips `site/`. The SPA's router basename comes from
  `window.celebrationBasePath`.
- Pure helpers (safe in `proxy.ts`): `lib/siteDomains.ts`
  (`parseCelebrationHost`, `matchPermanentPath`) and `lib/siteConfig.ts`
  (env vars).

Env vars (backend):

| Var | Production | Local Docker |
|---|---|---|
| `MARKETING_URL` | `https://our-venues.com` (default) | default |
| `CELEBRATION_SITE_HOST_SUFFIX` | empty | `.localhost` |
| `SITE_INDEX_URL` | absolute path of the built file: `/data/customers/thinkpozitive/vhosts/o-gamos-mas.com/www/frontend/index.html` | `http://frontend:3001/site/` |
| `SITE_ORIGIN` | unset (nginx serves `/site/`) | `http://frontend:3001` |

Frontend production build: `VITE_API_BASE_URL=/api` (same-origin on every
host), output served at `/site/`.

**Phase 4 — infrastructure** *(server-scripts)* — ✅ done (see "Production rollout")
Cloudflare DNS + wildcard records, wildcard-certificate playbook, wildcard
nginx template (static `/site/`, `/api/` and pages → backend), landing pages
for the bare domains, `/celebrations/` and `/site/` on `app.our-venues.com`.

For Phase 4 nginx, on `app.our-venues.com` **and** the wildcard hosts:
serve `/site/` from the frontend build; send `/api/` and every other page
request to the backend (it decides SPA shell vs. 302). Bare domains: static
landing page.

Local testing without DNS: Chrome resolves `*.localhost`, e.g.
`http://dimitris-and-maria-with-love.o-gamos-mas.com.localhost:3000` (only
serves inside the reservation's period — the seeded one is in 2032; widen
`startsAt`/`endsAt` in `SubdomainReservations` to try it), and the
permanent link `http://localhost:3000/celebrations/{guid}`.

## Production rollout

Deployment runs from the admin panel (`MyProjects\my.thinkpozitive.net`), which executes playbooks
from `server-scripts`. All three domains go under the **thinkpozitive** customer, all with the
**Custom** CMS, so the admin panel itself needs no code changes:

| Domain (admin panel) | Setting | Value |
|---|---|---|
| `app.our-venues.com` | Backend CMS | Custom |
| | Backend deployment script | `deployments/deployment-our-venues-app.yml` |
| | Backend repository | `app.our-venues.com` |
| | Backend port | e.g. `5000` (also used below) |
| | Backend env | `MONGODB_URI`, `MONGODB_DB`, `SESSION_SECRET`, `SEED_ROOT_PASSWORD`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (optional), `SITE_INDEX_URL=/data/customers/thinkpozitive/vhosts/o-gamos-mas.com/www/frontend/index.html` — **not** `SITE_ORIGIN` / `CELEBRATION_SITE_HOST_SUFFIX` |
| | TLS | the normal "Let's Encrypt" action |
| `o-gamos-mas.com` and `vaftizomai.com` | Frontend CMS | Custom |
| | Frontend deployment script | `deployments/deployment-our-venues-celebration-site.yml` |
| | Frontend repository | `frontend.our-venues.com` |
| | Frontend env | `VITE_API_BASE_URL=/api` (+ `VITE_GOOGLE_MAPS_API_KEY=...`; never `VITE_CELEBRATION_ID`) |
| | Backend port | **the app's port** (every request is proxied there) |
| | TLS | **don't** use "Let's Encrypt" — the deploy issues the wildcard cert itself |

Before the first deploy:
1. Cloudflare (DNS for `o-gamos-mas.com` / `vaftizomai.com`): `A` records for `@` and `*` → the
   server's IP (and `AAAA` if IPv6 is used).
2. A Cloudflare API token with **Zone → DNS → Edit** on those two zones, in
   `server-scripts/ansible/vars/tokens.yml` → `cloudflare_api_token`.
3. GoDaddy (`our-venues.com`): `A` record `app` → the server's IP.

Order: create the three vhosts, deploy `o-gamos-mas.com` and `vaftizomai.com` (createNginx), then
`app.our-venues.com` (createNginx), then Let's Encrypt for `app.our-venues.com`. The app reads the
SPA shell from `o-gamos-mas.com`'s build, so redeploy that domain whenever the frontend changes
(and `vaftizomai.com` too — each serves its own `/site/` copy).

Verified locally: the rendered nginx configs pass `nginx -t`; `celebration-sites.conf.j2` was run
in a real nginx in front of the local app (HTTPS, wildcard-style names, the production frontend
build) — http→https, bare domain / inactive / unknown subdomain → 302, `/site/` assets served by
nginx with immutable caching, API `no-store`, active subdomain → SPA with the celebration injected.
Both playbooks pass `ansible-playbook --syntax-check`. Not run against a real server yet.
