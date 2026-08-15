# Phase 4B — Logo and Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the site's header logo CMS-editable, give the desktop nav a logo it currently lacks, and derive every logo dimension from one pure function so the mobile tap-overlay cannot drift from the logo it overlays.

**Architecture:** A pure `lib/logo.ts` resolves render mode *and* width together from an optional asset aspect ratio. A shared `components/global/Logo.tsx` renders one of three modes (image, image+dark-variant, wordmark fallback) from that resolution. Both navbars consume it. A new `--nav-height` CSS custom property becomes the single authority for nav height and is what the Publications sticky bar and jump-nav offsets are repointed at, fixing D8.

**Tech Stack:** Next.js 16 (App Router), React 19, Sanity 6, Tailwind 4 (CSS-first `@theme inline`), Vitest, Playwright, Headless UI 2.

## Global Constraints

Copied from the spec; every task's requirements implicitly include these.

- **No new dependencies.** This repo is handed to a lab with no maintaining developer; a transitive break would be unfixable. This is why there is no React render-testing stack (§4) and why `<img>` is used over `next/image` (§2).
- **No `dark:` Tailwind variants.** Phase 3A implemented dark mode entirely through `--sem-*` tokens and `prefers-color-scheme`. Dark-variant logo switching uses a CSS class pair, not `dark:`.
- **`MobileNavBar.tsx`'s Headless UI Dialog arrangement is not restructured.** The tap-overlay `<Link>` stays a child of `<DialogPanel>` (not merely of `<Dialog>`), `onClick={closeMenu}` stays, `z-10`/`z-30` stay. Only the width source and logo markup change. Read the existing ~120 lines of comments before editing.
- **`alt="logo"` is a fixed literal string**, never the site name — `e2e/server-rendered-nav.spec.ts:24` locates the logo by that accessible name.
- **`LOGO_HEIGHT` is 32px at every breakpoint.** One height, one derived width, one code path.
- **`--nav-height` is `4rem` (64px) mobile / `4.75rem` (76px) at `md`+.** The `md` breakpoint is Tailwind 4's default `48rem`.
- **Vitest only collects `**/*.test.ts`.** Never create a `.test.tsx` — it will silently not run.
- **`public/logo.svg` is NOT deleted in this phase** and the JSON-LD logo URL is NOT changed. Both are Phase 4D. D1's "HOLSINGLER" typo intentionally survives in structured data until then.

---

## File Structure

| File | Responsibility |
|---|---|
| `lib/logo.ts` *(create)* | Pure geometry: mode + width resolution. No React, no Sanity imports. |
| `lib/logo.test.ts` *(create)* | Unit tests for the above. |
| `components/global/Logo.tsx` *(create)* | Presentational: renders one of three modes. No data fetching. |
| `components/global/logo-contract.test.ts` *(create)* | Source-parsing guards for invariants that cannot be render-tested. |
| `schemas/singletons/settings.ts` *(modify)* | Adds the Branding group + `logo`/`logoDark`. |
| `lib/sanity.queries.ts` *(modify)* | Projects the two images plus `metadata.dimensions.aspectRatio`. |
| `sanity.types.ts` *(regenerate)* | Typegen output. Never hand-edited. |
| `types/index.ts` *(modify)* | `fallbackSettings` gains the two new keys. |
| `styles/index.css` *(modify)* | `--nav-height` token; `.logo-light`/`.logo-dark` pair. |
| `styles/nav-height.test.ts` *(create)* | Guards the token's existence and both its values. |
| `components/global/Navbar/{Navbar,DesktopNavBar,MobileNavBar}.tsx` *(modify)* | Consume `Logo`; height from the token. |
| `components/shared/Layout.tsx` *(modify)* | Resolves branding and threads logo props through. |
| `components/pages/publications/Publications.tsx` *(modify)* | D8 fix: sticky offset + both `scroll-mt` values. |
| `e2e/{mobile-menu,server-rendered-nav,nav-logo}.spec.ts` *(modify/create)* | Widened selectors; new desktop-logo + sticky-geometry test. |
| `docs/branding.md` *(modify)* | Lab-facing + developer-facing documentation of the new fields. |

---

## Task 1: Logo geometry (`lib/logo.ts`)

Pure module, built test-first. No other task can proceed without it.

**Files:**
- Create: `lib/logo.ts`
- Test: `lib/logo.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `LOGO_HEIGHT: number` (32)
  - `CHAR_WIDTH: number` (14)
  - `type ResolvedLogo = { mode: 'image'; width: number; height: number } | { mode: 'wordmark'; width: number; height: number; text: string }`
  - `interface LogoImageSource { asset?: { metadata?: { dimensions?: { aspectRatio?: number | null } | null } | null } | null }`
  - `function getAspectRatio(image: LogoImageSource | null | undefined): number | null`
  - `function resolveLogo(input: { aspectRatio?: number | null; shortName: string }): ResolvedLogo`

- [ ] **Step 1: Write the failing test**

Create `lib/logo.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

import {
  CHAR_WIDTH,
  getAspectRatio,
  LOGO_HEIGHT,
  resolveLogo,
} from './logo'

describe('resolveLogo — image mode', () => {
  it('derives width from the aspect ratio at the fixed logo height', () => {
    const resolved = resolveLogo({ aspectRatio: 2, shortName: 'Lab' })
    expect(resolved.mode).toBe('image')
    expect(resolved.height).toBe(LOGO_HEIGHT)
    expect(resolved.width).toBe(LOGO_HEIGHT * 2)
  })

  it('handles a very wide banner logo', () => {
    expect(resolveLogo({ aspectRatio: 12, shortName: 'Lab' }).width).toBe(
      LOGO_HEIGHT * 12
    )
  })

  it('handles a near-square logo', () => {
    expect(resolveLogo({ aspectRatio: 1.02, shortName: 'Lab' }).width).toBeCloseTo(
      LOGO_HEIGHT * 1.02
    )
  })

  it('handles a tall logo without producing a sub-pixel width', () => {
    const resolved = resolveLogo({ aspectRatio: 0.25, shortName: 'Lab' })
    expect(resolved.mode).toBe('image')
    expect(resolved.width).toBeGreaterThan(0)
  })
})

