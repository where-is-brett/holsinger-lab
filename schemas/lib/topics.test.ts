import { describe, expect, it } from 'vitest'

import { isTopicTitle, TOPIC_OPTIONS, TOPIC_TITLES } from './topics'

describe('publication topic taxonomy', () => {
  // Transcribed from docs/redesign-experiment/design-system/agreed-ia.md
  // section 4, which is the agreed IA and the authority for these strings.
  // The counts are that section's own 19/19 mapping and are asserted in
  // scripts/publicationTopics.test.ts against the tag table.
  it('is exactly the five agreed tags, in the IA order', () => {
    expect(TOPIC_TITLES).toEqual([
      'Gut–brain & non-pharm therapies',
      'Glia & neuroinflammation',
      'Electrical stimulation & neural engineering',
      'Metabolism, oxidative stress & neuroprotection',
      'Neuro-oncology & biomarkers',
    ])
  })

  // The design system renders these verbatim, and the standing rule from
  // Phase 1 is that identifiers are never silently reshaped. An en dash that
  // decayed to a hyphen would not be caught by any other assertion here.
  it('spells "Gut–brain" with an en dash, as the IA does', () => {
    expect(TOPIC_TITLES[0]).toContain('Gut–brain')
    expect(TOPIC_TITLES[0]).not.toContain('Gut-brain')
    // 'non-pharm' keeps its ordinary hyphen -- only the compound is an en dash.
    expect(TOPIC_TITLES[0]).toContain('non-pharm')
  })

  it('exposes each title as its own stored value -- no parallel key space', () => {
    expect(TOPIC_OPTIONS).toHaveLength(TOPIC_TITLES.length)
    for (const option of TOPIC_OPTIONS) {
      expect(option.title).toBe(option.value)
      expect(TOPIC_TITLES).toContain(option.value)
    }
  })

  it('narrows known titles and rejects near-misses', () => {
    expect(isTopicTitle('Glia & neuroinflammation')).toBe(true)
    // A hyphen where the IA has an en dash is the realistic typo.
    expect(isTopicTitle('Gut-brain & non-pharm therapies')).toBe(false)
    expect(isTopicTitle('glia & neuroinflammation')).toBe(false)
    expect(isTopicTitle('Something else entirely')).toBe(false)
  })
})
