// The publication topic-tag taxonomy agreed in the redesign IA
// (docs/redesign-experiment/design-system/agreed-ia.md section 4).
//
// Flat tags on `publication`; deliberately no theme documents, pages or
// overviews. The list is closed -- Studio offers exactly these five and
// nothing else -- because the IA's whole point is that five tags cover all
// 19 papers. Adding a sixth is a content-model decision, made here.
//
// The IA's standing rule, which the UI must honour: every paper gets at
// least one tag at entry, but an untagged paper still appears under the year
// and type facets. The record never hides anything, so `topics` is optional
// and no validation requires it.

export const TOPIC_TITLES = [
  'Gut–brain & non-pharm therapies',
  'Glia & neuroinflammation',
  'Electrical stimulation & neural engineering',
  'Metabolism, oxidative stress & neuroprotection',
  'Neuro-oncology & biomarkers',
] as const

export type TopicTitle = (typeof TOPIC_TITLES)[number]

/**
 * Studio list options for the `topics` field. The stored value is the title
 * itself rather than a separate key: the titles are the taxonomy's identity
 * in `agreed-ia.md`, they are what the design mockups render verbatim, and a
 * parallel key space would be one more thing to keep in sync for no gain.
 */
export const TOPIC_OPTIONS: { title: TopicTitle; value: TopicTitle }[] =
  TOPIC_TITLES.map((title) => ({ title, value: title }))

/** Narrows an arbitrary string to a known topic title. */
export function isTopicTitle(value: string): value is TopicTitle {
  return (TOPIC_TITLES as readonly string[]).includes(value)
}
