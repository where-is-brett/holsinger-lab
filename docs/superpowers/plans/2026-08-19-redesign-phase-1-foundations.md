# Redesign Phase 1: Design-System Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the "Modern Instrument" design system's tokens and primitive components in the real app, verified by the existing contrast guards and by Playwright against a preview gallery — without changing any existing page's markup.

**Architecture:** The app is already fully semantic-token driven: components use Tailwind utilities that resolve to `--color-*`, which resolve to `--sem-*` custom properties in `styles/index.css`. So the palette can be replaced by editing values in one file, and every existing page re-skins automatically. This phase (1) vendors the design system into the repo so later tasks have a local source of truth, (2) re-points the `--sem-*` values and adds the direction's new tokens, (3) builds the primitive components under `components/redesign/`, and (4) exposes them on a `/preview/components` gallery route that Playwright and axe assert against. No existing page component is modified.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, Sanity 6, Vitest 4 (node environment, `**/*.test.ts` only), Playwright 1.62 + `@axe-core/playwright`.

**Spec:** `docs/superpowers/specs/2026-08-19-claude-design-redesign-experiment-design.md`

**Design system source:** Claude Design project `81465533-cb59-4875-826f-7592ef09f62d`, vendored locally in Task 1. The agreed IA contract is `brief/agreed-ia.md` in that project, mirrored into the repo in Task 1.

## Global Constraints

- **Branch isolation.** All work happens on `redesign/modern-instrument` in a git worktree. Nothing merges to `main`. The live Sanity dataset is never written to by any task in this plan.
- **Test conventions — do not introduce a new testing stack.** `vitest.config.ts` includes `**/*.test.ts` only, in Node's default environment. There is no jsdom, no `@testing-library/react`. Pure logic is tested with Vitest; anything that must render is tested with Playwright against a preview route. Do not add `.test.tsx` files and do not add testing-library dependencies.
- **No new runtime dependencies.** This repo was handed over to a non-technical maintainer; dependency churn is a liability. If a task appears to need a new package, stop and report instead.
- **Colour values are stored as hex.** `styles/tokens.test.ts` computes WCAG contrast by parsing hex (`luminance(hex)` at `styles/tokens.test.ts:7`). The design system specifies oklch. Convert with `oklchToHex` from `lib/color.ts` and record the oklch source in a comment. Do not put `oklch()` values into `--sem-*` declarations.
- **Every light token must be redeclared dark.** `styles/tokens.test.ts` asserts this ("defines every token the light theme defines", line 263). A token declared only in the light block silently keeps its light value in dark mode.
- **DOIs and URLs are case-sensitive identifiers.** They are printed verbatim and must never be rendered through `text-transform: uppercase`, never retyped in caps, and never truncated in an `href`. Display labels may be truncated with a trailing ellipsis only if the `href` carries the full identifier.
- **Class names are plain strings.** There is no `cn()`, `clsx`, or `tailwind-merge` helper in this repo. Build conditional classes with template literals and ternaries, matching e.g. `components/pages/publications/Publication.tsx:72`.
- **Gutters have one owner.** The `Layout` component owns horizontal page gutters. Components must not add their own horizontal page padding.
- **Accessibility floors.** Focus is a shared site-wide ring: `outline: 2px solid var(--sem-link); outline-offset: 3px`, never removed. Interactive targets are ≥44px. `prefers-reduced-motion: reduce` collapses all transition/animation durations to `0.01ms`.
- **Motion budget.** Only colour, background, border, filter and a press `scale(0.97)` animate. Durations: 120ms (`--sem-motion-fast`), 140ms press (`--sem-motion-press`), 160ms reveal (`--sem-motion-reveal`). Nothing translates, bounces, or animates on entrance.
- **Verification command set.** `npm test` (unit), `npm run type-check`, `npm run lint`, `npm run test:e2e`, `npm run build`. A task is not done until the commands named in its steps pass.

---

## File Structure

**Created:**

- `docs/redesign-experiment/design-system/` — vendored copy of the design system (tokens, component sources, agreed IA). Reference material, not compiled.
- `components/redesign/tokens.ts` — the one place that maps design-system token names to the Tailwind utility strings components use. Keeps token knowledge out of every component file.
- `components/redesign/Tag.tsx`, `Button.tsx`, `CopyCitation.tsx` — content primitives.
- `components/redesign/SectionRail.tsx`, `PageTitle.tsx` — structural primitives.
- `components/redesign/PublicationRow.tsx` — the load-bearing component; four-column ledger row, three variants.
- `components/redesign/publicationRow.ts` + `publicationRow.test.ts` — pure derivation logic (link kind, label truncation, PI-name split), tested in Vitest.
- `components/redesign/FacetChip.tsx`, `FacetBand.tsx` — facet controls.
- `components/redesign/facets.ts` + `facets.test.ts` — pure faceting logic (counts, toggle semantics, AND-filtering), tested in Vitest.
- `components/redesign/PersonCard.tsx`, `ResourceBlock.tsx`, `FormField.tsx`.
- `components/redesign/SiteNav.tsx`, `MobileHeader.tsx`, `SiteFooter.tsx`.
- `components/redesign/fixtures.ts` — real lab content (drawn from the live dataset) used by the gallery only.
- `app/preview/components/page.tsx` — the gallery route.
- `e2e/redesign-components.spec.ts` — Playwright + axe assertions against the gallery.

**Modified:**

- `styles/index.css` — `--sem-*` values re-pointed; new tokens added; type roles given explicit values.
- `styles/tokens.test.ts` — assertions extended for the new tokens.
- `styles/nav-height.test.ts` — updated for the new nav height values.
- `lib/theme.ts:102-134` (`deriveTheme`) — accent derived to the same contrast floor as link, so the two coincide.
- `lib/theme.test.ts` — assertion for the above.

**Not touched in this phase:** every file under `app/` except the new preview route, every file under `components/pages/`, `components/global/`, `components/shared/`, all Sanity schemas, all GROQ queries.

---

### Task 1: Vendor the design system into the repo

Later tasks port JSX and token values from the design system. Those files live in Claude Design, which an implementing engineer may not be able to reach. Bring them into the repo first so every later task has a local, reviewable source of truth.

**Files:**
- Create: `docs/redesign-experiment/design-system/README.md`
- Create: `docs/redesign-experiment/design-system/tokens/{colors,typography,spacing,motion,base,fonts}.css`
- Create: `docs/redesign-experiment/design-system/components/**` (the `.jsx`, `.d.ts` and `.prompt.md` files)
- Create: `docs/redesign-experiment/design-system/agreed-ia.md`

- [ ] **Step 1: Fetch the design-system files**

The files live in Claude Design project `81465533-cb59-4875-826f-7592ef09f62d`. If you have the `claude-design` MCP tools, load them with `ToolSearch` query `select:mcp__claude-design__read_file,mcp__claude-design__list_files` and read each path below. If you do not, ask the user to export them; do not invent contents.

