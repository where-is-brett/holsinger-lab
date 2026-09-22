// Contract tests: the Wix site's GROQ queries (lib/wix/queries.ts) and the
// importer (scripts/wix/plan.ts) address these field names as string
// literals. A rename here would break both silently -- GROQ returns null for
// an unknown field rather than erroring.
import { describe, expect, it } from 'vitest'

import mediaAppearance from './documents/mediaAppearance'
import newsItem from './documents/newsItem'

const names = (t: { fields: { name: string }[] }) => t.fields.map((f) => f.name)

describe('newsItem', () => {
  it('has the fields the Wix site and importer rely on', () => {
    expect(names(newsItem)).toEqual([
      'orderRank',
      'title',
      'body',
      'summary',
      'date',
      'showOnHome',
      'showOnNewsPage',
    ])
  })
  it('defaults both placements to shown', () => {
    const f = (n: string) => newsItem.fields.find((x) => x.name === n) as { initialValue?: unknown }
    expect(f('showOnHome').initialValue).toBe(true)
    expect(f('showOnNewsPage').initialValue).toBe(true)
  })
})

describe('mediaAppearance', () => {
  it('has the fields the Wix site and importer rely on', () => {
    expect(names(mediaAppearance)).toEqual([
      'orderRank',
      'title',
      'outlet',
      'date',
      'url',
      'video',
      'poster',
    ])
  })
  it('accepts only mp4 video', () => {
    const video = mediaAppearance.fields.find((x) => x.name === 'video') as {
      options?: { accept?: string }
    }
    expect(video.options?.accept).toBe('video/mp4')
  })
})
