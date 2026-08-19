# Phase 1 — decisions taken during execution

Companion to `docs/superpowers/plans/2026-08-19-redesign-phase-1-foundations.md`.

The plan is the argument; this file records where execution **departed from it** and why.
Written because the execution ledger lives in `.superpowers/`, which is git-ignored — without
this file the reasoning behind these departures would not survive a push, a fresh clone, or
`git clean -fdx`.

Anyone continuing Phase 1, or writing Phases 2-3, should read this before trusting the plan's
literal text.

---

## Two defect classes that no guard in this repo can catch

Both were found by checking the plan's claims before dispatching, not by a failing test. Watch
for them again in Phases 2-3.

### 1. `lib/color.ts`'s `Oklch.h` is radians; CSS `oklch()` is degrees

The plan's palette-conversion script fed CSS hue **degrees** (250, 255, 260, 264) straight into
`oklchToHex`, whose `h` parameter is documented as **radians** (`lib/color.ts:16`). 264 radians
wraps to about 6°, so `--sem-link` converted to `#a20045` — crimson — for a direction whose own
source file specifies "ultramarine oklch(0.45 0.19 264)".

**Why this was dangerous rather than merely wrong:** `contrast()` is hue-agnostic. All sixteen
WCAG assertions in `styles/tokens.test.ts` pass either way. The task would have reported fully
green while re-skinning the entire site the wrong colour.

Correct call: `oklchToHex({ L, C, h: (deg * Math.PI) / 180 })`. This yields `#1a48bc`, and
reproduces the design system's own annotated ratios (`--sem-text-faint` 4.51:1, `--sem-field`
3.98:1), which is what confirms it.

A related false alarm: `--sem-text-faint` first appeared to fail its own `>= 4.5` assertion at
4.48:1. That was the same bug. Corrected, it is 4.52:1 — passing, with very little margin. Do
not "improve" it and do not loosen the assertion.

### 2. A `--sem-*` token needs BOTH halves or its utility silently does not exist

Task 3 declared five new colour tokens on `:root` but `@theme inline` still mapped only the
original eleven to `--color-*`. So `text-text-faint` and `border-rule-strong` — used by the
plan's own `tokens.ts` — generated **no CSS at all**. `npm run type-check` and `npm run lint`
both pass on a class Tailwind never emits, because a nonexistent utility is an inert string,
not an error.

Any new colour token needs a `:root` value *and* a `@theme inline` mapping. The five spacing
tokens (`--spacing-rail`, `-rail-sm`, `-row`, `-stack`, `-stack-lg`) were deliberately **not**
registered, because those names collide with Tailwind's own `--spacing-*` namespace; reach them
through arbitrary values instead.

### Consequence: empirical proof is required, not type-check plus lint

Every component task must build and grep the generated CSS to prove its utilities emit real
declarations. This is the only guard against the class of failure above.

---

## Tailwind 4 arbitrary-value syntax (settled empirically)

Tailwind 4 does **not** wrap bracket contents in `var()`.

| Form | Emits | Verdict |
|---|---|---|
| `duration-[--sem-motion-press]` | `transition-duration:--sem-motion-press` | **invalid** — browser discards it, falls back to `0s` |
| `duration-(--sem-motion-press)` | `transition-duration:var(--sem-motion-press)` | correct when the custom property is the whole value |
| `grid-cols-[var(--spacing-rail)_1fr]` | real `var()` | correct when it is part of a composite value — write `var()` explicitly |
| `px-[13px]` | `padding-inline:13px` | fine — a concrete literal, unrelated to the above |

---

## Departures from the plan

Each of these overrides the plan's literal text. Reversing any one is cheap; the cost of
getting it wrong is stated so a reader can judge.

**Task 1 — vendored docs excluded from lint and type-check.** `docs/**` added to
`eslint.config.mjs` ignores and `"docs"` to `tsconfig.json` excludes. The vendored tree is
verbatim by contract, so its 4 lint warnings could never be fixed at source, and 14 vendored
`.d.ts` files sat inside the app's TS program alongside later components of the same names.
*Cost if wrong:* two config lines; `docs/` is no longer type-checked (it holds no app code).

**Task 1 — `.prompt.md` files vendored.** The plan's Files block promised them; its path list
omitted them. They exist for all fourteen components.

**Task 2 — guard the derived locals, not the object properties.** The plan kept a four-clause
null guard that, once accent *is* link, checks the same value twice. Guarding `lightLink` /
`darkLink` before constructing the return value is equivalent and narrows correctly. (Narrowing
a local does not narrow a property already assigned from it — which is why the plan needed four
clauses.)

