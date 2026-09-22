import { describe, expect, it } from 'vitest'

import { formatApaCitation } from './citation'

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
