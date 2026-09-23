import type { PublicationPayload } from 'types'
import { describe, expect, it } from 'vitest'

import {
  deriveLink,
  formatFilteredPublicationsMeta,
  formatPublicationsMeta,
  formatRef,
  shortenLabel,
  splitAuthors,
  toPublication,
} from './publicationModel'

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

  // The PI's own name token stops at a comma, semicolon, or " and "/" & "
  // conjunction -- a co-author with no comma before the PI's name must
  // never be swept into the bold run.
  it('stops the bold run at " and " when the PI has no comma before the next author', () => {
    const r = splitAuthors('A, Holsinger R.M.D. and Neely G.')
    expect(r.pre).toBe('A, ')
    expect(r.pi).toBe('Holsinger R.M.D.')
    expect(r.post).toBe(' and Neely G.')
  })

  it('stops the bold run at " & "', () => {
    const r = splitAuthors('Smith J & Holsinger RMD')
    expect(r.pre).toBe('Smith J & ')
    expect(r.pi).toBe('Holsinger RMD')
    expect(r.post).toBe('')
  })

  it('the PI alone, with no other authors', () => {
    const r = splitAuthors('Holsinger R.M.D.')
    expect(r.pre).toBe('')
    expect(r.pi).toBe('Holsinger R.M.D.')
    expect(r.post).toBe('')
  })

  it('stops the bold run at a semicolon', () => {
    const r = splitAuthors('Holsinger RMD; Other X')
    expect(r.pre).toBe('')
    expect(r.pi).toBe('Holsinger RMD')
    expect(r.post).toBe('; Other X')
  })

  it('no PI present', () => {
    const r = splitAuthors('Chen L. and Wang Y.')
    expect(r.pi).toBe('')
    expect(r.pre).toBe('Chen L. and Wang Y.')
    expect(r.post).toBe('')
  })

  it('an empty string', () => {
    const r = splitAuthors('')
    expect(r.pre).toBe('')
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

function payload(over: Partial<PublicationPayload> = {}): PublicationPayload {
  return {
    _id: 'p1',
    title: ' Chromobox protein homolog 7 suppresses glioblastoma. ',
    author: 'Ni K., Holsinger R.M.D., Jiao J.',
    journal: 'Cell Death Discovery',
    volume: 11,
    issue: 1,
    pages: '74',
    abstract: 'First paragraph.\n\nSecond paragraph.\n\n\n',
    url: 'https://doi.org/10.1038/s41420-025-02362-7',
    doi: '10.1038/s41420-025-02362-7',
    date: '2025-02-23',
    slug: 'chromobox-2025',
    type: null,
    topics: ['Neuro-oncology & biomarkers'],
    featured: null,
    resources: [],
    ...over,
  } as PublicationPayload
}

describe('formatRef', () => {
  it.each([
    [11, 1, '74', '11(1) · 74'],
    [23, null, '11037', '23 · 11037'],
    [null, null, '38–42', '38–42'],
    [12, 2, null, '12(2)'],
    [null, null, null, ''],
  ])('%s/%s/%s -> %s', (v, i, p, out) => {
    expect(formatRef(v as number | null, i as number | null, p as string | null)).toBe(out)
  })
})

describe('toPublication', () => {
  it('maps a DOI paper', () => {
    const pub = toPublication(payload())
    expect(pub.id).toBe('p1')
    expect(pub.title).toBe('Chromobox protein homolog 7 suppresses glioblastoma.')
    expect(pub.year).toBe('2025')
    expect(pub.dateLabel).toBe('23 February 2025')
    expect(pub.href).toBe('/publications/chromobox-2025')
    expect(pub.ref).toBe('11(1) · 74')
    expect(pub.linkKind).toBe('DOI')
    expect(pub.linkLabel).toBe('10.1038/s41420-025-02362-7')
    expect(pub.linkHref).toBe('https://doi.org/10.1038/s41420-025-02362-7')
    expect(pub.authorsPI).toBe('Holsinger R.M.D.')
    expect(pub.type).toBe('')
    expect(pub.topics).toEqual(['Neuro-oncology & biomarkers'])
    expect(pub.abstract).toEqual(['First paragraph.', 'Second paragraph.'])
    expect(pub.cite).toContain('https://doi.org/10.1038/s41420-025-02362-7')
  })

  it('falls back to the URL and keeps the href whole', () => {
    const url = 'https://www.jneuro.com/abstract/diagnostic-conundrums-in-cerebellar-cryptic-arteriovenous-malformations-37612.html'
    const pub = toPublication(payload({ doi: null, url }))
    expect(pub.linkKind).toBe('URL')
    expect(pub.linkHref).toBe(url)
    expect(pub.linkLabel).toBe(url.replace('https://www.', ''))
    expect(pub.linkLabelShort!.length).toBeLessThanOrEqual(26)
  })

  it('renders no link at all when neither exists', () => {
    const pub = toPublication(payload({ doi: null, url: null }))
    expect([pub.linkKind, pub.linkLabel, pub.linkHref]).toEqual(['', '', ''])
    expect(pub.cite).not.toMatch(/https?:/)
  })

  it('tolerates missing optional data', () => {
    const pub = toPublication(
      payload({ slug: null, date: null, abstract: null, topics: null, volume: null, issue: null, pages: null } as Partial<PublicationPayload>)
    )
    expect(pub.href).toBeNull()
    expect(pub.year).toBe('')
    expect(pub.dateLabel).toBe('')
    expect(pub.abstract).toEqual([])
    expect(pub.topics).toEqual([])
    expect(pub.ref).toBe('')
  })

  it('passes the type through when set', () => {
    expect(toPublication(payload({ type: 'Review' })).type).toBe('Review')
  })

  it('maps linked resources', () => {
    const pub = toPublication(
      payload({ resources: [{ _id: 'r1', title: 'ES chamber', kind: 'hardware' }] } as Partial<PublicationPayload>)
    )
    expect(pub.resources).toEqual([{ id: 'r1', title: 'ES chamber', kind: 'hardware' }])
  })

  it('drops resources with an empty or whitespace-only title', () => {
    const pub = toPublication(
      payload({
        resources: [
          { _id: 'r1', title: '', kind: 'hardware' },
          { _id: 'r2', title: '   ', kind: 'dataset' },
          { _id: 'r3', title: 'ES chamber', kind: 'hardware' },
        ],
      } as Partial<PublicationPayload>)
    )
    expect(pub.resources).toEqual([{ id: 'r3', title: 'ES chamber', kind: 'hardware' }])
  })
})

describe('formatPublicationsMeta', () => {
  it('renders a year range, pluralised, matching the brief\'s own example', () => {
    const pubs = Array.from({ length: 19 }, (_, i) => ({ year: i < 10 ? '2020' : '2025' }))
    expect(formatPublicationsMeta(pubs)).toBe('19 publications, 2020–2025')
  })

  it('singularises "publication" when there is exactly one', () => {
    expect(formatPublicationsMeta([{ year: '2024' }])).toBe('1 publication, 2024')
  })

  it('collapses to a single year when min === max', () => {
    expect(formatPublicationsMeta([{ year: '2024' }, { year: '2024' }])).toBe('2 publications, 2024')
  })

  it('omits the year entirely when no publication has one', () => {
    expect(formatPublicationsMeta([{ year: '' }, { year: '' }])).toBe('2 publications')
  })

  it('is "0 publications" for an empty list', () => {
    expect(formatPublicationsMeta([])).toBe('0 publications')
  })
})

describe('formatFilteredPublicationsMeta', () => {
  it('renders "shown of total", unconditionally plural', () => {
    expect(formatFilteredPublicationsMeta(5, 19)).toBe('5 of 19 publications shown')
  })
})
