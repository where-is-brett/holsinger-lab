import { describe, expect, it } from 'vitest'

import { deriveLink, shortenLabel, splitAuthors } from './publicationRow'

describe('splitAuthors', () => {
  it('splits around the PI so the name can be emphasised', () => {
    const r = splitAuthors('Huynh, Q-S. and Holsinger R.M.D.')
    expect(r.pre).toBe('Huynh, Q-S. and ')
    expect(r.pi).toBe('Holsinger R.M.D.')
    expect(r.post).toBe('')
  })

  it('handles the PI mid-list', () => {
    const r = splitAuthors('Ni K., Liu Y., Holsinger R.M.D., Kiang K.M. and Jiao J.')
    expect(r.pre).toBe('Ni K., Liu Y., ')
    expect(r.pi).toBe('Holsinger R.M.D.')
    expect(r.post).toBe(', Kiang K.M. and Jiao J.')
  })

  it('leaves the string whole when the PI is absent', () => {
    const r = splitAuthors('Smith, J. and Jones, K.')
    expect(r.pre).toBe('Smith, J. and Jones, K.')
    expect(r.pi).toBe('')
    expect(r.post).toBe('')
  })
})

describe('deriveLink', () => {
  it('prefers the DOI and prints it verbatim', () => {
    expect(deriveLink('10.3390/biomedicines12020289', 'https://example.org')).toEqual({
      kind: 'DOI',
      label: '10.3390/biomedicines12020289',
      href: 'https://doi.org/10.3390/biomedicines12020289',
    })
  })

  it('falls back to the recorded url when there is no DOI', () => {
    expect(deriveLink(null, 'https://www.mdpi.com/1420-3049/28/5/2306')).toEqual({
      kind: 'URL',
      label: 'mdpi.com/1420-3049/28/5/2306',
      href: 'https://www.mdpi.com/1420-3049/28/5/2306',
    })
  })

  it('never upper-cases an identifier', () => {
    const r = deriveLink('10.3390/BiomedIcines12020289', null)
    expect(r!.label).toBe('10.3390/BiomedIcines12020289')
  })

  it('returns null when neither is recorded', () => {
    expect(deriveLink(null, null)).toBeNull()
  })
})

describe('shortenLabel', () => {
  it('leaves a short label alone', () => {
    expect(shortenLabel('10.3390/genes14101845', 32)).toBe('10.3390/genes14101845')
  })

  it('truncates with a trailing ellipsis for compact rows', () => {
    const out = shortenLabel('10.1016/j.ygeno.2019.07.018.extra.long.suffix', 24)
    expect(out.endsWith('…')).toBe(true)
    expect(out.length).toBeLessThanOrEqual(24)
  })
})
