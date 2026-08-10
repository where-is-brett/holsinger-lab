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

/** Parses `--sem-*: #rrggbb;` declarations out of a named block of styles/index.css. */
function readTokens(blockSelector: string): Record<string, string> {
  const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8')
  const start = css.indexOf(blockSelector)
  if (start === -1) throw new Error(`block not found: ${blockSelector}`)
  const block = css.slice(start, css.indexOf('}', start))
  return Object.fromEntries(
    [...block.matchAll(/(--sem-[\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]])
  )
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
