import { describe, expect, it } from 'vitest'

import { matchingTypeRules, TYPE_RULES } from './publicationTypes.ts'

// The 19 real [year, title, type] triples, copied verbatim from
// docs/redesign-experiment/design-system/ui_kits/site/LabData.jsx (`y`, `t`,
// `ty`). This is the ground truth this file's rules are checked against.
const PAPERS: { year: string; title: string; type: string }[] = [
  {
    year: '2025',
    title:
      'Chromobox protein homolog 7 suppresses the stem-like phenotype of glioblastoma cells by regulating the myosin heavy chain 9-NF-κB signaling pathway.',
    type: 'Article',
  },
  {
    year: '2024',
    title:
      'Development of a Cell Culture Chamber for Investigating the Therapeutic Effects of Electrical Stimulation on Neural Growth.',
    type: 'Article',
  },
  {
    year: '2023',
    title: "INPP5D/SHIP1: Expression, Regulation and Roles in Alzheimer's Disease Pathophysiology.",
    type: 'Review',
  },
  {
    year: '2023',
    title: 'Neuroprotective Effects of Carnosic Acid: Insight into its Mechanisms of Action',
    type: 'Review',
  },
  {
    year: '2023',
    title: 'Oxidative Stress and Antioxidants in Neurodegenerative Disorders',
    type: 'Review',
  },
  {
    year: '2023',
    title:
      'Fiber and Electrical Field Alignment Increases BDNF Expression in SH-SY5Y Cells following Electrical Stimulation.',
    type: 'Article',
  },
  {
    year: '2023',
    title: 'The Role of Fecal Microbiota Transplantation in the Treatment of Neurodegenerative Diseases: A Review',
    type: 'Review',
  },
  {
    year: '2022',
    title:
      "Fecal Microbiota Transplantation Reduces Pathology and Improves Cognition in a Mouse Model of Alzheimer's Disease",
    type: 'Article',
  },
  {
    year: '2022',
    title: "Non-Pharmacological Therapeutic Options for the Treatment of Alzheimer's Disease",
    type: 'Review',
  },
  {
    year: '2022',
    title: "Variant TREM2 Signaling in Alzheimer's Disease",
    type: 'Review',
  },
  {
    year: '2021',
    title: 'Diagnostic Conundrums in Cerebellar Cryptic Arteriovenous Malformations.',
    type: 'Case report',
  },
  {
    year: '2021',
    title: 'Ground state depletion microscopy as a tool for studying microglia-synapse interactions',
    type: 'Article',
  },
  {
    year: '2020',
    title: "Altered Brain Leptin and Leptin Receptor Expression in the 5XFAD Mouse Model of Alzheimer's Disease.",
    type: 'Article',
  },
  {
    year: '2020',
    title: 'In Vitro Biocompatibility of Piezoelectric K0.5Na0.5NbO3 Thin Films on Platinized Silicon Substrates.',
    type: 'Article',
  },
  {
    year: '2020',
    title: "Genome-Wide Integrative Analysis Reveals Common Molecular Signatures in Blood and Brain of Alzheimer's Disease.",
    type: 'Article',
  },
  {
    year: '2020',
    title: "Altered Brain Adiponectin Receptor Expression in the 5XFAD Mouse Model of Alzheimer's Disease.",
    type: 'Article',
  },
  {
    year: '2020',
    title: 'Selective, high-contrast detection of syngeneic glioblastoma in vivo.',
    type: 'Article',
  },
  {
    year: '2020',
    title: "Cyclical amyloid beta-astrocyte activity induces oxidative stress in Alzheimer's disease.",
    type: 'Review',
  },
  {
    year: '2020',
    title:
      "Identification of molecular signatures and pathways to identify novel therapeutic targets in Alzheimer's disease: Insights from a systems biomedicine perspective.",
    type: 'Article',
  },
]

describe('publication type rules', () => {
  it('covers all 19 papers from the agreed IA', () => {
    expect(TYPE_RULES).toHaveLength(19)
  })

  it('gives every rule a distinct label, so audit output is unambiguous', () => {
    expect(new Set(TYPE_RULES.map((r) => r.label)).size).toBe(TYPE_RULES.length)
  })

  it('keeps every keyword lowercase, since matching lowercases the title', () => {
    for (const rule of TYPE_RULES) {
      expect(rule.keyword).toBe(rule.keyword.toLowerCase())
    }
  })

  it('has no two rules that could both match one paper', () => {
    for (const a of TYPE_RULES) {
      for (const b of TYPE_RULES) {
        if (a === b || a.year !== b.year) continue
        expect(a.keyword.includes(b.keyword)).toBe(false)
      }
    }
  })

  it('matches each of the 19 real papers to exactly one rule, with the right type', () => {
    const usedLabels = new Set<string>()
    for (const paper of PAPERS) {
      const hits = matchingTypeRules(paper.title, `${paper.year}-01-01`)
      expect(hits, `expected exactly one rule for "${paper.title}"`).toHaveLength(1)
      expect(hits[0].type).toBe(paper.type)
      usedLabels.add(hits[0].label)
    }
    // Every rule matches exactly one pair -- none left unused.
    expect(usedLabels.size).toBe(TYPE_RULES.length)
  })

  it('distributes the 19 papers Article 11 / Review 7 / Case report 1', () => {
    const counts = new Map<string, number>()
    for (const paper of PAPERS) {
      counts.set(paper.type, (counts.get(paper.type) ?? 0) + 1)
    }
    expect(counts.get('Article')).toBe(11)
    expect(counts.get('Review')).toBe(7)
    expect(counts.get('Case report')).toBe(1)
    expect([...counts.values()].reduce((a, b) => a + b, 0)).toBe(19)
  })
})

describe('matchingTypeRules', () => {
  it('is case-insensitive on the title', () => {
    expect(matchingTypeRules('CARNOSIC ACID and the brain', '2023-03-01')).toHaveLength(1)
  })

  it('separates the two FMT papers by year', () => {
    const title = 'Faecal microbiota transplantation in Alzheimer disease'
    expect(matchingTypeRules(title, '2023-06-01').map((r) => r.label)).toEqual(["FMT review '23"])
    expect(matchingTypeRules(title, '2022-06-01').map((r) => r.label)).toEqual(["FMT 5xFAD '22"])
  })

  it('separates the two glioblastoma papers by year', () => {
    expect(
      matchingTypeRules('Glioblastoma imaging with PET', '2020-01-01').map((r) => r.label)
    ).toEqual(["Glioblastoma PET '20"])
    const cbx7 = matchingTypeRules(
      'Chromobox protein homolog 7 suppresses the stem-like phenotype of glioblastoma cells',
      '2025-01-30'
    )
    expect(cbx7.map((r) => r.label)).toEqual(["CBX7 '25"])
  })

  it('returns nothing for a paper it does not recognise', () => {
    expect(matchingTypeRules('An entirely unrelated paper', '2019-01-01')).toEqual([])
    expect(matchingTypeRules('Carnosic acid', '2015-01-01')).toEqual([])
  })

  it('handles a missing date without throwing', () => {
    expect(matchingTypeRules('Carnosic acid', null)).toEqual([])
  })
})
