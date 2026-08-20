import { describe, expect, it } from 'vitest'

import { TOPIC_TITLES } from '../schemas/lib/topics'
import { matchingRules, TOPIC_RULES } from './publicationTopics'

describe('publication topic rules', () => {
  it('covers all 19 papers from the agreed IA', () => {
    expect(TOPIC_RULES).toHaveLength(19)
  })

  // agreed-ia.md section 4 states the per-tag counts as (3), (4), (3), (4), (5).
  // If a rule is retagged by hand these counts catch it.
  it('distributes them across the five tags exactly as the IA states', () => {
    const counts = new Map<string, number>()
    for (const rule of TOPIC_RULES) {
      counts.set(rule.topic, (counts.get(rule.topic) ?? 0) + 1)
    }
    expect(counts.get('Gut–brain & non-pharm therapies')).toBe(3)
    expect(counts.get('Glia & neuroinflammation')).toBe(4)
    expect(counts.get('Electrical stimulation & neural engineering')).toBe(3)
    expect(counts.get('Metabolism, oxidative stress & neuroprotection')).toBe(4)
    expect(counts.get('Neuro-oncology & biomarkers')).toBe(5)
    expect([...counts.values()].reduce((a, b) => a + b, 0)).toBe(19)
  })

  it('only ever assigns tags from the taxonomy', () => {
    for (const rule of TOPIC_RULES) {
      expect(TOPIC_TITLES).toContain(rule.topic)
    }
  })

  it('keeps every keyword lowercase, since matching lowercases the title', () => {
    for (const rule of TOPIC_RULES) {
      expect(rule.keyword).toBe(rule.keyword.toLowerCase())
    }
  })

  it('gives every rule a distinct label, so audit output is unambiguous', () => {
    expect(new Set(TOPIC_RULES.map((r) => r.label)).size).toBe(
      TOPIC_RULES.length
    )
  })

  it('has no two rules that could both match one paper', () => {
    // Two rules sharing a year where one keyword contains the other would make
    // a double match structurally possible. Same year + same keyword certainly
    // would -- that is why the two FMT papers are split by year.
    for (const a of TOPIC_RULES) {
      for (const b of TOPIC_RULES) {
        if (a === b || a.year !== b.year) continue
        expect(a.keyword.includes(b.keyword)).toBe(false)
      }
    }
  })
})

describe('matchingRules', () => {
  it('matches on year and keyword together', () => {
    const hits = matchingRules(
      'Chromobox protein homolog 7 suppresses …',
      '2025-01-30'
    )
    expect(hits.map((r) => r.label)).toEqual(["CBX7 '25"])
    expect(hits[0].topic).toBe('Neuro-oncology & biomarkers')
  })

  it('is case-insensitive on the title', () => {
    expect(
      matchingRules('CARNOSIC ACID and the brain', '2023-03-01')
    ).toHaveLength(1)
  })

  // The case the year field exists to disambiguate.
  it('separates the two FMT papers by year', () => {
    const title = 'Faecal microbiota transplantation in Alzheimer disease'
    expect(matchingRules(title, '2023-06-01').map((r) => r.label)).toEqual([
      "FMT review '23",
    ])
    expect(matchingRules(title, '2022-06-01').map((r) => r.label)).toEqual([
      "FMT 5xFAD '22",
    ])
  })

  it('separates the two glioblastoma papers by year', () => {
    expect(
      matchingRules('Glioblastoma imaging with PET', '2020-01-01').map(
        (r) => r.label
      )
    ).toEqual(["Glioblastoma PET '20"])
    // The 2025 CBX7 paper also says glioblastoma, and must not pick up the 2020 rule.
    const cbx7 = matchingRules(
      'Chromobox protein homolog 7 suppresses the stem-like phenotype of glioblastoma cells',
      '2025-01-30'
    )
    expect(cbx7.map((r) => r.label)).toEqual(["CBX7 '25"])
  })

  it('returns nothing for a paper it does not recognise', () => {
    expect(matchingRules('An entirely unrelated paper', '2019-01-01')).toEqual(
      []
    )
    // Right keyword, wrong year.
    expect(matchingRules('Carnosic acid', '2015-01-01')).toEqual([])
  })

  it('handles a missing date without throwing', () => {
    expect(matchingRules('Carnosic acid', null)).toEqual([])
  })
})
