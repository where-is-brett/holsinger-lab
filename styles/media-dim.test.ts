import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const css = readFileSync('styles/index.css', 'utf8')

describe('dark-mode media dimming', () => {
  it('defines a .media-frame filter only inside a dark-scheme media query', () => {
    expect(css, '.media-frame rule must exist').toContain('.media-frame')

    // Checks that a `.media-frame` rule opens somewhere after a
    // `@media (prefers-color-scheme: dark) {`, with no intervening at-rule
    // between that block's `{` and the selector. Note this regex alone does
    // NOT prove brace-balanced containment: `[^@]*` only refuses to cross an
    // `@` character, so it would also match a `.media-frame` rule sitting at
    // the top level after the dark block has already closed, as long as no
    // other at-rule appears in between. It's the `topLevel` assertion below
    // -- which strips real @media blocks by brace-matching -- that actually
    // rules out a top-level definition. The two assertions only work
    // together.
    expect(css).toMatch(
      /@media \(prefers-color-scheme: dark\)\s*\{[^@]*\.media-frame\s*\{[^}]*brightness\(/
    )

    // And it must not also be defined at the top level, which would apply
    // the dim in light mode too.
    const topLevel = css.replace(/@media[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g, '')
    expect(
      topLevel,
      '.media-frame must not be defined outside dark mode'
    ).not.toContain('.media-frame')
  })

  it('dims rather than inverts or blends', () => {
    // invert()/mix-blend-mode were both tested against the live site and
    // destroy photographic content: multiply over #0d0e12 crushes the
    // image to a silhouette, invert() renders a photo negative.
    expect(css).toMatch(/\.media-frame[^}]*filter:[^;]*brightness\(/)
    expect(css).not.toMatch(/\.media-frame[^}]*mix-blend-mode/)
    expect(css).not.toMatch(/\.media-frame[^}]*invert\(/)
  })
})
