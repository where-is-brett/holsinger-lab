import { describe, expect, it } from 'vitest'

import {
  crossrefDateToIsoDate,
  fetchCrossrefWork,
  formatCrossrefAuthors,
  stripJatsTags,
} from './crossref'

describe('formatCrossrefAuthors', () => {
  it('formats "Family Initials." per author, joined by ", "', () => {
    expect(
      formatCrossrefAuthors([
        { given: 'Kaixiang', family: 'Ni' },
        { given: 'Yuankun', family: 'Liu' },
        { given: 'R. M. Damian', family: 'Holsinger' },
      ])
    ).toBe('Ni K., Liu Y., Holsinger R.M.D.')
  })

  it('drops empty/whitespace-only name parts', () => {
    expect(formatCrossrefAuthors([{ given: '  ', family: 'Ni' }])).toBe('Ni')
  })

  it('returns an empty string for no authors', () => {
    expect(formatCrossrefAuthors([])).toBe('')
  })
})

describe('crossrefDateToIsoDate', () => {
  it('formats a full year/month/day', () => {
    expect(crossrefDateToIsoDate([2025, 2, 23])).toBe('2025-02-23')
  })

  it('defaults missing month/day to 01', () => {
    expect(crossrefDateToIsoDate([2025])).toBe('2025-01-01')
  })
})

describe('stripJatsTags', () => {
  it('drops a <jats:title>Abstract</jats:title> boilerplate block entirely', () => {
    const input = '<jats:title>Abstract</jats:title>\n<jats:p>Real content here.</jats:p>'
    expect(stripJatsTags(input)).toBe('Real content here.')
  })

  it('collapses internal whitespace/newlines to single spaces', () => {
    expect(stripJatsTags('<jats:p>Line one.\n   Line two.</jats:p>')).toBe('Line one. Line two.')
  })
})

// Real Crossref API responses (trimmed to the fields this module reads),
// captured live from https://api.crossref.org/works/{doi} on 2026-08-11 for
// two of the live dataset's actual DOIs -- design doc §5's "real data, not
// invented fixtures" standard, extended from the 19 URLs (Task 1) to Crossref
// itself.
const CROSSREF_FIXTURE_CBX7 = {
  message: {
    title: [
      'Chromobox protein homolog 7 suppresses the stem-like phenotype of glioblastoma cells by regulating the myosin heavy chain 9-NF-κB signaling pathway',
    ],
    author: [
      { given: 'Kaixiang', family: 'Ni' },
      { given: 'Yuankun', family: 'Liu' },
      { given: 'Pinggang', family: 'DI' },
      { given: 'Lu', family: 'Wang' },
      { given: 'Hui', family: 'Huang' },
      { given: 'R. M. Damian', family: 'Holsinger' },
      { given: 'Karrie Mei-Yee', family: 'Kiang' },
      { given: 'Jiantong', family: 'Jiao' },
    ],
    'container-title': ['Cell Death Discovery'],
    volume: '11',
    issue: '1',
    page: undefined,
    'article-number': '74',
    published: { 'date-parts': [[2025, 2, 23]] },
    abstract:
      '<jats:title>Abstract</jats:title>\n          <jats:p>Cancer stem cells (CSCs) are significant factors in the treatment resistance and recurrence of glioblastoma.</jats:p>',
  },
}

const CROSSREF_FIXTURE_GDM = {
  message: {
    title: ['Ground state depletion microscopy as a tool for studying microglia–synapse interactions'],
    author: [{ given: 'Paul J.', family: 'Paasila' }],
    'container-title': ['Journal of Neuroscience Research'],
    volume: '99',
    issue: '6',
    page: '1515-1532',
    published: { 'date-parts': [[2021, 3, 7]] },
    // No `abstract` field at all -- Crossref omits it for some records.
  },
}

function fakeFetch(body: unknown, ok = true, status = 200): typeof fetch {
  return (async () =>
    ({
      ok,
      status,
      json: async () => body,
    }) as Response) as typeof fetch
}

describe('fetchCrossrefWork', () => {
  it('parses a full record, preferring article-number when page is absent', async () => {
    const result = await fetchCrossrefWork('10.1038/s41420-025-02362-7', fakeFetch(CROSSREF_FIXTURE_CBX7))
    expect(result).toEqual({
      title:
        'Chromobox protein homolog 7 suppresses the stem-like phenotype of glioblastoma cells by regulating the myosin heavy chain 9-NF-κB signaling pathway',
      author: 'Ni K., Liu Y., DI P., Wang L., Huang H., Holsinger R.M.D., Kiang K.M.Y., Jiao J.',
      journal: 'Cell Death Discovery',
      volume: 11,
      issue: 1,
      pages: '74',
      date: '2025-02-23',
      abstract: 'Cancer stem cells (CSCs) are significant factors in the treatment resistance and recurrence of glioblastoma.',
    })
  })

  it('parses a record with a page range and no abstract field', async () => {
    const result = await fetchCrossrefWork('10.1002/jnr.24819', fakeFetch(CROSSREF_FIXTURE_GDM))
    expect(result).toEqual({
      title: 'Ground state depletion microscopy as a tool for studying microglia–synapse interactions',
      author: 'Paasila P.J.',
      journal: 'Journal of Neuroscience Research',
      volume: 99,
      issue: 6,
      pages: '1515-1532',
      date: '2021-03-07',
      abstract: null,
    })
  })

  it('throws with a clear message on a 404', async () => {
    await expect(fetchCrossrefWork('10.9999/does-not-exist', fakeFetch(null, false, 404))).rejects.toThrow(
      /no crossref record found/i
    )
  })

  it('throws with a clear message on a non-404 error status', async () => {
    await expect(fetchCrossrefWork('10.1038/x', fakeFetch(null, false, 503))).rejects.toThrow(
      /crossref lookup failed \(503\)/i
    )
  })

  it('throws if the record is missing a title, journal, or date', async () => {
    await expect(
      fetchCrossrefWork('10.1038/x', fakeFetch({ message: { author: [] } }))
    ).rejects.toThrow(/missing/i)
  })
})
