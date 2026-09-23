import { describe, expect, it } from 'vitest'

import { bibtex, type CitationInput,plainCitation, ris, splitAuthors } from './citationExport'

// Real records copied from data/wix/fixture.ndjson (2026-09-23 snapshot).

const PREPRINT: CitationInput = {
  _id: 'bdnf-preprint',
  title: 'Non-invasive Bdnf mRNA therapy improves cognition in ageing and Alzheimer’s mouse models',
  author: 'Bergamasco M., Clark T., Loo L., Fujikake K., Carr R., Scarborough H., Ponta A., Holsinger R.M.D. and Neely G.',
  journal: 'bioRxiv',
  date: '2026-04-20',
  volume: null,
  issue: null,
  pages: '04.19.719519',
  doi: '10.64898/2026.04.19.719519',
  slug: 'non-invasive-bdnf-mrna-therapy-improves-cognition-in-ageing-and-alzheimer-s-mouse-models-2026',
}

const CBX7: CitationInput = {
  _id: 'cbx7',
  title:
    'Chromobox protein homolog 7 suppresses the stem-like phenotype of glioblastoma cells by regulating the myosin heavy chain 9-NF-κB signaling pathway',
  author: 'Liu Y., DI P., Wang L., Huang H., Holsinger R.M.D., Kiang K.M. and Jiao J.',
  journal: 'Cell Death Discovery',
  date: '2025-01-01',
  volume: 11,
  issue: 1,
  pages: '74',
  doi: '10.1038/s41420-025-02362-7',
  slug: null,
}

const BIOMEDICINES: CitationInput = {
  _id: 'biomedicines',
  title: 'Development of a Cell Culture Chamber for Investigating the Therapeutic Effects of Electrical Stimulation on Neural Growth',
  author: 'Huynh Q-S and Holsinger RMD.',
  journal: 'Biomedicines',
  date: '2024-01-01',
  volume: 12,
  issue: 2,
  pages: '289',
  doi: '10.3390/biomedicines12020289',
  slug: null,
}

const GSD: CitationInput = {
  _id: 'gsd',
  title: 'Ground state depletion microscopy as a tool for studying microglia–synapse interactions',
  author:
    'Paasila PJ, Fok SYY, Flores‐Rodriguez N, Sajjan S, Svahn AJ, Dennis CV, Holsinger RMD, Kril JJ, Becker TS, Banati RB, Sutherland GT and Graeber MB',
  journal: 'Journal of Neuroscience Research',
  date: '2021-01-01',
  volume: 99,
  issue: 6,
  pages: '1515-1532',
  doi: '10.1002/jnr.24819',
  slug: null,
}

describe('splitAuthors', () => {
  it('"Surname Initial." list joined with " and "', () => {
    expect(splitAuthors('Bergamasco M., Clark T., Loo L., Fujikake K., Carr R., Scarborough H., Ponta A., Holsinger R.M.D. and Neely G.')).toEqual([
      'Bergamasco M.',
      'Clark T.',
      'Loo L.',
      'Fujikake K.',
      'Carr R.',
      'Scarborough H.',
      'Ponta A.',
      'Holsinger R.M.D.',
      'Neely G.',
    ])
  })

  it('"Surname Initial." list with an all-caps two-letter surname ("DI P.")', () => {
    expect(splitAuthors('Ni K., Liu Y., DI P., Wang L., Huang H., Holsinger R.M.D., Kiang K.M. and Jiao J.')).toEqual([
      'Ni K.',
      'Liu Y.',
      'DI P.',
      'Wang L.',
      'Huang H.',
      'Holsinger R.M.D.',
      'Kiang K.M.',
      'Jiao J.',
    ])
  })

  it('"Surname, Initials." form -- the hard case', () => {
    expect(splitAuthors('Huynh, Q-S. and Holsinger R.M.D.')).toEqual(['Huynh, Q-S.', 'Holsinger R.M.D.'])
  })

  it('mixed "Surname, Initials." and "Surname Initials." in one list', () => {
    expect(splitAuthors('Olufunmilayo, E., Gerke-Duncan M.B. and Holsinger, R.M.D.')).toEqual([
      'Olufunmilayo, E.',
      'Gerke-Duncan M.B.',
      'Holsinger, R.M.D.',
    ])
  })

  it('undotted initials, non-ASCII hyphen in a surname', () => {
    expect(
      splitAuthors(
        'Paasila PJ, Fok SYY, Flores‐Rodriguez N, Sajjan S, Svahn AJ, Dennis CV, Holsinger RMD, Kril JJ, Becker TS, Banati RB, Sutherland GT and Graeber MB'
      )
    ).toEqual([
      'Paasila PJ',
      'Fok SYY',
      'Flores‐Rodriguez N',
      'Sajjan S',
      'Svahn AJ',
      'Dennis CV',
      'Holsinger RMD',
      'Kril JJ',
      'Becker TS',
      'Banati RB',
      'Sutherland GT',
      'Graeber MB',
    ])
  })

  it('drops an orphan trailing full stop on an undotted last author', () => {
    expect(splitAuthors('Huynh Q-S and Holsinger RMD.')).toEqual(['Huynh Q-S', 'Holsinger RMD'])
  })

  it('leaves a legitimate dotted-initials trailing period alone', () => {
    expect(splitAuthors('Huynh, Q-S. and Holsinger R.M.D.').at(-1)).toBe('Holsinger R.M.D.')
  })

  it('null/undefined/empty', () => {
    expect(splitAuthors(null)).toEqual([])
    expect(splitAuthors(undefined)).toEqual([])
    expect(splitAuthors('')).toEqual([])
  })
})

