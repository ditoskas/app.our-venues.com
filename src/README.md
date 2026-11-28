This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Seeded demo data

On every server boot, `lib/seed` (`runSeeders()`) creates whatever is missing; it never deletes anything:

- **Root** user
- **1 Professional**, "Test Company" (Premium, full contact data and logo), who owns 3 fully-populated celebrations:
  - **Dimitris & Maria Marriage**: the showcase wedding (every tab: info, story and timeline, events with map points, guests in each RSVP state, live-event photos, hero and invitation images). Both spouses get **Couple** logins.
  - **Nikos & Eleni Wedding**: public site on, max guests shown. No logins.
  - **Christening of Alexandros**: Christening type, Greek and English only. No logins.
- 2 subscription packages (Free, Basic)

### Logins

Every non-Root user shares the same password. The table is also printed to the server log at the end of seeding (outside production).

| Email | Password | Role |
|---|---|---|
| ditoskas@gmail.com | `SEED_ROOT_PASSWORD` | Root |
| test@o-gamos-mas.com | Test123456! | Professional |
| dimitris-husband@o-gamos-mas.com | Test123456! | Couple |
| maria-wife@o-gamos-mas.com | Test123456! | Couple |

### Starting over

`npm run seed:reset -- --yes` drops the whole database and empties the S3 bucket (it refuses to run with `NODE_ENV=production`). Restart the server to reseed:

```bash
# Docker
docker compose exec backend npm run seed:reset -- --yes
docker compose restart backend

# Local (from src/)
node --env-file=.env.local scripts/seed-reset.mjs --yes   # then restart npm run dev
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
