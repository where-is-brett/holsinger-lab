import { describe, expect, it } from 'vitest'

import {
  currentMemberCount,
  firstSentence,
  homeStatement,
  IA_TAGLINE,
  maestroOverview,
  peopleStrip,
  plainTagline,
  researchCards,
  resolveLabHeadHref,
  shouldShowLabHeadCard,
  splitLead,
} from './homeModel'

// Moved unchanged from components/pages/home/shouldShowLabHeadCard.test.ts
// (Task 3 brief) -- same assertions, only the import path changed.
describe('shouldShowLabHeadCard', () => {
  it('is false when labHead is unset', () => {
    expect(
      shouldShowLabHeadCard({ labHead: null, showLabHeadOnHome: true })
    ).toBe(false)
  })

  it('is true when labHead is set and showLabHeadOnHome is unset', () => {
    expect(shouldShowLabHeadCard({ labHead: { _id: 'p1' } })).toBe(true)
    expect(
      shouldShowLabHeadCard({ labHead: { _id: 'p1' }, showLabHeadOnHome: null })
    ).toBe(true)
  })

  it('is false when showLabHeadOnHome is explicitly false, even with labHead set', () => {
    expect(
      shouldShowLabHeadCard({ labHead: { _id: 'p1' }, showLabHeadOnHome: false })
    ).toBe(false)
  })
})

// Moved unchanged from components/pages/home/resolveLabHeadHref.test.ts.
describe('resolveLabHeadHref', () => {
  it("links to the person's own page when hasPage is true and a slug exists", () => {
    expect(
      resolveLabHeadHref({ hasPage: true, slug: 'damian-holsinger' })
    ).toBe('/people/damian-holsinger')
  })

  it('falls back to /people when hasPage is false', () => {
    expect(resolveLabHeadHref({ hasPage: false, slug: 'damian-holsinger' })).toBe(
      '/people'
    )
  })

  it('falls back to /people when hasPage is true but slug is missing', () => {
    expect(resolveLabHeadHref({ hasPage: true, slug: null })).toBe('/people')
  })

  it('falls back to /people when both are unset', () => {
    expect(resolveLabHeadHref({})).toBe('/people')
  })
})

describe('currentMemberCount', () => {
  const ALUMNI_GROUP = { _id: 'alumni', title: 'Lab Alumni' }
  const SCIENTIST_GROUP = { _id: 'scientist', title: 'Research Scientist' }
  const roleGroups = [SCIENTIST_GROUP, ALUMNI_GROUP]

  it('excludes profiles in the alumni group', () => {
    const profiles = [
      { _id: 'p1', roleGroup: SCIENTIST_GROUP },
      { _id: 'p2', roleGroup: ALUMNI_GROUP },
      { _id: 'p3', roleGroup: ALUMNI_GROUP },
    ]
    expect(currentMemberCount(profiles, roleGroups, null)).toBe(1)
  })

  it('excludes the lab head only when an id is passed', () => {
    const profiles = [
      { _id: 'p1', roleGroup: SCIENTIST_GROUP },
      { _id: 'p2', roleGroup: SCIENTIST_GROUP },
    ]
    expect(currentMemberCount(profiles, roleGroups, 'p1')).toBe(1)
    expect(currentMemberCount(profiles, roleGroups, null)).toBe(2)
    expect(currentMemberCount(profiles, roleGroups, undefined)).toBe(2)
  })

  it('counts ungrouped profiles', () => {
    const profiles = [
      { _id: 'p1', roleGroup: null },
      { _id: 'p2' },
    ]
    expect(currentMemberCount(profiles, roleGroups, null)).toBe(2)
  })

  it('excludes both the alumni group and the lab head together', () => {
    const profiles = [
      { _id: 'p1', roleGroup: SCIENTIST_GROUP },
      { _id: 'p2', roleGroup: ALUMNI_GROUP },
      { _id: 'lab-head', roleGroup: null },
    ]
    expect(currentMemberCount(profiles, roleGroups, 'lab-head')).toBe(1)
  })
})

describe('plainTagline', () => {
  it('returns null when overview is unset', () => {
    expect(plainTagline(null)).toBeNull()
    expect(plainTagline(undefined)).toBeNull()
  })

  it('returns null when overview is an empty array', () => {
    expect(plainTagline([])).toBeNull()
  })

  it('returns trimmed plain text from portable-text blocks', () => {
    const blocks = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        children: [{ _type: 'span', _key: 's1', text: '  Advancing understanding.  ', marks: [] }],
      },
    ]
    expect(plainTagline(blocks)).toBe('Advancing understanding.')
  })

  it('returns null when blocks reduce to only whitespace', () => {
    const blocks = [
      {
        _type: 'block',
        _key: 'b1',
        style: 'normal',
        children: [{ _type: 'span', _key: 's1', text: '   ', marks: [] }],
      },
    ]
    expect(plainTagline(blocks)).toBeNull()
  })
})

const block = (text: string) => ({ _type: 'block', _key: text.slice(0, 8), children: [{ _type: 'span', _key: 's', text, marks: [] }], markDefs: [], style: 'normal' })

