# Phase 1 — complete

Status for anyone picking this branch up. Written 2026-08-19.

## Read these first, in order

1. `docs/superpowers/plans/2026-08-19-redesign-phase-1-foundations.md` — the plan, 9 tasks.
2. `docs/redesign-experiment/phase-1-decisions.md` — **every departure from the plan and why**,
   the two defect classes no guard here can catch, and the list of things deliberately carried
   into Phase 2/3. The plan's literal text is wrong in several places; this file says where.
3. This file.

## Where the work is

Branch `redesign/modern-instrument`, pushed to `origin`, branched from `redesign/experiment-brief`
at `7e9bba4`. **Not merged to `main`** — see "On merging" in the decisions file.

## All nine tasks are complete and reviewed

| Task | State |
|---|---|
| 1. Vendor the design system | complete |
| 2. Accent coincides with link | complete |
| 3. Re-point the palette and add the direction's tokens | complete |
| 4. `tokens.ts`, Tag, Button, CopyCitation | complete |
| 5. SectionRail, PageTitle | complete |
| 6. `publicationRow.ts` derivation logic + tests | complete |
| 7. PublicationRow | complete |
| 8a. `facets.ts` + tests, FacetChip, FacetBand | complete |
| 8b. PersonCard, ResourceBlock, FormField, SiteNav, MobileHeader, SiteFooter | complete |
| 9. fixtures, `/preview/components` gallery, Playwright + axe | complete |
| Final whole-branch review + fix wave | complete — verdict "ready to merge" |

Task 8 was split into 8a and 8b; the reason is in the decisions file. Every task passed a scoped
spec-and-quality review, and the branch then passed a whole-branch review whose two blocking
findings were fixed and independently re-verified.

## Verification state

| Command | Result |
|---|---|
| `npm test` | 323 passed, 38 files |
| `npm run type-check` | clean |
| `npm run lint` | 0 errors, 4 warnings — **all pre-existing** (`components/global/Logo.tsx`, `e2e/brand-colour.spec.ts`). Any new warning is a regression. |
| `npm run build` | clean, 23 routes |
| `npm run test:e2e` | 102 passed, 5 skipped (87 of those pre-existing) |

## Setting up a fresh or cloud checkout

```bash
cp .env.local.example .env.local
```

That is sufficient. `.env.local` is git-ignored and does not travel with the repo, and
`lib/sanity.api.ts` throws if `NEXT_PUBLIC_SANITY_PROJECT_ID` or `NEXT_PUBLIC_SANITY_DATASET` is
unset — so without this step `npm run build`, `npm run dev` and `npm run test:e2e` all fail.

Those two are prefilled in the committed example because neither is a secret: the project ID
appears in every image URL the public site serves, and the dataset is publicly readable. They are
also the only two the build requires.

Leave unset: `SANITY_API_READ_TOKEN` (drafts only), `SANITY_API_WRITE_TOKEN` (**leaving it unset is
what makes "the live Sanity dataset is never written to" structural rather than an instruction**),
and `SANITY_WEBHOOK_SECRET` (no test touches `/api/revalidate`).

`npm test`, `npm run type-check` and `npm run lint` need no environment at all.

## What to look at

`/preview/components` renders all twelve primitives in every state, in light and dark. It is the
only render-time verification they have, and it is what `e2e/redesign-components.spec.ts` asserts
against.

**One thing needs a human eyeball**, because it is pure geometry that axe and the token guards are
structurally blind to: open `/` at 768-1024px and check the desktop nav does not wrap. It is
`flex-wrap` at a fixed `h-[var(--nav-height)]` with no `overflow-hidden`, and `--nav-height`
dropped from 4rem to 3rem, so a wrapped second row would spill over the content below. Whether it
wraps depends on how many menu items the CMS holds.

## Standing rules if you continue

- **Implementation subagents use Sonnet.** Reviewers may use any tier; a final whole-branch review
  should use the most capable available.
- **The vendored tree under `docs/redesign-experiment/design-system/` is the authority for visual
  detail** and is read-only, verbatim by contract. But it is a static mockup with its own soft
  spots — check it against the contract rather than porting it blindly.
- **Empirical CSS proof is mandatory for any component work.** Build and grep the generated
  stylesheet. A class Tailwind never generates is a silent no-op that type-check and lint both
  pass; this bit the branch twice.
- **Two Tailwind utilities setting the same property never merge** — the later-generated one wins,
  and there is no `cn()`/`clsx`/`tailwind-merge` here to dedupe. This bit three times.
- **No new runtime dependencies. No new testing stack** — `vitest.config.ts` matches `**/*.test.ts`
  in Node's default environment; rendering is asserted in Playwright.
- **Identifiers (DOIs, URLs, citations) print verbatim** — never uppercased, never truncated in an
  `href`.

## After Phase 1

Phases 2 and 3 are scoped at the end of the plan file, and the decisions file lists what Phase 1
deliberately left for them.

Four engineering gaps between the agreed IA and the real schema are recorded in the spec
(`docs/superpowers/specs/2026-08-19-claude-design-redesign-experiment-design.md`): `publication`
has no `slug`; there is no `featured` field; **the PI has no `profile` document** (all 19 profiles
are lab members, none is Holsinger); and retiring `project` breaks `home.showcaseProjects` and
needs redirects for five URLs.
