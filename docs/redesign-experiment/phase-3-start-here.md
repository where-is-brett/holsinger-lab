# Start here — Phase 3

Handoff for continuing the redesign in a new session, cloud or local.
Written 2026-08-20, after Phase 2 merged.

## Where the work is

Branch **`redesign/integration`**, at `b9f5024`. It carries Phases 1 and 2 and is
36 commits ahead of `main`.

**`main` is untouched and must stay that way** until the redesign is whole. The
live site still runs the old design. Phase 1's palette re-point and Phase 3's
screen rebuild only make sense shipped together — merging half of it puts a
visibly half-redesigned site on a real lab's domain.

Branch Phase 3 work off `redesign/integration` and PR back into it, the way
Phases 1 and 2 did (PRs #22 and #23).

## Read these first, in order

1. `docs/superpowers/plans/2026-08-19-redesign-phase-1-foundations.md` — the
   original plan; Phase 3's scope is the last paragraph.
2. `docs/redesign-experiment/design-system/agreed-ia.md` — the agreed IA. This
   is the contract for what goes on each screen, in what order, and why. §3 is
   the ordered block list per screen.
3. `docs/redesign-experiment/phase-1-decisions.md` — the Tailwind 4 traps, the
   defect classes no guard catches, and the standing rules. **Do not skip.**
4. `docs/redesign-experiment/phase-2-decisions.md` — the content model, and what
   was deliberately left for Phase 3.
5. This file.

## Do these two things before writing any Phase 3 code

### 1. Run the four migrations

None have been run. All four are dry-run by default and print exactly what they
would change; none writes without `--commit`.

```bash
cp .env.local.example .env.local     # the two required vars are prefilled
npm ci

npm run backfill:publication-slugs      # then again with -- --commit
npm run backfill:publication-topics     # read the audit output carefully
npm run create:pi-profile
npm run backfill:profile-role-groups    # needs the roleGroup docs to exist first
```

**Read the topics dry run properly.** Its keyword table was written against the
IA's shorthand ("TREM2 '22"), not against the real titles, because the session
that wrote it could not reach the dataset. It prints every paper that matched no
rule, every paper that matched several, and **every rule that matched no paper** —
that last list is how a wrong keyword shows itself. It only writes where exactly
one rule matches, so anything it reports needs tagging by hand in Studio.

After `create:pi-profile` succeeds, three manual steps remain in Studio, by
design: read the copied bio, add a portrait, and set **Settings → Lab head** to
the new profile. Nothing turns the spotlight on until that last one.

Until these run, `slug`, `topics`, `type` and `featured` are empty on all 19
publications, and there is no `resource` document at all. Building screens
against that means building against fixtures, and the facets in particular will
look like they work when they have nothing to filter.

### 2. Fix the egress allowlist, if working in the cloud

A cloud session cannot currently build this project. The network policy does not
allowlist the Sanity API, and the build fetches from it:

```
Host not in allowlist: j3f9z8os.api.sanity.io.
  → Failed to collect page data for /projects/[slug]
```

Add **`j3f9z8os.api.sanity.io`** and **`cdn.sanity.io`** to the environment's
egress allowlist. Without them `npm run build`, `npm run dev` and
`npm run test:e2e` are all unavailable, and Phase 3 is the phase where that
matters most — it is entirely visual, and Phase 1's standing rule requires
building and grepping the generated stylesheet for every component task.

`npm test`, `npm run type-check`, `npm run lint` and `npm run typegen` all work
without network.

## Also outstanding

**Open `/` at 768–1024px and check the desktop nav does not wrap.** Carried over
from Phase 1 and still not done. It is `flex-wrap` at a fixed
`h-[var(--nav-height)]` with no `overflow-hidden`; a second row fitted at 76px
but does not at 52px. Whether it wraps depends on how many menu items the CMS
holds. axe, the token guards and every existing spec are structurally blind to
it — it needs a human eye, and Phase 3 rebuilds this nav anyway, so settle it
early.

## What Phase 3 is

From the plan, in the order the plan gives:

1. Rebuild `Layout` and the navbars on `SiteNav` / `MobileHeader` / `SiteFooter`.
2. Build Publications index, `/publications/[slug]`, People, Research, Resources
   and Home from the primitives.
3. Re-derive the `:root[data-theme='warm']` presets against the new palette.
4. Retire `project`: remove the type, migrate `home.showcaseProjects`, delete
   `/projects/[slug]`, add `redirects()` to `next.config.mjs` (it has none today)
   for the five existing project URLs, and update the `body.type` switch in
   `app/api/revalidate/route.ts`.

Step 4 is the only destructive step in the whole redesign, and it is last for a
reason. The five `project` documents redistribute per `agreed-ia.md` §2: the two
real projects become sections on Research, the PI bio goes to About and the PI
profile, MAESTRO becomes a Lab section, and "Publication highlights" is already
replaced by `publication.featured`. Nothing should be deleted until its
destination exists and the redirects are in place.

## What you already have

Twelve reviewed primitives in `components/redesign/`, with `tokens.ts`,
`facets.ts` (`countBy` / `toggleFacet` / `applyFacets`), `publicationRow.ts`
(author splitting, citation building), and `fixtures.ts`. All twelve render in
every state, light and dark, at **`/preview/components`** — run the app and open
it before building screens, it is the fastest way to see what exists.

The content model is in place: `publication.slug` / `type` / `topics` /
`featured`, the `resource` type, and queries `publicationsQuery`,
`publicationBySlugQuery`, `publicationPaths`, `featuredPublicationsQuery`,
`resourcesQuery`.

Two things Phase 2 left deliberately open:

- **Tighten `publication.slug` to `required()`** once the slug backfill has run.
  It is currently optional so the 19 unslugged records do not show as invalid.
- **Decide whether `resource` needs its own route and slug.** It has none. The IA
  gives publications their own pages and says nothing of the sort for resources,
  so this is Phase 3's call to make.

## Standing rules that still apply

Carried from `phase-1-decisions.md` — these were learned the hard way:

- **Empirical CSS proof is mandatory.** Build and grep the generated stylesheet.
  A class Tailwind never emits passes both type-check and lint silently. This bit
  twice in Phase 1.
- **Two Tailwind utilities setting the same property never merge** — the
  later-generated one wins. This repo deliberately has no `cn()` / `clsx` /
  `tailwind-merge`. It appeared three times in Phase 1, once silently discarding
  a whole colour transition.
- **Tailwind 4 arbitrary values:** `duration-(--sem-motion-press)` when the
  custom property is the whole value; `grid-cols-[var(--spacing-rail)_1fr]` with
  an explicit `var()` inside a composite; a bare `[--custom-prop]` emits invalid
  CSS.
- **The vendored tree under `design-system/` is the authority for visual
  detail** and is read-only. Where it and the plan's prose disagree, the source
  wins on appearance — but check it against the contract; it is a static mockup
  with its own soft spots.
- **Identifiers print verbatim** — DOIs, URLs, citations, tag titles. Never
  uppercased, never truncated in an `href`. The first topic tag is
  `Gut–brain & non-pharm therapies` with an **en dash**.
- **No new runtime dependencies, no new testing stack.** `vitest.config.ts`
  matches `**/*.test.ts` in Node's default environment only; rendering is
  asserted in Playwright.
- **Anything imported from `scripts/` needs explicit file extensions** — those
  run under plain Node, whose ESM resolver has no extensionless lookup. Nothing
  automated enforces this; it broke a script in Phase 2 while every other check
  stayed green.

## Baseline to beat

Measured on `redesign/integration` at `b9f5024`:

| Command              | Result                                                                                                                                   |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`           | 351 passed, 41 files                                                                                                                     |
| `npm run type-check` | clean                                                                                                                                    |
| `npm run lint`       | 0 errors, 4 warnings — all pre-existing (`components/global/Logo.tsx`, `e2e/brand-colour.spec.ts`). **Any new warning is a regression.** |
| `npm run typegen`    | clean, 16 queries and 36 schema types                                                                                                    |
| `npm run build`      | clean in CI, 23 routes                                                                                                                   |
| `npm run test:e2e`   | 102 passed, 5 skipped                                                                                                                    |

CI (`.github/workflows/ci.yml`) runs all six on every PR to any branch.