**Task 2 — `ACCENT_MIN_CONTRAST` deleted, not kept.** The plan said keep it "declared and
referenced by a comment"; a comment is not a reference, so it became dead module-private code.
The fact it documented — accent's floor is 3:1, which 4.5:1 clears — survives in the comment
above `LINK_MIN_CONTRAST`.

**Task 3 — `PRESET_SURFACES.default` updated in `lib/theme.ts`,** a file the plan's Files block
did not list. `lib/theme.test.ts:125` asserts the CSS and TS copies agree, and the brand-colour
derivation measures contrast against `PRESET_SURFACES`. Leaving it stale both fails the suite
and derives every lab's link colour against the old surfaces. New value:
`light: ['#f5f7f9', '#eaedf1'], dark: ['#0d1014', '#1a1d23']`.

**Task 3 — three further test files updated as a consequence.** `lib/theme.test.ts`,
`lib/layout-branding.test.ts`, `lib/manifest.test.ts` carried the old default-preset hexes as
expected literals, reached via `themeColorFor` → manifest/viewport colours. Literal-only
substitutions; every equality assertion preserved.

**Task 3 — motion and easing tokens stay light-only.** The plan's global constraint says every
light token is redeclared dark. That binds only hex-valued `--sem-*` colour tokens: the guard's
parser matches `--sem-[\w-]+:\s*#[0-9a-f]{6}` and nothing else, and motion values are
scheme-invariant.

**Task 3 — the palette comment lives *inside* the `:root` ruleset.** The plan said to put it
above. `styles/tokens.test.ts`'s block parser is comment-blind, so text directly above a
selector is folded into the selector it matches on — the `warm` preset's own comment documents
this trap.

**Task 3 — `npm run test:e2e` replaces the manual dev-server eyeball.** Playwright's
`webServer` builds and serves a real production build, and `e2e/axe.spec.ts` plus
`e2e/theme.spec.ts` already assert accessibility and both colour schemes on the affected
routes. Baseline for comparison: 87 passed / 5 skipped.

**Task 4 — `Tag` corrected against its vendored source, and its hit area expanded.** The plan's
`Tag` transposed and halved the source's padding (`px-2 py-1` against `8px 13px`), used
`text-text-faint` where the source says `--sem-text-muted` (4.52:1 against 7.83:1), and dropped
`white-space: nowrap`, which would wrap a topic like "Neuro-oncology & biomarkers" mid-phrase.
Separately, interactive `Tag`s rendered ~19px against the ≥44px target floor. Neither the plan
nor the design system reaches 44px, so the **hit area** was expanded with a `before:`
pseudo-element rather than the visual box: a 44px chip would wreck the density of the
publication ledger row, and interactive and informational tags of the same visual class would
stop matching. `inset-x-0` keeps the expansion inside the tag's own width.

**Task 4 — `LABEL_BASE` split out of `LABEL`.** `LABEL` baked in `text-text-faint`, so `Button`
and `CopyCitation` each re-typed the mono-caps fragment and `Tag` could not reuse it once it
needed muted. `LABEL_BASE` is colourless; `LABEL` derives from it and keeps the faint default
for column heads and the footer.

**Task 4 — the clipboard guard in the plan was buggy.** `await navigator.clipboard?.writeText(cite)`
yields `undefined` when the API is absent, and `await undefined` resolves rather than throwing,
so the `catch` never ran and the control showed a **false success** on insecure origins. Found
by the implementer, not the plan. `CopyCitation` now bails before touching state.

**Task 4 / Task 7 — `<button>` instead of `href="#"`.** The vendored sources use an anchor with
a placeholder `href` for click-only affordances. A handler with no destination is a button. In
`PublicationRow` this matters concretely: `publication` has **no `slug`** in the current schema,
so there is no per-publication URL to link to until Phase 2 adds one.

**Task 5 — the rail narrows on mobile; `PageTitle` narrows with it.** `SectionRail.jsx`
hardcodes an 88px rail and is not mobile-aware (88px is 23% of a 390px viewport). The plan
required narrowing to `--spacing-rail-sm` (38px) below `md`. Because the plan also says
`PageTitle` uses "the *same* `[rail | content]` grid", the narrowing had to extend there too —
otherwise `PageTitle`'s rail stays at 88px while every `SectionRail` beneath narrows, jogging
the shared vertical rule sideways at the seam. The grid now lives once, as `RAIL_GRID` in
`tokens.ts`.

**Task 5 — `PageTitle`'s meta line follows the source, not the `META` token.** The plan said it
consumes `META` (`text-meta`, `text-text-muted`); `PageTitle.jsx` specifies `400 12px/1` mono
at `0.1em` in `--sem-text-faint`, or `--sem-link` when `accentMeta`. They disagree on size,
tracking and colour.

