# Site-Wide Branding Customisation

**Date:** 2026-08-12
**Status:** Approved; ready for planning
**Relationship to the phase programme:** A new numbered phase — **Phase 4** — split into four
sub-phases (4A/4B/4C/4D). Phase 3 (3A/3B/3C) is complete and the parent spec
(`2026-08-07-site-modernisation-design.md`) defines no Phase 4; this was scoped from scratch, same
as every prior foundations doc, against a fresh read of the codebase and the **live production
Sanity dataset** (project `j3f9z8os` / dataset `production`, publicly readable, no token needed for
reads). Each sub-phase gets its own worktree, its own plan doc, its own PR, executed via
`superpowers:subagent-driven-development` with a whole-branch review before merge.

**Governing constraint, stated up front because it decides several otherwise-close calls:** this
work exists to hand the site over to the Holsinger Lab. **No one with coding skills will maintain
this repo afterwards.** That cuts both ways and both directions are load-bearing:

1. Anything left in code is **frozen permanently**. "A developer can change it later" is not a
   mitigation available to this design.
2. Anything editable that can be set to a broken value is a **permanent hazard** — there is nobody
   to unbreak it. An editable-but-breakable palette is strictly worse than a frozen one.

Every design decision below is justified against those two facts, not against general good practice.

---

## 1. Problem

Site-wide branding is hardcoded across the codebase. The lab cannot change its own identity without
a developer, and after handover that means it cannot change at all.

Concretely, as verified against the working tree and the live dataset on 2026-08-12:

**Logo.** `public/logo.svg` is a static asset with exactly two consumers:
- `components/global/Navbar/MobileNavBar.tsx:70` — inlined as raw SVG markup
- `lib/json-ld.ts:24` — as an absolute URL for `Organization.logo`

`DesktopNavBar.tsx` renders **no logo at all**, and there is no `components/global/Header`. Desktop
shows a bare nav-link row.

**Site name is double-sourced and self-contradictory.** Two independent values exist:
- `lib/site.ts:5` — `siteName = 'Holsinger Lab'`, hardcoded → drives `openGraph.siteName`
  (`lib/metadata.ts:40`), `applicationName` (`app/layout.tsx:81`), and JSON-LD `Organization.name`
  (`lib/json-ld.ts:22`)
- Sanity `home.title` — live value **"Laboratory of Molecular Neuroscience and Dementia"** → drives
  `<title>` on all six content routes via `buildMetadata`'s `baseTitle`

So browser tabs and Open Graph cards currently advertise different names for the same site.

**Colour** lives in `styles/index.css` as `--sem-*` tokens (Phase 3A), light and dark. Not editable.
Additionally `viewport.themeColor: '#F8F8F8'` (`app/layout.tsx:97`), `msapplication-TileColor:
'#000000'` (`app/layout.tsx:92`), and the manifest's `theme_color`/`background_color` of `#000000`
are three separate hardcoded colours that already disagree with each other and with the token
palette.

**Already editable, confirmed against live data:** `settings.footer` works correctly (live value:
"Designed by Brett Yang" / "Copyright 2026 © Holsinger Lab"). `settings.ogImage` exists as a field
but **is unset in production**, so social shares currently carry no image.

### 1.1 Defects found during scoping

These are bugs, not missing features. They are in scope because nobody will find or fix them later.

| # | Defect | Location |
|---|---|---|
| D1 | Logo artwork reads **"HOLSINGLER"** — a typo for "Holsinger" — and ships live | `public/logo.svg:10` |
| D2 | Webmanifest still says `"name": "Next.js"` / `"short_name": "Next.js"` | `public/favicon/site.webmanifest` |
| D3 | Manifest icon paths are `/favicons/…` (plural); the real directory is `/favicon/` (singular) → both icons 404 | `public/favicon/site.webmanifest` |
| D4 | `browserconfig.xml` has the same `/favicons/` path defect | `public/favicon/browserconfig.xml` |
| D5 | Mobile logo tap-overlay is `w-[120px]` but the rendered logo is ~140px wide → rightmost ~20px of the visible logo is already dead to taps while the menu is open | `MobileNavBar.tsx:281` vs `:75` |
| D6 | `themeColor` is a flat light-surface `#F8F8F8` served to everyone, so dark-mode users get light browser chrome above a `#0d0e12` page | `app/layout.tsx:97` |
| D7 | `robots.txt` hardcodes the `holsingerlab.vercel.app` sitemap URL while `siteUrl` is env-configurable | `public/robots.txt` |
| D8 | `Publications.tsx` sticky bar is `top-16` (64px, the *mobile* nav height) at all breakpoints while the desktop nav is ~70px — the "~6px overlap" Minor already on record from Phase 3C | `components/pages/publications/Publications.tsx:35` |
| D9 | `exclude: ['node_modules', …]` matches only a *top-level* `node_modules`, so `npm test` also runs any git worktree under `.claude/worktrees/` against its own dependency tree. Currently turns a clean 15-file/142-test run into 741 files / 56 failures | `vitest.config.ts:7` |