describe('homeStatement', () => {
  it('prefers siteCopy.about.body as plain text', () => {
    expect(homeStatement({ about: { body: [block('We study Alzheimer’s disease.'), block('Second sentence.')] } }, null))
      .toBe('We study Alzheimer’s disease. Second sentence.')
  })
  it('falls back to hero.subheading when about.body is empty or whitespace', () => {
    expect(homeStatement({ about: { body: [block('   ')] }, hero: { subheading: 'Sub' } }, null)).toBe('Sub')
  })
  it('falls back to home.overview, then the IA tagline', () => {
    expect(homeStatement(null, [block('Overview text')])).toBe('Overview text')
    expect(homeStatement({ hero: { subheading: '  ' } }, [])).toBe(IA_TAGLINE)
    expect(homeStatement(null, null)).toBe(IA_TAGLINE)
  })
})

describe('splitLead', () => {
  it('returns the first item as lead and the rest in order', () => {
    expect(splitLead([1, 2, 3])).toEqual({ lead: 1, rest: [2, 3] })
  })
  it('handles an empty list', () => {
    expect(splitLead([])).toEqual({ lead: null, rest: [] })
  })
  it('keeps a lead with no href (unslugged paper) as-is', () => {
    const lead = { id: 'a', href: null }
    expect(splitLead([lead]).lead).toBe(lead)
  })
})

describe('firstSentence', () => {
  it('returns the first sentence', () => {
    expect(firstSentence('One thing. Two things.')).toBe('One thing.')
  })
  it('does not split on "e.g." style abbreviations followed by lowercase', () => {
    expect(firstSentence('Uses e.g. mice and rats. Next.')).toBe('Uses e.g. mice and rats.')
  })
  it('truncates at a word boundary with an ellipsis past max', () => {
    const out = firstSentence('word '.repeat(80).trim(), 60)
    expect(out.length).toBeLessThanOrEqual(61)
    expect(out.endsWith('…')).toBe(true)
    expect(out).not.toMatch(/\s…$/)
  })
  it('returns "" for blank input', () => {
    expect(firstSentence('   ')).toBe('')
  })
})

describe('researchCards', () => {
  const view = (id: string, slug: string | null, text: string) => ({
    id, slug, title: `T ${id}`, label: 'Project', kicker: '', tagLine: '',
    body: [block(text)], cover: null,
  })
  it('builds one card per project, linking to /research#slug', () => {
    const cards = researchCards([view('p1', 'alpha', 'First. Second.')] as never, null)
    expect(cards).toEqual([{ key: 'p1', title: 'T p1', excerpt: 'First.', href: '/research#alpha', cover: null }])
  })
  it('links to /research when a project has no slug', () => {
    expect(researchCards([view('p1', null, 'X.')] as never, null)[0].href).toBe('/research')
  })
  it('falls back to siteCopy themes, stripping a leading "- ", unlinked', () => {
    expect(researchCards([], [{ title: 'Theme', summary: '- Does things' }])).toEqual([
      { key: 'theme-0', title: 'Theme', excerpt: 'Does things', href: null, cover: null },
    ])
  })
  it('drops themes with no title, and returns [] when neither source exists', () => {
    expect(researchCards([], [{ title: '  ', summary: 'x' }])).toEqual([])
    expect(researchCards([], null)).toEqual([])
  })
})

describe('peopleStrip', () => {
  const groups = [{ _id: 'g1', title: 'PhD students' }, { _id: 'g2', title: 'Lab alumni' }]
  const p = (id: string, group: string | null, image: unknown = { asset: { _ref: id } }) => ({
    _id: id, name: `N ${id}`, image, roleGroup: group ? { _id: group, title: null } : null,
  })
  it('keeps current members with photos, in input order, excluding alumni and the lab head', () => {
    const out = peopleStrip([p('head', 'g1'), p('a', 'g1'), p('b', 'g2'), p('c', null), p('d', 'g1', null)], groups, 'head')
    expect(out.map((x) => x.id)).toEqual(['a', 'c'])
  })
  it('caps at max (default 8)', () => {
    const many = Array.from({ length: 12 }, (_, i) => p(`m${i}`, 'g1'))
    expect(peopleStrip(many, groups, null)).toHaveLength(8)
    expect(peopleStrip(many, groups, null, 6)).toHaveLength(6)
  })
  it('skips profiles with a blank name', () => {
    expect(peopleStrip([{ ...p('x', 'g1'), name: '  ' }], groups, null)).toEqual([])
  })
})

describe('maestroOverview', () => {
  it('drops blocks whose whole text is the register URL (with or without scheme)', () => {
    const blocks = [block('Join us.'), block('https://tinyurl.com/maestrotalks'), block('tinyurl.com/maestrotalks ')]
    expect(maestroOverview(blocks, 'https://tinyurl.com/maestrotalks')).toEqual([blocks[0]])
  })
  it('keeps everything when site is unset', () => {
    const blocks = [block('https://x.org')]
    expect(maestroOverview(blocks, null)).toEqual(blocks)
  })
  it('returns [] for null blocks', () => {
    expect(maestroOverview(null, 'https://x.org')).toEqual([])
  })
})
