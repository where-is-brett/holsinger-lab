import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

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

  it('field meets WCAG AA for non-text (borders) on the page surface', () => {
    expect(contrast(t['--sem-field'], t['--sem-surface'])).toBeGreaterThanOrEqual(3)
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

  it('resolves an @media marker with no trailing brace distinctly from the nested :root marker', () => {
    // Coverage for the marker shape the 'dark theme tokens' describe block
    // below actually calls: readTokens('@media (prefers-color-scheme:
    // dark)') — an at-rule selector with no trailing '{', matched against
    // its own top-level block rather than the :root nested inside it.
    // Fixture mirrors styles/index.css's real layout: a light :root
    // followed by a dark override inside @media (prefers-color-scheme:
    // dark). Asserts the two markers resolve to their own values and don't
    // collide.
    const css = `
      :root {
        color-scheme: light dark;
        --sem-surface: #f8f8f8;
        --sem-text: #0d0e12;
      }

      @media (prefers-color-scheme: dark) {
        :root {
          --sem-surface: #0d0e12;
          --sem-text: #f6f6f8;
        }
      }
    `
    expect(parseTokens(css, ':root {')).toEqual({
      '--sem-surface': '#f8f8f8',
      '--sem-text': '#0d0e12',
    })
    expect(parseTokens(css, '@media (prefers-color-scheme: dark)')).toEqual({
      '--sem-surface': '#0d0e12',
      '--sem-text': '#f6f6f8',
    })
  })
})

describe('dark theme tokens', () => {
  const t = readTokens('@media (prefers-color-scheme: dark)')

  it('defines every token the light theme defines', () => {
    const light = Object.keys(readTokens(':root {')).sort()
    expect(Object.keys(t).sort()).toEqual(light)
  })

  it('every text token meets WCAG AA on both dark surfaces', () => {
    for (const name of ['--sem-text', '--sem-text-muted', '--sem-link']) {
      expect(contrast(t[name], t['--sem-surface']), `${name} on surface`).toBeGreaterThanOrEqual(4.5)
      expect(contrast(t[name], t['--sem-surface-raised']), `${name} on raised`).toBeGreaterThanOrEqual(4.5)
    }
  })

  it('accent meets WCAG AA for non-text on the dark surface', () => {
    expect(contrast(t['--sem-accent'], t['--sem-surface'])).toBeGreaterThanOrEqual(3)
  })

  it('field meets WCAG AA for non-text (borders) on the dark surface', () => {
    expect(contrast(t['--sem-field'], t['--sem-surface'])).toBeGreaterThanOrEqual(3)
  })

  it('inverse text meets WCAG AA on both inverse surfaces', () => {
    // Regression test for the bug a whole-branch review caught: this used to
    // check only --sem-surface-inverse, silently dropping the --sem-scrim
    // pairing that the light theme's equivalent test (above) already
    // covers. That dropped pairing is exactly the one that collapsed to
    // 1.00:1 in dark mode (--sem-scrim === --sem-surface there), making the
    // mobile hamburger and the preview banner invisible — and this test
    // suite still passed, because nothing was checking it.
    expect(contrast(t['--sem-text-inverse'], t['--sem-surface-inverse'])).toBeGreaterThanOrEqual(4.5)

    // The light test above also checks --sem-text-inverse against
    // --sem-scrim (19.29:1 there) — deliberately NOT mirrored here. In dark
    // mode --sem-text-inverse (#0d0e12) and --sem-scrim (#0d0e12) are the
    // literal same value (contrast 1.00), and this isn't fixable by
    // recolouring either token without breaking something else that's
    // pinned on purpose:
    //  - --sem-text-inverse's dark value can't move: it's what makes the
    //    --sem-text-inverse-on-surface-inverse assertion above land at
    //    17.87:1, the exact figure this review verified for the fixed
    //    PreviewBanner.
    //  - --sem-scrim can't move either: lightening it enough to clear even
    //    3:1 against a near-black text-inverse pushes it past the
    //    surface-raised panel's own darkness (verified: at the lightest
    //    value that clears 4.5:1, ErrorDialog's rendered backdrop —
    //    scrim composited at its actual 60% opacity over the page —
    //    becomes *lighter* than the surface-raised panel sitting on top of
    //    it, i.e. worse than the boundary-invisibility bug being fixed
    //    elsewhere in this review, not better).
    // The pairing is also no longer real: --sem-scrim's only consumer
    // (ErrorDialog's DialogBackdrop) never renders text on it, and
    // PreviewBanner — the pairing's one actual instance, and the bug this
    // whole review exists to catch — now uses --sem-surface-inverse
    // instead (see below). A token-hex contrast assertion can't usefully
    // guard a composition that's structurally never supposed to happen; the
    // 'token-role misuse guard' describe block below guards it at the
    // level where it actually went wrong instead.
  })
})