Paths to copy verbatim:

```
brief/agreed-ia.md                         -> agreed-ia.md
tokens/colors.css                          -> tokens/colors.css
tokens/typography.css                      -> tokens/typography.css
tokens/spacing.css                         -> tokens/spacing.css
tokens/motion.css                          -> tokens/motion.css
tokens/base.css                            -> tokens/base.css
tokens/fonts.css                           -> tokens/fonts.css
components/navigation/{SiteNav,MobileHeader,SiteFooter}.{jsx,d.ts}
components/publications/{PublicationRow,FacetBand,FacetChip,CopyCitation,Tag}.{jsx,d.ts}
components/people/PersonCard.{jsx,d.ts}
components/structure/{SectionRail,PageTitle}.{jsx,d.ts}
components/content/{Button,FormField,ResourceBlock}.{jsx,d.ts}
```

- [ ] **Step 2: Write the README that explains what this directory is**

```markdown
# Vendored design system — "Modern Instrument"

Read-only copy of the Holsinger Lab Design System, exported from Claude Design
project 81465533-cb59-4875-826f-7592ef09f62d on 2026-08-19.

**Nothing here is compiled or imported by the app.** It is the source of truth
that `components/redesign/*` is ported from, kept in-repo so the port is
reviewable without design-tool access.

- `tokens/` — the token definitions. Colour values are oklch here; the app
  stores hex (see the plan's Global Constraints).
- `components/` — reference JSX plus `.d.ts` prop contracts. The `.d.ts` doc
  comments carry behavioural rules that the ported components must honour.
- `agreed-ia.md` — the information-architecture contract the screens implement.

If a ported component and its vendored source disagree, the source wins unless
the divergence is recorded in the plan.
```

- [ ] **Step 3: Verify nothing here is reachable from application code**

Run: `npx tsc --noEmit`
Expected: PASS, and the vendored `.jsx`/`.d.ts` files are not part of the program (they live under `docs/`, which is outside `tsconfig.json`'s `include`). If `tsc` reports errors from `docs/`, add `"docs"` to `exclude` in `tsconfig.json` and re-run.

- [ ] **Step 4: Commit**

```bash
git add docs/redesign-experiment/design-system
git commit -m "docs: vendor Modern Instrument design system for the port"
```

---

### Task 2: Make accent coincide with link

The design system uses one chromatic colour for rail numbers, year stamps, links, current-nav and the focus ring, and warns that splitting it degrades the direction. Today `lib/theme.ts` derives `--sem-link` at a 4.5:1 floor and `--sem-accent` at 3:1, so they land at the same hue but different lightness.

**Files:**
- Modify: `lib/theme.ts:106-134`
- Test: `lib/theme.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `deriveTheme(brandHex: string, theme: ThemeName)` keeps its existing signature and return shape `{ light: { link, accent }, dark: { link, accent } } | null`; after this task `light.link === light.accent` and `dark.link === dark.accent` for every brand colour and every preset.

- [ ] **Step 1: Write the failing test**

Add to `lib/theme.test.ts`:

```ts
it.each(THEME_NAMES)('derives accent to the same value as link in the %s theme', (theme) => {
  // The Modern Instrument direction uses ONE chromatic colour, so these two
  // tokens must never drift apart for any brand colour or preset.
  const derived = deriveTheme('#4043e7', theme)
  expect(derived).not.toBeNull()
  expect(derived!.light.accent).toBe(derived!.light.link)
  expect(derived!.dark.accent).toBe(derived!.dark.link)
})
```

`deriveTheme(brandHex, theme)` is exported at `lib/theme.ts:102`; it takes a `ThemeName`, not a surfaces object, and looks the surfaces up itself from `PRESET_SURFACES`. Add `THEME_NAMES` and `deriveTheme` to the existing import from `./theme` at the top of `lib/theme.test.ts` if they are not already imported.

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run lib/theme.test.ts -t 'the same value as link'`
Expected: FAIL for every theme — accent and link differ, because accent is derived at `ACCENT_MIN_CONTRAST`.

- [ ] **Step 3: Make accent reuse the link derivation**

In `deriveTheme` (`lib/theme.ts:102-134`), replace each `accent: deriveToken(...)` call with the already-derived link value, so both come from the `LINK_MIN_CONTRAST` derivation. Keep `ACCENT_MIN_CONTRAST` declared and referenced by a comment explaining why it is no longer used for derivation — it still documents the floor accent must clear, and 4.5 clears 3. Leave `deriveToken` itself unchanged; `buildBrandStyle` needs no edit because it just emits whatever `deriveTheme` returns.

```ts
const lightLink = deriveToken(brandHex, surfaces.light, LINK_MIN_CONTRAST, 'darken')
const darkLink = deriveToken(brandHex, surfaces.dark, LINK_MIN_CONTRAST, 'lighten')

// The Modern Instrument direction uses ONE chromatic colour: rail numbers,
// year stamps, links, current-nav and the focus ring are all the same value.
// Accent therefore reuses the link derivation rather than deriving to its own
// (looser) ACCENT_MIN_CONTRAST floor -- 4.5:1 clears the 3:1 non-text floor,
// so nothing regresses, and the two can never drift apart.
const light = { link: lightLink, accent: lightLink }
const dark = { link: darkLink, accent: darkLink }
```

Keep the existing `if (!light.link || !light.accent || !dark.link || !dark.accent) return null` guard.

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npx vitest run lib/theme.test.ts`
Expected: PASS, including every pre-existing test in the file.

- [ ] **Step 5: Run the full unit suite for regressions**

Run: `npm test`
Expected: PASS. `styles/tokens.test.ts` exercises accent against its non-text floor; a 4.5:1 value clears it.

- [ ] **Step 6: Commit**

```bash
git add lib/theme.ts lib/theme.test.ts
git commit -m "feat: derive accent to the same value as link for the redesign direction"
```

---

### Task 3: Re-point the palette and add the direction's tokens

**Files:**
- Modify: `styles/index.css`
- Test: `styles/tokens.test.ts`, `styles/nav-height.test.ts`

**Interfaces:**
- Consumes: `oklchToHex` from `lib/color.ts` (already exported, `lib/color.ts:67`); `readResolved`/`contrast` from `styles/tokens.test.ts`.
- Produces: the token names every later component task references — `--sem-text-faint`, `--sem-text-inverse-muted`, `--sem-link-inverse`, `--sem-rule-strong`, `--sem-rule-inverse`, `--sem-motion-fast`, `--sem-motion-press`, `--sem-motion-reveal`, `--sem-ease`, `--sem-ease-out`, `--spacing-rail`, `--spacing-rail-sm`, `--spacing-row`, `--spacing-stack`, `--spacing-stack-lg`, `--text-heading`, `--text-label`.

- [ ] **Step 1: Convert the oklch palette to hex**

Write a throwaway script and run it — do not hand-convert.

```ts
// scratch-convert.ts
import { oklchToHex } from './lib/color'

const light = {
  'sem-surface': { L: 0.975, C: 0.003, h: 250 },
  'sem-surface-raised': { L: 0.945, C: 0.006, h: 250 },
  'sem-surface-inverse': { L: 0.21, C: 0.01, h: 260 },
  'sem-scrim': { L: 0.13, C: 0.01, h: 260 },
  'sem-text': { L: 0.21, C: 0.01, h: 260 },
  'sem-text-muted': { L: 0.42, C: 0.015, h: 255 },
  'sem-text-inverse': { L: 0.93, C: 0.005, h: 250 },
  'sem-link': { L: 0.45, C: 0.19, h: 264 },
  'sem-accent': { L: 0.45, C: 0.19, h: 264 },
  'sem-field': { L: 0.58, C: 0.012, h: 255 },
  'sem-rule': { L: 0.88, C: 0.005, h: 250 },
  'sem-text-faint': { L: 0.55, C: 0.015, h: 255 },
  'sem-text-inverse-muted': { L: 0.72, C: 0.015, h: 255 },
  'sem-link-inverse': { L: 0.66, C: 0.15, h: 264 },
  'sem-rule-strong': { L: 0.82, C: 0.008, h: 250 },
  'sem-rule-inverse': { L: 0.34, C: 0.01, h: 260 },
}
const dark = {
  'sem-surface': { L: 0.17, C: 0.01, h: 260 },
  'sem-surface-raised': { L: 0.23, C: 0.012, h: 260 },
  'sem-surface-inverse': { L: 0.93, C: 0.005, h: 250 },
  'sem-scrim': { L: 0.13, C: 0.01, h: 260 },
  'sem-text': { L: 0.93, C: 0.005, h: 250 },
  'sem-text-muted': { L: 0.72, C: 0.015, h: 255 },
  'sem-text-inverse': { L: 0.21, C: 0.01, h: 260 },
  'sem-link': { L: 0.66, C: 0.15, h: 264 },
  'sem-accent': { L: 0.66, C: 0.15, h: 264 },
  'sem-field': { L: 0.55, C: 0.012, h: 255 },
  'sem-rule': { L: 0.3, C: 0.012, h: 260 },
  'sem-text-faint': { L: 0.62, C: 0.015, h: 255 },
  'sem-text-inverse-muted': { L: 0.42, C: 0.015, h: 255 },
  'sem-link-inverse': { L: 0.45, C: 0.19, h: 264 },
  'sem-rule-strong': { L: 0.42, C: 0.012, h: 258 },
  'sem-rule-inverse': { L: 0.88, C: 0.005, h: 250 },
}
for (const [scheme, set] of [['light', light], ['dark', dark]] as const)
  for (const [name, v] of Object.entries(set))
    console.log(`${scheme}  --${name}: ${oklchToHex(v)};`)
```

Run: `npx tsx scratch-convert.ts` (or `npx vite-node scratch-convert.ts` if `tsx` is unavailable — do not install anything).
Record the output; you will paste these values in Step 3. Delete the script before committing.

- [ ] **Step 2: Write the failing test**

Add to `styles/tokens.test.ts`, alongside the existing `describe('dark theme tokens')` block:

```ts
describe('redesign direction tokens', () => {
  const ADDITIONS = [
    '--sem-text-faint',
    '--sem-text-inverse-muted',
    '--sem-link-inverse',
    '--sem-rule-strong',
    '--sem-rule-inverse',
  ]

  it('declares every direction addition in both schemes', () => {
    const light = readResolved(':root', 'light')
    const dark = readResolved(':root', 'dark')
    for (const name of ADDITIONS) {
      expect(light[name], `${name} missing from light`).toBeTruthy()
      expect(dark[name], `${name} missing from dark`).toBeTruthy()
    }
  })

  it('faint text still meets WCAG AA on the page surface in both schemes', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const t = readResolved(':root', scheme)
      expect(contrast(t['--sem-text-faint'], t['--sem-surface'])).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('inverse-band text and links meet WCAG AA on the inverse surface', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const t = readResolved(':root', scheme)
      expect(contrast(t['--sem-text-inverse-muted'], t['--sem-surface-inverse'])).toBeGreaterThanOrEqual(4.5)
      expect(contrast(t['--sem-link-inverse'], t['--sem-surface-inverse'])).toBeGreaterThanOrEqual(4.5)
    }
  })
})
```

`readResolved(selector, scheme)` (`styles/tokens.test.ts:139`) reads `styles/index.css` and layers the dark block over the light one; `contrast` is at `styles/tokens.test.ts:14`. Both are module-scoped in that file — reuse them rather than redefining, and note that `resolveTokens` itself takes `(css, selector, scheme)` and is the wrong helper here because it does not read the file.

- [ ] **Step 3: Run it to make sure it fails**

Run: `npx vitest run styles/tokens.test.ts -t 'redesign direction tokens'`
Expected: FAIL — the addition tokens are not declared yet.

- [ ] **Step 4: Re-point the palette and add the new tokens**

In `styles/index.css`:

1. Replace the eleven `--sem-*` colour values in the base `:root` block and in the `@media (prefers-color-scheme: dark)` `:root` block with the hex values from Step 1. Above the block, record the source:

```css
/* Palette: "Modern Instrument" direction (Round 2 winner). Source values are
   oklch -- see docs/redesign-experiment/design-system/tokens/colors.css --
   converted here to hex with lib/color.ts's oklchToHex, because
   styles/tokens.test.ts parses hex to check WCAG contrast.
   --sem-link and --sem-accent are the same colour by design; they are also
   overridden at request time from settings.brandColor (lib/theme.ts). */