describe('plainCitation', () => {
  it('preprint: no volume/issue/pages-only, no orphan punctuation', () => {
    const out = plainCitation(PREPRINT)
    expect(out).toContain('bioRxiv 2026; 04.19.719519.')
    expect(out).not.toMatch(/bioRxiv 2026;\(\)/)
    expect(out).not.toMatch(/;\s*\./)
    expect(out.endsWith('doi:10.64898/2026.04.19.719519')).toBe(true)
  })

  it('CBX7: κ survives untouched', () => {
    const out = plainCitation(CBX7)
    expect(out).toContain('9-NF-κB')
    expect(out).toContain('Cell Death Discovery 2025; 11(1):74.')
  })

  it('normal article with volume/issue/pages', () => {
    expect(plainCitation(BIOMEDICINES)).toContain('Biomedicines 2024; 12(2):289.')
  })

  it('is deterministic', () => {
    expect(plainCitation(GSD)).toBe(plainCitation(GSD))
  })
})

describe('bibtex', () => {
  it('preprint: @misc when there is no journal is NOT triggered here (bioRxiv counts as a journal) -> @article', () => {
    const out = bibtex(PREPRINT)
    expect(out.startsWith('@article{non-invasive-bdnf-mrna-therapy-improves-cognition-in-ageing-and-alzheimer-s-mouse-models-2026,')).toBe(true)
    expect(out).not.toMatch(/volume = /)
    expect(out).not.toMatch(/number = /)
    expect(out).toContain('pages = {04.19.719519},')
  })

  it('uses @misc when journal is absent', () => {
    const noJournal: CitationInput = { ...BIOMEDICINES, journal: null }
    expect(bibtex(noJournal).startsWith('@misc{')).toBe(true)
  })

  it('CBX7: κ preserved, title capitalisation brace-protected', () => {
    const out = bibtex(CBX7)
    expect(out).toContain('9-NF-κB')
    expect(out).toMatch(/title = \{\{.*\}\},/)
    // key falls back to author+year since this record has no slug
    expect(out.startsWith('@article{Liu2025,')).toBe(true)
  })

  it('GSD: full field set, page range kept as-is (no SP/EP split in BibTeX)', () => {
    const out = bibtex(GSD)
    expect(out).toContain('pages = {1515-1532},')
    expect(out).toContain('volume = {99},')
    expect(out).toContain('number = {6},')
    expect(out).toContain('author = {Paasila PJ and Fok SYY and Flores‐Rodriguez N and Sajjan S and Svahn AJ and Dennis CV and Holsinger RMD and Kril JJ and Becker TS and Banati RB and Sutherland GT and Graeber MB},')
  })

  it('escapes & % _ { correctly', () => {
    const weird: CitationInput = {
      ...BIOMEDICINES,
      title: 'A & B % C_{D}',
    }
    const out = bibtex(weird)
    expect(out).toContain('title = {{A \\& B \\% C\\_\\{D\\}}},')
  })

  it('is deterministic', () => {
    expect(bibtex(GSD)).toBe(bibtex(GSD))
  })
})

describe('ris', () => {
  it('uses CRLF line endings and starts/ends correctly', () => {
    const out = ris(BIOMEDICINES)
    expect(out.startsWith('TY  - JOUR\r\n')).toBe(true)
    expect(out.endsWith('ER  - \r\n')).toBe(true)
    expect(out).not.toContain('\n\n')
  })

  it('one AU line per author', () => {
    const out = ris(PREPRINT)
    const auLines = out.split('\r\n').filter((l) => l.startsWith('AU  - '))
    expect(auLines).toHaveLength(9)
    expect(auLines[0]).toBe('AU  - Bergamasco M.')
    expect(auLines.at(-1)).toBe('AU  - Neely G.')
  })

  it('preprint: no VL/IS lines, SP holds the raw preprint id', () => {
    const out = ris(PREPRINT)
    expect(out).not.toContain('VL  - ')
    expect(out).not.toContain('IS  - ')
    expect(out).toContain('SP  - 04.19.719519\r\n')
    expect(out).not.toContain('EP  - ')
  })

  it('GSD: 1515-1532 page range splits into SP and EP', () => {
    const out = ris(GSD)
    expect(out).toContain('SP  - 1515\r\n')
    expect(out).toContain('EP  - 1532\r\n')
  })

  it('CBX7: κ preserved in TI', () => {
    expect(ris(CBX7)).toContain('9-NF-κB')
  })

  it('carries T2/JO/DO/PY/UR', () => {
    const withUrl: CitationInput = { ...BIOMEDICINES, url: 'https://example.org/paper' }
    const out = ris(withUrl)
    expect(out).toContain('T2  - Biomedicines\r\n')
    expect(out).toContain('JO  - Biomedicines\r\n')
    expect(out).toContain('DO  - 10.3390/biomedicines12020289\r\n')
    expect(out).toContain('PY  - 2024\r\n')
    expect(out).toContain('UR  - https://example.org/paper\r\n')
  })

  it('is deterministic', () => {
    expect(ris(GSD)).toBe(ris(GSD))
  })
})