**Task 8 split into two dispatches.** 8a = `facets.ts` + tests + `FacetChip` + `FacetBand`;
8b = `PersonCard`, `ResourceBlock`, `FormField`, `SiteNav`, `MobileHeader`, `SiteFooter`. As
written the task bundled a unit-tested logic module with nine independent component ports behind
a single review gate, far past the plan's own stated task granularity.

**Task 8b — `PersonCard` uses `next/image`.** `next.config.mjs` already whitelists
`cdn.sanity.io`, and every image surface in this repo uses `next/image`. The vendored source's
plain `<img>` is a mockup artefact and would add a new `@next/next/no-img-element` warning inside
`components/redesign/`.

---

## Environment note

`.env.local` is git-ignored, so it does not follow a worktree — but `npm run build` and
`npm run test:e2e` need the Sanity keys. The worktree's copy was created from the main checkout
**minus `SANITY_API_WRITE_TOKEN`**, which makes the plan's "the live Sanity dataset is never
written to" constraint structural rather than an instruction a subagent has to be trusted to
honour. Recreate it the same way.

---

## Carried into later work

- **Task 9:** take a real `getBoundingClientRect()` reading of an interactive `Tag` in the
  Playwright pass. Task 4's 44px hit area was verified by CSS-spec arithmetic because the
  implementer could not get a live measurement.
- **Task 8b:** this repo has prior form with image-geometry bugs (object-fit and aspect-ratio
  traps; a `relative` wrapper collapsing to zero height). `PersonCard`'s 4:5 footprint must hold
  for both the portrait and the no-portrait fallback so the grid never reflows.
- **Task 8b:** the MAESTRO register link was seen rendering `TINYURL.COM/MAESTROTALKS` in caps
  with a correct href. Identifiers are never uppercased — apply `uppercase` to labels only,
  never to values.
- **`splitAuthors`:** the `.trimEnd()` on the `pi` segment is unreachable for all real inputs,
  and if it ever fired, `pre + pi + post` would lose the trimmed character rather than
  reconstruct the original exactly. Inherited from the plan; 0 of 19 publications reach it.
- **`--sem-link-inverse`** is chromatic but static, while `buildBrandStyle` overrides only
  `--sem-link` and `--sem-accent` at request time. A lab setting a `brandColor` therefore
  desyncs the inverse-band link from the real link. Out of Phase 1 scope; commented in
  `styles/index.css`.

---

## Later departures (Tasks 7-9 and the final fix wave)

**Task 8 was split into 8a and 8b.** As written it bundled a unit-tested logic module with nine
independent component ports behind a single commit and a single review gate — far past the plan's
own stated task granularity. 8a took `facets.ts` + tests + `FacetChip` + `FacetBand`; 8b took the
six remaining components.

**`PublicationRow`'s title is a `<button>`, never the source's `href="#paper"`.** `publication` has
no `slug` in the current schema, so there is no per-publication URL to link to until Phase 2. A
handler with no destination is a button. Same reasoning applied to `Tag` in Task 4.

**`PublicationRow` has no `'use client'`, for a specific reason.** `onOpen` is a function prop, and
functions are not serialisable across the RSC boundary — so a Server Component *cannot* pass it.
Any caller that does is necessarily a client component, and a module without the directive takes
on its importer's environment. A server-only caller reaches only the non-interactive `<span>`
branch. (The gallery route is therefore a client component, split into `page.tsx` + `Gallery.tsx`
because Next.js forbids exporting `metadata` from a `'use client'` file — the same split
`app/studio/[[...tool]]/page.tsx` already uses.)

**`FacetChip` gets the same hit-area treatment as `Tag`,** and `FacetBand`'s chip rows are spaced
`gap-y-5` (20px). A 44px hit area on a 29px box overhangs 7.5px per edge, so two adjacent wrapped
rows intrude 15px combined: the source's 8px gap *overlaps* by 7px and 16px leaves only 1px. The
same arithmetic applies across facet *groups*, which is why that container is `gap-5` too — an
ambiguous tap there would silently apply the wrong filter.

**`FacetBand` uses the shared `RAIL_GRID`,** not the source's fixed 88px rail, or its rail would
misalign against every `SectionRail` and `PageTitle` below the `md` breakpoint.