```

2. Add the five addition colour tokens to both schemes.

3. Add motion tokens to the base `:root` (they do not vary by scheme, so they need no dark redeclaration):

```css
  --sem-motion-fast: 120ms;
  --sem-motion-press: 140ms;
  --sem-motion-reveal: 160ms;
  --sem-ease: ease;
  --sem-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
```

4. Re-point the spacing and nav tokens and add the rail/rhythm tokens:

```css
  --nav-height: 3rem;        /* was 4rem */
  --spacing-rail: 5.5rem;
  --spacing-rail-sm: 2.375rem;
  --spacing-row: 1.125rem;
  --spacing-stack: 2.75rem;
  --spacing-stack-lg: 3.5rem;
```

and in the `@media (min-width: 48rem)` block, `--nav-height: 3.25rem;` (was `4.75rem`).

In the `@theme inline` block, re-point the gutters and add the new spacing and type roles:

```css
  --spacing-gutter: 1.125rem;
  --spacing-gutter-md: 3rem;
  --spacing-gutter-lg: 3.5rem;

  --text-display: 4rem;
  --text-display--line-height: 1.04;
  --text-display--letter-spacing: -0.02em;
  --text-display--font-weight: 600;
  --text-title: 2.75rem;
  --text-title--line-height: 1.08;
  --text-title--letter-spacing: -0.015em;
  --text-title--font-weight: 600;
  --text-heading: 2.0625rem;
  --text-heading--line-height: 1.15;
  --text-heading--letter-spacing: -0.01em;
  --text-heading--font-weight: 600;
  --text-lead: 1.0625rem;
  --text-lead--line-height: 1.65;
  --text-body: 0.96875rem;
  --text-body--line-height: 1.65;
  --text-meta: 0.78125rem;
  --text-meta--line-height: 1.6;
  --text-label: 0.6875rem;
  --text-label--line-height: 1;
  --text-label--letter-spacing: 0.12em;
  --text-label--font-weight: 500;
