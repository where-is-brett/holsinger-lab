// scripts/publicationTypes.ts
// Maps each of the 19 live publications to its `type` (Article / Review /
// Case report), transcribed from agreed-ia.md section 2 and the ui_kit's
// LabData.jsx (`ty`). Used by scripts/backfill-publication-types.ts.
//
// Same matching strategy as publicationTopics.ts: each rule matches on
// publication year plus a distinctive keyword that must appear in the title.
// Year alone is not unique -- seven of the nineteen are 2020 -- and keyword
// alone is not either, as the two FMT papers show. Where a topic rule's
// keyword is already unique within its year, this file reuses it verbatim.
//
// This deliberately does NOT resolve ambiguity. A rule that matches nothing, a
// paper that matches nothing, and a paper that matches more than one rule are
// all reported by the backfill script for a human to settle. Guessing here
// would put a wrong type on a real paper, and an untyped paper still lists
// under the year and topic facets -- so leaving one untyped is safe, while
// mis-typing it is not.

export type PublicationType = 'Article' | 'Review' | 'Case report'

export interface TypeRule {
  /** The paper's shorthand, for audit output. */
  label: string
  /** Four-digit publication year. */
  year: string
  /** Lowercase substring that must appear in the lowercased title. */
  keyword: string
  type: PublicationType
}

export const TYPE_RULES: TypeRule[] = [
  { label: "CBX7 '25", year: '2025', keyword: 'chromobox', type: 'Article' },
  { label: "ES chamber '24", year: '2024', keyword: 'chamber', type: 'Article' },
  { label: "INPP5D/SHIP1 '23", year: '2023', keyword: 'inpp5d', type: 'Review' },
  { label: "Carnosic acid '23", year: '2023', keyword: 'carnosic', type: 'Review' },
  {
    label: "Oxidative stress & antioxidants '23",
    year: '2023',
    keyword: 'antioxidant',
    type: 'Review',
  },
  { label: "Fiber/EF BDNF '23", year: '2023', keyword: 'bdnf', type: 'Article' },
  {
    label: "FMT review '23",
    year: '2023',
    keyword: 'microbiota transplant',
    type: 'Review',
  },
  {
    label: "FMT 5xFAD '22",
    year: '2022',
    keyword: 'microbiota transplant',
    type: 'Article',
  },
  {
    label: "Non-pharmacological options '22",
    year: '2022',
    keyword: 'non-pharmacological',
    type: 'Review',
  },
  { label: "TREM2 '22", year: '2022', keyword: 'trem2', type: 'Review' },
  {
    label: "Cerebellar AVM '21",
    year: '2021',
    keyword: 'cerebellar',
    type: 'Case report',
  },
  {
    label: "GSDIM microglia-synapse '21",
    year: '2021',
    keyword: 'microglia-synapse',
    type: 'Article',
  },
  { label: "Leptin/LepR '20", year: '2020', keyword: 'leptin', type: 'Article' },
  {
    label: "KNN piezoelectric films '20",
    year: '2020',
    keyword: 'piezoelectric',
    type: 'Article',
  },
  {
    label: "Genome-wide blood-brain '20",
    year: '2020',
    keyword: 'genome-wide',
    type: 'Article',
  },
  { label: "Adiponectin '20", year: '2020', keyword: 'adiponectin', type: 'Article' },
  {
    label: "Glioblastoma PET '20",
    year: '2020',
    keyword: 'glioblastoma',
    type: 'Article',
  },
  {
    label: "Ab-astrocyte oxidative stress '20",
    year: '2020',
    keyword: 'astrocyte',
    type: 'Review',
  },
  {
    label: "Molecular signatures '20",
    year: '2020',
    keyword: 'systems biomedicine',
    type: 'Article',
  },
]

/** Every rule whose year and keyword both match the given publication. */
export function matchingTypeRules(title: string, date: string | null): TypeRule[] {
  const year = typeof date === 'string' ? date.slice(0, 4) : ''
  const haystack = title.toLowerCase()
  return TYPE_RULES.filter(
    (rule) => rule.year === year && haystack.includes(rule.keyword)
  )
}