**On D9:** this repo's own methodology creates worktrees under `.claude/worktrees/`, so every sub-phase
of this plan makes it worse. It must be fixed before 4A's first task, not alongside it — an
implementer who runs `npm test` and sees 56 unrelated failures cannot tell whether their own change
is sound.

**On D5, specifically:** the visible mobile logo is `h-[50%]` of an `h-16` bar → 32px tall, with a
524×120 viewBox → aspect ratio 4.37 → ~140px rendered width. The overlay `<Link>` inside
`DialogPanel` is hardcoded `w-[120px]`. This is a *latent* 20px error today; a CMS logo of arbitrary
aspect ratio converts it into an unbounded one. See §3.2.

## 2. Decision

Move branding into content on the existing `settings` singleton, organised with Sanity **field
groups**, and make every editable field safe to set to any value the Studio UI permits.

**Rejected: a separate `branding` singleton.** Cleaner separation on paper, but every one of the
seven routes already fetches `settingsQuery`; a second singleton means a second fetch on all of them
for no capability gain. `settings` is this repo's established site-wide config singleton and already
holds `ogImage`, which is branding. Field groups solve the only real objection (a 13-field wall is
unusable for a non-technical admin) without the fetch cost.

**Rejected: free-form colour editing.** Discussed at length during scoping. `styles/tokens.test.ts`
guards WCAG AA by parsing `styles/index.css` at build time, including a cross-token contrast matrix
over known foreground/background pairings. Moving colours to Sanity makes that guard test something
other than what ships, and per-token Studio validation cannot reproduce a *cross-token* matrix —
validating an accent in isolation says nothing about how it composites against `--sem-surface-raised`.
Given constraint (2) in the preamble, a palette a lab admin can silently make unreadable is a
permanent hazard. Superseded by §3.3's presets-plus-derivation, which is safe **by construction**
rather than by validation.

**Rejected: CMS-editable fonts.** Four families, two of them licensed local `.woff2` files. Upload
through Studio means format conversion, licence compliance and FOUT handling, for a capability a
lab realistically never exercises. Explicitly out of scope (§8).

## 3. Design

### 3.1 Schema and data flow (4A)

New fields on `schemas/singletons/settings.ts`, organised into groups. Existing fields keep their
current definitions and move into the Navigation and Footer groups unchanged.

| Group | Field | Type | Required | Purpose |
|---|---|---|---|---|
| Identity | `siteName` | `string` | yes | Full name. `<title>` base, OG `siteName`, `applicationName`, JSON-LD `Organization.name`, manifest `name` |
| Identity | `shortName` | `string` | no | Short form. Wordmark fallback text, manifest `short_name`. Falls back to `siteName` |
| Branding | `logo` | `image` | no | Primary logo |
| Branding | `logoDark` | `image` | no | Dark-scheme variant |
| Branding | `icon` | `image` | no | Square source for favicon / app icons |
| Branding | `theme` | `string` (`options.list`) | no | Neutral preset name; defaults to `default` |
| Branding | `brandColor` | `color` | no | Drives the chromatic tokens (§3.3) |
| Identity | `ogImage` | `image` | no | Unchanged definition; regrouped here as site-level presentation |
| Navigation | `menuItems`, `showPublications`, `showPeople`, `showContactForm` | — | — | Unchanged |
| Footer | `footer` | — | — | Unchanged |

**Fields are added by the sub-phase that consumes them, not all at once in 4A.** 4A creates the
group scaffolding and the Identity fields it actually uses (`siteName`, `shortName`, and regrouping
`ogImage`); 4B adds `logo`/`logoDark`; 4C adds `theme`/`brandColor` and the `@sanity/color-input`
dependency; 4D adds `icon`. This keeps each sub-phase independently shippable and avoids exposing
Studio fields that silently do nothing if a later sub-phase does not land.

