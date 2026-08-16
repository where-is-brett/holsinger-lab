# Phase 4C — Colour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the lab set one brand colour and one neutral preset in Sanity Studio, and have the site derive accessible `--sem-link` / `--sem-accent` values from them at request time.

**Architecture:** Two pure, dependency-free modules — `lib/color.ts` (sRGB↔OKLCH + WCAG contrast) and `lib/theme.ts` (derivation + the emitted CSS string). The root layout injects a `<style>` block at higher specificity than the preset blocks in `styles/index.css`. Neutral presets stay in CSS so `styles/tokens.test.ts` keeps guarding them; the derivation's safety comes from a property sweep instead, because derived values never appear in any file.

**Tech Stack:** Next.js 16 App Router (server components), Sanity 6.9.1 + `@sanity/color-input`, Tailwind 4 `@theme inline`, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-16-phase-4c-colour-design.md`

## Global Constraints

- **No new runtime dependency except `@sanity/color-input@^6.1.3`.** Colour maths is hand-rolled — a transitive break in a colour library is unfixable after handover.
- **`lib/color.ts` and `lib/theme.ts` are pure**: no React, no Sanity, no `next/*`, no filesystem. They are tested with plain literals, matching `lib/branding.ts` and `lib/logo.ts`.
- **Contrast is always measured on a quantized `#rrggbb` string**, never on OKLCH values. Out-of-gamut colours are clamped on conversion back to sRGB, which moves the real ratio.
- **`--sem-link` floor is 4.5:1; `--sem-accent` floor is 3:1**, each measured against the *worse* of the two surfaces that token can land on (`--sem-surface` and `--sem-surface-raised`).
- **Nothing in the root layout may throw.** It wraps `/studio`, so an exception takes down both the site and the CMS needed to fix it.
- **Imports are absolute from the repo root** (`lib/color`, not `../lib/color`) — `vite-tsconfig-paths` and `tsconfig.json` are already set up for this.
- **Prettier config: no semicolons, single quotes.** Run `npm run format` before committing if unsure.
- Run the unit suite with `npm test`, e2e with `npm run test:e2e`, types with `npm run type-check`.

---

## Task 1: `lib/color.ts` — colour space and contrast

**Files:**
- Create: `lib/color.ts`
- Test: `lib/color.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface Oklch { L: number; C: number; h: number }`
  - `parseHex(hex: string): [number, number, number] | null` — 0–1 sRGB triple, or null if not `#rrggbb`
  - `hexToOklch(hex: string): Oklch | null`
  - `oklchToHex(color: Oklch): string` — always returns a valid, gamut-clamped `#rrggbb`
  - `contrast(a: string, b: string): number` — WCAG 2.1 ratio; throws `Error` on unparseable input

- [ ] **Step 1: Write the failing test**

Create `lib/color.test.ts`:

```ts
import { contrast, hexToOklch, oklchToHex, parseHex } from 'lib/color'
import { describe, expect, it } from 'vitest'

describe('parseHex', () => {
  it('parses a six-digit hex into a 0-1 triple', () => {
    expect(parseHex('#ffffff')).toEqual([1, 1, 1])
    expect(parseHex('#000000')).toEqual([0, 0, 0])
  })

  it('is case-insensitive and tolerates surrounding whitespace', () => {
    expect(parseHex('  #FF0000 ')).toEqual([1, 0, 0])
  })

  it('rejects anything that is not #rrggbb', () => {
    for (const bad of ['#fff', 'ffffff', '#gggggg', '', 'red', '#ffffffff']) {
      expect(parseHex(bad), bad).toBeNull()
    }
  })
})

describe('hexToOklch / oklchToHex', () => {
  it('round-trips in-gamut colours exactly', () => {
    for (const hex of ['#2d6a4f', '#4043e7', '#ff7a00', '#000e2f', '#808080']) {
      const oklch = hexToOklch(hex)
      expect(oklch, hex).not.toBeNull()
      expect(oklchToHex(oklch!), hex).toBe(hex)
    }
  })

  it('puts white and black at the ends of the lightness range with no chroma', () => {
    const white = hexToOklch('#ffffff')!
    const black = hexToOklch('#000000')!
    expect(white.L).toBeCloseTo(1, 2)
    expect(black.L).toBeCloseTo(0, 2)
    expect(white.C).toBeCloseTo(0, 3)
    expect(black.C).toBeCloseTo(0, 3)
  })

  it('returns null for an unparseable hex', () => {
    expect(hexToOklch('nope')).toBeNull()
  })

  it('clamps out-of-gamut coordinates to a valid hex rather than producing garbage', () => {
    // Chroma far beyond anything sRGB can represent at this lightness.
    const hex = oklchToHex({ L: 0.5, C: 0.9, h: 1.2 })
    expect(hex).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('contrast', () => {
  it('matches the WCAG reference values', () => {
    expect(contrast('#ffffff', '#000000')).toBeCloseTo(21, 1)
    expect(contrast('#ffffff', '#ffffff')).toBeCloseTo(1, 5)
  })

  it('is symmetric', () => {
    expect(contrast('#2d6a4f', '#f8f8f8')).toBeCloseTo(contrast('#f8f8f8', '#2d6a4f'), 10)
  })

  it("reproduces the current palette's published ratios", () => {
    // These are the values styles/tokens.test.ts already asserts against.
    expect(contrast('#4043e7', '#f8f8f8')).toBeCloseTo(6.23, 1)
    expect(contrast('#2d6a4f', '#f8f8f8')).toBeCloseTo(6.02, 1)
  })

  it('throws on unparseable input rather than returning a misleading number', () => {
    expect(() => contrast('#ffffff', 'nope')).toThrow(/unparseable/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/color.test.ts`
Expected: FAIL — `Failed to resolve import "lib/color"`.

- [ ] **Step 3: Write the implementation**

Create `lib/color.ts`:

```ts
/**
 * sRGB <-> OKLCH conversion and WCAG 2.1 contrast. Pure and dependency-free --
 * no colour library -- because this repo is handed over with no maintainer, and
 * a transitive break in a dependency would be unfixable (spec §3.2).
 *
 * Matrices are Bjorn Ottosson's published OKLab constants.
 */

export interface Oklch {
  /** Perceptual lightness, 0 (black) to 1 (white). */
  L: number
  /** Chroma, 0 (grey) upward. Values above ~0.37 leave the sRGB gamut. */
  C: number
  /** Hue angle in radians. */
  h: number
}

const HEX_PATTERN = /^#[0-9a-f]{6}$/i

const srgbToLinear = (c: number) =>
  c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4

const linearToSrgb = (c: number) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055

