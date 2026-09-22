import { describe, expect, it } from 'vitest'

import { doiHref, formatCitationLine, formatMediaDate, mailtoHref, telHref, youtubeEmbedUrl } from './format'

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

describe('youtubeEmbedUrl', () => {
  const EXPECTED = 'https://www.youtube-nocookie.com/embed/xKqAJ2sNEBk'
  it('accepts a watch URL', () => {
    expect(youtubeEmbedUrl('https://www.youtube.com/watch?v=xKqAJ2sNEBk')).toBe(EXPECTED)
  })
  it('accepts a watch URL with extra query params', () => {
    expect(youtubeEmbedUrl('https://www.youtube.com/watch?v=xKqAJ2sNEBk&t=19s&feature=share')).toBe(EXPECTED)
  })
  it('accepts a watch URL with no "www."', () => {
    expect(youtubeEmbedUrl('https://youtube.com/watch?v=xKqAJ2sNEBk')).toBe(EXPECTED)
  })
  it('accepts a youtu.be short link', () => {
    expect(youtubeEmbedUrl('https://youtu.be/xKqAJ2sNEBk')).toBe(EXPECTED)
  })
  it('accepts a youtu.be short link with extra query params', () => {
    expect(youtubeEmbedUrl('https://youtu.be/xKqAJ2sNEBk?t=19')).toBe(EXPECTED)
  })
  it('accepts an existing embed URL', () => {
    expect(youtubeEmbedUrl('https://www.youtube.com/embed/xKqAJ2sNEBk')).toBe(EXPECTED)
  })
  it('rejects a non-YouTube URL', () => {
    expect(youtubeEmbedUrl('https://vimeo.com/xKqAJ2sNEBk')).toBeNull()
  })
  it('rejects a YouTube URL with no video id', () => {
    expect(youtubeEmbedUrl('https://www.youtube.com/')).toBeNull()
  })
  it('rejects a malformed id', () => {
    expect(youtubeEmbedUrl('https://www.youtube.com/watch?v=short')).toBeNull()
  })
  it('rejects null/undefined/empty', () => {
    expect(youtubeEmbedUrl(null)).toBeNull()
    expect(youtubeEmbedUrl(undefined)).toBeNull()
    expect(youtubeEmbedUrl('')).toBeNull()
  })
  it('rejects a value that is not a URL at all', () => {
    expect(youtubeEmbedUrl('not a url')).toBeNull()
  })
  it('cleans a stega-encoded input first', () => {
    const stega = '​‌‍⁠' // zero-width chars as stega encodes
    expect(youtubeEmbedUrl(`https://www.youtube.com/watch?v=xKqAJ2sNEBk${stega}`)).toBe(EXPECTED)
  })
})
