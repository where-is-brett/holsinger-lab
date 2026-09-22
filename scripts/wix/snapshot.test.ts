import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { validateSnapshot, type WixSnapshot } from './snapshot.ts'

const load = (): WixSnapshot =>
  JSON.parse(readFileSync(new URL('../../data/wix/snapshot.json', import.meta.url), 'utf8'))

describe('data/wix/snapshot.json', () => {
  it('is valid', () => {
    expect(validateSnapshot(load())).toEqual([])
  })
  it('holds the counts captured on 2026-09-22', () => {
    const s = load()
    expect(s.news).toHaveLength(4)
    expect(s.news.filter((n) => n.showOnNewsPage)).toHaveLength(3)
    expect(s.media).toHaveLength(3)
    expect(s.projects).toHaveLength(4)
    expect(s.publications).toHaveLength(17)
    expect(s.people.filter((p) => p.group === 'International Interns')).toHaveLength(6)
    const alumni = s.people.filter((p) => p.group === 'Lab Alumni')
    expect(alumni.filter((p) => p.imageUrl !== null || p.sanityId !== null)).toHaveLength(6) // photo cards
    expect(alumni.filter((p) => p.imageUrl === null && p.sanityId === null)).toHaveLength(15) // name rows
    expect(s.people.filter((p) => p.sanityId === null)).toHaveLength(22) // new profiles
    // Rene Buxton appears twice on Wix; the snapshot corrects it to once.
    expect(s.people.filter((p) => p.name === 'Rene Buxton')).toHaveLength(1)
  })
})

describe('validateSnapshot', () => {
  const minimal = (): WixSnapshot => ({
    capturedAt: '2026-09-22',
    siteCopy: {
      hero: { imageUrl: null, imageAlt: '', heading: 'h', subheading: 's' },
      about: { heading: 'a', paragraphs: ['p'], themesIntro: 't', themes: [] },
      teamIntro: 'i',
      alumniSubtitle: '2020 - present',
      contactIntro: 'c',
    },
    contact: { address: 'a', email: 'e@x.org', phone: '1' },
    news: [],
    media: [],
    projects: [],
    people: [],
    publications: [],
  })

  it('rejects duplicate keys within a collection', () => {
    const s = minimal()
    s.news = [
      { key: 'a', title: 't', paragraphs: [], summary: null, showOnHome: true, showOnNewsPage: true },
      { key: 'a', title: 't', paragraphs: [], summary: null, showOnHome: true, showOnNewsPage: true },
    ]
    expect(validateSnapshot(s)).toContain('news: duplicate key "a"')
  })
  it('rejects an unknown role group', () => {
    const s = minimal()
    s.people = [
      { key: 'x', sanityId: null, name: 'X', role: 'r', roleDetail: null, group: 'Alumni' as never, imageUrl: null },
    ]
    expect(validateSnapshot(s)).toContain('people.x: unknown group "Alumni"')
  })
  it('rejects asset URLs that are not Wix originals', () => {
    const s = minimal()
    s.siteCopy.hero.imageUrl = 'https://example.com/a.png'
    expect(validateSnapshot(s)).toContain('siteCopy.hero.imageUrl: not a wixstatic original')
  })
  it('requires date and journal on publications that are new', () => {
    const s = minimal()
    s.publications = [
      { key: 'p', sanityId: null, title: 't', authors: 'a', journal: null, date: null, volume: null, issue: null, pages: null, doi: null },
    ]
    expect(validateSnapshot(s)).toEqual(
      expect.arrayContaining(['publications.p: new publication needs date', 'publications.p: new publication needs journal'])
    )
  })
})