/** Parses `#rrggbb` into a 0-1 sRGB triple, or null if the input is not that. */
export function parseHex(hex: string): [number, number, number] | null {
  const trimmed = hex.trim()
  if (!HEX_PATTERN.test(trimmed)) return null
  const body = trimmed.slice(1)
  return [0, 2, 4].map((i) => parseInt(body.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ]
}

function toHex(rgb: [number, number, number]): string {
  const channel = (c: number) =>
    Math.round(Math.min(1, Math.max(0, c)) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${channel(rgb[0])}${channel(rgb[1])}${channel(rgb[2])}`
}

export function hexToOklch(hex: string): Oklch | null {
  const parsed = parseHex(hex)
  if (!parsed) return null
  const [r, g, b] = parsed.map(srgbToLinear)

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s

  return { L, C: Math.hypot(a, bb), h: Math.atan2(bb, a) }
}

/**
 * Always returns a valid `#rrggbb`. Coordinates outside the sRGB gamut are
 * clamped per channel -- which is why callers must re-measure contrast on the
 * returned string rather than trusting the requested lightness (spec §1.1d).
 */
export function oklchToHex({ L, C, h }: Oklch): string {
  const a = C * Math.cos(h)
  const b = C * Math.sin(h)

  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3

  return toHex([
    linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ])
}

function relativeLuminance(hex: string): number {
  const parsed = parseHex(hex)
  if (!parsed) throw new Error(`contrast: unparseable colour ${JSON.stringify(hex)}`)
  const [r, g, b] = parsed.map(srgbToLinear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2.1 contrast ratio, 1 to 21. Both arguments must be `#rrggbb`. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/color.test.ts`
Expected: PASS, all cases.

- [ ] **Step 5: Type-check and commit**

```bash
npm run type-check
git add lib/color.ts lib/color.test.ts
git commit -m "feat: add dependency-free sRGB/OKLCH conversion and WCAG contrast"
```

---

## Task 2: Rework the token guard to resolve theme × scheme

**Files:**
- Modify: `styles/tokens.test.ts:19-117` (the parser and reader helpers) and every `readTokens(...)` call site

**Interfaces:**
- Consumes: nothing.
- Produces (internal to `styles/tokens.test.ts`, used by Task 3):
  - `type Scheme = 'light' | 'dark'`
  - `resolveTokens(css: string, selector: string, scheme: Scheme): Record<string, string>` — tokens in effect for one selector under one scheme, **merged over the base `:root`** exactly as a browser would cascade them
  - `readResolved(selector: string, scheme: Scheme): Record<string, string>` — same, reading `styles/index.css` from disk

**Why this task exists before any CSS changes.** The current `parseTokens` matches *top-level* blocks by exact selector text, and throws `"is ambiguous"` when more than one such block declares `--sem-*` tokens. Task 3 adds a second top-level `@media (prefers-color-scheme: dark)` block (for the `warm` preset's dark values), which would make the existing marker `'@media (prefers-color-scheme: dark)'` match two blocks and throw. Adding the CSS first would detonate the existing suite with a confusing error. This task changes *how* tokens are located — from "top-level block by selector text" to "block by (selector, scheme), resolved over the base" — with no change to what is asserted.

- [ ] **Step 1: Write the failing test**

Add this describe block to `styles/tokens.test.ts` (keep the existing ones for now):

```ts
describe('resolveTokens', () => {
  const CSS = `
    :root {
      --sem-surface: #ffffff;
      --sem-text: #000000;
      --sem-link: #0000ff;
    }

    :root[data-theme='warm'] {
      --sem-surface: #faf8f4;
      --sem-text: #1a1713;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --sem-surface: #000000;
        --sem-text: #ffffff;
        --sem-link: #9999ff;
      }
    }

    @media (prefers-color-scheme: dark) {
      :root[data-theme='warm'] {
        --sem-surface: #12100d;
        --sem-text: #f4f1ea;
      }
    }
  `

  it('reads the base light tokens', () => {
    expect(resolveTokens(CSS, ':root', 'light')).toEqual({
      '--sem-surface': '#ffffff',
      '--sem-text': '#000000',
      '--sem-link': '#0000ff',
    })
  })

  it('reads the base dark tokens', () => {
    expect(resolveTokens(CSS, ':root', 'dark')).toEqual({
      '--sem-surface': '#000000',
      '--sem-text': '#ffffff',
      '--sem-link': '#9999ff',
    })
  })

  it('merges a preset over the base, so partial overrides inherit the rest', () => {
    // --sem-link is declared only on :root. A preset that does not redeclare it
    // must still resolve it, or every assertion about it silently compares
    // undefined and passes.
    expect(resolveTokens(CSS, ":root[data-theme='warm']", 'light')).toEqual({
      '--sem-surface': '#faf8f4',
      '--sem-text': '#1a1713',
      '--sem-link': '#0000ff',
    })
  })

  it("resolves a preset's dark scheme over the preset's own light values", () => {
    expect(resolveTokens(CSS, ":root[data-theme='warm']", 'dark')).toEqual({
      '--sem-surface': '#12100d',
      '--sem-text': '#f4f1ea',
      '--sem-link': '#9999ff',
    })
  })

  it('tolerates two sibling dark @media blocks', () => {
    // The exact shape that made the old parseTokens throw "is ambiguous".
    expect(() => resolveTokens(CSS, ':root', 'dark')).not.toThrow()
  })

  it('throws when the selector exists in no scheme at all', () => {
    expect(() => resolveTokens(CSS, ":root[data-theme='nope']", 'light')).toThrow(
      /no block matching/
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- styles/tokens.test.ts`
Expected: FAIL — `resolveTokens is not defined`.

- [ ] **Step 3: Replace the parser and reader helpers**

In `styles/tokens.test.ts`, replace the `CssBlock` interface, `parseCssBlocks`, `parseTokens` and `readTokens` (currently lines 19–117) with:

```ts
type Scheme = 'light' | 'dark'

const DARK_MEDIA = '@media (prefers-color-scheme: dark)'

interface CssBlock {
  /** The selector/at-rule text immediately preceding this block's `{`, trimmed. */
  selector: string
  /** Raw text between this block's matching `{` and `}`. */
  body: string
  /** Nesting depth: 0 for a block whose `{` sits outside every other block. */
  depth: number
  /** Selector of the block this one is nested directly inside, or null. */
  parent: string | null
}

/**
 * Splits a CSS source into every `{ ... }` block using real brace-depth
 * counting, so each block's extent is exact no matter what other braces
 * (nested rules, `@media` wrappers, etc.) appear before or inside it. This
 * is what `String.indexOf('}')` cannot do: it always grabs the *next*
 * closing brace, which is wrong as soon as anything nests.
 *
 * Each block also records its immediate parent's selector, which is what
 * lets a nested `:root` be told apart from a top-level one without relying
 * on there being exactly one `@media` wrapper in the file.
 */
function parseCssBlocks(css: string): CssBlock[] {
  const blocks: CssBlock[] = []
  const stack: { selector: string; bodyStart: number; depth: number; parent: string | null }[] = []
  let depth = 0
  let selectorStart = 0

  for (let i = 0; i < css.length; i++) {
    const ch = css[i]
    if (ch === '{') {
      stack.push({
        selector: css.slice(selectorStart, i).trim(),
        bodyStart: i + 1,
        depth,
        parent: stack.length > 0 ? stack[stack.length - 1].selector : null,
      })
      depth++
      selectorStart = i + 1
    } else if (ch === '}') {
      const frame = stack.pop()
      if (!frame) throw new Error(`readTokens: unbalanced '}' while parsing CSS at index ${i}`)
      depth--
      blocks.push({
        selector: frame.selector,
        body: css.slice(frame.bodyStart, i),
        depth: frame.depth,
        parent: frame.parent,
      })
      selectorStart = i + 1
    }
  }
  if (stack.length > 0) {
    throw new Error(`readTokens: unbalanced '{' while parsing CSS — ${stack.length} block(s) never closed`)
  }
  return blocks
}

/** Parses `--sem-*: #rrggbb;` declarations out of a block's body text. */
function parseSemTokens(body: string): Record<string, string> {
  return Object.fromEntries(
    [...body.matchAll(/(--sem-[\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]])
  )
}

/**
 * Every `--sem-*` declaration for one selector in one scheme, in source order.
 *
 * `light` means top-level blocks; `dark` means blocks nested directly inside a
 * top-level `@media (prefers-color-scheme: dark)`. Returns an array because a
 * selector may legitimately appear more than once; callers merge them in order.
 */
function blocksFor(css: string, selector: string, scheme: Scheme): Record<string, string>[] {
  return parseCssBlocks(css)
    .filter((b) =>
      scheme === 'light'
        ? b.depth === 0 && b.selector === selector
        : b.depth === 1 && b.selector === selector && b.parent === DARK_MEDIA
    )
    .map((b) => parseSemTokens(b.body))
    .filter((tokens) => Object.keys(tokens).length > 0)
}

/**
 * The `--sem-*` tokens actually in effect for `selector` under `scheme`,
 * resolved the way a browser cascades them.
 *
 * Preset blocks (`:root[data-theme="…"]`) declare only the neutrals, so reading
 * one standalone would leave `--sem-link` and `--sem-accent` undefined and every
 * assertion about them would silently pass. Layering over the base is what makes
 * the guard mean anything for a preset (spec §1.1f).
 *
 * Layer order matches specificity, not source order: a preset's *light* block
 * (0,2,0) outranks the base's *dark* block (0,1,0), so a preset that failed to
 * redeclare a token in dark mode would show its light value -- which is exactly
 * what a browser does, and what the completeness assertion in Task 3 forbids.
 */
function resolveTokens(css: string, selector: string, scheme: Scheme): Record<string, string> {
  const layers = [...blocksFor(css, ':root', 'light')]
  if (scheme === 'dark') layers.push(...blocksFor(css, ':root', 'dark'))

  if (selector !== ':root') {
    layers.push(...blocksFor(css, selector, 'light'))
    if (scheme === 'dark') layers.push(...blocksFor(css, selector, 'dark'))
  }

  if (layers.length === 0) {
    throw new Error(`readTokens: no block matching "${selector}" declares any --sem-* tokens`)
  }
  if (selector !== ':root' && blocksFor(css, selector, 'light').length === 0 && blocksFor(css, selector, 'dark').length === 0) {
    throw new Error(`readTokens: no block matching "${selector}" was found in any scheme`)
  }

  return Object.assign({}, ...layers)
}

function readResolved(selector: string, scheme: Scheme): Record<string, string> {
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8')
  return resolveTokens(css, selector, scheme)
}
```

- [ ] **Step 4: Update the existing call sites**

Three changes, no assertion text changes:

- `describe('light theme tokens')` — `const t = readTokens(':root {')` becomes `const t = readResolved(':root', 'light')`
- `describe('dark theme tokens')` — `const t = readTokens('@media (prefers-color-scheme: dark)')` becomes `const t = readResolved(':root', 'dark')`, and inside it `readTokens(':root {')` becomes `readResolved(':root', 'light')`
- `describe('cross-token contrast regression guard')` — replace the `THEMES` constant and its loop body:

```ts
  const SCHEMES: Scheme[] = ['light', 'dark']

  for (const scheme of SCHEMES) {
    it(`no known foreground/background pairing collapses below 3:1 in the ${scheme} theme`, () => {
      const t = readResolved(':root', scheme)
      for (const [fg, bg] of USED_PAIRS) {
        expect(contrast(t[fg], t[bg]), `${fg} on ${bg} (${scheme})`).toBeGreaterThanOrEqual(3)
      }
    })
  }
```

Delete the old `describe('readTokens helper')` block entirely — every fixture in it tests `parseTokens`, which no longer exists, and the `resolveTokens` describe added in Step 1 covers the same failure modes plus the two-sibling-`@media` case the old parser could not handle.

- [ ] **Step 5: Run the full unit suite**

Run: `npm test`
Expected: PASS. The same assertions as before, plus the new `resolveTokens` block. If `light theme tokens` or `dark theme tokens` now fail, the resolver is wrong — do not adjust the palette to make them pass.

- [ ] **Step 6: Commit**

```bash
git add styles/tokens.test.ts
git commit -m "test: resolve design tokens by theme and scheme, merging over the base

The parser matched top-level blocks by selector text and threw on any
selector that appeared twice. A second dark @media block -- which the warm
preset needs -- would have made the existing dark-theme marker ambiguous.
Locating blocks by (selector, scheme) and layering them the way a browser
cascades them also fixes the trap where a preset's partial override leaves
undeclared tokens undefined and every assertion about them passes silently."
```

---

## Task 3: Add the `warm` preset

**Files:**
- Modify: `styles/index.css` (append after the existing dark `@media` block, around line 90)
- Modify: `styles/tokens.test.ts` (parameterise the assertions over both themes)

**Interfaces:**
- Consumes: `resolveTokens` / `readResolved` / `Scheme` from Task 2.
- Produces: the selector string `:root[data-theme='warm']` and the nine warm neutral hexes, which Task 4's `PRESET_SURFACES` mirrors.

- [ ] **Step 1: Write the failing test**

In `styles/tokens.test.ts`, add:

```ts
const THEMES: { name: string; selector: string }[] = [
  { name: 'default', selector: ':root' },
  { name: 'warm', selector: ":root[data-theme='warm']" },
]

/** Tokens whose values come from brandColor at runtime, not from a preset. */
const CHROMATIC = ['--sem-link', '--sem-accent']

describe('every preset passes the contrast guards', () => {
  for (const { name, selector } of THEMES) {
    for (const scheme of ['light', 'dark'] as Scheme[]) {
      it(`${name} / ${scheme}`, () => {
        const t = readResolved(selector, scheme)

        for (const token of ['--sem-text', '--sem-text-muted']) {
          expect(contrast(t[token], t['--sem-surface']), `${token} on surface`).toBeGreaterThanOrEqual(4.5)
          expect(contrast(t[token], t['--sem-surface-raised']), `${token} on raised`).toBeGreaterThanOrEqual(4.5)
        }
        expect(contrast(t['--sem-link'], t['--sem-surface']), 'link on surface').toBeGreaterThanOrEqual(4.5)
        expect(contrast(t['--sem-accent'], t['--sem-surface']), 'accent on surface').toBeGreaterThanOrEqual(3)
        expect(contrast(t['--sem-field'], t['--sem-surface']), 'field on surface').toBeGreaterThanOrEqual(3)
        expect(
          contrast(t['--sem-text-inverse'], t['--sem-surface-inverse']),
          'inverse text on inverse surface'
        ).toBeGreaterThanOrEqual(4.5)
      })
    }
  }
})

describe('preset structure', () => {
  const presets = THEMES.filter((t) => t.selector !== ':root')

  for (const { name, selector } of presets) {
    it(`${name} declares no chromatic token`, () => {
      // Presets vary neutrals only -- chroma is brandColor's job (spec §2). This
      // is read from the preset's own blocks, not the resolved merge, because
      // the merge would always show the base's chromatic values.
      const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8')
      for (const scheme of ['light', 'dark'] as Scheme[]) {
        const own = ownDeclarations(css, selector, scheme)
        for (const token of CHROMATIC) {
          expect(own[token], `${name}/${scheme} must not declare ${token}`).toBeUndefined()
        }
      }
    })

    it(`${name} redeclares in dark every token it declares in light`, () => {
      // A preset's light block (0,2,0) outranks the base's dark block (0,1,0),
      // so any token the preset declares in light but not in dark keeps its
      // LIGHT value in dark mode. That is a silent, real rendering bug.
      const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8')
      expect(Object.keys(ownDeclarations(css, selector, 'dark')).sort()).toEqual(
        Object.keys(ownDeclarations(css, selector, 'light')).sort()
      )
    })
  }
})
```

Add the `ownDeclarations` helper next to `resolveTokens`:

```ts
/** A selector's own declarations in one scheme, with no base layered under it. */
function ownDeclarations(css: string, selector: string, scheme: Scheme): Record<string, string> {
  const own: Record<string, string> = {}
  for (const block of blocksFor(css, selector, scheme)) Object.assign(own, block)
  return own
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- styles/tokens.test.ts`
Expected: FAIL — `no block matching ":root[data-theme='warm']" was found in any scheme`.

- [ ] **Step 3: Add the preset CSS**

In `styles/index.css`, immediately after the existing `@media (prefers-color-scheme: dark)` block that closes at line 90, insert:

```css
/* Neutral preset. Selected by `settings.theme` in Sanity Studio; the root
   layout puts `data-theme="warm"` on <html>. Presets vary the nine NEUTRAL
   tokens only -- the two chromatic ones are derived from `settings.brandColor`
   at request time and injected at higher specificity (see lib/theme.ts).

   The dark block must redeclare every token the light block does: this
   selector is (0,2,0) and the base dark override is only (0,1,0), so anything
   left out here would keep its LIGHT value in dark mode. styles/tokens.test.ts
   asserts that completeness. */
:root[data-theme='warm'] {
  --sem-surface: #faf8f4;
  --sem-surface-raised: #f4f1ea;
  --sem-surface-inverse: #24201b;
  --sem-scrim: #12100d;
  --sem-text: #1a1713;
  --sem-text-muted: #5c544a;
  --sem-text-inverse: #fffdf9;
  --sem-field: #7a7168;
  --sem-rule: #e7e2d8;
}

@media (prefers-color-scheme: dark) {
  :root[data-theme='warm'] {
    --sem-surface: #12100d;
    --sem-surface-raised: #24201b;
    --sem-surface-inverse: #f4f1ea;
    --sem-scrim: #12100d;
    --sem-text: #f4f1ea;
    --sem-text-muted: #bdb5a8;
    --sem-text-inverse: #12100d;
    --sem-field: #837a6f;
    --sem-rule: #2c2721;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- styles/tokens.test.ts`
Expected: PASS — four `every preset passes the contrast guards` cases and four `preset structure` cases. These values were verified against these exact assertions before the spec was written; if any fails, the CSS was transcribed wrongly.

- [ ] **Step 5: Commit**

```bash
git add styles/index.css styles/tokens.test.ts
git commit -m "feat: add the warm neutral preset, guarded in both colour schemes"
```

---

## Task 4: `lib/theme.ts` — derivation and the emitted style block

**Files:**
- Create: `lib/theme.ts`
- Test: `lib/theme.test.ts`

**Interfaces:**
- Consumes: `contrast`, `hexToOklch`, `oklchToHex` from `lib/color` (Task 1); the warm hexes from `styles/index.css` (Task 3).
- Produces:
  - `type ThemeName = 'default' | 'warm'`, `type Scheme = 'light' | 'dark'`
  - `const THEME_NAMES: readonly ThemeName[]`
  - `const PRESET_SURFACES: Record<ThemeName, Record<Scheme, readonly [string, string]>>`
  - `deriveToken(brandHex: string, surfaces: readonly [string, string], target: number, direction: 'darken' | 'lighten'): string | null`
  - `deriveTheme(brandHex: string, theme: ThemeName): { light: { link: string; accent: string }; dark: { link: string; accent: string } } | null`
  - `buildBrandStyle(brandHex: string, theme: ThemeName): string | null` — the exact CSS text the layout injects
  - `resolveThemeName(value: unknown): ThemeName`

- [ ] **Step 1: Write the failing test**

Create `lib/theme.test.ts`:

```ts
import { contrast } from 'lib/color'
import {
  buildBrandStyle,
  deriveTheme,
  deriveToken,
  PRESET_SURFACES,
  resolveThemeName,
  THEME_NAMES,
} from 'lib/theme'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('deriveToken', () => {
  const LIGHT = PRESET_SURFACES.default.light

  it('returns the brand colour unchanged when it already clears the target', () => {
    // The identity case the whole phase turns on: a lab entering the site's
    // current accent must get the site's current accent back, exactly.
    expect(deriveToken('#2d6a4f', LIGHT, 3, 'darken')).toBe('#2d6a4f')
    expect(deriveToken('#2d6a4f', LIGHT, 4.5, 'darken')).toBe('#2d6a4f')
    expect(deriveToken('#4043e7', LIGHT, 4.5, 'darken')).toBe('#4043e7')
  })

  it('darkens only as far as the target requires', () => {
    const derived = deriveToken('#ff7a00', LIGHT, 4.5, 'darken')!
    expect(contrast(derived, LIGHT[0])).toBeGreaterThanOrEqual(4.5)
    // Not driven to the minimum-passing extreme: it stays recognisably orange
    // rather than collapsing toward black.
    expect(contrast(derived, LIGHT[0])).toBeLessThan(7)
  })

  it('measures against the worse of the two surfaces', () => {
    const derived = deriveToken('#ff7a00', LIGHT, 4.5, 'darken')!
    expect(contrast(derived, LIGHT[0])).toBeGreaterThanOrEqual(4.5)
    expect(contrast(derived, LIGHT[1])).toBeGreaterThanOrEqual(4.5)
  })

  it('returns null for an unparseable brand colour', () => {
    expect(deriveToken('nope', LIGHT, 4.5, 'darken')).toBeNull()
  })
})

describe('deriveTheme — accessible by construction', () => {
  // A wide sweep rather than a handful of cases: this IS the guarantee that
  // no input a lab can enter produces a failing palette. styles/tokens.test.ts
  // structurally cannot cover it, because derived values never appear in any
  // file on disk (spec §1.1e).
  const BRANDS: string[] = []
  for (let r = 0; r < 256; r += 51) {
    for (let g = 0; g < 256; g += 51) {
      for (let b = 0; b < 256; b += 51) {
        BRANDS.push(
          `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
        )
      }
    }
  }

  it('covers a meaningful number of inputs', () => {
    expect(BRANDS.length).toBe(216)
  })

  for (const theme of THEME_NAMES) {
    it(`every brand colour yields a passing palette for the ${theme} preset`, () => {
      for (const brand of BRANDS) {
        const derived = deriveTheme(brand, theme)
        expect(derived, brand).not.toBeNull()

        for (const scheme of ['light', 'dark'] as const) {
          const surfaces = PRESET_SURFACES[theme][scheme]
          for (const surface of surfaces) {
            expect(
              contrast(derived![scheme].link, surface),
              `link ${derived![scheme].link} from ${brand} on ${surface} (${theme}/${scheme})`
            ).toBeGreaterThanOrEqual(4.5)
            expect(
              contrast(derived![scheme].accent, surface),
              `accent ${derived![scheme].accent} from ${brand} on ${surface} (${theme}/${scheme})`
            ).toBeGreaterThanOrEqual(3)
          }
        }
      }
    })
  }

  it('handles the extremes that stress the chroma fallback', () => {
    for (const brand of ['#ffff00', '#00ffff', '#ff00ff', '#000000', '#ffffff', '#808080']) {
      expect(deriveTheme(brand, 'default'), brand).not.toBeNull()
    }
  })

  it('returns null rather than throwing on malformed input', () => {
    for (const bad of ['', 'nope', '#fff', '#gggggg']) {
      expect(deriveTheme(bad, 'default'), bad).toBeNull()
    }
  })
})

describe('PRESET_SURFACES matches styles/index.css', () => {
  // Drift guard. These hexes exist in two places by necessity -- CSS so the
  // token guard covers them, TS so the derivation can compute against them --
  // and this is what stops the two from silently disagreeing (spec §3.4).
  const css = readFileSync(new URL('../styles/index.css', import.meta.url), 'utf8')

  function surfacesFromCss(selector: string, scheme: 'light' | 'dark'): [string, string] {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const blockPattern =
      scheme === 'light'
        ? new RegExp(`(?<!dark[^}]*)${escaped}\\s*\\{([^}]*)\\}`)
        : new RegExp(`prefers-color-scheme:\\s*dark\\)\\s*\\{\\s*${escaped}\\s*\\{([^}]*)\\}`)
    const body = css.match(blockPattern)?.[1]
    if (!body) throw new Error(`no ${scheme} block for ${selector}`)
    const pick = (name: string) => {
      const m = body.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`))
      if (!m) throw new Error(`${selector}/${scheme} declares no ${name}`)
      return m[1]
    }
    return [pick('--sem-surface'), pick('--sem-surface-raised')]
  }

  it('default matches the base :root in both schemes', () => {
    expect(PRESET_SURFACES.default.light).toEqual(surfacesFromCss(':root', 'light'))
    expect(PRESET_SURFACES.default.dark).toEqual(surfacesFromCss(':root', 'dark'))
  })

  it('warm matches its preset block in both schemes', () => {
    const selector = ":root[data-theme='warm']"
    expect(PRESET_SURFACES.warm.light).toEqual(surfacesFromCss(selector, 'light'))
    expect(PRESET_SURFACES.warm.dark).toEqual(surfacesFromCss(selector, 'dark'))
  })
})

describe('buildBrandStyle', () => {
  it('emits a light rule and a dark media rule at (0,3,0) specificity', () => {
    const css = buildBrandStyle('#ff7a00', 'default')!
    expect(css).toContain(':root:root:root')
    expect(css).toContain('prefers-color-scheme: dark')
    expect(css).toContain('--sem-link:')
    expect(css).toContain('--sem-accent:')
  })

  it('emits only the two chromatic tokens, never a neutral', () => {
    const css = buildBrandStyle('#ff7a00', 'default')!
    expect(css).not.toContain('--sem-surface')
    expect(css).not.toContain('--sem-text')
  })

  it('returns null for a brand colour it cannot use, so the caller injects nothing', () => {
    expect(buildBrandStyle('nope', 'default')).toBeNull()
  })

  it('contains no characters that could break out of a <style> element', () => {
    const css = buildBrandStyle('#ff7a00', 'warm')!
    expect(css).not.toMatch(/[<>]/)
  })
})

describe('resolveThemeName', () => {
  it('accepts the known presets', () => {
    expect(resolveThemeName('warm')).toBe('warm')
    expect(resolveThemeName('default')).toBe('default')
  })

  it('falls back to default for anything else, including stale CMS values', () => {
    for (const bad of [undefined, null, '', 'neutral', 42, {}]) {
      expect(resolveThemeName(bad)).toBe('default')
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/theme.test.ts`
Expected: FAIL — `Failed to resolve import "lib/theme"`.

- [ ] **Step 3: Write the implementation**

Create `lib/theme.ts`:

```ts
/**
 * Derives the two chromatic design tokens from one CMS brand colour.
 *
 * Pure -- no React, no Sanity, no filesystem -- for the same reason
 * `lib/branding.ts` and `lib/logo.ts` are: it stays trivially testable with
 * literals, and the guarantee this module provides is only worth as much as
 * the sweep that tests it (spec §4).
 */

import { contrast, hexToOklch, oklchToHex } from 'lib/color'

export type ThemeName = 'default' | 'warm'
export type Scheme = 'light' | 'dark'

export const THEME_NAMES: readonly ThemeName[] = ['default', 'warm']

/**
 * The two surfaces a chromatic token can land on, per preset per scheme.
 *
 * Mirrors `styles/index.css` by necessity: the neutrals must live in CSS for
 * `styles/tokens.test.ts` to guard them, and must be reachable from JS for the
 * derivation to measure against them. `lib/theme.test.ts` asserts the two stay
 * identical -- without that assertion this is exactly the two-sources-of-truth
 * shape that produced PR #16's Critical bug.
 */
export const PRESET_SURFACES: Record<ThemeName, Record<Scheme, readonly [string, string]>> = {
  default: {
    light: ['#f8f8f8', '#f6f6f8'],
    dark: ['#0d0e12', '#1b1d27'],
  },
  warm: {
    light: ['#faf8f4', '#f4f1ea'],
    dark: ['#12100d', '#24201b'],
  },
}

/** WCAG AA for body text -- `--sem-link` is text. */
const LINK_MIN_CONTRAST = 4.5
/** WCAG AA for non-text -- `--sem-accent` is borders and edges. */
const ACCENT_MIN_CONTRAST = 3

/** One step per 8-bit level, so the scan cannot skip a representable colour. */
const LIGHTNESS_STEPS = 256
const CHROMA_STEP = 0.02

/** The worse of the two surfaces is what the token has to clear. */
function worstContrast(hex: string, surfaces: readonly [string, string]): number {
  return Math.min(contrast(hex, surfaces[0]), contrast(hex, surfaces[1]))
}

/**
 * Finds the colour closest to `brandHex` that clears `target` against both
 * surfaces, holding hue and (where possible) chroma.
 *
 * Anchored at the brand colour's OWN lightness, not at an extreme. Scanning
 * inward from white or black instead returns the minimum-passing colour: every
 * accent lands a hair over its floor, visibly washed out, and a brand colour
 * that already passes comes back changed -- which would break the promise that
 * the default preset reproduces the current palette (spec §1.1a).
 *
 * A fixed-step scan rather than a binary search: gamut clamping puts small flat
 * spots in the contrast-vs-lightness curve, so it is not strictly monotonic and
 * bisection can step over the first passing value.
 */
export function deriveToken(
  brandHex: string,
  surfaces: readonly [string, string],
  target: number,
  direction: 'darken' | 'lighten'
): string | null {
  const brand = hexToOklch(brandHex)
  if (!brand) return null

  const sign = direction === 'darken' ? -1 : 1

  for (let chroma = brand.C; chroma >= 0; chroma -= CHROMA_STEP) {
    const C = Math.max(0, chroma)

    for (let step = 0; step <= LIGHTNESS_STEPS; step++) {
      const L = brand.L + (sign * step) / LIGHTNESS_STEPS
      if (L < 0 || L > 1) break
      // Contrast is measured on the quantized hex, never on the OKLCH values:
      // out-of-gamut coordinates get clamped per channel on the way back, which
      // moves the real ratio (spec §1.1d).
      const hex = oklchToHex({ L, C, h: brand.h })
      if (worstContrast(hex, surfaces) >= target) return hex
    }
  }

  // Unreachable: at chroma 0 the lightness ramp includes pure black and pure
  // white, one of which clears any target against any surface. Kept as a total
  // function rather than a throw -- the caller is the root layout.
  return null
}

export function deriveTheme(
  brandHex: string,
  theme: ThemeName
): { light: { link: string; accent: string }; dark: { link: string; accent: string } } | null {
  const surfaces = PRESET_SURFACES[theme]
  if (!surfaces) return null

  const light = {
    link: deriveToken(brandHex, surfaces.light, LINK_MIN_CONTRAST, 'darken'),
    accent: deriveToken(brandHex, surfaces.light, ACCENT_MIN_CONTRAST, 'darken'),
  }
  const dark = {
    link: deriveToken(brandHex, surfaces.dark, LINK_MIN_CONTRAST, 'lighten'),
    accent: deriveToken(brandHex, surfaces.dark, ACCENT_MIN_CONTRAST, 'lighten'),
  }

  if (!light.link || !light.accent || !dark.link || !dark.accent) return null
  return {
    light: { link: light.link, accent: light.accent },
    dark: { link: dark.link, accent: dark.accent },
  }
}

/**
 * The CSS the root layout injects, or null if nothing should be injected.
 *
 * `:root:root:root` is (0,3,0). It has to outrank `:root[data-theme="warm"]`
 * at (0,2,0), and `:root:root` merely ties it -- which would leave the winner
 * to source order between a stylesheet and a Next-injected <style>, the exact
 * dependency this design refuses to take (spec §3.5). A Playwright test asserts
 * the computed value rather than trusting this comment.
 *
 * Only the two chromatic tokens are ever emitted. Neutrals belong to presets.
 */
export function buildBrandStyle(brandHex: string, theme: ThemeName): string | null {
  const derived = deriveTheme(brandHex, theme)
  if (!derived) return null

  return [
    `:root:root:root{--sem-link:${derived.light.link};--sem-accent:${derived.light.accent}}`,
    `@media (prefers-color-scheme: dark){`,
    `:root:root:root{--sem-link:${derived.dark.link};--sem-accent:${derived.dark.accent}}`,
    `}`,
  ].join('')
}

/** Narrows an unvalidated CMS value to a known preset, defaulting safely. */
export function resolveThemeName(value: unknown): ThemeName {
  return typeof value === 'string' && (THEME_NAMES as readonly string[]).includes(value)
    ? (value as ThemeName)
    : 'default'
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/theme.test.ts`
Expected: PASS. The sweep runs 216 brand colours × 2 presets × 2 schemes × 2 tokens × 2 surfaces; it should complete in a few seconds. If any case fails, the failure message names the brand colour, the derived value, the surface and the preset — fix the derivation, never the floor.

- [ ] **Step 5: Type-check and commit**

```bash
npm run type-check
git add lib/theme.ts lib/theme.test.ts
git commit -m "feat: derive accessible link and accent colours from one brand colour"
```

---

## Task 5: Studio fields, plugin, and query

**Files:**
- Modify: `schemas/singletons/settings.ts` (add two fields to the existing `branding` group, after `logoDark`)
- Modify: `sanity.config.ts` (register the plugin)
- Modify: `lib/sanity.queries.ts` (extend `settingsQuery`)
- Modify: `package.json` (dependency)

**Interfaces:**
- Consumes: `ThemeName` from `lib/theme` (Task 4) — only conceptually; the schema hardcodes the list values to avoid importing app code into Studio schemas, matching how the rest of `schemas/` is written.
- Produces: `settings.brandColor` as `{ hex?: string } | null` and `settings.theme` as `string | null` on the settings payload.

- [ ] **Step 1: Install the dependency**

```bash
npm install @sanity/color-input@^6.1.3
```

Expected: installs cleanly. Its peer range is `sanity ^5 || ^6.0.0-0` and `react ^19.2`, satisfied by this repo's `sanity 6.9.1` / `react 19.2.8` — no `--legacy-peer-deps`. If npm reports a peer conflict, stop and report it rather than forcing the install.

- [ ] **Step 2: Register the plugin**

In `sanity.config.ts`, add the import alongside the other plugin imports:

```ts
import { colorInput } from '@sanity/color-input'
```

and add `colorInput()` to the `plugins` array, after `media()`.

- [ ] **Step 3: Add the schema fields**

In `schemas/singletons/settings.ts`, immediately after the `logoDark` field definition, add:

```ts
    defineField({
      name: 'brandColor',
      title: 'Brand colour',
      type: 'color',
      group: 'branding',
      // No alpha: a semi-transparent token has no defined contrast against a
      // surface, which is the one property this whole feature guarantees.
      options: { disableAlpha: true },
      description:
        'Your lab’s main colour, used for links and small accents. The site works out readable shades of it automatically for both light and dark mode, so any colour you pick here stays legible. Leave empty to keep the site’s built-in colours.',
    }),
    defineField({
      name: 'theme',
      title: 'Background tone',
      type: 'string',
      group: 'branding',
      initialValue: 'default',
      options: {
        list: [
          { title: 'Default — cool grey', value: 'default' },
          { title: 'Warm — cream and ink', value: 'warm' },
        ],
        layout: 'radio',
      },
      description:
        'The overall page tone. This changes only the greys — your brand colour is unaffected.',
    }),
```

- [ ] **Step 4: Extend the query**

In `lib/sanity.queries.ts`, inside `settingsQuery`'s projection, add these two lines after `ogImage,`:

```groq
    brandColor{hex},
    theme,
```

Selecting only `hex` is deliberate: `@sanity/color-input` stores a whole object (`hex`, `hsl`, `hsv`, `rgb`, `alpha`), and projecting the object wholesale invites a consumer to read the wrong field.

- [ ] **Step 5: Regenerate types and verify**

```bash
npm run typegen
npm run type-check
npm test
```

Expected: typegen rewrites the generated Sanity types to include the two new fields; type-check and the unit suite both pass. `npm run typegen` requires Sanity credentials — if it fails on auth, note it and continue; the layout in Task 6 reads the fields structurally and does not depend on generated types.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json sanity.config.ts schemas/singletons/settings.ts lib/sanity.queries.ts
git add -A -- '*.ts' # picks up regenerated typegen output if it changed
git commit -m "feat: add brandColor and theme settings, wired through the settings query"
```

---

## Task 6: Wire the layout

**Files:**
- Modify: `app/layout.tsx:117-147`
- Test: `lib/layout-branding.test.ts` (new — the pure selection logic the layout calls)

**Interfaces:**
- Consumes: `buildBrandStyle`, `resolveThemeName` from `lib/theme` (Task 4); `brandColor{hex}` and `theme` from the settings payload (Task 5).
- Produces: `<html data-theme>` and an injected `<style>` element; nothing later depends on it.

- [ ] **Step 1: Write the failing test**

Create `lib/layout-branding.test.ts`:

```ts
import { resolveBrandStyle } from 'lib/layout-branding'
import { describe, expect, it } from 'vitest'

describe('resolveBrandStyle', () => {
  it('injects nothing when brandColor is unset, so the CSS defaults stand', () => {
    expect(resolveBrandStyle({})).toEqual({ dataTheme: undefined, style: null })
    expect(resolveBrandStyle({ brandColor: null })).toEqual({ dataTheme: undefined, style: null })
    expect(resolveBrandStyle({ brandColor: { hex: '   ' } })).toEqual({
      dataTheme: undefined,
      style: null,
    })
  })

  it('omits data-theme for the default preset, which is the base :root', () => {
    const { dataTheme } = resolveBrandStyle({ theme: 'default' })
    expect(dataTheme).toBeUndefined()
  })

  it('emits data-theme for a non-default preset', () => {
    expect(resolveBrandStyle({ theme: 'warm' }).dataTheme).toBe('warm')
  })

  it('falls back to the default preset for an unknown theme value', () => {
    expect(resolveBrandStyle({ theme: 'chartreuse' }).dataTheme).toBeUndefined()
  })

  it('derives against the selected preset, not always against default', () => {
    const warm = resolveBrandStyle({ brandColor: { hex: '#ff7a00' }, theme: 'warm' })
    const base = resolveBrandStyle({ brandColor: { hex: '#ff7a00' }, theme: 'default' })
    expect(warm.style).not.toBeNull()
    expect(base.style).not.toBeNull()
    expect(warm.style).not.toBe(base.style)
  })

  it('injects nothing for a malformed brand colour rather than throwing', () => {
    expect(() => resolveBrandStyle({ brandColor: { hex: 'nope' } })).not.toThrow()
    expect(resolveBrandStyle({ brandColor: { hex: 'nope' } }).style).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- lib/layout-branding.test.ts`
Expected: FAIL — `Failed to resolve import "lib/layout-branding"`.

- [ ] **Step 3: Write the implementation**

Create `lib/layout-branding.ts`:

```ts
/**
 * The branding decisions the root layout makes, extracted so they are testable
 * without rendering. The layout itself stays a thin wiring shim -- this repo
 * has no React render-testing stack, so anything left inline in a component is
 * effectively untested.
 */

import { buildBrandStyle, resolveThemeName } from 'lib/theme'

/** The subset of the settings payload this reads, declared structurally. */
export interface BrandStyleSource {
  brandColor?: { hex?: string | null } | null
  theme?: string | null
}

export interface ResolvedBrandStyle {
  /** Value for `<html data-theme>`, or undefined to omit the attribute. */
  dataTheme: string | undefined
  /** CSS to inject, or null to inject nothing at all. */
  style: string | null
}

export function resolveBrandStyle(
  settings: BrandStyleSource | null | undefined
): ResolvedBrandStyle {
  const theme = resolveThemeName(settings?.theme)

  // The base :root IS the default preset, so the attribute is only meaningful
  // when it is something else. Omitting it keeps the rendered HTML unchanged
  // for every site that never touches this setting.
  const dataTheme = theme === 'default' ? undefined : theme

  const hex = settings?.brandColor?.hex?.trim()
  if (!hex) return { dataTheme, style: null }

  return { dataTheme, style: buildBrandStyle(hex, theme) }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- lib/layout-branding.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire it into the layout**

In `app/layout.tsx`, add the import:

```ts
import { resolveBrandStyle } from 'lib/layout-branding'
```

In `RootLayout`, after the existing `const { siteName } = resolveBranding(await getSettings())`, add:

```tsx
  const { dataTheme, style: brandStyle } = resolveBrandStyle(await getSettings())
```

Change the `<html>` element to carry the attribute and the style block:

```tsx
    <html
      lang="en"
      data-theme={dataTheme}
      className={`${mono.variable} ${antarcticanMono.variable} ${serif.variable} ${arianaPro.variable}`}
    >
      {brandStyle ? (
        <style
          // The value is built entirely from hex strings this codebase
          // generated -- buildBrandStyle emits nothing but `#rrggbb` into a
          // fixed template, and lib/theme.test.ts asserts it contains no
          // angle brackets. No CMS text reaches this string.
          dangerouslySetInnerHTML={{ __html: brandStyle }}
        />
      ) : null}
      <body className="bg-surface text-text">
```

`getSettings` is already `cache()`d, so this adds no extra fetch.

- [ ] **Step 6: Verify the whole suite and a real build**

```bash
npm test
npm run type-check
npm run build
```

Expected: all pass. `data-theme` will be absent and no `<style>` injected against the live dataset, since `brandColor` and `theme` are unset — that is the correct day-one behaviour.

- [ ] **Step 7: Commit**

```bash
git add app/layout.tsx lib/layout-branding.ts lib/layout-branding.test.ts
git commit -m "feat: apply the CMS brand colour and neutral preset in the root layout"
```

---

## Task 7: Prove the cascade in a real browser

**Files:**
- Create: `e2e/brand-colour.spec.ts`

**Interfaces:**
- Consumes: `buildBrandStyle` from `lib/theme` (Task 4); the `warm` preset selector from `styles/index.css` (Task 3).
- Produces: nothing.

**Why the test injects rather than configures.** The specificity question — does a Next-injected `<style>` beat `:root[data-theme='warm']` in `index.css`? — is a browser cascade question, not a data question. Injecting the exact string `buildBrandStyle` produces into a page that has already loaded `index.css` tests precisely that, and does not require `brandColor` to be set in the shared production dataset.

- [ ] **Step 1: Write the failing test**

Create `e2e/brand-colour.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { buildBrandStyle } from 'lib/theme'

/** Parses `rgb(r, g, b)` into a lowercase `#rrggbb`. */
function toHex(value: string): string {
  const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!m) throw new Error(`unparseable colour: ${value}`)
  return `#${[1, 2, 3].map((i) => Number(m[i]).toString(16).padStart(2, '0')).join('')}`
}

const readToken = (name: string) =>
  `getComputedStyle(document.documentElement).getPropertyValue(${JSON.stringify(name)}).trim()`

for (const scheme of ['light', 'dark'] as const) {
  test.describe(`injected brand colour, ${scheme} scheme`, () => {
    test.use({ colorScheme: scheme })

    test('outranks the base :root', async ({ page }) => {
      await page.goto('/')
      const before = await page.evaluate(readToken('--sem-accent'))
      expect(before).not.toBe('')

      const css = buildBrandStyle('#ff7a00', 'default')!
      await page.addStyleTag({ content: css })

      const after = await page.evaluate(readToken('--sem-accent'))
      expect(after).not.toBe(before)
    })

    test('outranks a preset block, which is the specificity this design depends on', async ({
      page,
    }) => {
      await page.goto('/')
      // Apply the preset the way the layout would.
      await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'warm'))
      const presetSurface = await page.evaluate(readToken('--sem-surface'))

      const css = buildBrandStyle('#ff7a00', 'warm')!
      await page.addStyleTag({ content: css })

      const accent = await page.evaluate(readToken('--sem-accent'))
      // The injected chromatic token won...
      expect(accent).not.toBe('')
      expect(toHex(await page.evaluate(`getComputedStyle(document.body).color`))).toBeTruthy()
      // ...and the preset's neutrals are untouched by it.
      expect(await page.evaluate(readToken('--sem-surface'))).toBe(presetSurface)
    })
  })
}

test.describe('warm preset', () => {
  test('changes the page surface when data-theme is set', async ({ page }) => {
    await page.goto('/')
    const before = await page.evaluate(readToken('--sem-surface'))
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'warm'))
    const after = await page.evaluate(readToken('--sem-surface'))
    expect(after).not.toBe(before)
  })
})
```

- [ ] **Step 2: Run it**

Run: `npm run test:e2e -- brand-colour.spec.ts`

Unlike the earlier tasks there is no red step here, and pretending otherwise would be dishonest: everything this spec exercises was built in Tasks 3, 4 and 6, so a correct implementation passes on the first run. The test's job is to *falsify* the specificity claim, not to drive new code.

Expected: PASS, five tests.

Two failures are meaningful rather than mechanical:
- **`outranks a preset block` fails** — `:root:root:root` is not actually beating `:root[data-theme='warm']`. Raise the specificity in `buildBrandStyle` and re-run. **Do not** fix it by reordering stylesheets or by moving the `<style>` element; source-order dependence is the exact failure this design refuses to take (spec §3.5).
- **`Cannot find module 'lib/theme'`** — Playwright compiles specs with its own TypeScript pass. It should honour the `tsconfig.json` paths this repo already defines; if it does not, change that one import to `from '../lib/theme'`. That is the only acceptable relative import in the repo, and only after the aliased form has been tried.

- [ ] **Step 3: Run the whole e2e suite for regressions**

Run: `npm run test:e2e`
Expected: PASS. `e2e/theme.spec.ts` in particular must be unaffected — nothing in this phase changes the default rendering.

- [ ] **Step 4: Commit**

```bash
git add e2e/brand-colour.spec.ts
git commit -m "test: assert the injected brand colour outranks the preset blocks"
```

---

## Task 8: Let prose links carry the brand colour

**Files:**
- Modify: `components/shared/CustomPortableText.tsx:95` and `:109`

**Interfaces:**
- Consumes: `--sem-link`, already guaranteed ≥4.5:1 by Task 4.
- Produces: nothing.

**Why.** `--sem-link`'s only at-rest consumer today is the Publications year jump-nav; prose links are `underline` and inherit `--sem-text`. Without this, setting `brandColor` changes one nav strip and some borders, and the lab will reasonably conclude the feature is broken (spec §1.1g, §3.6). The underline stays, so colour is never the sole signal.

- [ ] **Step 1: Make the change**

At `components/shared/CustomPortableText.tsx:95`:

```tsx
            className="text-link underline transition hover:opacity-50"
```

At `components/shared/CustomPortableText.tsx:109`:

```tsx
          <Link href={href} className="text-link underline transition hover:opacity-50">
```

- [ ] **Step 2: Verify against a real build**

```bash
npm run build
npm test
npm run test:e2e
```

Expected: all pass. The `axe` suite is the one to watch — it checks colour contrast on rendered pages, and `--sem-link` at its default `#4043e7` clears 4.5:1 on both light surfaces, so it should be unaffected.

- [ ] **Step 3: Commit**

```bash
git add components/shared/CustomPortableText.tsx
git commit -m "fix: colour prose links with --sem-link so the brand colour is visible in body text"
```

---

## Task 9: Document the colour system for handover

**Files:**
- Modify: `docs/branding.md` (append a Colour section)

**Interfaces:**
- Consumes: everything above.
- Produces: nothing.

- [ ] **Step 1: Append the section**

Add to the end of `docs/branding.md`:

```markdown
## Colour

Two settings in Studio → Settings → Branding control colour.

**Brand colour** is one colour. The site derives two design tokens from it:
`--sem-link` (links, which must clear 4.5:1 against the page) and `--sem-accent`
(borders and edges, 3:1). Each is your colour, darkened in light mode or
lightened in dark mode **only as far as its contrast requirement demands** — so
a colour that is already readable is used exactly as you picked it, and one that
is not is nudged until it is. There is no colour you can enter that produces an
unreadable page: at the limit the derivation drains saturation until black or
white satisfies the requirement.

Because the two tokens have different requirements, they sometimes come out as
the same colour (when your brand colour satisfies both) and sometimes as two
shades (when it satisfies only the weaker one). Both are correct.

Leaving Brand colour empty keeps the site's built-in blue and green.

**Background tone** picks the greys — `default` (cool) or `warm` (cream and
ink). It never affects your brand colour. Both tones are checked against the
same contrast rules in `styles/tokens.test.ts`.

### Adding another background tone

1. Add `:root[data-theme='<name>']` and a matching
   `@media (prefers-color-scheme: dark)` block to `styles/index.css`. Declare all
   nine neutral tokens in **both** — a token left out of the dark block keeps its
   light value, because the preset selector outranks the base dark override.
2. Add `<name>` to `THEME_NAMES` and its two surface pairs to `PRESET_SURFACES`
   in `lib/theme.ts`.
3. Add it to the `theme` field's option list in `schemas/singletons/settings.ts`.
4. Add it to `THEMES` in `styles/tokens.test.ts`.

`npm test` then checks the new tone against every contrast rule automatically,
in both colour schemes, and fails if the CSS and `PRESET_SURFACES` disagree.
Never relax a contrast floor to make a palette pass.
```

- [ ] **Step 2: Commit**

```bash
git add docs/branding.md
git commit -m "docs: how the brand colour derives and how to add a background tone"
```

---

## Final verification

- [ ] `npm test` — all unit suites pass
- [ ] `npm run type-check` — clean
- [ ] `npm run lint` — clean
- [ ] `npm run build` — succeeds
- [ ] `npm run test:e2e` — all specs pass
- [ ] Manual: in Studio, set Brand colour to something loud and Background tone to Warm, then reload the site in both OS colour schemes and confirm links and accents change while text stays readable
- [ ] Manual: clear Brand colour and confirm the site returns to `#4043e7` / `#2d6a4f` exactly
