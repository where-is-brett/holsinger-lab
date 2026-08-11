import { describe, expect, it } from 'vitest'

import { extractDoiFromUrl, isValidDoi, normalizeDoiInput } from './doi'

// The `url` field of all 19 live `publication` documents (project j3f9z8os,
// dataset production), queried 2026-08-11. Real data, not invented fixtures
// — design doc §1.9/§5 found the three URL shapes below only by querying the
// live dataset, and the split (10 recoverable / 9 not) is the whole reason
// this module exists.
const LIVE_PUBLICATION_URLS: { url: string; doi: string | null }[] = [
  { url: 'https://doi.org/10.1038/s41420-025-02362-7', doi: '10.1038/s41420-025-02362-7' },
  { url: 'https://doi.org/10.3390/biomedicines12020289', doi: '10.3390/biomedicines12020289' },
  { url: 'https://doi.org/10.3390/genes14101845', doi: '10.3390/genes14101845' },
  { url: 'https://www.mdpi.com/1420-3049/28/5/2306', doi: null },
  { url: 'https://www.mdpi.com/2076-3921/12/2/517', doi: null },
  { url: 'https://www.mdpi.com/1424-8247/16/2/138', doi: null },
  { url: 'https://www.mdpi.com/1422-0067/24/2/1001', doi: null },
  { url: 'https://www.mdpi.com/2073-4409/12/1/119', doi: null },
  { url: 'https://www.mdpi.com/1422-0067/23/19/11037', doi: null },
  { url: 'https://doi.org/10.1016/j.jmb.2022.167470', doi: '10.1016/j.jmb.2022.167470' },
  {
    url: 'https://www.jneuro.com/abstract/diagnostic-conundrums-in-cerebellar-cryptic-arteriovenous-malformations-37612.html',
    doi: null,
  },
  { url: 'https://onlinelibrary.wiley.com/doi/10.1002/jnr.24819', doi: '10.1002/jnr.24819' },
  { url: 'https://www.mdpi.com/1424-8247/13/11/401', doi: null },
  { url: 'https://doi.org/10.1021/acsabm.0c01111', doi: '10.1021/acsabm.0c01111' },
  { url: 'https://doi.org/10.33263/BRIAC112.86868701', doi: '10.33263/BRIAC112.86868701' },
  { url: 'https://www.mdpi.com/1424-8247/13/7/150', doi: null },
  { url: 'https://doi.org/10.1038/s41598-020-67036-z', doi: '10.1038/s41598-020-67036-z' },
  { url: 'https://doi.org/10.1016/j.biochi.2020.02.003', doi: '10.1016/j.biochi.2020.02.003' },
  { url: 'https://doi.org/10.1016/j.ygeno.2019.07.018', doi: '10.1016/j.ygeno.2019.07.018' },
]

describe('extractDoiFromUrl', () => {
  it('extracts the DOI from every one of the 19 live publication URLs correctly', () => {
    for (const { url, doi } of LIVE_PUBLICATION_URLS) {
      expect(extractDoiFromUrl(url), url).toBe(doi)
    }
  })

  it('recovers exactly 10 of the 19 (the design doc §1.9 count)', () => {
    const recoverable = LIVE_PUBLICATION_URLS.filter(({ url }) => extractDoiFromUrl(url) !== null)
    expect(recoverable).toHaveLength(10)
  })

  it('handles a dx.doi.org host the same as doi.org', () => {
    expect(extractDoiFromUrl('https://dx.doi.org/10.1038/s41420-025-02362-7')).toBe(
      '10.1038/s41420-025-02362-7'
    )
  })

  it('returns null for a non-DOI, non-Wiley URL', () => {
    expect(extractDoiFromUrl('https://example.com/not-a-doi')).toBeNull()
  })

  it('trims surrounding whitespace before matching', () => {
    expect(extractDoiFromUrl('  https://doi.org/10.1038/s41420-025-02362-7  ')).toBe(
      '10.1038/s41420-025-02362-7'
    )
  })
})

describe('isValidDoi', () => {
  it('accepts a bare DOI', () => {
    expect(isValidDoi('10.1038/s41420-025-02362-7')).toBe(true)
  })

  it('rejects a full URL', () => {
    expect(isValidDoi('https://doi.org/10.1038/s41420-025-02362-7')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isValidDoi('')).toBe(false)
  })

  it('rejects a string with no suffix after the prefix', () => {
    expect(isValidDoi('10.1038/')).toBe(false)
  })

  it('accepts every DOI recovered from the live dataset', () => {
    for (const { doi } of LIVE_PUBLICATION_URLS) {
      if (doi !== null) expect(isValidDoi(doi), doi).toBe(true)
    }
  })
})

describe('normalizeDoiInput', () => {
  it('passes a bare DOI through unchanged', () => {
    expect(normalizeDoiInput('10.1038/s41420-025-02362-7')).toBe('10.1038/s41420-025-02362-7')
  })

  it('strips a pasted doi.org URL down to the bare DOI', () => {
    expect(normalizeDoiInput('https://doi.org/10.1038/s41420-025-02362-7')).toBe(
      '10.1038/s41420-025-02362-7'
    )
  })

  it('trims whitespace', () => {
    expect(normalizeDoiInput('  10.1038/s41420-025-02362-7  ')).toBe('10.1038/s41420-025-02362-7')
  })
})
