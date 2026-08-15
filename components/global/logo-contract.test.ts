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