describe('resolveLogo — wordmark fallback', () => {
  // Every one of these is a value the CMS or a malformed asset can actually
  // produce. Each must degrade to the wordmark rather than rendering an
  // image with a zero or nonsense width -- which would also size the mobile
  // tap-overlay to zero, silently killing the header logo's tap target.
  it.each([
    ['undefined', undefined],
    ['null', null],
    ['zero', 0],
    ['negative', -3],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('falls back to the wordmark when aspectRatio is %s', (_label, ratio) => {
    const resolved = resolveLogo({ aspectRatio: ratio, shortName: 'Holsinger' })
    expect(resolved.mode).toBe('wordmark')
    expect(resolved.width).toBeGreaterThan(0)
  })

  it('renders the short name as the wordmark text', () => {
    const resolved = resolveLogo({ shortName: 'Holsinger' })
    expect(resolved).toMatchObject({ mode: 'wordmark', text: 'Holsinger' })
  })

  it('scales width with the number of characters', () => {
    const short = resolveLogo({ shortName: 'LMND' })
    const long = resolveLogo({ shortName: 'Holsinger Laboratory' })
    expect(long.width).toBeGreaterThan(short.width)
    expect(short.width).toBe(4 * CHAR_WIDTH)
  })

  it('reproduces the pre-4B wordmark width for the ten-character legacy mark', () => {
    // The old inline SVG was a 524x120 viewBox rendered at 32px tall, i.e.
    // ~139.7px wide. CHAR_WIDTH is tuned so a ten-character name lands there.
    expect(resolveLogo({ shortName: 'HOLSINGLER' }).width).toBeCloseTo(140, 0)
  })

  it('never returns a zero width for an empty name', () => {
    // resolveBranding guarantees a non-empty shortName, but a zero-width
    // tap target is severe enough to guard independently.
    expect(resolveLogo({ shortName: '' }).width).toBeGreaterThan(0)
  })

  it('trims whitespace around the short name', () => {
    expect(resolveLogo({ shortName: '  LMND  ' })).toMatchObject({
      text: 'LMND',
      width: 4 * CHAR_WIDTH,
    })
  })
})

describe('getAspectRatio', () => {
  it('reads the ratio out of a projected Sanity asset', () => {
    expect(
      getAspectRatio({ asset: { metadata: { dimensions: { aspectRatio: 3 } } } })
    ).toBe(3)
  })

  it.each([
    ['a null image', null],
    ['an undefined image', undefined],
    ['an image with no asset', {}],
    ['an asset with no metadata', { asset: {} }],
    ['metadata with no dimensions', { asset: { metadata: {} } }],
    ['dimensions with a null ratio', {
      asset: { metadata: { dimensions: { aspectRatio: null } } },
    }],
  ])('returns null for %s', (_label, image) => {
    expect(getAspectRatio(image as never)).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/logo.test.ts`
Expected: FAIL — `Failed to resolve import "./logo"`.

- [ ] **Step 3: Write the implementation**

Create `lib/logo.ts`:

```ts
/**
 * Logo geometry. Pure -- no React, no Sanity, no framework imports -- for the
 * same reason `lib/branding.ts` is: it stays trivially testable with object
 * literals, and this repo has no React render-testing stack (spec §4).
 */

/**
 * Rendered logo height in px, at every breakpoint.
 *
 * This is exactly what the pre-4B mobile rule (`h-[50%]` of an `h-16` bar)
 * already produced. Desktop reuses it rather than taking its own larger size,
 * so there is one height in the system rather than a pair that can disagree.
 */
export const LOGO_HEIGHT = 32

/**
 * Wordmark width per character, in px.
 *
 * NOT load-bearing for correctness. The wordmark renders inside
 * `<text textLength={width} lengthAdjust="spacingAndGlyphs">`, which forces
 * the glyphs to occupy exactly `width` whatever this constant is -- so this
 * only sets the *box proportions*, never whether the geometry is right. It is
 * therefore tuned by eye rather than derived from font metrics, which are not
 * knowable server-side.
 *
 * 14 is chosen so a ten-character name reproduces the pre-4B mark's ~139.7px
 * (a 524x120 viewBox rendered 32px tall).
 */
export const CHAR_WIDTH = 14

export type ResolvedLogo =
  | { mode: 'image'; width: number; height: number }
  | { mode: 'wordmark'; width: number; height: number; text: string }

/**
 * The shape `settingsQuery` projects for `logo`/`logoDark`. Declared
 * structurally rather than importing the generated type so this module has no
 * dependency on typegen output.
 */
export interface LogoImageSource {
  asset?: {
    metadata?: {
      dimensions?: { aspectRatio?: number | null } | null
    } | null
  } | null
}

export function getAspectRatio(
  image: LogoImageSource | null | undefined
): number | null {
  return image?.asset?.metadata?.dimensions?.aspectRatio ?? null
}

/**
 * Resolves which of the three render modes applies AND how wide it will be, in
 * one call.
 *
 * These are deliberately one function rather than a `getLogoWidth(aspectRatio)`
 * helper, because a wordmark has no asset to take a ratio from -- and wordmark
 * mode is what production actually renders until someone uploads a logo. Any
 * width helper that only understood aspect ratios would leave the live case
 * underivable, which is precisely the D5 bug this phase fixes: a hardcoded
 * `w-[120px]` overlay sitting under a ~140px *wordmark*.
 *
 * Both `Logo` and MobileNavBar's transparent tap-overlay size themselves from
 * this. They cannot drift, in either mode, because there is one function.
 */
export function resolveLogo({
  aspectRatio,
  shortName,
}: {
  aspectRatio?: number | null
  shortName: string
}): ResolvedLogo {
  if (
    typeof aspectRatio === 'number' &&
    Number.isFinite(aspectRatio) &&
    aspectRatio > 0
  ) {
    return {
      mode: 'image',
      width: LOGO_HEIGHT * aspectRatio,
      height: LOGO_HEIGHT,
    }
  }

  const text = shortName.trim()
  return {
    mode: 'wordmark',
    // `Math.max(1, …)` so an empty name can never produce a zero-width tap
    // target. `resolveBranding` already guarantees a non-empty string, but
    // the failure mode is severe and invisible, so it is guarded here too.
    width: Math.max(1, text.length) * CHAR_WIDTH,
    height: LOGO_HEIGHT,
    text,
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/logo.test.ts`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/logo.ts lib/logo.test.ts
git commit -m "feat: add pure logo geometry resolving render mode and width together"
```

---

## Task 2: Schema fields, query projection, and types

Adds the CMS surface. Independently reviewable: after this task the fields exist and are queryable, but nothing renders them yet.

**Files:**
- Modify: `schemas/singletons/settings.ts` (groups array; new fields)
- Modify: `lib/sanity.queries.ts:68-96` (`settingsQuery`)
- Modify: `types/index.ts` (`fallbackSettings`)
- Regenerate: `sanity.types.ts`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: `settings.logo` and `settings.logoDark` on `SettingsPayload`, each projecting `asset->metadata.dimensions.aspectRatio`, matching Task 1's `LogoImageSource`.

- [ ] **Step 1: Add the Branding group**

In `schemas/singletons/settings.ts`, add to the `groups` array, immediately after the `identity` entry:

```ts
    { name: 'branding', title: 'Branding' },
```

The array becomes:

```ts
  groups: [
    { name: 'identity', title: 'Identity', default: true },
    { name: 'branding', title: 'Branding' },
    { name: 'labHead', title: 'Lab head' },
    { name: 'navigation', title: 'Navigation' },
    { name: 'footer', title: 'Footer' },
  ],
```

- [ ] **Step 2: Add the two image fields**

In the same file, insert immediately **after** the `ogImage` field definition and before the `labHead` field:

```ts
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      group: 'branding',
      // No `hotspot`: the logo is rendered whole at a fixed height, never
      // cropped to a box, so a crop UI would only offer a way to break it.
      description:
        'Shown in the site header. Any shape works — the site scales it to fit the header and works out the width itself. Leave empty to show the site’s short name in a box instead.',
    }),
    defineField({
      name: 'logoDark',
      title: 'Logo (dark mode)',
      type: 'image',
      group: 'branding',
      description:
        'Optional. Used instead of Logo when the visitor’s device is set to dark mode — useful if your logo is dark-coloured and would disappear. Leave empty to use the same logo in both.',
    }),
```

- [ ] **Step 3: Project both images in `settingsQuery`**

In `lib/sanity.queries.ts`, inside `settingsQuery`, add immediately after the `ogImage,` line:

```groq
    logo{
      ...,
      asset->{
        ...,
        metadata { dimensions { aspectRatio } }
      }
    },
    logoDark{
      ...,
      asset->{
        ...,
        metadata { dimensions { aspectRatio } }
      }
    },
```

This is the first query in the repo to project `metadata.dimensions.aspectRatio`; `sanity.types.ts` declares the field but nothing selected it before.

- [ ] **Step 4: Regenerate types**

Run: `npm run typegen`
Expected: succeeds, and `sanity.types.ts` is modified. Do not hand-edit that file.

- [ ] **Step 5: Add the new keys to `fallbackSettings`**

`SettingsPayload` requires every key to be present. In `types/index.ts`, add to the `fallbackSettings` object literal:

```ts
  logo: null,
  logoDark: null,
```

- [ ] **Step 6: Verify types and the existing suite still pass**

Run: `npm run type-check && npm test`
Expected: type-check clean; all existing tests pass (no behaviour changed yet).

- [ ] **Step 7: Confirm the live dataset still has no logo**

Run:

```bash
curl -s 'https://j3f9z8os.api.sanity.io/v2023-10-01/data/query/production?query=*%5B_type%3D%3D%22settings%22%5D%5B0%5D%7Blogo%2C%20logoDark%7D'
```

Expected: `{"result":{}}` or both fields null. This confirms the **wordmark** is the path production will exercise after this phase ships, which is what makes Task 8's e2e expectations correct.

- [ ] **Step 8: Commit**

```bash
git add schemas/singletons/settings.ts lib/sanity.queries.ts sanity.types.ts types/index.ts
git commit -m "feat: add logo and logoDark to settings under a Branding group"
```

---

## Task 3: The `Logo` component

**Files:**
- Create: `components/global/Logo.tsx`
- Test: `components/global/logo-contract.test.ts`

**Interfaces:**
- Consumes: `resolveLogo`, `getAspectRatio`, `LogoImageSource`, `LOGO_HEIGHT` from `lib/logo.ts` (Task 1); `urlForImage` from `lib/sanity.image.ts`.
- Produces: `export default function Logo(props: { logo?: LogoImageSource | null; logoDark?: LogoImageSource | null; shortName: string }): JSX.Element` — used by both navbars in Tasks 5 and 6.

- [ ] **Step 1: Write the failing contract test**

Create `components/global/logo-contract.test.ts`:

```ts
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const logo = () => readFileSync('components/global/Logo.tsx', 'utf8')

// This repo has no React render-testing stack (no jsdom, no
// @testing-library, and vitest collects only **/*.test.ts). Adding one for a
// single component would contradict the no-new-dependencies constraint this
// hand-over repo is built on, so component invariants are guarded by parsing
// the source -- the same idiom as image-fit-contract.test.ts and
// media-dim.test.ts. Rendered behaviour is covered by Playwright instead.
describe('Logo contract', () => {
  it('gives every render mode the fixed accessible name "logo"', () => {
    // e2e/server-rendered-nav.spec.ts locates the header logo by this exact
    // accessible name. Making it dynamic (e.g. the site name) would make
    // every logo-locating test depend on live CMS content.
    expect(logo()).toMatch(/alt="logo"/)
    expect(logo()).toMatch(/aria-label="logo"/)
  })

  it('hides the inactive dark-mode variant from assistive tech', () => {
    // Mode 2 renders two <img>s. If both were named "logo" there would be two
    // matches for that accessible name -- ambiguous under Playwright strict
    // mode, and a duplicate announcement for screen-reader users.
    expect(logo()).toMatch(/aria-hidden/)
  })

  it('derives its dimensions from the shared resolver, not literals', () => {
    expect(logo()).toMatch(/resolveLogo/)
    // A hardcoded pixel width here would reintroduce D5 by another route.
    expect(logo()).not.toMatch(/w-\[\d+px\]/)
  })

  it('forces the wordmark to the resolved width rather than trusting font metrics', () => {
    expect(logo()).toMatch(/textLength=/)
    expect(logo()).toMatch(/lengthAdjust="spacingAndGlyphs"/)
  })

  it('themes the wordmark with currentColor so it follows the colour tokens', () => {
    // Phase 3A: this repo has no `dark:` variants; everything is token-driven.
    expect(logo()).toMatch(/stroke="currentColor"/)
    expect(logo()).not.toMatch(/\bdark:/)
  })

  it('renders the wordmark in the bundled mono font, not a system font', () => {
    // The pre-4B mark hardcoded fontFamily="Menlo-Regular" -- a macOS system
    // font that silently degrades to a generic monospace on Windows, Linux
    // and Android. Antarctican Mono is a bundled .woff2 already loaded for
    // nav and headings, so it renders identically everywhere.
    expect(logo()).toMatch(/font-antarctican/)
    expect(logo()).not.toMatch(/Menlo/)
  })

  it('uses a plain img rather than next/image', () => {
    // Sanity accepts SVG uploads, and next/image refuses to serve SVG unless
    // images.dangerouslyAllowSVG is enabled site-wide -- which would route
    // every future user-uploaded SVG through the image pipeline. Spec §2.
    expect(logo()).not.toMatch(/from 'next\/image'/)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run components/global/logo-contract.test.ts`
Expected: FAIL — `ENOENT: no such file or directory, open 'components/global/Logo.tsx'`.

- [ ] **Step 3: Write the component**

Create `components/global/Logo.tsx`:

```tsx
import {
  getAspectRatio,
  LOGO_HEIGHT,
  type LogoImageSource,
  resolveLogo,
} from 'lib/logo'
import { urlForImage } from 'lib/sanity.image'
import type { Image } from 'sanity'

interface LogoProps {
  logo?: LogoImageSource | null
  logoDark?: LogoImageSource | null
  /** Already resolved by `resolveBranding` — never raw CMS input. */
  shortName: string
}

/**
 * Rendered at 2x so the logo stays sharp on high-DPI screens. Sanity returns
 * SVG uploads untransformed, so this is a no-op for vector logos.
 */
const RASTER_HEIGHT = LOGO_HEIGHT * 2

function logoUrl(image: LogoImageSource): string | undefined {
  // The generated image shape leaves crop/hotspot bounds optional while
  // `Image` from 'sanity' assumes them populated — the same cast the other
  // image call sites in this repo carry (see lib/json-ld.ts).
  return urlForImage(image as Image)?.height(RASTER_HEIGHT).url()
}

/**
 * The site's header logo, in one of three modes:
 *
 *   1. `logo` uploaded            -> <img> from the Sanity CDN
 *   2. `logo` + `logoDark`        -> both, CSS-switched by colour scheme
 *   3. neither                    -> wordmark fallback (the stroked box)
 *
 * All three take their width from `resolveLogo`, which is also what sizes
 * MobileNavBar's transparent tap-overlay. That shared call is the whole
 * safety property of Phase 4B: the overlay cannot drift from the logo it
 * overlays, because one function produces both numbers.
 *
 * A plain <img> rather than next/image is deliberate — see the contract test.
 */
export default function Logo({ logo, logoDark, shortName }: LogoProps) {
  const resolved = resolveLogo({
    aspectRatio: getAspectRatio(logo),
    shortName,
  })

  if (resolved.mode === 'image' && logo) {
    const lightUrl = logoUrl(logo)
    const darkUrl = logoDark ? logoUrl(logoDark) : undefined

    if (lightUrl && darkUrl) {
      return (
        <>
          <img
            className="logo-light"
            src={lightUrl}
            alt="logo"
            width={resolved.width}
            height={resolved.height}
          />
          {/*
            Exactly one logo is ever exposed as a named image. The inactive
            variant is hidden from the accessibility tree explicitly rather
            than relying on `display: none`'s side effect, so the guarantee
            does not depend on how a given tool resolves hidden elements.
          */}
          <img
            className="logo-dark"
            src={darkUrl}
            alt=""
            aria-hidden="true"
            width={resolved.width}
            height={resolved.height}
          />
        </>
      )
    }

    if (lightUrl) {
      return (
        <img
          src={lightUrl}
          alt="logo"
          width={resolved.width}
          height={resolved.height}
        />
      )
    }
  }

  // Wordmark fallback. `role="img"` + `aria-label` supply the accessible name
  // that the <img> modes get from `alt`.
  const { width, height, text } = resolved as Extract<
    typeof resolved,
    { mode: 'wordmark' }
  >

  return (
    <svg
      role="img"
      aria-label="logo"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="text-text"
    >
      <rect
        x={1}
        y={1}
        width={width - 2}
        height={height - 2}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      />
      <text
        x={width / 2}
        y={height / 2}
        // Forces the glyphs to occupy exactly this width whatever the font's
        // real advance metrics are -- which are not knowable server-side. The
        // box proportions become exact by construction rather than by
        // assuming a per-character advance.
        textLength={width - 12}
        lengthAdjust="spacingAndGlyphs"
        textAnchor="middle"
        dominantBaseline="central"
        fill="currentColor"
        className="font-antarctican"
        fontSize={height * 0.55}
      >
        {text}
      </text>
    </svg>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run components/global/logo-contract.test.ts && npm run type-check`
Expected: tests PASS; type-check clean.

- [ ] **Step 5: Commit**

```bash
git add components/global/Logo.tsx components/global/logo-contract.test.ts
git commit -m "feat: add shared Logo component with image, dark-variant and wordmark modes"
```

---

## Task 4: The nav-height token and dark-variant CSS

**Files:**
- Modify: `styles/index.css`
- Test: `styles/nav-height.test.ts` *(create)*

**Interfaces:**
- Consumes: nothing.
- Produces: the CSS custom property `--nav-height` (`4rem` / `4.75rem` at `md`+) and the `.logo-light`/`.logo-dark` class pair, both used by Tasks 5–7.

- [ ] **Step 1: Write the failing test**

Create `styles/nav-height.test.ts`:

```ts
import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const css = readFileSync('styles/index.css', 'utf8')

describe('--nav-height token', () => {
  it('defines a mobile default of 4rem', () => {
    expect(css).toMatch(/--nav-height:\s*4rem/)
  })

  it('redefines to 4.75rem at the md breakpoint', () => {
    // 48rem is Tailwind 4's default `md`. If these diverge, the sticky
    // Publications bar and the desktop nav stop agreeing about where the nav
    // ends, which is exactly defect D8.
    expect(css).toMatch(
      /@media \(min-width:\s*48rem\)\s*\{[^@]*--nav-height:\s*4\.75rem/
    )
  })
})

describe('dark-mode logo variant switching', () => {
  it('defines the light/dark logo pair', () => {
    expect(css).toContain('.logo-light')
    expect(css).toContain('.logo-dark')
  })

  it('swaps them inside a dark-scheme media query', () => {
    expect(css).toMatch(
      /@media \(prefers-color-scheme: dark\)\s*\{[^@]*\.logo-light\s*\{[^}]*display:\s*none/
    )
  })

  it('uses colour-scheme CSS rather than Tailwind dark: variants', () => {
    // Phase 3A implemented dark mode entirely through tokens and
    // prefers-color-scheme; this repo has no `dark:` variants by design.
    expect(css).not.toMatch(/\bdark:logo/)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run styles/nav-height.test.ts`
Expected: FAIL — no `--nav-height` in the stylesheet.

- [ ] **Step 3: Add the token**

In `styles/index.css`, inside the existing `:root { … }` block (the one starting `color-scheme: light dark;` at line 43), add after the `--sem-rule` declaration:

```css
  /* Single authority for the height of the site header, at both breakpoints.
     Both navbars set their own height FROM this, and the Publications sticky
     bar and its jump-nav offsets are positioned against it -- so the nav can
     grow (as it does in Phase 4B, when the desktop nav gains a logo) without
     silently sliding content under it. That desync is defect D8: the bar was
     pinned at a literal 64px while the desktop nav measured 70px.
     4.75rem = a 32px logo + the nav's 20px vertical padding + 1px borders,
     rounded up to a round value for a little optical breathing room. */
  --nav-height: 4rem;
```

Then add a new top-level block immediately after the closing brace of that `:root` block:

```css
@media (min-width: 48rem) {
  :root {
    /* Must match Tailwind's `md` breakpoint, which is where both navbars
       swap over. */
    --nav-height: 4.75rem;
  }
}
```

- [ ] **Step 4: Add the logo variant CSS**

In `styles/index.css`, add after the `.media-frame` dark-mode block (around line 97):

```css
/* Dark-scheme logo switching. Emitted by Logo.tsx only when a dark variant is
   actually uploaded -- a single-logo site renders one <img> carrying neither
   class, visible in both schemes. Class-based rather than a Tailwind `dark:`
   variant because Phase 3A implemented dark mode entirely through tokens and
   prefers-color-scheme; there are no `dark:` variants anywhere in this repo.
   No JS, so no hydration mismatch. */
.logo-light {
  display: block;
}

.logo-dark {
  display: none;
}

@media (prefers-color-scheme: dark) {
  .logo-light {
    display: none;
  }

  .logo-dark {
    display: block;
  }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run styles/`
Expected: PASS — including the pre-existing `tokens.test.ts` and `media-dim.test.ts`, which must not regress.

- [ ] **Step 6: Commit**

```bash
git add styles/index.css styles/nav-height.test.ts
git commit -m "feat: add a --nav-height token and dark-variant logo switching"
```

---

## Task 5: Desktop nav logo

The lower-risk navbar, done first so `Logo` is proven in a real tree before touching the Dialog-coupled mobile one.

**Files:**
- Modify: `components/global/Navbar/DesktopNavBar.tsx`
- Modify: `components/global/Navbar/Navbar.tsx`
- Modify: `components/shared/Layout.tsx`

**Interfaces:**
- Consumes: `Logo` (Task 3), `--nav-height` (Task 4), `LogoImageSource` (Task 1), `resolveBranding` from `lib/branding.ts`.
- Produces: `NavbarProps` and `DesktopNavBar`'s props both gain `logo?: LogoImageSource | null`, `logoDark?: LogoImageSource | null`, `shortName: string`. Task 6 adds the same three to `MobileNavBar`.

- [ ] **Step 1: Thread branding through `Layout`**

In `components/shared/Layout.tsx`, add the import:

```tsx
import { resolveBranding } from 'lib/branding'
```

Inside the component body, before the `return`:

```tsx
  const { shortName } = resolveBranding(settings)
```

And extend the `<Navbar …>` call with three new props:

```tsx
      <Navbar
        menuItems={settings?.menuItems}
        showPublications={settings?.showPublications ?? true}
        showPeople={settings?.showPeople ?? true}
        showContactForm={settings?.showContactForm ?? true}
        logo={settings?.logo}
        logoDark={settings?.logoDark}
        shortName={shortName}
      />
```

- [ ] **Step 2: Pass them through `Navbar`**

In `components/global/Navbar/Navbar.tsx`, add the import:

```tsx
import type { LogoImageSource } from 'lib/logo'
```

Extend `NavbarProps`:

```tsx
interface NavbarProps {
  menuItems?: MenuItem[] | null
  showPublications?: boolean | null
  showPeople?: boolean | null
  showContactForm?: boolean | null
  logo?: LogoImageSource | null
  logoDark?: LogoImageSource | null
  shortName: string
}
```

Destructure the three new props and forward them to **both** child navbars:

```tsx
export function Navbar({
  menuItems,
  showPublications = true,
  showPeople = true,
  showContactForm = true,
  logo,
  logoDark,
  shortName,
}: NavbarProps) {
  return (
    <>
      <MobileNavBar
        menuItems={menuItems}
        showPublications={showPublications}
        showPeople={showPeople}
        showContactForm={showContactForm}
        logo={logo}
        logoDark={logoDark}
        shortName={shortName}
      />
      <DesktopNavBar
        menuItems={menuItems}
        showPublications={showPublications}
        showPeople={showPeople}
        showContactForm={showContactForm}
        logo={logo}
        logoDark={logoDark}
        shortName={shortName}
      />
    </>
  )
}
```

`MobileNavBar` does not accept these yet — it will after Task 6. Expect a type error until then; Step 5 below only type-checks after both are done, so run the full check at the end of Task 6.

- [ ] **Step 3: Render the logo in `DesktopNavBar`**

In `components/global/Navbar/DesktopNavBar.tsx`, add imports:

```tsx
import Logo from 'components/global/Logo'
import type { LogoImageSource } from 'lib/logo'
```

Extend the props signature with `logo`, `logoDark`, `shortName` (same three types as `NavbarProps` above).

Replace the `<nav>`'s `py-4 … md:py-5` with the token, and insert the logo link as the first child:

```tsx
    <nav
      className={`sticky top-0 z-10 hidden h-[var(--nav-height)] flex-wrap items-center gap-x-5
            border-y border-accent bg-surface/80
            px-4 uppercase backdrop-blur md:flex md:px-gutter-md lg:px-gutter-lg`}
    >
      {/*
        Desktop had no logo at all before Phase 4B. Adding one is what forces
        the shared --nav-height token: it makes this bar taller, and the
        Publications sticky bar was pinned at a literal 64px (defect D8).
        The row's existing `items-center` centres the 32px logo against the
        28px links with no extra alignment work.
      */}
      <Link href="/" aria-label="Home">
        <Logo logo={logo} logoDark={logoDark} shortName={shortName} />
      </Link>

      {menuItems &&
```

Leave the `menuItems` map and the three `show*` links exactly as they are — the bold "Home" text link is deliberately kept alongside the logo (spec §3.5).

- [ ] **Step 4: Verify the desktop nav height is now token-driven**

Run: `npx vitest run components/global/`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/global/Navbar/DesktopNavBar.tsx components/global/Navbar/Navbar.tsx components/shared/Layout.tsx
git commit -m "feat: give the desktop nav a logo and a token-driven height"
```

---

## Task 6: Mobile nav logo and derived tap-overlay width

**The highest-risk task in the phase.** Read `MobileNavBar.tsx`'s existing comments in full before editing — they document three interlocking Headless UI mitigations from Phase 2C (PR #7), and the structure they describe must survive this change unchanged.

**Files:**
- Modify: `components/global/Navbar/MobileNavBar.tsx`
- Modify: `components/global/logo-contract.test.ts` (add MobileNavBar guards)

**Interfaces:**
- Consumes: `Logo` (Task 3), `resolveLogo`/`getAspectRatio` (Task 1), `--nav-height` (Task 4), the props threaded in Task 5.
- Produces: nothing new for later tasks.

- [ ] **Step 1: Write the failing contract tests**

Append to `components/global/logo-contract.test.ts`:

```ts
const mobileNav = () =>
  readFileSync('components/global/Navbar/MobileNavBar.tsx', 'utf8')

describe('MobileNavBar tap-overlay contract', () => {
  it('has no hardcoded overlay width', () => {
    // Defect D5: the overlay was `w-[120px]` while the rendered wordmark is
    // ~140px, so the rightmost ~20px of the visible logo was already dead to
    // taps while the menu was open. A CMS logo of arbitrary aspect ratio
    // turns that fixed 20px error into an unbounded one. Since image-mode
    // cannot be exercised end-to-end in this environment (spec §4/§6), THIS
    // is the real regression guard for that defect.
    expect(mobileNav()).not.toMatch(/w-\[120px\]/)
    expect(mobileNav()).not.toMatch(/w-\[\d+px\]/)
  })

  it('sizes the overlay from the shared resolver', () => {
    expect(mobileNav()).toMatch(/resolveLogo/)
  })

  it('takes its bar height from the shared token, not a literal', () => {
    expect(mobileNav()).toMatch(/h-\[var\(--nav-height\)\]/)
    expect(mobileNav()).not.toMatch(/\bh-16\b/)
  })

  it('keeps the Phase 2C Headless UI mitigations intact', () => {
    const source = mobileNav()
    // The tap-overlay Link must remain INSIDE DialogPanel. As a
    // Dialog-level sibling it works on mouse and silently fails on touch,
    // because useOutsideClick calls preventDefault() on touchend for
    // anything outside resolveContainers(), suppressing the synthesized
    // click. Asserted structurally: the overlay's aria-label="Home" Link
    // appears after <DialogPanel and before its closing tag.
    const panelStart = source.indexOf('<DialogPanel')
    const panelEnd = source.indexOf('</DialogPanel>')
    const overlay = source.indexOf('aria-label="Home"')
    expect(panelStart).toBeGreaterThan(-1)
    expect(overlay).toBeGreaterThan(panelStart)
    expect(overlay).toBeLessThan(panelEnd)
    // onClick={closeMenu} on the overlay is load-bearing: tapping an element
    // inside the panel is not an outside-click, so closing must come from
    // its own handler.
    expect(source).toMatch(/onClick=\{closeMenu\}/)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run components/global/logo-contract.test.ts`
Expected: FAIL — `w-[120px]` and `h-16` are still present, `resolveLogo` is not.

- [ ] **Step 3: Add imports and resolve the geometry once**

In `components/global/Navbar/MobileNavBar.tsx`, add imports:

```tsx
import Logo from 'components/global/Logo'
import { getAspectRatio, type LogoImageSource, resolveLogo } from 'lib/logo'
```

Extend the props signature with the three new props, then compute the geometry once inside the component body, immediately after the `closeMenu` definition:

```tsx
  // The visible logo and the transparent tap-overlay below take their width
  // from this single call. They cannot drift, in either render mode, because
  // there is one function -- which is what keeps the Phase 2C overlay
  // mitigation intact once the logo becomes CMS-editable and its aspect ratio
  // stops being a constant. See lib/logo.ts.
  const logoGeometry = resolveLogo({
    aspectRatio: getAspectRatio(logo),
    shortName,
  })
```

- [ ] **Step 4: Replace the inlined SVG with `Logo`**

Replace the entire `<svg viewBox="0 0 524 120" …>…</svg>` block (the one containing the `HOLSINGLER` text element) with:

```tsx
            <span className="absolute left-4 top-1/2 -translate-y-1/2">
              <Logo logo={logo} logoDark={logoDark} shortName={shortName} />
            </span>
```

Then **update the comment directly above it.** It currently explains that the logo is inlined SVG with `stroke="currentColor"` *because `public/logo.svg` hardcodes `stroke:#000000`, which an external `<img>` could not override*. That rationale is now mode-dependent and must say so:

```tsx
            {/*
              The logo's three render modes live in components/global/Logo.tsx.
              Wordmark mode is still inline SVG themed with
              `stroke="currentColor"` -- that is what lets it pick up the same
              token-driven colour as the hamburger bars (`bg-text`) and stay
              visible against `bg-surface` in both colour schemes. Image mode
              cannot use `currentColor` (it is a bitmap or an external SVG), so
              a dark-scheme variant is handled by the `.logo-light`/`.logo-dark`
              pair in styles/index.css instead. Both modes carry the accessible
              name "logo".
            */}
```

- [ ] **Step 5: Repoint the bar height and both overlay geometries at the token**

Three `h-16` occurrences become `h-[var(--nav-height)]`:

1. The header bar `<div>`: `… top-0 z-50 h-[var(--nav-height)] border-y">`
2. The close-button overlay: `className="absolute right-6 top-0 z-30 h-[var(--nav-height)] w-9 border-0 bg-transparent"`
3. The logo tap-overlay (below).

Replace the tap-overlay `<Link>`'s hardcoded width with the derived one:

```tsx
            <Link
              href="/"
              onClick={closeMenu}
              aria-label="Home"
              className="absolute left-4 top-0 z-10 h-[var(--nav-height)]"
              // Tailwind arbitrary values cannot take a runtime variable, so
              // this width is an inline style. It is the SAME number the
              // visible logo renders at -- see logoGeometry above.
              style={{ width: logoGeometry.width }}
            />
```

Finally, update that overlay's "Geometry coupling" comment paragraph: it currently says `left-4 top-0 h-16 w-[120px]` must stay in sync with the header bar's `h-16`. It should now read that the height comes from `--nav-height` and the width from `logoGeometry`, so both couplings are structural rather than comment-enforced. **Leave every other part of that comment intact** — the `touchend`/`preventDefault` mechanism, the `DialogPanel` containment requirement, the accepted transform/positioning tradeoff, and the `onClick={closeMenu}` note are all still accurate and still load-bearing.

- [ ] **Step 6: Run the full unit suite and type-check**

Run: `npm test && npm run type-check`
Expected: all tests PASS (including Task 5's now-complete prop threading); type-check clean.

- [ ] **Step 7: Commit**

```bash
git add components/global/Navbar/MobileNavBar.tsx components/global/logo-contract.test.ts
git commit -m "feat: render the CMS logo in the mobile nav with a derived tap-overlay width"
```

---

## Task 7: Fix D8 — Publications sticky geometry

**Files:**
- Modify: `components/pages/publications/Publications.tsx:35` and `:81-89`

**Interfaces:**
- Consumes: `--nav-height` (Task 4).
- Produces: nothing.

- [ ] **Step 1: Repoint the sticky offset at the token**

At `components/pages/publications/Publications.tsx:35`, change `sticky top-16` to `sticky top-[var(--nav-height)]`:

```tsx
      <div className="sticky top-[var(--nav-height)] z-0 mb-8 flex flex-col gap-4 border-b border-rule bg-surface/95 py-4 backdrop-blur md:flex-row md:items-center md:justify-between">
```

This is the D8 fix. The bar was pinned at a literal 64px (the *mobile* nav height) at all breakpoints while the desktop nav measured 70px — a 6px overlap, which Task 5's logo would have widened to 12px.

- [ ] **Step 2: Repoint both jump-nav offsets and correct the comment**

Replace the comment and `className` at `:81-89` with:

```tsx
              // Anchor-jump targets need enough top offset to clear both
              // stacked sticky bars (site nav + this page's search/filter
              // bar), or the browser's default hash-scroll lands the year
              // heading directly under them, fully hidden.
              //
              // The nav portion is --nav-height rather than a literal, so
              // this tracks the header automatically -- that is the whole
              // point of the token, and what stops defect D8 recurring here
              // the next time the nav's height changes. The added constant is
              // this page's own filter bar, measured against production:
              // 151px on mobile (flex-col) and 75px at md+ (flex-row), each
              // plus a 5px buffer.
              //
              // Note the previous md+ value (145px) had NO buffer -- it was
              // exactly the measured stack height, and its comment claimed a
              // stale "~139px". Both are corrected here.
              className="scroll-mt-[calc(var(--nav-height)+156px)] md:scroll-mt-[calc(var(--nav-height)+80px)]"
```

- [ ] **Step 3: Verify the arithmetic**

Confirm by hand that the values are right:
- Mobile: `4rem` (64) + 156 = **220px**, matching the previous mobile value exactly (bar 151 + 5 buffer). Mobile behaviour must not change — the mobile nav height is unchanged at 64px.
- Desktop: `4.75rem` (76) + 80 = **156px**, up from 145. The stack is now 76 + 75 = 151, so this clears it with the intended 5px buffer.

- [ ] **Step 4: Run tests**

Run: `npm test && npm run type-check`
Expected: PASS, clean.

- [ ] **Step 5: Commit**

```bash
git add components/pages/publications/Publications.tsx
git commit -m "fix: pin the Publications sticky bar to the real nav height (D8)"
```

---

## Task 8: End-to-end coverage

**Files:**
- Modify: `e2e/mobile-menu.spec.ts:209-229`
- Create: `e2e/nav-logo.spec.ts`
- Verify (no change expected): `e2e/server-rendered-nav.spec.ts`

**Interfaces:**
- Consumes: everything above.
- Produces: nothing.

- [ ] **Step 1: Widen the mobile-menu logo selector**

In `e2e/mobile-menu.spec.ts`, replace the `page.evaluate` block at `:221-229` with:

```ts
      const logoRect = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"]')
        // Matches both render modes: the wordmark fallback is an
        // <svg aria-label="logo">, an uploaded logo is an <img alt="logo">.
        // Production currently renders the wordmark (no logo is uploaded),
        // so this test exercises that path -- the selector is widened so it
        // does not silently start passing vacuously the day one is.
        const logoEl =
          document.querySelector('svg[aria-label="logo"]') ??
          document.querySelector('img[alt="logo"]')
        if (!logoEl || dialog?.contains(logoEl)) {
          return null
        }
        const rect = logoEl.getBoundingClientRect()
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
      })
      expect(logoRect).not.toBeNull()
```

Also update the comment at `:218-220`, which asserts the logo "is an inlined `<svg role="img" aria-label="logo">` (Phase 3A Task 5), not an `<img>`" — that is now only true in wordmark mode.

- [ ] **Step 2: Write the new nav-logo e2e test**

Create `e2e/nav-logo.spec.ts`:

```ts
import { expect, test } from '@playwright/test'

test.describe('header logo and nav geometry', () => {
  test('desktop nav renders a logo', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/')
    // Scoped to the desktop nav specifically. Both navbars are in the DOM at
    // every viewport -- only one is displayed -- and while display:none keeps
    // the hidden one out of the accessibility tree (so an unscoped getByRole
    // would in fact resolve to one element), relying on that is fragile: any
    // future change to how the navbars hide would turn this into an opaque
    // strict-mode violation rather than a clear failure.
    const desktopNav = page.locator('nav.sticky')
    // Before Phase 4B the desktop nav had no logo at all.
    await expect(desktopNav.getByRole('img', { name: 'logo' })).toBeVisible()
  })

  test('the Publications sticky bar sits exactly at the bottom of the desktop nav', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/publications')

    const geometry = await page.evaluate(() => {
      const nav = document.querySelector('nav.sticky')
      const bar = document.querySelector('[class*="sticky"][class*="top-"]')
      if (!nav || !bar) return null
      return {
        navHeight: nav.getBoundingClientRect().height,
        barTop: Number.parseFloat(getComputedStyle(bar).top),
      }
    })

    expect(geometry).not.toBeNull()
    // Defect D8: the bar was pinned at a literal 64px (the *mobile* nav
    // height) while the desktop nav measured 70px, so it overlapped the nav
    // by 6px -- which adding a logo would have widened to 12px. Both now come
    // from --nav-height, so they cannot disagree.
    expect(geometry!.barTop).toBeCloseTo(geometry!.navHeight, 0)
  })

  test('a year jump-link lands the heading clear of both sticky bars', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/publications')

    const yearLink = page.getByRole('navigation', { name: 'Jump to year' }).getByRole('link').first()
    test.skip(!(await yearLink.count()), 'dataset has only one publication year')

    const yearText = (await yearLink.textContent())!.trim()
    await yearLink.click()

    const heading = page.getByRole('heading', { name: yearText, level: 2 })
    const stackBottom = await page.evaluate(() => {
      const nav = document.querySelector('nav.sticky')
      const bar = document.querySelector('[class*="sticky"][class*="top-"]')
      if (!nav || !bar) return 0
      return (
        nav.getBoundingClientRect().height + bar.getBoundingClientRect().height
      )
    })

    const box = (await heading.boundingBox())!
    // The heading must land below the combined sticky stack, not underneath
    // it. This is the assertion the stale "~139px" comment's zero-buffer
    // value would have failed once the nav grew.
    expect(box.y).toBeGreaterThanOrEqual(stackBottom)
  })
})
```

- [ ] **Step 3: Run the e2e suite**

Run: `npm run test:e2e`
Expected: all pass, including the unchanged `server-rendered-nav.spec.ts` (its `getByRole('img', { name: 'logo' })` still resolves, because wordmark mode keeps `aria-label="logo"`).

Note this command rebuilds and serves a real production build, so it is slow. If `server-rendered-nav.spec.ts` fails with a strict-mode violation ("resolved to 2 elements"), that means both navbars are rendering a logo at the same viewport — check that `DesktopNavBar` still carries `hidden md:flex` and `MobileNavBar`'s `<nav>` still carries `md:hidden`.

- [ ] **Step 4: Commit**

```bash
git add e2e/
git commit -m "test: cover the desktop logo and the fixed Publications sticky geometry"
```

---

## Task 9: Documentation and final verification

**Files:**
- Modify: `docs/branding.md`

- [ ] **Step 1: Document the logo fields**

In `docs/branding.md`, add after the "Resolution order" section:

```markdown
## Logo

Uploaded in Studio under **Settings → Branding**. Three render modes, in
priority order:

1. **Logo** uploaded → shown as an image, scaled to the header height.
2. **Logo (dark mode)** also uploaded → swapped in automatically when the
   visitor's device is in dark mode, via the `.logo-light`/`.logo-dark` pair in
   `styles/index.css`. No JavaScript is involved.
3. **Neither** → the short name is rendered as a wordmark inside a stroked box,
   reproducing the site's original header mark.

### Geometry is derived, never hardcoded

`lib/logo.ts`'s `resolveLogo` returns the render mode *and* the width together,
from `asset.metadata.dimensions.aspectRatio` at a fixed `LOGO_HEIGHT`. Both the
visible logo and MobileNavBar's transparent tap-overlay call it, so they cannot
drift — a logo of any aspect ratio stays tappable while the mobile menu is open.

Do not reintroduce a literal pixel width in either place. `logo-contract.test.ts`
fails the build if you do, because this failure mode is invisible: it only
manifests on touch input, only while the menu is open.

### Nav height

`--nav-height` in `styles/index.css` is the single authority (4rem mobile,
4.75rem at `md`+). Both navbars set their height from it, and the Publications
sticky bar and jump-nav offsets are positioned against it. Changing the logo
height means changing that token, not hunting for literals.
```

- [ ] **Step 2: Run the complete verification suite**

Run each and confirm before claiming the phase is done:

```bash
npm test && npm run type-check && npm run lint && npm run build && npm run test:e2e
```

| Check | Expected |
|---|---|
| `npm test` | All unit + contract tests pass, including the new `lib/logo.test.ts`, `styles/nav-height.test.ts`, `components/global/logo-contract.test.ts` |
| `npm run type-check` | Clean |
| `npm run lint` | Clean |
| `npm run build` | Succeeds |
| `npm run test:e2e` | All pass |

- [ ] **Step 3: Confirm no hardcoded logo geometry survives**

```bash
grep -rn "w-\[120px\]\|h-16" components/ | grep -v node_modules
```

Expected: **no output.** Any hit is a literal that should have become `--nav-height` or a derived width.

- [ ] **Step 4: Commit**

```bash
git add docs/branding.md
git commit -m "docs: how the CMS logo resolves and why its geometry is derived"
```

---

## PR notes — carry these forward explicitly

The spec requires these be stated in the PR rather than discovered later:

1. **Image mode is not covered end-to-end.** E2E runs a real production build where `sanityFetch` executes server-side, so Playwright cannot substitute a CMS response, and this environment has no write token to upload a logo. Image mode is covered by unit tests (geometry) and contract tests (no hardcoded width) only. This is a gap in the phase's highest-risk area — same category as the existing webhook-secret and VisualEditing carry-forwards.
2. **Studio rendering of the Branding group is unverified** — no Studio login in this environment.
3. **The site will keep rendering the wordmark after this merges**, until someone uploads a logo in Studio. That is expected, not a failure.
4. **D1's "HOLSINGLER" typo still ships in JSON-LD.** `public/logo.svg` deletion and the JSON-LD logo URL are Phase 4D. The typo is gone from the visible header as of this phase.

## Post-merge manual steps

1. **Optionally upload a logo** in Studio under Settings → Branding. Until then the wordmark renders.
2. **Set `settings.shortName`** if not already set — it is the wordmark's text, and it is what the ≤20-character Studio warning was added for in 4A. Until it is set, the wordmark renders the full `siteName`, which at 48 characters ("Laboratory of Molecular Neuroscience and Dementia") will be squeezed hard by `textLength`.
