import type { CitationInput } from 'lib/wix/citationExport'
import { describe, expect, it } from 'vitest'

import { allBibtex, allRis } from './PublicationsDownloadAll'

const A: CitationInput = {
  _id: 'a',
  title: 'First paper',
  author: 'Smith J.',
  journal: 'Journal A',
  date: '2024-01-01',
  volume: 1,
  issue: 1,
  pages: '1-2',
  doi: '10.1/a',
  slug: 'first-paper',
}

const B: CitationInput = {
  _id: 'b',
  title: 'Second paper',
  author: 'Jones K.',
  journal: 'Journal B',
  date: '2023-01-01',
  volume: 2,
  issue: 3,
  pages: '10-20',
  doi: '10.1/b',
  slug: null,
}

describe('allBibtex', () => {
  it('joins every entry with a blank line and ends with exactly one trailing newline', () => {
    const out = allBibtex([A, B])
    expect(out.endsWith('}\n')).toBe(true)
    expect(out.endsWith('}\n\n')).toBe(false)
    expect(out).toContain('}\n\n@')
    expect(out.split('\n\n')).toHaveLength(2)
  })

  it('is empty-safe', () => {
    expect(allBibtex([])).toBe('\n')
  })
})

describe('allRis', () => {
  it('joins every entry with a blank line (each record already CRLF-terminated) and ends with one CRLF', () => {
    const out = allRis([A, B])
    expect(out.endsWith('ER  - \r\n')).toBe(true)
    expect(out).toContain('ER  - \r\n\r\nTY  - JOUR')
    expect(out.match(/TY {2}- JOUR/g)).toHaveLength(2)
  })
})