```

The `--text-*--line-height` companion-property form is Tailwind 4's convention for attaching line-height, tracking and weight to a named text step.

5. Add the reduced-motion guard and the shared focus ring, if `styles/index.css` does not already declare them:

```css
:focus-visible {
  outline: 2px solid var(--sem-link);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}
```

Do **not** touch the `:root[data-theme='warm']` preset blocks in this task; presets are re-derived in Phase 3.

- [ ] **Step 5: Run the token tests**

Run: `npx vitest run styles/`
Expected: The new `redesign direction tokens` block PASSES. `styles/nav-height.test.ts` will FAIL if it asserts the literal old heights — that is the next step. If a contrast assertion fails for a *base* token, the palette is wrong: re-check the conversion rather than loosening the assertion.

- [ ] **Step 6: Update the nav-height test to the new values**

`styles/nav-height.test.ts` pins the header height so the sticky bar and its offsets cannot desync from the navbars. Update its expected values to `3rem` and `3.25rem`, keeping the assertion that both breakpoints are declared and that nothing hardcodes a pixel height.

- [ ] **Step 7: Run the whole unit suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Confirm the existing site still builds and renders**

Run: `npm run build`
Expected: PASS.

Then run `npm run dev`, open `/`, `/people` and `/publications`, and confirm each renders in the new palette without layout breakage. Existing pages are expected to look *different* — that is the point of re-pointing semantic tokens — but nothing should overlap, clip, or lose contrast. Note anything that does in the commit message; do not fix page components in this phase.

- [ ] **Step 9: Commit**

```bash
rm -f scratch-convert.ts
git add styles/index.css styles/tokens.test.ts styles/nav-height.test.ts
git commit -m "feat: re-point tokens to the Modern Instrument palette and scale"
```

---

### Task 4: Token map and content primitives — Tag, Button, CopyCitation

**Files:**
- Create: `components/redesign/tokens.ts`
- Create: `components/redesign/Tag.tsx`
- Create: `components/redesign/Button.tsx`
- Create: `components/redesign/CopyCitation.tsx`
- Reference: `docs/redesign-experiment/design-system/components/publications/{Tag,CopyCitation}.jsx`, `docs/redesign-experiment/design-system/components/content/Button.jsx`

**Interfaces:**
- Consumes: the tokens added in Task 3.
- Produces:
  - `LABEL`, `META`, `HAIRLINE`, `PRESS` — exported class-string constants from `components/redesign/tokens.ts`.
  - `Tag(props: { children: React.ReactNode; href?: string; onClick?: (e: React.MouseEvent) => void })`
  - `Button(props: { children: React.ReactNode; onClick?: () => void; href?: string; disabled?: boolean; active?: boolean })`
  - `CopyCitation(props: { cite: string; compact?: boolean; copiedLabel?: string })`

- [ ] **Step 1: Write the token map**

```ts
// components/redesign/tokens.ts
// One place that knows which Tailwind utilities express the design system's
// roles. Components import these instead of repeating utility strings, so a
// token change is a one-file edit.

/** Mono caps label: column heads, chip text, button text. */
export const LABEL = 'font-mono text-label uppercase text-text-faint'
/** Mono metadata: journal refs, counts, identifiers. */
export const META = 'font-mono text-meta text-text-muted'
/** The system's only border treatment: 1px, square corners, no shadow. */
export const HAIRLINE = 'border border-rule-strong'
/** Press feedback. Paired with the motion tokens; reduced-motion neutralises it. */
export const PRESS = 'active:scale-[0.97] transition-transform duration-[--sem-motion-press] ease-[--sem-ease-out]'
```

- [ ] **Step 2: Write Tag**

Port from the vendored source. Rules that must hold: square corners, hairline border, mono caps **by CSS `uppercase`, never by retyping the label**, informational unless `href` or `onClick` is supplied, and an identifier (DOI/URL) is never placed inside a Tag.

```tsx
// components/redesign/Tag.tsx
import type { MouseEvent, ReactNode } from 'react'

import { HAIRLINE, LABEL } from './tokens'

export interface TagProps {
  children: ReactNode
  href?: string
  onClick?: (e: MouseEvent) => void
}

const BASE = `${LABEL} ${HAIRLINE} inline-block px-2 py-1 leading-none`

export function Tag({ children, href, onClick }: TagProps) {
  if (href) {
    return (
      <a className={`${BASE} hover:text-link hover:border-link`} href={href} onClick={onClick}>
        {children}
      </a>
    )
  }
  if (onClick) {
    return (
      <button className={`${BASE} hover:text-link hover:border-link`} onClick={onClick} type="button">
        {children}
      </button>
    )
  }
  return <span className={BASE}>{children}</span>
}
```

- [ ] **Step 3: Write Button and CopyCitation**

Port both from the vendored sources, honouring: square corners, hairline border, mono caps, no fills or shadows, press `scale(0.97)` at 140ms, `active` swaps border and text to accent, `disabled` renders at 45% opacity. `CopyCitation` writes `cite` to the clipboard, shows `✓ COPIED` in accent for 1.8s then reverts, and **must pass `cite` through untouched** — no uppercasing, no truncation. It needs `'use client'` because it holds state and touches the clipboard.

Guard the clipboard call — `navigator.clipboard` is undefined on insecure origins and the component must not throw:

```tsx
'use client'

