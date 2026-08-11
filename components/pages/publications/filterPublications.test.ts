import { describe, expect, it } from 'vitest'

import { filterPublications, getAvailableYears } from './filterPublications'

const CBX7 = {
  _id: 'cbx7',
  title:
    'Chromobox protein homolog 7 suppresses the stem-like phenotype of glioblastoma cells',
  author: 'Ni K., Liu Y., Holsinger R.M.D.',
  journal: 'Cell Death Discovery',
  abstract: null,
  date: '2025-02-23',
}

const PHARMACEUTICALS = {
  _id: 'pharma',
  title:
    'Fiber and Electrical Field Alignment Increases BDNF Expression in SH-SY5Y Cells following Electrical Stimulation',
  author: 'Huynh Q-S, Holsinger RMD.',
  journal: 'Pharmaceuticals',
  abstract: 'Electrical stimulation has shown promise in promoting neural growth.',
  date: '2023-01-17',
}

const BIOCHIMIE = {
  _id: 'biochimie',
  title:
    "Cyclical amyloid beta-astrocyte activity induces oxidative stress in Alzheimer's disease",
  author: 'Elangovan, S., Holsinger, RMD.',
  journal: 'Biochimie',
  abstract: 'Amyloid beta accumulation is a hallmark of Alzheimer’s disease pathology.',
  date: '2020-02-20',
}

const ALL = [CBX7, PHARMACEUTICALS, BIOCHIMIE]

describe('filterPublications', () => {
  it('matches a title substring, case-insensitively', () => {
    expect(filterPublications(ALL, { query: 'CHROMOBOX' }).map((p) => p._id)).toEqual(['cbx7'])
  })

  it('matches an author substring', () => {
    expect(filterPublications(ALL, { query: 'huynh' }).map((p) => p._id)).toEqual(['pharma'])
  })

  it('matches a journal substring', () => {
    expect(filterPublications(ALL, { query: 'pharmaceuticals' }).map((p) => p._id)).toEqual([
      'pharma',
    ])
  })

  it('matches an abstract substring', () => {
    expect(filterPublications(ALL, { query: 'amyloid beta' }).map((p) => p._id)).toEqual([
      'biochimie',
    ])
  })

  it('returns everything for an empty or whitespace-only query', () => {
    expect(filterPublications(ALL, { query: '' })).toHaveLength(3)
    expect(filterPublications(ALL, { query: '   ' })).toHaveLength(3)
  })

  it('filters by year', () => {
    expect(filterPublications(ALL, { year: '2020' }).map((p) => p._id)).toEqual(['biochimie'])
  })

  it('treats an empty year as "all years"', () => {
    expect(filterPublications(ALL, { year: '' })).toHaveLength(3)
  })

  it('combines query and year as AND, not OR', () => {
    expect(filterPublications(ALL, { query: 'amyloid', year: '2020' })).toHaveLength(1)
    expect(filterPublications(ALL, { query: 'amyloid', year: '2023' })).toHaveLength(0)
  })

  it('buckets a null date under "Undated" for the year filter', () => {
    const undated = { ...CBX7, date: null }
    expect(filterPublications([undated], { year: 'Undated' })).toHaveLength(1)
    expect(filterPublications([undated], { year: '2025' })).toHaveLength(0)
  })
})

describe('getAvailableYears', () => {
  it('returns distinct years in input order (assumes date-desc-sorted input)', () => {
    expect(getAvailableYears(ALL)).toEqual(['2025', '2023', '2020'])
  })

  it('returns an empty array for an empty input', () => {
    expect(getAvailableYears([])).toEqual([])
  })
})
