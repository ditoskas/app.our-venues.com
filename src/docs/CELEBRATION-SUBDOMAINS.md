# Celebration subdomains & permanent links

Status: **Phase 1 done** (reservations + Domain tab, verified locally).
Next: Phase 2 (serving the sites). Infrastructure (Phase 4) waits for the
deployment concept.

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

**Phase 2 — app: serving the sites** *(this repo)*
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

**Phase 3 — frontend** *(frontend.our-venues.com)*
1. Vite `base: "/site/"` so assets load from both hosts.
2. Router `basename` from `window.celebrationBasePath` (`/celebrations/{guid}`
   on the permanent link, `/` on subdomains).
3. API base `/api` same-origin in production; local docker unchanged.

**Phase 4 — infrastructure** *(server-scripts, after the deployment concept)*
Cloudflare DNS + wildcard records, wildcard-certificate playbook, wildcard
nginx template (static `/site/`, `/api/` and pages → backend), landing pages
for the bare domains, `/celebrations/` and `/site/` on `app.our-venues.com`.

Local testing without DNS: Chrome resolves `*.localhost`, e.g.
`http://dimitris-and-maria-with-love.o-gamos-mas.localhost:3000`.
