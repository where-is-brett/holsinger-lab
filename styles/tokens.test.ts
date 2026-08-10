import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

/** Relative luminance per WCAG 2.1. */
function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

interface CssBlock {
  /** The selector/at-rule text immediately preceding this block's `{`, trimmed. */
  selector: string
  /** Raw text between this block's matching `{` and `}`. */
  body: string
  /** Nesting depth: 0 for a block whose `{` sits outside every other block. */
  depth: number
}

/**
 * Splits a CSS source into every `{ ... }` block using real brace-depth
 * counting, so each block's extent is exact no matter what other braces
 * (nested rules, `@media` wrappers, etc.) appear before or inside it. This
 * is what `String.indexOf('}')` cannot do: it always grabs the *next*
 * closing brace, which is wrong as soon as anything nests.
 */
function parseCssBlocks(css: string): CssBlock[] {
  const blocks: CssBlock[] = []
  const stack: { selector: string; bodyStart: number; depth: number }[] = []
  let depth = 0
  let selectorStart = 0

  for (let i = 0; i < css.length; i++) {
    const ch = css[i]
    if (ch === '{') {
      stack.push({ selector: css.slice(selectorStart, i).trim(), bodyStart: i + 1, depth })
      depth++
      selectorStart = i + 1
    } else if (ch === '}') {
      const frame = stack.pop()
      if (!frame) throw new Error(`readTokens: unbalanced '}' while parsing CSS at index ${i}`)
      depth--
      blocks.push({ selector: frame.selector, body: css.slice(frame.bodyStart, i), depth: frame.depth })
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
 * Resolves `marker` (e.g. `:root {`) to the single top-level block that
 * actually declares semantic tokens, then returns those tokens.
 *
 * Matching on "top-level selector AND declares --sem-* tokens" — rather
 * than "first block whose selector text appears in the file" — is what
 * keeps this from being fooled by:
 *  - a same-selector block nested inside `@media` (e.g. a dark-mode
 *    `:root` override): excluded by the depth === 0 check, regardless of
 *    source order
 *  - an unrelated same-selector block that carries no semantic tokens
 *    (e.g. `:root { --font-sans: ... }`): excluded by the --sem-* check
 *  - any rule appearing before the target block inside the same wrapper:
 *    irrelevant, because extents come from brace-depth counting, not
 *    `indexOf('}')`
 * Any marker that resolves to zero or more than one such block throws,
 * naming the reason, instead of silently returning an empty or wrong map.
 */
function parseTokens(css: string, marker: string): Record<string, string> {
  const selector = marker.replace(/\{\s*$/, '').trim()
  if (!selector) throw new Error('readTokens: marker must name a selector (got an empty string)')

  const topLevelMatches = parseCssBlocks(css).filter((b) => b.depth === 0 && b.selector === selector)
  if (topLevelMatches.length === 0) {
    throw new Error(`readTokens: no top-level block matching "${selector}" was found`)
  }

  const withTokens = topLevelMatches
    .map((block) => parseSemTokens(block.body))
    .filter((tokens) => Object.keys(tokens).length > 0)

  if (withTokens.length === 0) {
    throw new Error(
      `readTokens: found ${topLevelMatches.length} top-level block(s) matching "${selector}", but none declare any --sem-* tokens`
    )
  }
  if (withTokens.length > 1) {
    throw new Error(
      `readTokens: "${selector}" is ambiguous — ${withTokens.length} top-level blocks declare --sem-* tokens`
    )
  }

  return withTokens[0]
}

/** Parses `--sem-*: #rrggbb;` declarations out of a named block of styles/index.css. */
function readTokens(marker: string): Record<string, string> {
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8')
  return parseTokens(css, marker)
}

describe('light theme tokens', () => {
  const t = readTokens(':root {')

  it('every text token meets WCAG AA on the page surface', () => {
    for (const name of ['--sem-text', '--sem-text-muted']) {
      expect(contrast(t[name], t['--sem-surface']), `${name} on --sem-surface`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('link colour meets WCAG AA on the page surface', () => {
    expect(contrast(t['--sem-link'], t['--sem-surface'])).toBeGreaterThanOrEqual(4.5)
  })

  it('accent meets WCAG AA for non-text (borders) on the page surface', () => {
    expect(contrast(t['--sem-accent'], t['--sem-surface'])).toBeGreaterThanOrEqual(3)
  })

  it('inverse text meets WCAG AA on both inverse surfaces', () => {
    expect(contrast(t['--sem-text-inverse'], t['--sem-surface-inverse'])).toBeGreaterThanOrEqual(4.5)
    expect(contrast(t['--sem-text-inverse'], t['--sem-scrim'])).toBeGreaterThanOrEqual(4.5)
  })

  it('has dropped the consolidated tokens', () => {
    expect(t['--sem-text-strong']).toBeUndefined()
    expect(t['--sem-text-body']).toBeUndefined()
    expect(t['--sem-text-subtle']).toBeUndefined()
  })
})

describe('readTokens helper', () => {
  it('resolves the top-level :root even when a same-selector @media block precedes it in the file', () => {
    // Regression fixture for failure mode 1: if the dark block is ever
    // moved above the light block, a naive indexOf(':root {') would find
    // the *nested* :root first and silently hand back dark values labelled
    // as light.
    const css = `
      @media (prefers-color-scheme: dark) {
        :root {
          --sem-surface: #000000;
          --sem-text: #ffffff;
        }
      }
      :root {
        --sem-surface: #ffffff;
        --sem-text: #000000;
      }
    `
    expect(parseTokens(css, ':root {')).toEqual({
      '--sem-surface': '#ffffff',
      '--sem-text': '#000000',
    })
  })

  it('is not confused by a rule preceding :root inside the @media block', () => {
    // Regression fixture for failure mode 2: indexOf('}') would grab the
    // closing brace of an earlier rule (here ::selection) inside the same
    // @media wrapper and return an empty map instead of the real tokens.
    const css = `
      :root {
        --sem-surface: #ffffff;
        --sem-text: #000000;
      }
      @media (prefers-color-scheme: dark) {
        ::selection {
          background: red;
        }
        :root {
          --sem-surface: #000000;
          --sem-text: #ffffff;
        }
      }
    `
    expect(parseTokens(css, ':root {')).toEqual({
      '--sem-surface': '#ffffff',
      '--sem-text': '#000000',
    })
  })

  it('ignores an unrelated top-level :root block that declares no --sem-* tokens', () => {
    // Regression fixture for failure mode 3: styles/index.css also has a
    // `:root { --font-sans: ... }` block. Correctness must not depend on
    // the semantic-token :root happening to appear first.
    const css = `
      :root {
        --font-sans: sans-serif;
      }
      :root {
        --sem-surface: #ffffff;
      }
    `
    expect(parseTokens(css, ':root {')).toEqual({ '--sem-surface': '#ffffff' })
  })

  it('throws when the marker matches nothing', () => {
    const css = `.foo { color: red; }`
    expect(() => parseTokens(css, ':root {')).toThrow(/no top-level block matching ":root"/)
  })

  it('throws instead of returning an empty map when the only matching block has no --sem-* tokens', () => {
    const css = `:root { --font-sans: sans-serif; }`
    expect(() => parseTokens(css, ':root {')).toThrow(/none declare any --sem-\* tokens/)
  })

  it('throws when two top-level blocks both declare --sem-* tokens for the same marker', () => {
    const css = `
      :root {
        --sem-surface: #ffffff;
      }
      :root {
        --sem-surface: #000000;
      }
    `
    expect(() => parseTokens(css, ':root {')).toThrow(/is ambiguous/)
  })

  it('does not match a :root nested inside @media when no top-level :root exists at all', () => {
    const css = `
      @media (prefers-color-scheme: dark) {
        :root {
          --sem-surface: #000000;
        }
      }
    `
    expect(() => parseTokens(css, ':root {')).toThrow(/no top-level block matching ":root"/)
  })
})