`brandColor` uses `@sanity/color-input` — **verified compatible**: version 6.1.3 declares
`sanity: ^5 || ^6.0.0-0` and `react: ^19.2`; this repo has `sanity@6.9.1` and `react@19.2.8`. Note
it stores a **colour object**, not a bare hex string; `settingsQuery` must project `brandColor.hex`
and the generated type reflects an object, not a string.

**`shortName` earns its place for two independent reasons.** The wordmark fallback (§3.2) renders
this text into a fixed-height header — and the live `home.title` is
"Laboratory of Molecular Neuroscience and Dementia", 48 characters, which cannot fit a 64px-tall
mobile bar. Separately, a correct webmanifest requires both `name` and `short_name` (D2). One field
serves both. Studio validation warns above ~20 characters, explaining that it is the header wordmark.

**Site name resolution.** `settings.siteName` becomes the single source of truth. `lib/site.ts`'s
`siteName` constant is demoted to a **fallback only**, used when the settings singleton is missing
or unreachable. `home.title` continues to drive per-page `<title>` content as it does today; the
conflict is resolved by making the *site-level* name come from one place rather than by collapsing
the two concepts.

**Root layout must fetch settings, which overturns a documented Phase 2D decision.** 2D deliberately
sourced `Organization` JSON-LD from `lib/site.ts` static constants specifically to avoid adding a
Sanity data dependency to `app/layout.tsx` — the one layer wrapping every route, including
`/studio`. Making `siteName`, `themeColor` and the icon set CMS-driven forces that dependency:
`metadata` must become `generateMetadata()`, and `viewport` must become `generateViewport()`.

Overturning it is correct — site-wide branding is inherently site-wide — but it requires a guard 2D
never needed. **The fetch wraps in try/catch and falls back to `fallbackSettings` plus `lib/site.ts`
constants on any error.** Without this, a Sanity outage 500s every route including `/studio` — the
exact tool the lab would need to fix things, in a repo where nobody can deploy a hotfix. This is a
direct consequence of preamble constraint (2) and is not optional.

**The root-layout fetch must use `stega: false`.** This is Phase 2D's own load-bearing lesson
applying one layer up: `siteName` flows into `<title>`, Open Graph tags and JSON-LD — all
machine-readable — and 2D found that a fetch tuned for visible UI leaks invisible stega characters
into non-visual output during draft-mode sessions. Same trap, higher in the tree.

### 3.2 Logo and navigation (4B)

New shared `components/global/Logo.tsx`, consumed by both `MobileNavBar` and `DesktopNavBar`.

**Three render modes, one geometry path:**

1. `logo` uploaded → `<img>` from the Sanity CDN
2. `logoDark` also uploaded → rendered alongside, CSS-switched by colour scheme
3. Neither → **wordmark fallback**: `shortName` (or `siteName`) rendered as inline SVG text inside a
   stroked rect, reproducing the current design, themed via `stroke="currentColor"`

**Geometry is derived, never hardcoded — this is the core of 4B.** Sanity exposes
`asset->metadata.dimensions.aspectRatio`, so the server component computes `logoWidth = LOGO_HEIGHT
× aspectRatio` **once** — where `LOGO_HEIGHT` is the 32px the current `h-[50%]`-of-`h-16` rule
already produces, promoted to a named constant alongside the nav-height token below — and passes
that single value to both the visible logo and the tap overlay.
They cannot drift, because there is only one number. This fixes D5 as a side effect.

**The wordmark needs the same guarantee, and text width is not knowable server-side.** Solved with
`<text textLength={W} lengthAdjust="spacingAndGlyphs">`, which forces the glyphs to occupy exactly
`W` regardless of the font's real advance metrics. The aspect ratio becomes exact **by construction**
rather than by assuming the font is 0.6em-per-character — an assumption that would be a guess about
Antarctican Mono's actual metrics. The wordmark then flows through the identical derived-width path
as an uploaded image: one code path, not two.

