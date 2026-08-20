// scripts/publicationTopics.ts
// Maps each of the 19 live publications to its topic tag, transcribed from the
// agreed IA's 19/19 mapping (docs/redesign-experiment/design-system/
// agreed-ia.md section 4). Used by scripts/backfill-publication-topics.ts.
//
// The IA identifies each paper by a shorthand ("TREM2 '22", "Carnosic acid
// '23"), not by _id or full title, so each rule matches on publication year
// plus a distinctive keyword that must appear in the title. Year alone is not
// unique -- seven of the nineteen are 2020 -- and keyword alone is not either,
// as the two FMT papers show.
//
// This deliberately does NOT resolve ambiguity. A rule that matches nothing, a
// paper that matches nothing, and a paper that matches more than one rule are
// all reported by the backfill script for a human to settle. Guessing here
// would put a wrong tag on a real paper, and the IA's own rule is that an
// untagged paper still lists under the year and type facets -- so leaving one
// untagged is safe, while mis-tagging it is not.

import type { TopicTitle } from '../schemas/lib/topics.ts'

export interface TopicRule {
  /** The IA's shorthand for this paper, for audit output. */
  label: string
  /** Four-digit publication year. */
  year: string
  /** Lowercase substring that must appear in the lowercased title. */
  keyword: string
  topic: TopicTitle
}

export const TOPIC_RULES: TopicRule[] = [
  // Gut-brain & non-pharm therapies (3)
  {
    label: "FMT review '23",
    year: '2023',
    keyword: 'microbiota transplant',
    topic: 'Gut–brain & non-pharm therapies',
  },
  {
    label: "FMT 5xFAD '22",
    year: '2022',
    keyword: 'microbiota transplant',
    topic: 'Gut–brain & non-pharm therapies',
  },
  {
    label: "Non-pharmacological options '22",
    year: '2022',
    keyword: 'non-pharmacological',
    topic: 'Gut–brain & non-pharm therapies',
  },

  // Glia & neuroinflammation (4)
  {
    label: "INPP5D/SHIP1 '23",
    year: '2023',
    keyword: 'inpp5d',
    topic: 'Glia & neuroinflammation',
  },
  {
    label: "TREM2 '22",
    year: '2022',
    keyword: 'trem2',
    topic: 'Glia & neuroinflammation',
  },
  {
    label: "GSDIM microglia-synapse '21",
    year: '2021',
    keyword: 'gsdim',
    topic: 'Glia & neuroinflammation',
  },
  {
    label: "Ab-astrocyte oxidative stress '20",
    year: '2020',
    keyword: 'astrocyte',
    topic: 'Glia & neuroinflammation',
  },

  // Electrical stimulation & neural engineering (3)
  {
    label: "ES chamber '24",
    year: '2024',
    keyword: 'chamber',
    topic: 'Electrical stimulation & neural engineering',
  },
  {
    label: "Fiber/EF BDNF '23",
    year: '2023',
    keyword: 'bdnf',
    topic: 'Electrical stimulation & neural engineering',
  },
  {
    label: "KNN piezoelectric films '20",
    year: '2020',
    keyword: 'piezoelectric',
    topic: 'Electrical stimulation & neural engineering',
  },

  // Metabolism, oxidative stress & neuroprotection (4)
  {
    label: "Carnosic acid '23",
    year: '2023',
    keyword: 'carnosic',
    topic: 'Metabolism, oxidative stress & neuroprotection',
  },
  {
    label: "Oxidative stress & antioxidants '23",
    year: '2023',
    keyword: 'antioxidant',
    topic: 'Metabolism, oxidative stress & neuroprotection',
  },
  {
    label: "Leptin/LepR '20",
    year: '2020',
    keyword: 'leptin',
    topic: 'Metabolism, oxidative stress & neuroprotection',
  },
  {
    label: "Adiponectin '20",
    year: '2020',
    keyword: 'adiponectin',
    topic: 'Metabolism, oxidative stress & neuroprotection',
  },

  // Neuro-oncology & biomarkers (5)
  {
    label: "CBX7 '25",
    year: '2025',
    keyword: 'chromobox',
    topic: 'Neuro-oncology & biomarkers',
  },
  {
    label: "Glioblastoma PET '20",
    year: '2020',
    keyword: 'glioblastoma',
    topic: 'Neuro-oncology & biomarkers',
  },
  {
    label: "Genome-wide blood-brain '20",
    year: '2020',
    keyword: 'genome-wide',
    topic: 'Neuro-oncology & biomarkers',
  },
  {
    label: "Molecular signatures '20",
    year: '2020',
    keyword: 'molecular signature',
    topic: 'Neuro-oncology & biomarkers',
  },
  {
    label: "Cerebellar AVM '21",
    year: '2021',
    keyword: 'cerebellar',
    topic: 'Neuro-oncology & biomarkers',
  },
]

/** Every rule whose year and keyword both match the given publication. */
export function matchingRules(title: string, date: string | null): TopicRule[] {
  const year = typeof date === 'string' ? date.slice(0, 4) : ''
  const haystack = title.toLowerCase()
  return TOPIC_RULES.filter(
    (rule) => rule.year === year && haystack.includes(rule.keyword)
  )
}