// ...
const copy = async () => {
  try {
    await navigator.clipboard?.writeText(cite)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  } catch {
    // Clipboard unavailable (insecure origin, denied permission). Leave the
    // control in its rest state rather than showing a false success.
  }
}
```

- [ ] **Step 4: Typecheck and lint**

Run: `npm run type-check && npm run lint`
Expected: PASS. There is no render test at this step by design — these components are asserted in Task 9 via Playwright against the gallery.

- [ ] **Step 5: Commit**

```bash
git add components/redesign/tokens.ts components/redesign/Tag.tsx components/redesign/Button.tsx components/redesign/CopyCitation.tsx
git commit -m "feat: add redesign content primitives (Tag, Button, CopyCitation)"
```

---

### Task 5: Structural primitives — SectionRail and PageTitle

**Files:**
- Create: `components/redesign/SectionRail.tsx`
- Create: `components/redesign/PageTitle.tsx`
- Reference: `docs/redesign-experiment/design-system/components/structure/{SectionRail,PageTitle}.jsx`

**Interfaces:**
- Consumes: `LABEL`, `META` from `components/redesign/tokens.ts`; `--spacing-rail`, `--spacing-rail-sm`, `--spacing-stack`, `--spacing-stack-lg` from Task 3.
- Produces:
  - `SectionRail(props: { num?: string; label?: string; inverse?: boolean; borderTop?: boolean; pad?: boolean; padTop?: string; children?: React.ReactNode })` — `borderTop` defaults `true` and is ignored when `inverse`; `pad` defaults `true`.
  - `PageTitle(props: { title: string; meta?: string; accentMeta?: boolean })`

- [ ] **Step 1: Write SectionRail**

This is the direction's structural signature and every screen composes it, so get the contract exactly right: a `[rail | content]` grid where the rail is `--spacing-rail` (88px), narrowing to `--spacing-rail-sm` (38px) on mobile; accent number at the top of the rail with a vertical mono-caps label beneath; a 1px rule on the rail's right edge; a 1px top rule separating blocks — **except** on inverse bands, which are separated by their background change and carry no top rule.

```tsx
import type { ReactNode } from 'react'

export interface SectionRailProps {
  num?: string
  label?: string
  inverse?: boolean
  borderTop?: boolean
  pad?: boolean
  padTop?: string
  children?: ReactNode
}

export function SectionRail({
  num,
  label,
  inverse = false,
  borderTop = true,
  pad = true,
  padTop,
  children,
}: SectionRailProps) {
  // An inverse band is separated by its own background, so a top rule would
  // read as a seam. This is why borderTop is ignored when inverse is set.
  const rule = !inverse && borderTop ? 'border-t border-rule' : ''
  const surface = inverse ? 'bg-surface-inverse text-text-inverse' : ''
  // ...
}
```

Port the remaining markup from the vendored source. The vertical label uses `writing-mode: vertical-rl` with a 180° rotation; keep whatever the source does rather than reinventing it.

- [ ] **Step 2: Write PageTitle**

44px title, baseline-aligned with a mono-caps meta line on the right for counts and ranges; sits on the rail grid with an empty rail cell; meta is uppercased **by style**; an identifier is never placed in `meta`. `accentMeta` colours the meta line with the accent, which screens use to signal an active filter.

- [ ] **Step 3: Typecheck and lint**

Run: `npm run type-check && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/redesign/SectionRail.tsx components/redesign/PageTitle.tsx
git commit -m "feat: add redesign structural primitives (SectionRail, PageTitle)"
```

---

### Task 6: Publication row derivation logic

The row's *rendering* is asserted by Playwright later. Its *derivations* — which link kind applies, how a label is shortened, how the author string splits around the PI's name — are pure functions and are unit-tested here.

**Files:**
- Create: `components/redesign/publicationRow.ts`
- Test: `components/redesign/publicationRow.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `interface Publication { year: string; title: string; authorsPre: string; authorsPI: string; authorsPost: string; journal: string; ref: string; linkKind: 'DOI' | 'URL'; linkLabel: string; linkLabelShort?: string; linkHref: string; type: string; topics: string[]; cite: string }`
  - `splitAuthors(authors: string, piSurname?: string): { pre: string; pi: string; post: string }`
  - `deriveLink(doi: string | null, url: string | null): { kind: 'DOI' | 'URL'; label: string; href: string } | null`
  - `shortenLabel(label: string, max?: number): string`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest'

import { deriveLink, shortenLabel, splitAuthors } from './publicationRow'

describe('splitAuthors', () => {
  it('splits around the PI so the name can be emphasised', () => {
    const r = splitAuthors('Huynh, Q-S. and Holsinger R.M.D.')
    expect(r.pre).toBe('Huynh, Q-S. and ')
    expect(r.pi).toBe('Holsinger R.M.D.')
    expect(r.post).toBe('')
  })

  it('handles the PI mid-list', () => {
    const r = splitAuthors('Ni K., Liu Y., Holsinger R.M.D., Kiang K.M. and Jiao J.')
    expect(r.pre).toBe('Ni K., Liu Y., ')
    expect(r.pi).toBe('Holsinger R.M.D.')
    expect(r.post).toBe(', Kiang K.M. and Jiao J.')
  })

  it('leaves the string whole when the PI is absent', () => {
    const r = splitAuthors('Smith, J. and Jones, K.')
    expect(r.pre).toBe('Smith, J. and Jones, K.')
    expect(r.pi).toBe('')
    expect(r.post).toBe('')
  })
})

describe('deriveLink', () => {
  it('prefers the DOI and prints it verbatim', () => {
    expect(deriveLink('10.3390/biomedicines12020289', 'https://example.org')).toEqual({
      kind: 'DOI',
      label: '10.3390/biomedicines12020289',
      href: 'https://doi.org/10.3390/biomedicines12020289',
    })
  })

  it('falls back to the recorded url when there is no DOI', () => {
    expect(deriveLink(null, 'https://www.mdpi.com/1420-3049/28/5/2306')).toEqual({
      kind: 'URL',
      label: 'mdpi.com/1420-3049/28/5/2306',
      href: 'https://www.mdpi.com/1420-3049/28/5/2306',
    })
  })

  it('never upper-cases an identifier', () => {
    const r = deriveLink('10.3390/BiomedIcines12020289', null)
    expect(r!.label).toBe('10.3390/BiomedIcines12020289')
  })

  it('returns null when neither is recorded', () => {
    expect(deriveLink(null, null)).toBeNull()
  })
})

describe('shortenLabel', () => {
  it('leaves a short label alone', () => {
    expect(shortenLabel('10.3390/genes14101845', 32)).toBe('10.3390/genes14101845')
  })

  it('truncates with a trailing ellipsis for compact rows', () => {
    const out = shortenLabel('10.1016/j.ygeno.2019.07.018.extra.long.suffix', 24)
    expect(out.endsWith('…')).toBe(true)
    expect(out.length).toBeLessThanOrEqual(24)
  })
})
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run components/redesign/publicationRow.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
export interface Publication {
  year: string
  title: string
  authorsPre: string
  authorsPI: string
  authorsPost: string
  journal: string
  /** volume(issue) · pages, e.g. "11(1) · 74" */
  ref: string
  linkKind: 'DOI' | 'URL'
  /** printed verbatim -- identifiers are case-sensitive */
  linkLabel: string
  linkLabelShort?: string
  linkHref: string
  type: string
  topics: string[]
  cite: string
}

const PI_SURNAME = 'Holsinger'

