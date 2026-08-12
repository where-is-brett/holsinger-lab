import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const css = readFileSync('styles/index.css', 'utf8')

describe('dark-mode media dimming', () => {
  it('defines a .media-frame filter only inside a dark-scheme media query', () => {
    expect(css, '.media-frame rule must exist').toContain('.media-frame')

    // Asserts containment, not merely "appears later in the file": the
    // rule must open inside a dark-scheme block, with no intervening
    // at-rule between the block's `{` and the selector.
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
