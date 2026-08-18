# Holsinger Lab

The website for the Holsinger Lab — a Next.js site with all content managed in Sanity CMS.

**New here?** If you are taking over this site rather than developing it, read
[`docs/HANDOVER.md`](docs/HANDOVER.md) instead. It covers ownership, accounts and day-to-day
editing in non-technical language.

- **Live site:** https://holsingerlab.vercel.app
- **CMS (Sanity Studio):** https://holsingerlab.vercel.app/studio — mounted in-app at
  `app/studio`, not deployed separately

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Sanity 6 · Vitest ·
Playwright. Hosted on Vercel, deployed automatically from `main`.

## Getting started

Requires Node 22 or later.

```bash
npm install
cp .env.local.example .env.local   # then fill in the values
npm run dev
```

Environment variables are documented inline in `.env.local.example`. The Sanity project ID
and dataset are public by design (the dataset is publicly readable); the API tokens, webhook
secret and Formspree endpoint are not. In production these are set in Vercel → Settings →
Environment Variables.

## Commands

| Command              | Purpose                                       |
| -------------------- | --------------------------------------------- |
| `npm run dev`        | Development server                            |
| `npm run build`      | Production build                              |
| `npm run lint`       | ESLint                                        |
| `npm run type-check` | TypeScript, no emit                           |
| `npm test`           | Unit tests (Vitest)                           |
| `npm run test:e2e`   | End-to-end tests (Playwright)                 |
| `npm run typegen`    | Regenerate `sanity.types.ts` from the schemas |

CI runs all of the above on every pull request. `typegen` is checked for freshness — if you
change a schema in `schemas/`, run it and commit the result or the build fails.

## How content reaches the site

Editors publish in Studio → Sanity fires a webhook at `/api/revalidate` → the affected pages
are regenerated. Changes are live within about a minute without a deployment.

The webhook authenticates with `SANITY_WEBHOOK_SECRET`, and the route **fails closed** — if
the secret is unset or mismatched it returns 401 and edits silently stop appearing. That is
the first thing to check when content looks stale.

## Layout

```
app/           Routes (App Router). app/studio hosts the CMS.
schemas/       Sanity content models — the source of truth for sanity.types.ts
lib/           Data fetching, branding resolution, metadata, design tokens
plugins/       Studio customisations (DOI lookup, preview pane, desk structure)
e2e/           Playwright specs
docs/          Handover, branding guide, and the full design record
```

## Documentation

- [`docs/HANDOVER.md`](docs/HANDOVER.md) — ownership, accounts, editing. Non-technical.
- [`docs/branding.md`](docs/branding.md) — how branding resolves, and the invariants behind
  it. **Read this before touching logo, colour or metadata code.**
- [`docs/tutorial-copy.md`](docs/tutorial-copy.md) — editor-facing copy, pasted into the
  `/tutorial` page in Studio.
- `docs/superpowers/specs/` and `docs/superpowers/plans/` — design documents for every
  change in the 2026 rebuild, with the reasoning behind each decision.

## Conventions worth knowing

**This repo has no maintaining developer.** Several design decisions follow from that, and
they are deliberate rather than incidental:

- The root layout's settings fetch cannot throw. An unguarded failure would take down both
  the site and the CMS needed to fix it (`lib/settings.ts`).
- Contrast floors in `styles/tokens.test.ts` are enforced by tests. Never relax one to make
  a palette pass.
- Anything reaching `<title>`, Open Graph tags or JSON-LD must fetch with `stega: false`.
  Nothing in CI catches a mistake here — see `docs/branding.md`.