export function splitAuthors(authors: string, piSurname: string = PI_SURNAME) {
  const at = authors.indexOf(piSurname)
  if (at === -1) return { pre: authors, pi: '', post: '' }
  // The PI's name runs from the surname to the next comma or the end, so
  // initials stay attached ("Holsinger R.M.D." not "Holsinger").
  let end = at + piSurname.length
  while (end < authors.length && authors[end] !== ',') end++
  return {
    pre: authors.slice(0, at),
    pi: authors.slice(at, end).trimEnd(),
    post: authors.slice(end),
  }
}

export function deriveLink(doi: string | null, url: string | null) {
  if (doi) {
    return { kind: 'DOI' as const, label: doi, href: `https://doi.org/${doi}` }
  }
  if (url) {
    // Display drops the scheme and a leading www. for scannability; the href
    // always keeps the recorded URL intact.
    const label = url.replace(/^https?:\/\//, '').replace(/^www\./, '')
    return { kind: 'URL' as const, label, href: url }
  }
  return null
}

export function shortenLabel(label: string, max = 32) {
  if (label.length <= max) return label
  return `${label.slice(0, max - 1)}…`
}
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npx vitest run components/redesign/publicationRow.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/redesign/publicationRow.ts components/redesign/publicationRow.test.ts
git commit -m "feat: add publication row derivation logic with tests"
```

---

### Task 7: The publication row component

**Files:**
- Create: `components/redesign/PublicationRow.tsx`
- Reference: `docs/redesign-experiment/design-system/components/publications/PublicationRow.{jsx,d.ts}`

**Interfaces:**
- Consumes: `Publication` from `components/redesign/publicationRow.ts`; `CopyCitation`, `Tag` from Task 4.
- Produces: `PublicationRow(props: { pub: Publication; density?: 'comfortable' | 'compact'; variant?: 'index' | 'home'; narrow?: boolean; onOpen?: (pub: Publication) => void })`

- [ ] **Step 1: Port the component**

This is the load-bearing component — it is why the direction was chosen — so match the vendored source closely. The grid is `64px 1fr 230px 250px` with a 28px column gap, a 1px top hairline, and the whole row is the hover target (background tints to `surface-raised`, the title goes to accent, and **the rules never move**).

Three shapes:

- `density="comfortable"` (index default): three-line anatomy — title at `--text-lead` weight 600; authors with the PI's segment at weight 600 in ink; a mono-caps type · topic line. Journal on two lines. Link plus a `COPY CITATION` button.
- `density="compact"`: **one** scanning line — title truncates with an ellipsis; authors and tags yield to the publication page; the link uses `linkLabelShort`; the control is a `CITE` button.
- `variant="home"`: a single-line title row for Home's recent-work block — no authors, no tags, no copy control.

And one responsive escape hatch:

- `narrow` (containers under 720px): the grid must **not** squeeze. Render stacked instead — (1) a mono line `YEAR — JOURNAL REF`, (2) the title, (3) the ellipsized link. Authors, tags and the copy control yield to the publication page.

The identifier prints verbatim in every shape. Only `linkLabelShort` may be pre-truncated, and `linkHref` always carries the full identifier.

- [ ] **Step 2: Typecheck and lint**

Run: `npm run type-check && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/redesign/PublicationRow.tsx
git commit -m "feat: add the publication row component"
```

---

### Task 8: Facet logic, facet controls, and the remaining primitives

**Files:**
- Create: `components/redesign/facets.ts`
- Test: `components/redesign/facets.test.ts`
- Create: `components/redesign/FacetChip.tsx`, `components/redesign/FacetBand.tsx`
- Create: `components/redesign/PersonCard.tsx`, `components/redesign/ResourceBlock.tsx`, `components/redesign/FormField.tsx`
- Create: `components/redesign/SiteNav.tsx`, `components/redesign/MobileHeader.tsx`, `components/redesign/SiteFooter.tsx`
- Reference: the matching vendored sources under `docs/redesign-experiment/design-system/components/`

**Interfaces:**
- Consumes: `Publication` from Task 6; `LABEL`, `HAIRLINE`, `PRESS` from Task 4.
- Produces:
  - `countBy<T>(items: T[], pick: (item: T) => string | string[]): Record<string, number>`
  - `toggleFacet(current: string | null, value: string): string | null`
  - `applyFacets(pubs: Publication[], f: { year: string | null; type: string | null; topic: string | null }): Publication[]`
  - `FacetChip(props: { label: string; count?: number | string; on?: boolean; onClick?: () => void })`
  - `FacetBand(props: { groups: { label: string; chips: FacetChipSpec[] }[]; density?: { options: string[]; value: string; onChange: (d: string) => void }; note?: string; sticky?: boolean; num?: string; label?: string })` where `FacetChipSpec = { label: string; count?: number | string; on?: boolean; onClick?: () => void }`
  - `PersonCard(props: { name: string; role: string; img?: string; initials?: string })`
  - `ResourceBlock(props: { title: string; meta?: { label: string; value: string; href?: string }[]; figureLabel?: string })`
  - `FormField(props: { label: string; hint?: string; type?: string; textarea?: boolean; rows?: number; placeholder?: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void; disabled?: boolean; name?: string })`
  - `SiteNav(props: { current?: NavId; items?: { id: string; label: string }[]; onNavigate?: (id: string) => void })`, `NAV_ITEMS`, and `type NavId = 'home' | 'pubs' | 'research' | 'resources' | 'people' | 'lab'`
  - `MobileHeader(props: { open?: boolean; onToggle?: () => void; current?: string; items?: { id: string; label: string }[]; onNavigate?: (id: string) => void })`
  - `SiteFooter(props: { compact?: boolean })`

- [ ] **Step 1: Write the failing facet tests**

```ts
import { describe, expect, it } from 'vitest'

import { applyFacets, countBy, toggleFacet } from './facets'
import type { Publication } from './publicationRow'

const pub = (over: Partial<Publication>): Publication => ({
  year: '2023',
  title: 't',
  authorsPre: '',
  authorsPI: '',
  authorsPost: '',
  journal: 'j',
  ref: 'r',
  linkKind: 'DOI',
  linkLabel: 'l',
  linkHref: 'h',
  type: 'Article',
  topics: [],
  cite: 'c',
  ...over,
})

describe('countBy', () => {
  it('counts a single-valued key', () => {
    const out = countBy([pub({ year: '2023' }), pub({ year: '2023' }), pub({ year: '2020' })], (p) => p.year)
    expect(out).toEqual({ '2023': 2, '2020': 1 })
  })

  it('counts every value of a multi-valued key', () => {
    const out = countBy([pub({ topics: ['Glia', 'Gut'] }), pub({ topics: ['Glia'] })], (p) => p.topics)
    expect(out).toEqual({ Glia: 2, Gut: 1 })
  })
})

describe('toggleFacet', () => {
  it('selects when nothing is selected', () => {
    expect(toggleFacet(null, '2023')).toBe('2023')
  })

  it('clears when the same value is clicked again', () => {
    expect(toggleFacet('2023', '2023')).toBeNull()
  })

  it('replaces when a different value is clicked', () => {
    expect(toggleFacet('2023', '2020')).toBe('2020')
  })
})

describe('applyFacets', () => {
  const pubs = [
    pub({ year: '2023', type: 'Review', topics: ['Glia'] }),
    pub({ year: '2023', type: 'Article', topics: ['Gut'] }),
    pub({ year: '2020', type: 'Article', topics: [] }),
  ]

  it('returns everything when no facet is active', () => {
    expect(applyFacets(pubs, { year: null, type: null, topic: null })).toHaveLength(3)
  })

  it('ANDs the active facets', () => {
    const out = applyFacets(pubs, { year: '2023', type: 'Article', topic: null })
    expect(out).toHaveLength(1)
    expect(out[0].topics).toEqual(['Gut'])
  })

  it('keeps an untagged paper reachable under year and type', () => {
    // agreed-ia.md §4: an untagged paper still appears under year and type,
    // so the record never hides anything.
    const out = applyFacets(pubs, { year: '2020', type: 'Article', topic: null })
    expect(out).toHaveLength(1)
    expect(out[0].topics).toEqual([])
  })

  it('excludes an untagged paper only when a topic filter is active', () => {
    expect(applyFacets(pubs, { year: null, type: null, topic: 'Glia' })).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run them to make sure they fail**

Run: `npx vitest run components/redesign/facets.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the facet logic**

```ts
import type { Publication } from './publicationRow'

export function countBy<T>(items: T[], pick: (item: T) => string | string[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const item of items) {
    const picked = pick(item)
    for (const key of Array.isArray(picked) ? picked : [picked]) {
      out[key] = (out[key] ?? 0) + 1
    }
  }
  return out
}

/** Click selects; clicking the selected value again clears it. */
export function toggleFacet(current: string | null, value: string): string | null {
  return current === value ? null : value
}

export function applyFacets(
  pubs: Publication[],
  f: { year: string | null; type: string | null; topic: string | null },
): Publication[] {
  return pubs.filter(
    (p) =>
      (!f.year || p.year === f.year) &&
      (!f.type || p.type === f.type) &&
      (!f.topic || p.topics.includes(f.topic)),
  )
}
```

- [ ] **Step 4: Run the tests and make sure they pass**

Run: `npx vitest run components/redesign/facets.test.ts`
Expected: PASS.

- [ ] **Step 5: Port the remaining components**

Port each from its vendored source. These rules are contractual:

- **FacetChip** — the ON state is an ink fill (`surface-inverse` background, `text-inverse` text), *not* accent. The count renders at 55% opacity. Press feedback is `scale(0.97)`. The parent owns state.
- **FacetBand** — presentational only; the parent owns filter state and counts. When `sticky`, it pins to `top: 0` in this direction because the header is not sticky. **If it is ever placed under a sticky header, the offset must be `var(--nav-height)` and never a hardcoded pixel value.** Write that as a comment in the file.
- **PersonCard** — a 4:5 portrait, grayscale at rest, colour on hover over 160ms; name at weight 600 going to accent on hover; `role` printed verbatim because it is free text. The no-portrait fallback keeps the exact 4:5 footprint with mono initials on a striped placeholder plus an honest caption, so the grid never reflows around a missing image.
- **ResourceBlock** — labels uppercased by style; values (DOIs, citations) printed verbatim; `href` renders the value as a chromatic identifier link.
- **FormField** — mono-caps label, square transparent input, `--sem-field` border, **minimum 44px height**, shared focus ring, `surface-raised` fill when disabled. The placeholder is faint and is never the only label.
- **SiteNav** — the header is **not** sticky in this direction; it scrolls away. Height comes from `--nav-height`. The current item renders in accent with **no underline**. When `onNavigate` is supplied, clicks call `preventDefault()` and then the handler.
- **MobileHeader** — a MENU/CLOSE toggle; open renders a full-width sheet of numbered 56px rows; the parent owns `open`; every tap target is ≥44px.
- **SiteFooter** — attribution left, copyright right, mono-caps faint; `compact` stacks the two lines for 390-wide layouts.

`FacetChip`, `FacetBand`, `MobileHeader`, `FormField` and `SiteNav` (when `onNavigate` is used) need `'use client'`.

- [ ] **Step 6: Typecheck, lint, unit**

Run: `npm run type-check && npm run lint && npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/redesign/
git commit -m "feat: add facet logic, facet controls, and remaining redesign primitives"
```

---

### Task 9: Preview gallery route and Playwright assertions

Everything built so far is unrendered. This task gives the components a route so Playwright and axe can assert the behaviour that Vitest cannot reach in this repo's node-only setup.

**Files:**
- Create: `components/redesign/fixtures.ts`
- Create: `app/preview/components/page.tsx`
- Create: `e2e/redesign-components.spec.ts`

**Interfaces:**
- Consumes: every component from Tasks 4-8.
- Produces: the route `/preview/components`, and `SAMPLE_PUBLICATIONS: Publication[]`, `SAMPLE_PEOPLE: { name: string; role: string; img?: string; initials?: string }[]` from `components/redesign/fixtures.ts`.

- [ ] **Step 1: Write the fixtures**

Use real lab content so the gallery exercises real-world strings — long titles, an author list with the PI mid-list, a paper with a DOI and one without, and a person with no portrait.

```ts
import type { Publication } from './publicationRow'
import { deriveLink, shortenLabel, splitAuthors } from './publicationRow'

function make(
  year: string,
  title: string,
  authors: string,
  journal: string,
  ref: string,
  doi: string | null,
  url: string | null,
  type: string,
  topics: string[],
): Publication {
  const a = splitAuthors(authors)
  const link = deriveLink(doi, url)
  if (!link) throw new Error(`fixture ${title} has neither DOI nor URL`)
  return {
    year,
    title,
    authorsPre: a.pre,
    authorsPI: a.pi,
    authorsPost: a.post,
    journal,
    ref,
    linkKind: link.kind,
    linkLabel: link.label,
    linkLabelShort: shortenLabel(link.label, 24),
    linkHref: link.href,
    type,
    topics,
    cite: `${authors} (${year}). ${title} ${journal} ${ref}. ${link.href}`,
  }
}

export const SAMPLE_PUBLICATIONS: Publication[] = [
  make(
    '2025',
    'Chromobox protein homolog 7 suppresses the stem-like phenotype of glioblastoma cells by regulating the myosin heavy chain 9-NF-κB signaling pathway.',
    'Ni K., Liu Y., DI P., Wang L., Huang H., Holsinger R.M.D., Kiang K.M. and Jiao J.',
    'Cell Death Discovery',
    '11(1) · 74',
    '10.1038/s41420-025-02362-7',
    null,
    'Article',
    ['Neuro-oncology & biomarkers'],
  ),
  make(
    '2023',
    'Neuroprotective Effects of Carnosic Acid: Insight into its Mechanisms of Action',
    'Mirza, F., Zahid, S., Holsinger, R.M.D.',
    'Molecules',
    '28(5) · 2306',
    null,
    'https://www.mdpi.com/1420-3049/28/5/2306',
    'Review',
    ['Metabolism, oxidative stress & neuroprotection'],
  ),
]

export const SAMPLE_PEOPLE = [
  {
    name: 'Haochen Wu',
    role: 'PhD Student',
    img: 'https://cdn.sanity.io/images/j3f9z8os/production/8804e1e4206e971126b4ea1593388981dda21fb7-827x1157.jpg',
  },
  // Jiyoo Choi has no portrait in the dataset -- this is the fallback case.
  { name: 'Jiyoo Choi', role: 'Ungergraduate student - Diagnostic Radiography', initials: 'JC' },
]
```

The misspelling in that last role is present in the source data and is reproduced verbatim; roles are free text and are never silently corrected.

- [ ] **Step 2: Write the gallery route**

A client component rendering every primitive under a labelled heading, each section wrapped in `<section data-testid="gallery-<name>">`. It must include: both publication-row densities, the `home` variant, the `narrow` variant inside a 700px-wide container, a `FacetBand` with live counts wired through `countBy`/`toggleFacet`/`applyFacets`, both `PersonCard` states, `SiteNav` with a current item, `MobileHeader` in both open and closed states, `SiteFooter` in both densities, `FormField`, `ResourceBlock`, `Button` in all states and `CopyCitation`.

Exclude it from production and from search:

```tsx
// app/preview/components/page.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = { robots: { index: false, follow: false } }
```

- [ ] **Step 3: Keep the preview route out of the sitemap**

Check `app/sitemap.ts` and `app/robots.ts`. If either enumerates routes, exclude anything under `/preview`. Add a one-line comment saying why.

- [ ] **Step 4: Write the Playwright assertions**

```ts
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe('redesign component gallery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/preview/components')
  })

  test('renders every gallery section', async ({ page }) => {
    for (const name of [
      'publication-row',
      'facet-band',
      'person-card',
      'site-nav',
      'mobile-header',
      'form-field',
      'resource-block',
    ]) {
      await expect(page.getByTestId(`gallery-${name}`)).toBeVisible()
    }
  })

  test('identifiers are never rendered upper-cased', async ({ page }) => {
    const ids = page.locator('[data-identifier]')
    const count = await ids.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      const el = ids.nth(i)
      const text = (await el.innerText()).replace('…', '')
      const href = await el.getAttribute('href')
      // The rendered label must not have been case-transformed, and the href
      // must carry the full identifier even when the label is truncated.
      expect(href).toContain(text.replace(/^https?:\/\//, '').replace(/^www\./, ''))
      expect(await el.evaluate((n) => getComputedStyle(n).textTransform)).not.toBe('uppercase')
    }
  })

  test('copy-citation reports success and reverts', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const button = page.getByRole('button', { name: /copy citation/i }).first()
    await button.click()
    await expect(page.getByText('✓ COPIED')).toBeVisible()
    await expect(page.getByText('✓ COPIED')).toBeHidden({ timeout: 4000 })
  })

  test('facet chips filter and clear', async ({ page }) => {
    const band = page.getByTestId('gallery-facet-band')
    const chip = band.getByRole('button', { name: /^2025/ })
    await chip.click()
    await expect(band.getByTestId('facet-result-count')).toHaveText('1')
    await chip.click()
    await expect(band.getByTestId('facet-result-count')).toHaveText('2')
  })

  test('mobile tap targets clear 44px', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    const targets = page.getByTestId('gallery-mobile-header').getByRole('link')
    const count = await targets.count()
    for (let i = 0; i < count; i++) {
      const box = await targets.nth(i).boundingBox()
      expect(box!.height).toBeGreaterThanOrEqual(44)
    }
  })

  test('has no detectable accessibility violations', async ({ page }) => {
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations).toEqual([])
  })
})
```

Add `data-identifier` to the anchor that renders a DOI/URL label in `PublicationRow` and `ResourceBlock`, and `data-testid="facet-result-count"` to the gallery's count display, so these assertions have something to bind to.

Check `e2e/publications-interactive.spec.ts` for this repo's existing Playwright conventions (base URL, fixtures, whether `test.describe.configure` is used) and follow them.

- [ ] **Step 5: Run the e2e suite**

Run: `npm run test:e2e -- e2e/redesign-components.spec.ts`
Expected: PASS. `playwright.config.ts` builds and starts the production server, so this also proves the route builds.

- [ ] **Step 6: Run everything**

Run: `npm run type-check && npm run lint && npm test && npm run build`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/redesign/fixtures.ts app/preview/components/page.tsx e2e/redesign-components.spec.ts
git commit -m "feat: add redesign component gallery with Playwright and axe coverage"
```

