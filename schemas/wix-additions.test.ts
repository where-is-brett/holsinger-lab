// Contract tests: the Wix site's GROQ queries (lib/wix/queries.ts) and the
// importer (scripts/wix/plan.ts) address these field names as string
// literals. A rename here would break both silently -- GROQ returns null for
// an unknown field rather than erroring.
import { describe, expect, it } from 'vitest'

import mediaAppearance from './documents/mediaAppearance'
import newsItem from './documents/newsItem'
import profile from './documents/profile'
import project from './documents/project'
import settings from './singletons/settings'
import siteCopy from './singletons/siteCopy'

const names = (t: { fields: { name: string }[] }) => t.fields.map((f) => f.name)
type Field = { name: string; fields?: Field[]; of?: { fields?: Field[] }[] }
// `t` is typed `unknown` here rather than `{ fields: Field[] }`: the real
// schema types (siteCopy, settings, ...) have deeply nested field unions
// (blocks, annotations, ...) that share no keys with the all-optional
// `Field` shape, which trips TS's "no properties in common" weak-type
// check on structural assignment. The cast below still gets us the
// runtime behaviour the contract test needs.
const sub = (t: unknown, n: string) =>
  (
    (t as { fields: Field[] }).fields.find((f) => f.name === n) as Field
  ).fields!.map((f) => f.name)

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

describe('siteCopy', () => {
  it('has the fields the Wix site and importer rely on', () => {
    expect(names(siteCopy)).toEqual([
      'hero',
      'about',
      'teamIntro',
      'alumniSubtitle',
      'contactIntro',
    ])
    expect(sub(siteCopy, 'hero')).toEqual(['image', 'heading', 'subheading'])
    expect(sub(siteCopy, 'about')).toEqual(['heading', 'body', 'themesIntro', 'themes'])
    const themes = (siteCopy.fields.find((f) => f.name === 'about') as Field).fields!.find(
      (f) => f.name === 'themes'
    )!
    expect(themes.of![0].fields!.map((f) => f.name)).toEqual(['title', 'summary'])
  })
})

describe('additive fields on existing types', () => {
  it('settings.contact', () => {
    expect(sub(settings, 'contact')).toEqual(['address', 'email', 'phone'])
  })
  it('profile.roleDetail follows role', () => {
    const n = names(profile)
    expect(n.indexOf('roleDetail')).toBe(n.indexOf('role') + 1)
  })
  it('project.researchOrder', () => {
    expect(names(project)).toContain('researchOrder')
  })
})
