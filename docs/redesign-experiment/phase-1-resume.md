# Phase 1 — resume here

Handoff state for continuing Phase 1 in a new session (cloud or local). Written 2026-08-19.

## Read these three files first, in order

1. `docs/superpowers/plans/2026-08-19-redesign-phase-1-foundations.md` — the plan, 9 tasks.
2. `docs/redesign-experiment/phase-1-decisions.md` — **every departure from the plan and why.**
   The plan's literal text is wrong in several places; this file says where. Do not skip it.
3. This file — what is done and what is next.

## Where the work is

Branch `redesign/modern-instrument`, pushed to `origin`. Branched from `redesign/experiment-brief`
at `7e9bba4`. Nothing merges to `main`.

## Status: Tasks 1-7 implemented, 8a / 8b / 9 remain

| Task | Commits | State |
|---|---|---|
| 1. Vendor design system | `1c140fd`, `dcf3776` | complete, reviewed |
| 2. Accent coincides with link | `ded2fe5`, `edcba01` | complete, reviewed |
| 3. Re-point palette + tokens | `6d2c54f` | complete, reviewed |
| 4. tokens.ts, Tag, Button, CopyCitation | `12a4588`, `90064b0` | complete, reviewed |
| 5. SectionRail, PageTitle | `d9797ca`, `21b0d07` | complete, reviewed |
| 6. publicationRow.ts + tests | `7423474` | complete, reviewed |
| 7. PublicationRow.tsx | `0edb9d3` | implemented; **review was in flight when this session ended — re-review it** |
| 8a. facets.ts + tests, FacetChip, FacetBand | — | not started |
| 8b. PersonCard, ResourceBlock, FormField, SiteNav, MobileHeader, SiteFooter | — | not started |
| 9. fixtures, `/preview/components` gallery, Playwright + axe | — | not started |
| Final whole-branch review | — | not started |

Task 8 was **split** into 8a and 8b — see the decisions file for why. Everything else follows the
plan's numbering.

## Two open questions on Task 7 that a re-review must settle

Task 7's implementer disclosed both; neither has been adjudicated.

1. **`group-hover:text-link` fires on the title even when `onOpen` is absent.** When the title is
   non-interactive text, colouring it link-blue on hover may misrepresent it as clickable. Decide
   whether the coupling should be conditional on `onOpen`.
2. **`compact`'s link ellipsis has no `min-width: 0`.** Likely a real functional defect, not
   cosmetic: `text-overflow: ellipsis` on a flex *item* does not truncate unless that item has
   `min-width: 0`, because flex items default to `min-width: auto` and refuse to shrink below
   their content. The contract requires compact's title to truncate and its link to be
   ellipsized. Verify both actually truncate. Fidelity to the vendored source is not a defence if
   the contract is broken.

## Blocker for a cloud or fresh checkout

`.env.local` is git-ignored and does **not** travel with the repo, but `npm run build` and
`npm run test:e2e` need the Sanity keys. Without it, Tasks 8b and 9 cannot be verified — Task 9
is entirely Playwright against a real production build.

Recreate it from the values in `.env.local.example`, or copy the local one **minus
`SANITY_API_WRITE_TOKEN`** (see the decisions file: omitting the write token is what makes "the
live Sanity dataset is never written to" structural rather than an instruction).

`npm test`, `npm run type-check` and `npm run lint` all work without it.

## Baseline at handoff

- `npm test` — 314 passed, 37 files
- `npm run lint` — 0 errors, 4 warnings, all pre-existing (`components/global/Logo.tsx`,
  `e2e/brand-colour.spec.ts`). **Any new warning is a regression.**
- `npm run build` — clean, 22 routes
- `npm run test:e2e` — 87 passed, 5 skipped (measured before Task 3 re-pointed the palette; it
  still passed after)

## Standing rules for the remaining work

- **Implementation subagents use Sonnet.** Reviewers and verifiers may use any tier; the final
  whole-branch review should use the most capable one available.
- **The vendored tree under `docs/redesign-experiment/design-system/` is the authority for
  visual detail** and is read-only, verbatim by contract. Where the plan's prose and the vendored
  source disagree, the source wins on appearance — but check it against the contract, because the
  source is a static mockup and has its own soft spots (see Task 7's second open question, and
  `Tag`'s three fidelity gaps in the decisions file).
- **Empirical CSS proof is mandatory for every component task.** Build and grep the generated
  stylesheet. A class Tailwind never generates is a silent no-op that type-check and lint both
  pass — this has already bitten twice.
- **Tailwind 4 arbitrary values:** `duration-(--sem-motion-press)` when the custom property is
  the whole value; `grid-cols-[var(--spacing-rail)_1fr]` with an explicit `var()` when it is part
  of a composite value; a bare `[--custom-prop]` emits invalid CSS.
- **No new runtime dependencies. No new testing stack** — `vitest.config.ts` matches
  `**/*.test.ts` in Node's default environment only; rendering is asserted in Playwright.
- **Identifiers (DOIs, URLs, citations) print verbatim** — never uppercased, never truncated in
  an `href`.

## Regenerating the working files

The execution ledger lived in `.superpowers/sdd/2026-08-19-redesign-phase-1-foundations/`, which
is git-ignored and did not travel. Its rulings are preserved in
`docs/redesign-experiment/phase-1-decisions.md`; its per-task briefs and diffs are regenerable.

If continuing with `superpowers:subagent-driven-development`, that skill's `scripts/task-brief`
extracts a task's text to a file (`task-brief <plan-file> <N>`) and `scripts/review-package`
builds a reviewer's diff package (`review-package <plan-file> <base> <head>`). Start a fresh
ledger; note in it that Tasks 1-7 are already complete so they are never re-dispatched.

## After Phase 1

Phases 2 and 3 are scoped at the end of the plan file. Phase 2 is the additive content model
(`publication.slug`, `publication.featured`, a `resource` type, topic tags, GROQ + typegen,
dry-run-by-default migrations). Phase 3 rebuilds the screens, retires the `project` type, adds
`redirects()` to `next.config.mjs`, and updates `app/api/revalidate/route.ts`.

Four engineering gaps between the agreed IA and the real schema are recorded in the spec
(`docs/superpowers/specs/2026-08-19-claude-design-redesign-experiment-design.md`): `publication`
has no `slug`; there is no `featured` field; **the PI has no `profile` document** (all 19 profiles
are lab members, none is Holsinger); and retiring `project` breaks `home.showcaseProjects` and
needs redirects for five URLs.
