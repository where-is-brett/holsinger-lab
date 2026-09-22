import { describe, expect, it } from 'vitest'

import { doiHref, formatCitationLine, formatMediaDate, mailtoHref, telHref } from './format'

describe('formatCitationLine (Wix: "Journal Year; vol(issue):pages.")', () => {
  it('full record', () => {
    expect(formatCitationLine({ journal: 'Biomedicines', date: '2024-01-26', volume: 12, issue: 2, pages: '289' }))
      .toBe('Biomedicines 2024; 12(2):289.')
  })
  it('pages only (preprint)', () => {
    expect(formatCitationLine({ journal: 'bioRxiv', date: '2026-04-19', volume: null, issue: null, pages: '04.19.719519' }))
      .toBe('bioRxiv 2026; 04.19.719519.')
  })
  it('no volume/issue/pages leaves no orphan semicolon (Review Focus 4)', () => {
    expect(formatCitationLine({ journal: 'Cells', date: '2022-12-28', volume: null, issue: null, pages: null })).toBe('Cells 2022.')
  })
  it('strips a trailing full stop from the journal', () => {
    expect(formatCitationLine({ journal: 'Int J Mol Sci.', date: '2023-01-05', volume: 24, issue: 2, pages: '1001' }))
      .toBe('Int J Mol Sci 2023; 24(2):1001.')
  })
  it('nothing at all', () => {
    expect(formatCitationLine({ journal: null, date: null, volume: null, issue: null, pages: null })).toBe('')
  })
})

describe('hrefs are stega-clean and null-safe (Review Focus 5)', () => {
  const stega = '​‌‍⁠' // zero-width chars as stega encodes
  it('doiHref', () => {
    expect(doiHref(`10.3390/x${stega}`)).toBe('https://doi.org/10.3390/x')
    expect(doiHref('https://doi.org/10.1/y')).toBe('https://doi.org/10.1/y')
    expect(doiHref(null)).toBeNull()
  })
  it('mailtoHref / telHref', () => {
    expect(mailtoHref(`a@b.org${stega}`)).toBe('mailto:a@b.org')
    expect(telHref('+612 9351 0876')).toBe('tel:+61293510876')
    expect(mailtoHref('')).toBeNull()
    expect(telHref(undefined)).toBeNull()
  })
})

describe('formatMediaDate', () => {
  it('Wix style "14 Jul 2024"', () => expect(formatMediaDate('2024-07-14')).toBe('14 Jul 2024'))
  it('null', () => expect(formatMediaDate(null)).toBeNull())
})
