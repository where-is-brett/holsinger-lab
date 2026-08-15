# Phase 4B — Logo and Navigation

**Date:** 2026-08-15
**Status:** Approved; ready for planning
**Parent spec:** `2026-08-12-site-branding-customisation-design.md` §3.2 and §4
**Depends on:** Phase 4A (merged as PR #14)

This document scopes one sub-phase of the branding programme. It refines the parent spec against a
fresh read of the codebase at `origin/main` and of the **live production site**, per the programme's
own standing instruction to re-verify before building — every prior sub-phase found stale assumptions
in the design docs rather than in the code, and this one is no exception (§1.1).

Constraints inherited from the parent spec's preamble, both load-bearing here:

1. Anything left in code is **frozen permanently** — no developer will maintain this repo after
   handover.
2. Anything editable that can be set to a broken value is a **permanent hazard**.

(2) is what makes §3.2's derived-geometry work non-negotiable rather than tidy: a CMS logo of
arbitrary aspect ratio is exactly an editable value that can silently break a touch interaction.

---

## 1. Starting state, verified

Verified against `origin/main` and against production (`https://holsingerlab.vercel.app`) on
2026-08-15.

**Schema.** `schemas/singletons/settings.ts` already carries Phase 4A's field groups —
`identity` (default), `labHead`, `navigation`, `footer` — with `siteName`, `shortName` and `ogImage`
in `identity`. There is **no `branding` group and no `logo` field**; 4B's schema work is genuinely
unstarted, as the parent spec assumed.

**Name resolution exists and works.** `lib/branding.ts`'s `resolveBranding(settings)` returns
`{ siteName, shortName }`, treating whitespace-only values as unset and falling back
`shortName → siteName → fallbackSiteName`. 4B consumes this; it does not modify it.

**Logo.** `public/logo.svg` still has exactly two consumers, unchanged from the parent spec:
- `components/global/Navbar/MobileNavBar.tsx:70` — inlined as raw SVG markup
- `app/layout.tsx` — passes `` `${siteUrl}/logo.svg` `` into `buildOrganizationJsonLd`

Note the second consumer moved during 4A: `buildOrganizationJsonLd` now takes `name`/`url`/`logo` as
parameters (`lib/json-ld.ts`) rather than reading `lib/site.ts` directly. The hardcoded path is now
at the call site in the root layout.

`DesktopNavBar.tsx` still renders **no logo at all** — confirmed visually in-browser at 1280px, the
desktop nav is a bare text-link row. `components/shared/Header.tsx` exists but is an unrelated
page-title/description block used by `HomePage`/`Page`/`ProjectPage`; there is no naming collision
with the `Logo` component this phase adds.

**D1 is live.** The mobile logo reads "HOLSINGLER" in production right now — confirmed by screenshot,
not merely by reading the file.

**No nav-height token exists.** `git grep` finds no `nav-height`/`NAV_HEIGHT`/`navHeight` anywhere.
`Publications.tsx:35` is still `sticky top-16`, and `:89` still
`scroll-mt-[220px] md:scroll-mt-[145px]`.

### 1.1 Corrections to the parent spec

Two of the parent spec's stated numbers are wrong. Both were measured live rather than re-derived on
paper.

| | Parent spec says | Measured live | Consequence |
|---|---|---|---|
| Desktop nav height | "~70px" | **70px** exactly (20px padding × 2 + 28px line-height + 1px border × 2) | Confirmed; D8's overlap is exactly 6px, not approximate |
| Combined sticky stack at `md`+ | `Publications.tsx:86`'s comment claims "~139px" | **145px** (nav 70 + bar 75) | The existing `md:scroll-mt-[145px]` has **zero** buffer, not the "small buffer" its own comment claims |

Full measurements, taken at 375×812 and 1280×900 against production:

| | Nav height | Publications bar | Combined | Current `scroll-mt` |
|---|---|---|---|---|
| Mobile | 64px (`fixed`) | 151px | 215px | `220px` — 5px buffer, correct |
| Desktop | 70px (`sticky`) | 75px | 145px | `md:145px` — no buffer |

**Why this matters for 4B:** a 32px logo takes the desktop nav to 76px (§3.3). Against the unchanged
`top-16`/64px sticky offset that turns D8's 6px overlap into **12px**. And the combined stack becomes
76 + 75 = 151px while `md:scroll-mt-[145px]` stays put, so a year heading jumped to from the year nav
lands **6px underneath** the stack — currently it lands exactly flush with its bottom edge, which is
only correct by luck, since that value has no buffer at all. A phase that added the logo without
touching these numbers would ship two visible regressions on the Publications page.

## 2. Decision

Add `logo` and `logoDark` to a new **Branding** field group on `settings`, render them through one
shared `Logo` component consumed by both navbars, and derive every width from a single pure function
so the mobile tap-overlay cannot drift from the logo it overlays. Introduce the shared nav-height
token the parent spec defers to this phase, and repoint the Publications sticky geometry at it.

**Rejected: threading a pre-computed `logoWidth` prop.** The parent spec's literal wording is that
the server component "computes `logoWidth` … **once** … and passes that single value to both". That
achieves the no-drift property, but it grows both navbars' prop signatures with a derived rendering
detail that is not navigation state, and `MobileNavBar` would receive both `aspectRatio` (to choose a
render mode) and `logoWidth` (derived from it) — two props that must agree. Superseded by a shared
pure function (§3.2): calling `resolveLogo(...)` at each site gives the identical cannot-drift
guarantee, because it is the same function on the same input, while keeping the formula in one place
and the prop lists honest.

**Rejected: `next/image` for the logo.** This is a deliberate deviation from the codebase's own
convention (`ImageBox.tsx` uses `next/image`, and `cdn.sanity.io` is already a configured
`remotePattern`), so it needs a stated reason rather than the parent spec's bare assertion of
`<img>`. Sanity's `image` field accepts **SVG uploads**, and a lab's real logo is very plausibly an
SVG. `next/image` refuses to serve SVGs unless `images.dangerouslyAllowSVG` is enabled in
`next.config.mjs` — enabling it site-wide, to support one CMS field, would route every future
user-uploaded SVG anywhere on the site through Next's image pipeline, and SVG is script-capable. A
plain `<img>` avoids that entirely. Nothing is lost: we compute exact `width`/`height` server-side
from the asset's aspect ratio, so CLS is already handled; only responsive srcset generation is
forgone, and it is irrelevant for a 32px-tall fixed-size nav logo.

**Rejected: restructuring `MobileNavBar`'s Dialog arrangement.** Out of scope per the parent spec §8
and preserved here verbatim. See §3.4.

## 3. Design

### 3.1 Schema and query

A new group on `settings.ts`, inserted after `identity`:

```ts
{ name: 'branding', title: 'Branding' }
```

| Field | Type | Notes |
|---|---|---|
| `logo` | `image` | No `hotspot`/crop — rendered whole at a fixed height, never cropped |
| `logoDark` | `image` | Same. Description states it is optional and used only in dark mode |

Field descriptions are written for a non-technical lab admin, matching 4A's established tone —
`logoDark`'s reads: *"Optional. Used instead of Logo when the visitor's device is set to dark mode.
Leave empty to use the same logo in both."*

`settingsQuery` (`lib/sanity.queries.ts`) projects the asset's aspect ratio for both:

```groq
logo{ ..., asset->{ ..., metadata { dimensions { aspectRatio } } } },
logoDark{ ..., asset->{ ..., metadata { dimensions { aspectRatio } } } },
```

This is the **first** query in the repo to project `metadata.dimensions.aspectRatio` — verified by
`git grep`; `sanity.types.ts:450` declares the field but nothing selects it. Types must be
regenerated.

### 3.2 Geometry: `lib/logo.ts`

A new pure module with no framework imports, in the spirit of `lib/branding.ts`:

```ts
export const LOGO_HEIGHT = 32   // px — what the current h-[50%]-of-h-16 rule already produces
export const CHAR_WIDTH  = …    // px per character, wordmark mode only (see below)

/** Which of the three render modes applies, and how wide it will be. */
export type ResolvedLogo =
  | { mode: 'image'; aspectRatio: number; width: number }
  | { mode: 'wordmark'; text: string; width: number }

export function resolveLogo(source: {
  aspectRatio?: number | null
  shortName: string
}): ResolvedLogo
```

**One function resolves mode *and* width together.** This is deliberate, and it is the correction of
an obvious-looking simpler design: a `getLogoWidth(aspectRatio)` taking only an aspect ratio cannot
serve wordmark mode, because a wordmark has no asset to take a ratio from. Since **the overlay must
match whichever mode actually renders**, and — critically — **production renders wordmark mode today
and will keep doing so until someone uploads a logo (§6)**, an aspect-ratio-only helper would leave
the live case underivable. That is precisely D5's existing bug: `w-[120px]` hardcoded against a
~140px *wordmark*. Mode and width are one decision and must be computed in one place.

**One height for both breakpoints.** Desktop reuses the same 32px rather than taking a larger size;
the desktop nav's existing vertical padding supplies the breathing room instead. One constant, one
derived width, one code path.

**This is the core safety property of the phase.** `Logo` renders from `resolveLogo(...)`, and
`MobileNavBar`'s tap-overlay sizes itself from `resolveLogo(...)` called on the same input. They
cannot disagree, in either mode, because there is one function. This fixes D5 outright and prevents
an uploaded logo of arbitrary aspect ratio from converting that latent 20px error into an unbounded
one.

**Wordmark width, where the parent spec is silent.** `<text textLength={W}
lengthAdjust="spacingAndGlyphs">` forces glyphs to occupy exactly `W` regardless of the font's real
advance metrics — but the parent spec never says what determines `W`, since there is no asset aspect
ratio to derive it from. Resolved here:

```
W = shortName.length × CHAR_WIDTH
```

`CHAR_WIDTH` is tuned once by eye against Antarctican Mono. **Its exact value is not load-bearing** —
`textLength` forces the glyphs to fit `W` whatever it is, so `CHAR_WIDTH` sets only the *box
proportions*, never correctness. Scaling with `shortName.length` keeps a 4-character and a
20-character short name from rendering in the same box, one cramped and one stretched. `shortName`'s
existing 20-character Studio validation warning (added in 4A, written specifically because "4B
renders it into a 64px-tall mobile header") bounds the long end.

**`aspectRatio` missing or non-positive → wordmark mode.** `resolveLogo` treats a null, undefined,
zero or negative ratio as "no usable image", so a malformed asset degrades to the wordmark rather
than rendering a zero-width image with a zero-width tap target.

### 3.3 The nav-height token

Tailwind 4 is CSS-first here, so a custom property redefined at the `md` breakpoint yields one
responsive number:

```css
:root { --nav-height: 4rem; }                                   /* 64px */
@media (min-width: 768px) { :root { --nav-height: 4.75rem; } }  /* 76px */
```

**The token is authoritative, not descriptive.** Both navbars set their height *from* it rather than
the token being tuned to match them:

- `MobileNavBar`'s bar: `h-16` → `h-[var(--nav-height)]` (64px, unchanged in value)
- `MobileNavBar`'s two overlay elements: `h-16` → `h-[var(--nav-height)]`. Their own comments already
  mandate staying in sync with the bar height; the token makes that structural instead of
  comment-enforced.
- `DesktopNavBar`: `py-4 md:py-5` → `h-[var(--nav-height)]`. Its existing `items-center` already
  centres the row.

76px rather than the natural 74px (32 + 20 + 20 + 2) so the value is a round `4.75rem` with slightly
more optical space around the logo.

**Publications geometry, repointed at the token** (`components/pages/publications/Publications.tsx`):

- `:35` — `sticky top-16` → `sticky top-[var(--nav-height)]`. **This is the D8 fix**, and it lands at
  both breakpoints at once because the token already differs per breakpoint. The bar currently sticks
  at 64px under a 70px nav; after this it sticks at exactly the nav's height, whatever that is.
- `:89` — `scroll-mt-[220px] md:scroll-mt-[145px]` →
  `scroll-mt-[calc(var(--nav-height)+156px)] md:scroll-mt-[calc(var(--nav-height)+80px)]`

  where 156 and 80 are the measured bar heights (151 and 75) plus a 5px buffer. The nav portion now
  auto-tracks the token, so a future logo-height change cannot silently desync the jump-nav. Desktop
  gains the buffer it never had (§1.1).
- `:81-88` — the explanatory comment is rewritten: it currently states a measured "~139px at md+"
  that is actually 145px, and it must now explain the calc form rather than two magic numbers.

**Checked and deliberately not changed:** `Layout.tsx`'s `mt-32 md:mt-16` on `<main>`. Mobile's 128px
clears the 64px **fixed** nav with a 64px gap, and the mobile nav height does not change. The desktop
nav is **sticky**, so it occupies flow space and its 70→76px growth is absorbed automatically;
`md:mt-16` is pure spacing there, not clearance. Recorded so a later reader does not assume it was
overlooked.

### 3.4 `components/global/Logo.tsx`

New shared component, no `'use client'` — it is pure presentation and must render from both the
client `MobileNavBar` and the server `DesktopNavBar`.

Props: `{ logo, logoDark, shortName, siteName }`. The image props are the resolved Sanity image
objects (or `undefined`), already carrying `asset.metadata.dimensions.aspectRatio` from the query;
the name props are the already-resolved strings from `resolveBranding(settings)`.

**Three render modes:**

1. **`logo` only** → one `<img>`, sized from `resolveLogo(...)`, `height={LOGO_HEIGHT}`.
2. **`logo` + `logoDark`** → both `<img>`s, classed `.logo-light` / `.logo-dark`, CSS-switched.
3. **Neither** → **wordmark fallback**: the current stroked-`<rect>` + `<text>` design, themed via
   `stroke="currentColor"`, with `textLength` per §3.2.

**`alt="logo"` stays a literal string, not the site name.** This is deliberate and worth stating
because it looks like a missed opportunity: `e2e/server-rendered-nav.spec.ts:24` locates the logo by
`getByRole('img', { name: 'logo' })`. Fixing the accessible name keeps that assertion valid across
all three render modes with no change, and gives the touch-tap e2e test a stable selector. The
alternative — a dynamic accessible name — would make every logo-locating test depend on live CMS
content.

**Exactly one logo is exposed to the accessibility tree, in every mode.** Mode 2 renders two `<img>`
elements, and if both carried `alt="logo"` there would be two matches for the accessible name
"logo" — an ambiguity that breaks `getByRole` under Playwright's strict mode and, more importantly,
presents a duplicate image to screen-reader users. The inactive variant therefore carries
`aria-hidden="true"` and `alt=""`, leaving the scheme-appropriate one as the sole named logo. This is
specified rather than left to `display: none`'s a11y-tree side effect, so it does not depend on how a
given tool resolves hidden elements.

**The wordmark switches from `Menlo-Regular` to Antarctican Mono.** The current inline SVG hardcodes
`fontFamily="Menlo-Regular"`, a macOS system font that silently falls back to a generic monospace on
Windows, Linux and Android. Antarctican Mono is a bundled `.woff2` already loaded site-wide for nav
and headings, so it renders identically everywhere and matches the surrounding typography. This costs
nothing, because 4B rebuilds this SVG element from scratch regardless.

**Dark-variant switching uses CSS visibility, not `dark:` variants** — this repo has no `dark:`
variants by design (Phase 3A implemented dark mode entirely through tokens). A rule pair in
`styles/index.css`, inside the existing `prefers-color-scheme` block that PR #13's `.media-frame`
rule already established:

```css
.logo-light { display: block; }
.logo-dark  { display: none; }
@media (prefers-color-scheme: dark) {
  .logo-light { display: none; }
  .logo-dark  { display: block; }
}
```

These classes are emitted **only when `logoDark` is actually set**. A `logo`-only upload — the common
case, until an admin bothers producing a second variant — renders one plain `<img>` with neither
class, visible in both schemes. No JS, no hydration mismatch.

### 3.5 Navbar integration

**`MobileNavBar.tsx`.** The Headless UI Dialog arrangement is **not modified**: the visible logo
`<Link>` stays a sibling of `<Dialog>` (and therefore goes `inert` while the menu is open); the
transparent tap-overlay `<Link>` stays a child of `<DialogPanel>` specifically — a `Dialog`-level
sibling works on mouse and silently fails on touch, because Headless UI's `useOutsideClick` calls
`preventDefault()` on `touchend` for anything outside `resolveContainers()`, suppressing the
synthesized click. `onClick={closeMenu}` stays load-bearing, and the `z-10`/`z-30` layering stays.
Implementers must read the existing ~120 lines of comments before touching the file. Two changes
only:

1. The inline `<svg>…HOLSINGLER…</svg>` is replaced by `<Logo … />`, still inside the same
   `<Link href="/">`.
2. The overlay's hardcoded `w-[120px]` becomes the derived width. Tailwind arbitrary values cannot
   take a runtime variable, so this is an inline `style={{ width }}`.

**Comment maintenance is part of this task, not optional cleanup.** The existing comment explains
that the logo is inlined SVG with `stroke="currentColor"` *because the source file hardcodes
`stroke:#000000`, which an external `<img>` could not override*. After 4B that rationale becomes
mode-dependent: it holds for wordmark mode, while image mode is recoloured (if at all) by the
`.logo-light`/`.logo-dark` pair. Leaving the comment as-is would leave it describing a mechanism that
no longer universally applies — a real hazard in a repo whose comments are its handover
documentation. The geometry-coupling comments (`right-6`, `h-16`, `z-10`) are updated only where the
token replaces a literal.

**`DesktopNavBar.tsx`.** One new element at the **start** of the existing link row:
`<Link href="/"><Logo … /></Link>`. The row already has `items-center`, so a 32px logo centres
against the 28px text links with no extra work. Net rendered result:
`HOME PUBLICATIONS PEOPLE CONTACT` → `[logo] HOME PUBLICATIONS PEOPLE CONTACT`.

**The bold "Home" text link is kept.** The logo is purely additive and `DesktopNavBar`'s
`menuItems`-mapping logic is untouched. The alternative — the logo *replacing* the home link, as the
mobile pattern implies — would require new filtering logic and would make the rendered nav diverge
from what a lab admin sees when they inspect `menuItems` in Studio.

**`Navbar.tsx` and `Layout.tsx`** pass the two new image fields through, alongside the resolved
`siteName`/`shortName`. `Layout.tsx` already receives the full `SettingsPayload` and already defaults
it to `fallbackSettings`, so the unset-logo path is covered by machinery 4A built.

## 4. Testing

**This repo has no React render-testing stack, and 4B does not add one.** There are zero `.test.tsx`
files, no jsdom/happy-dom, no `@testing-library`, and `vitest.config.ts` includes only
`**/*.test.ts`. Adding that stack for one component contradicts the governing constraint that a repo
nobody will maintain benefits from every dependency it does not have. The repo's established idiom
covers this case in three layers, and 4B follows it:

| Layer | Mechanism | Precedent in repo |
|---|---|---|
| Pure logic | Real unit tests | `lib/branding.test.ts` |
| Component invariants | **Source-parsing contract tests** | `components/shared/image-fit-contract.test.ts` |
| CSS invariants | Source-parsing tests | `styles/media-dim.test.ts`, `tokens.test.ts` |
| Real rendering | Playwright e2e | `e2e/mobile-menu.spec.ts` |

**Unit (Vitest) — `lib/logo.test.ts`:**
- `resolveLogo` width across a range of aspect ratios **including extreme ones** — a very wide
  banner, a near-square, a tall logo. This is the case the derived-width design exists to protect.
- `resolveLogo` mode selection and its degradation paths: missing, null, zero, negative, `NaN` and
  `Infinity` aspect ratios all resolve to `wordmark` with a **positive** width.
- Wordmark width scales with `shortName.length`, so a 4-character and a 20-character name do not
  produce the same box; and an empty name still yields a positive width, never a zero-width tap
  target.

**Contract (Vitest) — `components/global/logo-contract.test.ts`:**
- `MobileNavBar.tsx` contains **no hardcoded overlay width** (`w-[120px]` and any
  `w-[<number>px]` literal are both absent) and derives it from the shared helper instead. This is
  the guard that actually protects D5/§3.2, and it works without rendering anything.
- `MobileNavBar.tsx` still has the tap-overlay `<Link>` inside `DialogPanel` and still calls
  `closeMenu` — the Phase 2C invariants §3.5 promises not to disturb.
- `Logo.tsx` emits `alt="logo"` and, in the dark-variant path, `aria-hidden` — the §3.4 guarantee
  that exactly one logo is ever exposed as a named image.
- Both navbars size themselves from `var(--nav-height)` rather than a literal height.

**E2E (Playwright):**
- `e2e/mobile-menu.spec.ts:223`'s `document.querySelector('svg[aria-label="logo"]')` is widened to
  match both render modes. Note it does **not** break today (see §6 — production renders the
  wordmark, still an `<svg>`); it is widened so it does not silently start passing vacuously the day
  a logo is uploaded.
- `e2e/server-rendered-nav.spec.ts:24`'s `getByRole('img', { name: 'logo' })` **keeps working
  unchanged**, because §3.4 fixes `alt="logo"` as a literal. Verified, not assumed.
- **New:** desktop nav renders a logo, and the Publications sticky bar's `top` equals the desktop
  nav's rendered height — the assertion that would have caught D8, and the one that will catch it
  again if the token drifts.

**Cannot be automated in this environment — stated rather than quietly dropped.** The parent spec
asks for the touch-tap test to be "extended to a CMS logo with a deliberately non-default aspect
ratio". **That is not achievable here.** E2E runs against a real production build in which
`sanityFetch` executes *server-side*, so Playwright's route interception — which only sees browser
requests — cannot substitute a CMS response, and §6's missing write token means no logo can be
uploaded to make it real. Image mode is therefore covered by the unit tests (geometry) and the
contract tests (no hardcoded width) rather than end-to-end, and **the touch-tap e2e continues to
exercise wordmark mode only**. This is a genuine coverage gap in the highest-risk area of the phase
and must be called out explicitly in the PR, alongside the existing webhook-secret and VisualEditing
carry-forwards.

## 5. Risks

| Risk | Mitigation |
|---|---|
| CMS logo breaks the Dialog tap-overlay on touch, silently and only while the menu is open | One derived width from one pure function covering **both** render modes (§3.2). Note the e2e touch test **cannot** cover image mode here (§4) — the contract test asserting no hardcoded width is the real guard |
| An implementer "simplifies" `MobileNavBar`'s Dialog structure while replacing the logo markup | §3.5 states the structure is unchanged; existing comments preserved and corrected rather than deleted |
| Desktop logo silently breaks Publications sticky/jump-nav geometry | Nav-height token (§3.3), with both the sticky offset and both `scroll-mt` values repointed at it |
| Uploaded SVG logo routed through `next/image` would require `dangerouslyAllowSVG` site-wide | Plain `<img>` (§2), with width/height computed server-side so CLS protection is retained |
| Wordmark box looks wrong for an unusually long or short `shortName` | Width scales with `shortName.length` (§3.2); 4A's 20-char Studio warning bounds the long end |
| `aspectRatio` is missing, null, zero or negative on an asset | `resolveLogo` degrades to wordmark mode (§3.2), rather than rendering a zero-width image with a zero-width tap target |
| Mode 2 exposes two images named "logo", breaking `getByRole` and duplicating for screen readers | Inactive variant carries `aria-hidden="true"` + `alt=""` (§3.4); asserted in unit tests |

## 6. Known environment limitation

Unchanged and carried forward from Phase 3B and 4A: **this environment has no Sanity Studio login and
no write token.** Reads against the live dataset work without a token and were used throughout this
scoping; writes and interactive Studio verification do not.

Consequences specific to 4B, which should be budgeted up front rather than discovered mid-task:

- The Branding group's Studio rendering cannot be verified interactively.
- No logo can actually be uploaded, so **image mode cannot be exercised against real CMS data** — not
  by e2e either, since `sanityFetch` runs server-side and is unreachable from Playwright's route
  interception (§4). Unit and contract tests carry the derived-geometry proof, with object literals
  standing in for uploaded assets.
- The production site will keep rendering the **wordmark fallback** after this ships, until someone
  uploads a logo in Studio. That is the correct and expected outcome, not a failure — but it means
  the visible production change from this phase is the desktop logo appearing and the typo
  disappearing from the header, nothing more.

The proven substitutes apply: `tsc --noEmit` clean against real installed types, hand-tracing against
concrete scenarios, and flagging untested live behaviour explicitly in the PR.

## 7. Out of scope

- **`public/logo.svg` deletion and the JSON-LD logo URL** — both stay in **4D**, per the parent spec.
  Worth stating plainly because it is counterintuitive: after 4B nothing *renders* that file, but
  `app/layout.tsx` still passes `` `${siteUrl}/logo.svg` `` into `buildOrganizationJsonLd`, so **D1's
  "HOLSINGLER" typo survives in structured data until 4D**. It disappears from the visible header in
  this phase.
- **`settings.icon`, favicons, manifest, `robots.ts`, `generateViewport`** — 4D.
- **`theme`, `brandColor`, colour presets, `@sanity/color-input`** — 4C. 4B and 4C are mutually
  independent and may ship in either order.
- **Restructuring `MobileNavBar`'s Dialog arrangement** — preserved as-is; only the width source and
  the logo markup change (§3.5).
- **Per-page logo overrides** — site-wide only.
- **Fonts as CMS content** — parent spec §8.

## 8. Repository note, not part of this phase

At the time of writing, local `main` had **diverged** from `origin/main` (43 behind, 3 ahead). The
three local-only commits are `docs:` commits whose content is byte-identical to commits already
merged upstream via PRs #13/#14/#15, so no unique work exists locally — but a working tree on that
stale `main` shows pre-4A versions of `settings.ts`, `lib/site.ts` and `app/layout.tsx`, which is
actively misleading when scoping 4B.

This design was written on a branch off `origin/main`, per the programme's existing
one-branch-per-sub-phase convention. **Local `main` is left untouched and still needs reconciling**
— out of scope here, flagged so it is not rediscovered later.