**Headless UI Dialog inert quirk — where this work touches it.** `MobileNavBar.tsx` carries three
interlocking mitigations documented across ~120 lines of comments (Phase 2C, PR #7). The relevant
one here: the visible logo `<Link>` is a **sibling of `<Dialog>`**, so it goes `inert` while the menu
is open; a transparent overlay `<Link>` **inside `<DialogPanel>`** receives the tap instead. It must
be inside `DialogPanel` specifically — a `Dialog`-level sibling works on mouse but silently fails on
touch, because Headless UI's `useOutsideClick` calls `preventDefault()` on `touchend` for anything
outside `resolveContainers()`, suppressing the synthesized click.

**Implication for this design:** the overlay's `left-4 top-0 h-16 w-[120px]` geometry is the coupling
a CMS logo threatens. Making the width derived (above) is what keeps that mitigation intact. The
structural arrangement — overlay inside `DialogPanel`, `onClick={closeMenu}` load-bearing, `z-10`
above the menu links — **is not modified by this work**. Implementers must read the existing comments
before touching the file and preserve them, updating only the width-source. The accepted tradeoff
already documented there (overlay position is only accurate once `DialogPanel` finishes its ~500ms
translate-x transition) is unchanged and not worsened.

**Dark-variant switching uses CSS visibility, not `dark:` variants.** This repo deliberately has no
`dark:` variants — Phase 3A implemented dark mode entirely through tokens. A `.logo-light` /
`.logo-dark` pair in `styles/index.css`, toggled inside the existing `prefers-color-scheme` block,
matches that convention. No JS, no hydration mismatch.

**Desktop logo forces the nav-height token deferred in 3C.** `DesktopNavBar` currently has no logo,
and `Publications.tsx:35` is `sticky top-16` — 64px, the *mobile* nav height — at all breakpoints,
with `scroll-mt-[220px] md:scroll-mt-[145px]` jump-nav offsets tuned to match (D8). Adding a logo
makes the desktop nav taller and converts that cosmetic 6px into a real overlap. 4B therefore
introduces the shared nav-height token Phase 3C flagged as an optional fast-follow, and repoints the
sticky offset and both `scroll-mt-*` values at it. This work forces it, so it stops being optional.

### 3.3 Colour (4C)

**Only two tokens are chromatic.** Reading `styles/index.css`: `--sem-link` (#4043e7) and
`--sem-accent` (#2d6a4f). The other nine are neutrals. So "derive a palette from one brand hex"
concretely means **`brandColor` drives `accent` and `link`; the selected preset supplies the
neutrals.** This is the entire chromatic surface, and it structurally prevents a lab from setting a
coloured page background.

**Colour-space conversion is hand-rolled** into `lib/color.ts` (~80 lines of well-specified
sRGB↔OKLCH math) rather than adding `culori`. This repo already hand-rolls `contrast()` in
`tokens.test.ts`, and a repo nobody will maintain benefits from every dependency it does not have —
a transitive break in a colour library would be unfixable after handover.

**Derivation algorithm** (`lib/theme.ts`, pure):

1. Convert `brandColor` to OKLCH.
2. Hold hue and chroma; binary-search lightness until contrast clears the requirement against **both**
   `--sem-surface` and `--sem-surface-raised`, taking the worse of the two.
   - `accent` targets ≥3:1 (non-text/borders)
   - `link` targets ≥4.5:1 (body text)
3. Run once per theme: light darkens, dark lightens.
4. If a ratio is unreachable even at the lightness extremes — only possible at extreme chroma —
   reduce chroma and retry.

**Step 4 always terminates**, because at chroma 0 the colour is pure gray, and black or white against
any surface achieves maximum contrast. Therefore **no input the lab can enter produces a failing
palette**. This is the "accessible by construction" property that made this approach acceptable where
free-form editing was not.

Because `accent` and `link` have different contrast requirements, they land at different lightnesses
off the same hue — which reads as a coherent brand rather than one flat colour.

**Which presets ship is deferred to 4C planning**, deliberately — the set is a design judgement, not
an architectural one, and it is cheap to change later precisely because `tokens.test.ts` covers any
addition automatically. The constraints are fixed here: `default` reproduces the current palette
exactly and is the initial value; every preset varies **neutrals only** (chroma is `brandColor`'s
job, §3.3); and every preset must pass the existing guard unmodified. A small set is expected —
adding one is a documented, low-risk change (§3.5), so shipping fewer costs little.

**Presets must live in `styles/index.css`.** The entire reason presets were the safe option is that
`tokens.test.ts` parses that file. They are defined as `:root[data-theme="…"]` blocks with matching
`prefers-color-scheme` counterparts; the root layout sets `<html data-theme={…}>`. `tokens.test.ts`
is extended to iterate every preset × both schemes, so a preset added later is automatically covered
by the existing guard — which is what makes "add a preset" a safe change for a future contractor or
agent.

**Phase 3A's `@theme inline` is what makes runtime override possible at all** — utilities resolve to
`var(--sem-*)` rather than to a snapshot of its value, so re-pointing the custom property re-points
every utility on the page. It was written for dark mode; it is now load-bearing for a second reason.
Worth recording so nobody "simplifies" it away.

**Cascade hazard, called out explicitly.** The injected `brandColor` block and the preset blocks are
both attribute-selector specificity, so which wins depends on source order between a stylesheet and
a Next-injected `<style>`. That is not a thing this design should silently depend on. The injected
block therefore takes deliberately higher specificity, **and this is verified by an actual Playwright
assertion** reading `getComputedStyle(document.documentElement).getPropertyValue('--sem-accent')`
under both emulated colour schemes — not by reasoning about cascade rules.

Note inline `style` on `<html>` was considered (inline styles beat any stylesheet rule) and rejected:
inline styles cannot express a `prefers-color-scheme` media query, so the dark-theme derived values
have no home there.

### 3.4 Icons, manifest, OG (4D)

**Favicon from CMS, with one stated limitation.** `settings.icon` drives the PNG icon set through the
Sanity image pipeline (`urlForImage(icon).width(n).height(n).format('png')`), wired through the
now-async `generateMetadata`. `/favicon.ico` is requested by browsers at a fixed path and generating
a real `.ico` requires ICO encoding, which is not worth the complexity — so the existing static
`favicon.ico` remains as the legacy fallback while the explicit `<link rel="icon">` PNGs, which
browsers prefer, come from Sanity. Documented as a limitation rather than glossed.

**`app/manifest.ts` replaces `public/favicon/site.webmanifest`**, fixing D2 and D3 and making
name/short_name/icons/colours CMS-driven. Next links it automatically, so `app/layout.tsx`'s
hardcoded `manifest:` entry is removed.

**`browserconfig.xml` and the `msapplication-*` entries are deleted, not fixed** (D4). They target
IE11 (EOL June 2022) and Edge Legacy (EOL March 2021). Repairing dead technology in a repo nobody
will maintain is worse than removing it. `mstile-150x150.png` goes with them.

**`generateViewport()` returns light and dark theme colours** from the active palette, fixing D6.
`viewport` stays a static export until this point — 4A has no reason to convert it, since nothing
before 4C makes the colour dynamic.

**`public/logo.svg` is deleted outright**, permanently removing D1 from the repo. After 4B nothing
renders it; the only remaining consumer is JSON-LD, which instead emits the Sanity CDN URL when a
logo is uploaded and **omits `logo` entirely when one is not** — it is recommended, not required, by
schema.org, and it self-resolves the moment a logo is uploaded. Pointing structured data at a file
containing a typo is the worse option.

**`app/robots.ts` replaces `public/robots.txt`** using `siteUrl` (D7).

**Deliberately deferred: a generated OG fallback.** The chain is `ogImage → logo → none`. A generated
card would require `ImageResponse`/satori, which **cannot load `.woff2`** — meaning a TTF conversion
and a second shipped copy of a licensed font, to cover only the case where *both* `ogImage` and
`logo` are unset. That case disappears the moment a logo is uploaded, which is this phase's headline
feature. Recorded here so the reasoning survives, not because it is impossible.

### 3.5 Handover documentation

The `/tutorial` route is already the lab-facing handbook, published-but-noindexed
(`lib/site.ts:16`), whose live content opens with "Sanity Studio is a headless content management
system… without touching the website's code". It is the correct home for branding documentation.

Its content lives in Sanity, not the repo, and **this environment has no Sanity write access** (see
§7). So 4D delivers drafted copy as a repo file for the lab to paste into Studio, plus
`docs/branding.md` covering the developer-facing side: how the derivation works, and the documented
procedure for adding a colour preset.

## 4. Sequencing

| Sub-phase | Content | Depends on |
|---|---|---|
| **4A — Identity foundation** | D9 fix, schema groups + Identity fields, `settingsQuery`, typegen, root-layout `generateMetadata` with try/catch fallback, `siteName` single source of truth | — |
| **4B — Logo & navigation** | `Logo.tsx`, wordmark fallback, both navbars, derived overlay geometry, shared nav-height token | 4A |
| **4C — Colour** | `lib/color.ts`, `lib/theme.ts`, presets in `index.css`, injected style block, `@sanity/color-input` | 4A |
| **4D — Icons, manifest, OG** | `app/manifest.ts`, `app/robots.ts`, CMS favicon, `generateViewport` colours, JSON-LD, deletions, docs | 4A, 4C |

4B, 4C and 4D are mutually independent; only 4A is load-bearing. Each is separately shippable and
separately revertible.

## 5. Testing

**Unit (Vitest):**
- `lib/color.ts` — sRGB↔OKLCH round-trips against published reference values
- `lib/theme.ts` — sweep a grid of seed hexes across hue, chroma and lightness; assert every derived
  palette passes the full contrast matrix in both themes, including the unreachable-ratio path that
  exercises chroma reduction
- `styles/tokens.test.ts` — extended to iterate every preset × both schemes
- Logo geometry — derived width from a range of aspect ratios, including extreme ones

**The contrast assertion matrix is extracted into a shared module** imported by both
`tokens.test.ts` and `theme.test.ts`. Without this the preset guard and the derived guard drift
apart and the entire safety argument in §2 quietly stops holding. This is a requirement, not a
refactor.

**E2E (Playwright):**
- `e2e/mobile-menu.spec.ts` currently locates the logo via
  `document.querySelector('svg[aria-label="logo"]')` (`:223`), which breaks the moment the logo is an
  `<img>` — needs a selector covering both modes
- The touch-tap regression test is extended to a CMS logo with a deliberately **non-default aspect
  ratio**, since that is the exact case the derived-width change exists to protect
- Computed `--sem-*` values under both emulated colour schemes (§3.3 cascade hazard)
- `e2e/json-ld.spec.ts:34` and `lib/json-ld.test.ts:56` both assert the old `/logo.svg` path and
  must be updated
- `e2e/server-rendered-nav.spec.ts:24` uses `getByRole('img', { name: 'logo' })` — verify it still
  matches across all three render modes

**Manual, requires access this environment lacks (§7):** Studio rendering of field groups and the
colour input; a real upload exercising the derived-geometry path.

## 6. Risks

| Risk | Mitigation |
|---|---|
| Root-layout Sanity fetch breaks every route including `/studio` during an outage | try/catch → `fallbackSettings` + `lib/site.ts` constants (§3.1). Non-optional. |
| CMS logo breaks the Dialog tap-overlay on touch, silently and only while the menu is open | Single derived width shared by both elements (§3.2); e2e touch test extended to a non-default aspect ratio |
| Injected colour block loses the cascade to preset blocks | Higher specificity + Playwright computed-value assertion, not reasoning (§3.3) |
| Preset and derived contrast guards drift apart | Shared assertion module, mandated in §5 |
| Stega characters leak into `<title>`/OG/JSON-LD from the new root fetch | `stega: false` (§3.1) — Phase 2D's recorded lesson |
| Desktop logo silently breaks Publications sticky/jump-nav geometry | Shared nav-height token, closing the 3C fast-follow (§3.2) |
| `brandColor` type is an object, not a hex string | Project `brandColor.hex` in `settingsQuery`; regenerate types |

## 7. Known environment limitation

Carried forward from Phase 3B and unchanged: **this environment has no Sanity Studio login and no
write token.** Any task needing interactive Studio verification hits this wall. The proven substitute,
effective across 3B's Tasks 3–5, applies again and should be budgeted up front rather than discovered
mid-task:

- `tsc --noEmit` fully clean against the **real installed** Sanity/React types, not stubs
- Re-verify every touched interface field directly in
  `node_modules/sanity/lib/index-DLGpPgPg.d.ts` (the real declaration file; `lib/index.d.ts` is a
  minified re-export barrel with aliased names)
- Hand-trace logic against concrete scenarios including edge cases
- Flag untested live behaviour explicitly in the PR, same category as the existing webhook-secret and
  VisualEditing carry-forwards

Reads against the live dataset **do** work without a token and were used throughout this scoping.

## 8. Out of scope

- **Fonts** — four families, two licensed local `.woff2`; upload means format conversion, licence
  compliance and FOUT handling for a capability a lab never exercises (§2)
- **Generated OG image fallback** — satori cannot load `.woff2` (§3.4)
- **Studio title** (`sanity.config.ts`'s `'HOLSINGER LAB'`) — Sanity config loads before any data
  fetch, so it genuinely cannot read from the CMS; stays env-driven via
  `NEXT_PUBLIC_SANITY_PROJECT_TITLE`
- **Per-page branding overrides** — site-wide only; no per-route logo or palette
- **Editing `/tutorial` content directly** — no write access (§7); 4D delivers paste-ready copy
  instead
- **Restructuring `MobileNavBar`'s Dialog arrangement** — the overlay pattern is preserved as-is;
  only the width-source changes (§3.2)
- **`siteUrl`** — stays env-driven (`NEXT_PUBLIC_SITE_URL`); it is deployment configuration, not
  branding
