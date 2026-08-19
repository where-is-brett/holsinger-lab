import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const css = readFileSync('styles/index.css', 'utf8')

describe('--nav-height token', () => {
  it('defines a mobile default of 3rem', () => {
    // Modern Instrument direction (Task 3): was 4rem.
    expect(css).toMatch(/--nav-height:\s*3rem/)
  })

  it('redefines to 3.25rem at the md breakpoint', () => {
    // 48rem is Tailwind 4's default `md`. If these diverge, the sticky
    // Publications bar and the desktop nav stop agreeing about where the nav
    // ends, which is exactly defect D8. Modern Instrument direction: was
    // 4.75rem.
    expect(css).toMatch(
      /@media \(min-width:\s*48rem\)\s*\{[^@]*--nav-height:\s*3\.25rem/
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
    expect(css).toMatch(
      /@media \(prefers-color-scheme: dark\)\s*\{[^@]*\.logo-dark\s*\{[^}]*display:\s*block/
    )
  })

  it('uses colour-scheme CSS rather than Tailwind dark: variants', () => {
    // Phase 3A implemented dark mode entirely through tokens and
    // prefers-color-scheme; this repo has no `dark:` variants by design.
    expect(css).not.toMatch(/\bdark:logo/)
  })
})