---

## Phase 1 Completion Check

- [ ] `npm test`, `npm run type-check`, `npm run lint`, `npm run test:e2e`, `npm run build` all pass.
- [ ] `/preview/components` renders every primitive in light and dark (toggle the OS colour scheme, or use Playwright's `colorScheme` option).
- [ ] `/`, `/people` and `/publications` still render — restyled by the new palette, not broken.
- [ ] No new runtime dependency was added.
- [ ] No file under `components/pages/`, `components/global/`, `components/shared/`, `schemas/`, or `lib/sanity.queries.ts` was modified.

---

## What comes next (separate plans)

These are written after Phase 1 executes, because each depends on decisions made in the previous one.

**Phase 2 — Content model (additive, nothing retired).** Add `publication.slug` (generated from title + year) and `publication.featured`; add the `resource` document type and register it in `sanity.config.ts` and the Studio structure in `plugins/settings.tsx`; add the topic-tag field carrying the five-tag taxonomy from `agreed-ia.md` §4; extend the GROQ queries in `lib/sanity.queries.ts` and re-run `npm run typegen`. Ship migration scripts alongside the existing `scripts/backfill-*.ts` — **dry-run by default**, never run automatically — for slug backfill, tag assignment, roleGroup population, and creating the PI's `profile` document (none exists today; all 19 profiles are lab members). Every new UI path must degrade gracefully while that content is absent, because the live dataset is not written to as part of this work.

**Phase 3 — Screens and retirement.** Rebuild Layout and the navbars on `SiteNav`/`MobileHeader`/`SiteFooter`; build Publications index, `/publications/[slug]`, People, Research, Resources and Home from the primitives; re-derive the `:root[data-theme='warm']` presets against the new palette; then retire `project` — remove the type, migrate `home.showcaseProjects`, delete `/projects/[slug]`, add `redirects()` to `next.config.mjs` (which has none today) for the five existing project URLs, and update the `body.type` switch in `app/api/revalidate/route.ts`.
