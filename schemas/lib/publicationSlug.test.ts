import { describe, expect, it } from 'vitest'

import { publicationSlug, yearFromDate } from './publicationSlug'

// The two real titles below are the ones vendored as fixtures in the Phase 1
// plan (SAMPLE_PUBLICATIONS), captured from the live dataset.
const CBX7 =
  'Chromobox protein homolog 7 suppresses the stem-like phenotype of glioblastoma cells by regulating the myosin heavy chain 9-NF-κB signaling pathway.'
const CARNOSIC =
  'Neuroprotective Effects of Carnosic Acid: Insight into its Mechanisms of Action'

describe('yearFromDate', () => {
  it('takes the year off an ISO date', () => {
    expect(yearFromDate('2025-01-30')).toBe('2025')
    expect(yearFromDate('2020-12-01')).toBe('2020')
  })

  it('returns empty for anything that is not a leading four-digit year', () => {
    expect(yearFromDate(undefined)).toBe('')
    expect(yearFromDate(null)).toBe('')
    expect(yearFromDate('')).toBe('')
    expect(yearFromDate('not-a-date')).toBe('')
    expect(yearFromDate(2025)).toBe('')
  })
})

describe('publicationSlug', () => {
  it('appends the year to a short title', () => {
    expect(publicationSlug('TREM2 and Alzheimer disease', '2022-06-15')).toBe(
      'trem2-and-alzheimer-disease-2022'
    )
  })

  it('keeps the year on a title far longer than the 96-char cap', () => {
    const slug = publicationSlug(CBX7, '2025-01-30')
    expect(slug.length).toBeLessThanOrEqual(96)
    // The regression this whole module exists to prevent.
    expect(slug.endsWith('-2025')).toBe(true)
  })

  it('cuts a long title on a word boundary, not mid-word', () => {
    const slug = publicationSlug(CBX7, '2025-01-30')
    const withoutYear = slug.slice(0, -'-2025'.length)
    // Every segment of the truncated title must be a whole word from the
    // slugified title, so the visible URL never ends in a word fragment.
    const fullTitleSegments = publicationSlug(CBX7, '').split('-')
    for (const segment of withoutYear.split('-')) {
      expect(fullTitleSegments).toContain(segment)
    }
  })

  it('is deterministic and distinguishes the same title in different years', () => {
    const a = publicationSlug(CARNOSIC, '2023-03-01')
    const b = publicationSlug(CARNOSIC, '2024-03-01')
    expect(a).toBe(publicationSlug(CARNOSIC, '2023-03-01'))
    expect(a).not.toBe(b)
    expect(a).toBe(
      'neuroprotective-effects-of-carnosic-acid-insight-into-its-mechanisms-of-action-2023'
    )
  })

  it('produces a slug matching the repo slug format', () => {
    const format = /^[a-z0-9]+(-[a-z0-9]+)*$/
    expect(publicationSlug(CBX7, '2025-01-30')).toMatch(format)
    expect(publicationSlug(CARNOSIC, '2023-03-01')).toMatch(format)
    expect(
      publicationSlug('Aβ–astrocyte oxidative stress', '2020-01-01')
    ).toMatch(format)
  })

  it('falls back to the bare title slug when the date is absent', () => {
    expect(publicationSlug('TREM2 and Alzheimer disease', undefined)).toBe(
      'trem2-and-alzheimer-disease'
    )
  })

  it('falls back to the bare year when the title is absent', () => {
    expect(publicationSlug('', '2021-05-05')).toBe('2021')
    expect(publicationSlug(undefined, '2021-05-05')).toBe('2021')
  })

  it('returns empty when it has nothing to work with', () => {
    expect(publicationSlug(undefined, undefined)).toBe('')
  })

  it('never leaves a trailing or doubled hyphen from truncation', () => {
    // A title whose slug lands a hyphen exactly on the budget boundary.
    const awkward = 'a'.repeat(89) + ' bbbbbbbbbb'
    const slug = publicationSlug(awkward, '2019-01-01')
    expect(slug).not.toContain('--')
    expect(slug.endsWith('-2019')).toBe(true)
    expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })

  it('hard-cuts a single word longer than the whole budget', () => {
    const oneLongWord = 'x'.repeat(200)
    const slug = publicationSlug(oneLongWord, '2018-01-01')
    expect(slug.length).toBeLessThanOrEqual(96)
    expect(slug.endsWith('-2018')).toBe(true)
    expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
  })
})