**`MobileHeader` takes its height from `var(--nav-height)`** rather than the source's hardcoded
`48`, and its MENU/CLOSE toggle gained a minimum width (the source's was ~43px).

**`PersonCard` uses `next/image`.** `cdn.sanity.io` is already whitelisted and every image surface
in this repo uses it; the source's `<img>` is a mockup artefact that would add a lint warning.

**`SiteNav`'s desktop links are allowed to sit under the 44px floor.** They are desktop pointer
targets in page chrome, paired with a touch-optimised `MobileHeader` whose targets do clear 44px,
and the structure matches the already-shipped `DesktopNavBar`.

### The transition collision — a systemic bug fixed at the source

Two Tailwind utilities setting the same CSS property **never merge**; the later-generated one wins,
and this repo deliberately has no `cn()`/`clsx`/`tailwind-merge` to dedupe. `PRESS` set
`transition-transform`, so `FacetChip`'s added `transition-colors` was silently discarded and the
ON/OFF colour swap did not animate at all — while the component's own comment claimed it did.

Fixed at the source rather than per-component: `.hl-press` in `styles/index.css` now declares the
whole transition in one shorthand (mirroring the vendored design system), and `PRESS` references
it. A side effect is that `Button` and `CopyCitation` now animate their colour swaps too — which
they were always meant to. The class sits *unlayered*, so it beats every Tailwind utility
regardless of generation order.

**This trap appeared three times.** Anywhere a shared constant is concatenated with a local
override of the same property is suspect.

## Final whole-branch review — two real defects, both fixed

**The mobile hamburger was broken, not restyled.** `--nav-height` went 4rem → 3rem, but
`MobileNavBar`'s visible hamburger was a hardcoded `py-4` stack measuring 62px, so its glyph sat
16px down in a 48px bar and its click box overflowed by 14px — breaking the geometry contract
documented in that very file. The e2e guard stayed green because it clicks the box centre. Fixed by
deriving the padding from the token: `py-[calc((var(--nav-height) - 2px - 1.875rem)/2)]`, which
reproduces the original relationship (at the old 4rem it yields exactly the old `py-4`).

**`--sem-text-faint` failed WCAG AA on `--sem-surface-raised`** (4.13:1 light) — a real composition,
since `PublicationRow` tints rows to `surface-raised` on hover while they carry faint text. The
guard only ever checked faint against `--sem-surface`. Re-derived to `oklch(0.52 0.015 255)` →
`#636a72` (4.66:1 on raised), and the guard extended to assert both surfaces in both schemes.

Also fixed: the `narrow` row shape had no `group` ancestor so its title hover was inert; two
*invalid* dead utilities were being emitted into the production stylesheet because Tailwind's
content scanner reads class-like strings out of markdown prose in `docs/` (fixed with
`@source not "../docs"`); and the triplicated hit-area string was hoisted into `tokens.ts`.

## Carried into Phase 2/3 — deliberately not fixed here

- **`--sem-text-faint` on `--sem-surface-raised` in the `warm` preset is 4.455:1** and untested. The
  warm preset inherits the five new tokens from base and is scheduled for re-derivation in Phase 3;
  start there.
- **`--sem-rule-strong` is 1.62:1 (light) against `--sem-surface`**, below WCAG 1.4.11's 3:1 for UI
  boundaries — and it is the sole visual boundary of `Button`, `Tag` and OFF-state `FacetChip`.
  Inherited from the design system; axe does not evaluate 1.4.11, so the green e2e says nothing
  about it. Contestable, but it is the one boundary token that escaped the repo's own convention.
- **The type tokens are not a single source of truth.** The components hand-roll 16 distinct
  arbitrary pixel sizes and 7 tracking values rather than using the seven declared type roles;
  `--text-display` and `--text-lead` have no consumer. Each deviation was individually justified by
  source fidelity, but `tokens.ts`'s promise that "a token change is a one-file edit" is not yet
  true. Phase 3 rebuilds the screens and is the moment to settle it.
- **`publicationRow.ts` and `PublicationRow.tsx` collide on a case-insensitive filesystem.**
  `Gallery.tsx` already needs explicit `.ts`/`.tsx` extensions plus a comment to disambiguate.
  Rename one while there is still a single consumer.
- **Desktop nav wrap at `md` is unverified.** `DesktopNavBar` is `flex-wrap` at a fixed
  `h-[var(--nav-height)]` with no `overflow-hidden`; a second row fitted at 76px but does not at
  52px. Whether it wraps depends on how many menu items the CMS holds. Eyeball `/` at 768-1024px.
- Smaller items: `splitAuthors`'s unreachable `.trimEnd()` would break string reconstruction if it
  ever fired; `FormField`'s hover border lacks a `:not(:disabled)` guard; the striped-gradient value
  is duplicated across two components; the `SiteFooter` density assertion only counts elements.

## On merging

Phase 1 re-points the palette and the scale globally while Phase 3 is what rebuilds the screens, so
`/`, `/people` and `/publications` render restyled with their old markup. The plan's own Global
Constraints say nothing merges to `main`, and the experiment's founding framing was explicitly
"not straightaway replacing the production site". A green suite does not make shipping a
half-migrated site to a live academic lab's domain the right call — that is a decision for the
repository owner, not for the branch.