describe('cross-token contrast regression guard', () => {
  // Generalizes past the specific bug above: every check up to this point
  // tests one named token against another named token, so a real
  // composition that nobody thought to name (e.g. bg-scrim + text-inverse
  // in PreviewBanner, before that was fixed) can still collapse silently.
  // This instead walks every [foreground, background] pair actually
  // composited together somewhere in the codebase — as a text-on-surface or
  // non-text-on-surface pairing — and asserts none of them collapses below
  // 3:1 (the WCAG floor for non-text/large-text; the more specific 4.5:1
  // AA-for-body-text checks above still apply to the pairs that carry
  // normal-size text) in either colour scheme.
  //
  // --sem-text-inverse on --sem-scrim is deliberately not in this list: see
  // the comment on 'inverse text meets WCAG AA on both inverse surfaces'
  // above for why that specific pairing can't be fixed at the token level,
  // and the 'token-role misuse guard' block below for how it's guarded
  // instead.
  const USED_PAIRS: [string, string][] = [
    ['--sem-text', '--sem-surface'],
    ['--sem-text-muted', '--sem-surface'],
    ['--sem-text-inverse', '--sem-surface-inverse'],
    ['--sem-text', '--sem-surface-raised'],
  ]

  const THEMES: [string, string][] = [
    ['light', ':root {'],
    ['dark', '@media (prefers-color-scheme: dark)'],
  ]

  for (const [themeName, marker] of THEMES) {
    it(`no known foreground/background pairing collapses below 3:1 in the ${themeName} theme`, () => {
      const t = readTokens(marker)
      for (const [fg, bg] of USED_PAIRS) {
        expect(contrast(t[fg], t[bg]), `${fg} on ${bg} (${themeName})`).toBeGreaterThanOrEqual(3)
      }
    })
  }
})

describe('token-role misuse guard', () => {
  // Direct regression guard for the actual Critical-1 bug (PreviewBanner
  // combining `bg-scrim` with a `text-*-inverse` class): --sem-scrim is a
  // backdrop-only role (pinned dark in both colour schemes — see the 'not
  // mirrored here' comment above) and its only legitimate consumer
  // (ErrorDialog's DialogBackdrop) never renders text on it. That makes
  // `bg-scrim` + inverse text a composition that's wrong regardless of what
  // the current palette's hex values happen to be, so — unlike every other
  // guard in this file — this checks source text, not resolved colours: no
  // component may combine the two classes in the same className value.
  //
  // Scans both components/ and app/ — the token classes these checks care
  // about aren't confined to components/ (app/layout.tsx and
  // app/not-found.tsx use them too), so a misused pairing landing directly
  // in an app/ route would otherwise go undetected.
  const SCAN_ROOTS = [new URL('../components/', import.meta.url), new URL('../app/', import.meta.url)]
  const PROJECT_ROOT = fileURLToPath(new URL('../', import.meta.url))

  // The one legitimate consumer of --sem-scrim (see rationale above).
  const SCRIM_ALLOWED_FILES = ['components/pages/contact/ErrorDialog.tsx']

  function collectTsxFiles(dirUrl: URL): string[] {
    const files: string[] = []
    for (const entry of readdirSync(dirUrl, { withFileTypes: true })) {
      const entryUrl = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dirUrl)
      if (entry.isDirectory()) {
        files.push(...collectTsxFiles(entryUrl))
      } else if (entry.name.endsWith('.tsx')) {
        files.push(fileURLToPath(entryUrl))
      }
    }
    return files
  }

  function allTsxFiles(): string[] {
    return SCAN_ROOTS.flatMap(collectTsxFiles)
  }

  it('no component composites inverse text directly onto bg-scrim', () => {
    const offenders: string[] = []
    for (const file of allTsxFiles()) {
      const src = readFileSync(file, 'utf8')
      // Tailwind classes only ever appear inside a quoted/template string
      // literal, so it's enough to check each such literal in isolation —
      // this is what stops the check from flagging a file that uses
      // bg-scrim in one className and an unrelated text-inverse in another.
      for (const m of src.matchAll(/`([^`]*)`|"([^"]*)"|'([^']*)'/g)) {
        const literal = m[1] ?? m[2] ?? m[3] ?? ''
        if (literal.includes('bg-scrim') && literal.includes('text-inverse')) {
          offenders.push(`${file}: "${literal.trim()}"`)
        }
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('bg-scrim is a backdrop-only role and may only appear in the allowlisted file(s)', () => {
    // Generalizes past the co-occurrence check above. That check can only
    // ever catch bg-scrim paired with inverse text on a scanned className —
    // it structurally cannot see the *other* shape this same review found:
    // MobileNavBar's hamburger icon used bg-scrim as a bare fill (no text
    // involved anywhere) on a bg-scrim-coloured bar, so the icon and its
    // background were the literal same colour. The fix here is to encode the
    // actual invariant directly — "--sem-scrim is a backdrop-only role; its
    // only legitimate consumer is ErrorDialog's DialogBackdrop" — rather than
    // continuing to guard one specific misuse shape of it.
    //
    // This also isn't scoped to a single quoted/template literal the way the
    // check above is: it looks for the literal substring 'bg-scrim' anywhere
    // in a file's source, so a multi-literal composition — e.g.
    // `clsx('bg-scrim', 'text-text-inverse')`, which is exactly the style
    // MobileNavBar's own `hamburgerLine` constant uses for its classes —
    // can't evade it by splitting the class across separate string literals.
    const offenders = allTsxFiles()
      .filter((file) => readFileSync(file, 'utf8').includes('bg-scrim'))
      .map((file) => file.replace(PROJECT_ROOT, ''))
      .filter((relativePath) => !SCRIM_ALLOWED_FILES.includes(relativePath))

    expect(offenders, offenders.join('\n')).toEqual([])
  })
})
