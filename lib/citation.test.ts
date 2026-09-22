import { describe, expect, it } from 'vitest'

import {
  assignBibtexCiteKeys,
  formatApaCitation,
  formatBibtexCitation,
} from './citation'

// Real field values from the live dataset (project j3f9z8os, dataset production),
// queried 2026-08-11.
const CBX7 = {
  author:
    'Ni K., Liu Y., DI P., Wang L., Huang H., Holsinger R.M.D., Kiang K.M. and Jiao J.',
  title:
    ' Chromobox protein homolog 7 suppresses the stem-like phenotype of glioblastoma cells by regulating the myosin heavy chain 9-NF-κB signaling pathway. ',
  journal: 'Cell Death Discovery',
  volume: 11,
  issue: 1,
  pages: '74',
  date: '2025-02-23',
  doi: null,
  url: 'https://doi.org/10.1038/s41420-025-02362-7',
}

const BIOCHIMIE_2020 = {
  author: 'Elangovan, S., Holsinger, RMD.',
  title:
    "Cyclical amyloid beta-astrocyte activity induces oxidative stress in Alzheimer's disease.",
  journal: 'Biochimie',
  volume: null,
  issue: null,
  pages: '38-42',
  date: '2020-02-20',
  doi: null,
  url: 'https://doi.org/10.1016/j.biochi.2020.02.003',
}

describe('formatApaCitation', () => {
  it('formats a full record, trimming whitespace and a redundant trailing period from the title', () => {
    expect(formatApaCitation(CBX7)).toBe(
      'Ni K., Liu Y., DI P., Wang L., Huang H., Holsinger R.M.D., Kiang K.M. and Jiao J. (2025). Chromobox protein homolog 7 suppresses the stem-like phenotype of glioblastoma cells by regulating the myosin heavy chain 9-NF-κB signaling pathway. Cell Death Discovery, 11(1), 74. https://doi.org/10.1038/s41420-025-02362-7'
    )
  })

  it('omits the volume/issue block and its comma entirely when both are absent', () => {
    expect(formatApaCitation(BIOCHIMIE_2020)).toBe(
      "Elangovan, S., Holsinger, RMD. (2020). Cyclical amyloid beta-astrocyte activity induces oxidative stress in Alzheimer's disease. Biochimie, 38-42. https://doi.org/10.1016/j.biochi.2020.02.003"
    )
  })

  it('prefers doi over url when both are present', () => {
    const withBoth = { ...CBX7, doi: '10.1038/s41420-025-02362-7', url: 'https://example.com/wrong' }
    const result = formatApaCitation(withBoth)
    expect(result).toContain('https://doi.org/10.1038/s41420-025-02362-7')
    expect(result).not.toContain('example.com')
  })

  it('falls back to "n.d." when date is missing', () => {
    expect(formatApaCitation({ ...CBX7, date: null })).toContain('(n.d.)')
  })

  it('falls back gracefully when author/title are missing', () => {
    const result = formatApaCitation({ ...CBX7, author: null, title: null })
    expect(result).toContain('Unknown author')
    expect(result).toContain('Untitled')
  })
})

describe('assignBibtexCiteKeys', () => {
  // Real collision: two 2023 publications share "Olufunmilayo" as first author --
  // the INPP5D/SHIP1 review (2023-09-23) and the Oxidative Stress paper
  // (2023-02-18). publicationsQuery sorts date desc, so September is encountered
  // first in list order.
  const OLUFUNMILAYO_SEPT = {
    _id: 'a',
    author: 'Olufunmilayo, E. and Holsinger, R.M.D.',
    date: '2023-09-23',
  }
  const OLUFUNMILAYO_FEB = {
    _id: 'b',
    author: 'Olufunmilayo, E., Gerke, M., Holsinger, R.M.D.',
    date: '2023-02-18',
  }
  const UNRELATED = {
    _id: 'c',
    author: 'Mirza, F., Zahid, S., Holsinger, R.M.D.',
    date: '2023-03-02',
  }

  it('assigns the bare key to the first occurrence and an "a" suffix to the next collision', () => {
    const keys = assignBibtexCiteKeys([OLUFUNMILAYO_SEPT, OLUFUNMILAYO_FEB, UNRELATED])
    expect(keys.get('a')).toBe('olufunmilayo2023')
    expect(keys.get('b')).toBe('olufunmilayo2023a')
    expect(keys.get('c')).toBe('mirza2023')
  })

  it('assigns a "b" suffix to a third collision', () => {
    const third = { _id: 'd', author: 'Olufunmilayo, E.', date: '2023-01-01' }
    const keys = assignBibtexCiteKeys([OLUFUNMILAYO_SEPT, OLUFUNMILAYO_FEB, third])
    expect(keys.get('d')).toBe('olufunmilayo2023b')
  })

  it('strips non-ASCII characters from the base key', () => {
    // Real author string (2020-11-06 piezoelectric thin-films paper) -- stored
    // with a leading space in the live dataset.
    const keys = assignBibtexCiteKeys([
      { _id: 'e', author: ' Gaukås NH, Huynh QS, Pratap AA.', date: '2020-11-06' },
    ])
    expect(keys.get('e')).toBe('gauks2020')
  })

  it('falls back to "unknown" when author is null or empty', () => {
    const keys = assignBibtexCiteKeys([{ _id: 'f', author: null, date: '2022-01-01' }])
    expect(keys.get('f')).toBe('unknown2022')
  })
})

describe('formatBibtexCitation', () => {
  it('formats a complete @article entry, only including fields that are present', () => {
    const result = formatBibtexCitation(CBX7, 'ni2025')
    expect(result).toBe(
      `@article{ni2025,
  author = {Ni K., Liu Y., DI P., Wang L., Huang H., Holsinger R.M.D., Kiang K.M. and Jiao J.},
  title = {Chromobox protein homolog 7 suppresses the stem-like phenotype of glioblastoma cells by regulating the myosin heavy chain 9-NF-κB signaling pathway},
  journal = {Cell Death Discovery},
  year = {2025},
  volume = {11},
  number = {1},
  pages = {74},
  url = {https://doi.org/10.1038/s41420-025-02362-7},
}`
    )
  })

  it('omits volume/number when absent, and prefers doi over url when doi is set', () => {
    const withDoi = { ...BIOCHIMIE_2020, doi: '10.1016/j.biochi.2020.02.003' }
    const result = formatBibtexCitation(withDoi, 'elangovan2020')
    expect(result).not.toContain('volume')
    expect(result).not.toContain('number')
    expect(result).toContain('doi = {10.1016/j.biochi.2020.02.003}')
    expect(result).not.toContain('url =')
  })

  it('escapes literal braces in a field value', () => {
    const result = formatBibtexCitation({ ...CBX7, title: 'A {weird} title' }, 'x2025')
    expect(result).toContain('title = {A weird title}')
  })
})
