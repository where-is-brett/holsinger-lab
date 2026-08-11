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

  it('strips plain (non-jats:) inline tags like <i> and <sub>', () => {
    expect(stripJatsTags('<i>Foo</i> <sub>Bar</sub>')).toBe('Foo Bar')
  })
})

// Real Crossref API responses (trimmed to the fields this module reads),
// captured live from https://api.crossref.org/works/{doi} on 2026-08-11 for
// two of the live dataset's actual DOIs -- design doc §5's "real data, not
// invented fixtures" standard, extended from the 19 URLs (Task 1) to Crossref
// itself.
//
// Plan correction, recorded during Task 2's review. This section originally
// paired CBX7 with a second fixture for 10.1002/jnr.24819 (the wiley/GDM
// paper), claiming a "Paul J. Paasila" author and no abstract field. Neither
// was true of the live record -- the real first author is "Patrick Jarmo
// Paasila" among 12 authors, and the record does carry a JATS-wrapped
// abstract. That fixture was fabricated at plan-writing time, not captured,
// which the task's own re-review (dispatched against the live implementation)
// caught by re-fetching the DOI. It has been replaced below with a DOI that
// is genuinely abstract-less in the live Crossref data
// (10.1021/acsabm.0c01111, the piezoelectric thin-films paper -- also in
// the 19-publication dataset), keeping the "no abstract" code path tested
// against a real response rather than an invented one.
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

const CROSSREF_FIXTURE_THIN_FILMS = {
  message: {
    title: [
      '<i>In Vitro</i> Biocompatibility of Piezoelectric K<sub>0.5</sub>Na<sub>0.5</sub>NbO<sub>3</sub> Thin Films on Platinized Silicon Substrates',
    ],
    author: [
      { given: 'Nikolai Helth', family: 'Gaukås' },
      { given: 'Quy-Susan', family: 'Huynh' },
      { given: 'Anishchal A.', family: 'Pratap' },
      { given: 'Mari-Ann', family: 'Einarsrud' },
      { given: 'Tor', family: 'Grande' },
      { given: 'R. M. Damian', family: 'Holsinger' },
      { given: 'Julia', family: 'Glaum' },
    ],
    'container-title': ['ACS Applied Bio Materials'],
    volume: '3',
    issue: '12',
    page: '8714-8721',
    published: { 'date-parts': [[2020, 11, 6]] },
    // No `abstract` field at all -- Crossref omits it for some records.
    // Confirmed absent on the live record, not merely undefined here.
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

  it('parses a real record with no abstract field and a 7-author list', async () => {
    const result = await fetchCrossrefWork('10.1021/acsabm.0c01111', fakeFetch(CROSSREF_FIXTURE_THIN_FILMS))
    expect(result).toEqual({
      title:
        'In Vitro Biocompatibility of Piezoelectric K0.5Na0.5NbO3 Thin Films on Platinized Silicon Substrates',
      author: 'Gaukås N.H., Huynh Q.S., Pratap A.A., Einarsrud M.A., Grande T., Holsinger R.M.D., Glaum J.',
      journal: 'ACS Applied Bio Materials',
      volume: 3,
      issue: 12,
      pages: '8714-8721',
      date: '2020-11-06',
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
