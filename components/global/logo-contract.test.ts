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

  it('gives both dark-mode-pair <img>s the identical accessible name, with no manual aria-hidden', () => {
    // Mode 2 renders two <img>s, one per colour scheme, CSS-switched by
    // styles/index.css §3.4 (`.logo-light`/`.logo-dark`, `display: none` /
    // `display: block` flipped under `prefers-color-scheme: dark`). Because
    // exactly one of the pair is ever `display: block` at a time, exactly one
    // is ever in the accessibility tree at a time -- in every browser and
    // under Playwright's role-based locators -- with no manual
    // accessibility-tree bookkeeping required. Both must carry the SAME alt
    // text so neither
    // colour scheme is left with zero elements named "logo" (the bug this
    // guards: an asymmetric alt="logo"/alt="" pairing hides the accessible
    // name entirely in dark mode, since the light image -- the one carrying
    // the name -- is the one CSS hides there).
    const source = logo()
    const imgTags = source.match(/<img\b[^>]*\/?>/g) ?? []
    const pairTags = imgTags.filter(
      (tag) => tag.includes('logo-light') || tag.includes('logo-dark')
    )
    expect(pairTags).toHaveLength(2)
    for (const tag of pairTags) {
      expect(tag).toMatch(/alt="logo"/)
      expect(tag).not.toMatch(/aria-hidden/)
    }
    expect(source).not.toMatch(/aria-hidden/)
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

  it('never reuses an image-mode resolveLogo() result to render the wordmark', () => {
    // If `resolveLogo` resolves `mode: 'image'` (an aspect ratio is present)
    // but `urlForImage` can't produce a URL for either `logo` or `logoDark`
    // -- a malformed asset reference, e.g. `metadata.dimensions.aspectRatio`
    // present but `asset._ref` missing -- execution falls through to the
    // wordmark JSX. `resolved` at that point is image-shaped (`{width,
    // height}`, no `text`). An `as Extract<typeof resolved, {mode:
    // 'wordmark'}>` cast there would hide that mismatch from `tsc` and
    // silently render an empty wordmark (`text` becomes `undefined`) instead
    // of a real one. The fix recomputes a genuine wordmark via
    // `resolveLogo({ aspectRatio: null, shortName })` at the fallthrough
    // point rather than casting the image-shaped value, so this guards
    // against the unsound cast coming back.
    expect(logo()).not.toMatch(/as Extract/)
    // The recompute this guards for.
    expect(logo()).toMatch(/resolveLogo\(\{\s*aspectRatio:\s*null,\s*shortName\s*\}\)/)
  })
})

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
