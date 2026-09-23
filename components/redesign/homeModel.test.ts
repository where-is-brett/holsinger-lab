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

describe('shouldShowLabHeadCard', () => {
  it('is false when labHead is unset', () => {
    expect(
      shouldShowLabHeadCard({ labHead: null, showLabHeadOnHome: true })
    ).toBe(false)
  })

  it('is true when labHead has a name and showLabHeadOnHome is unset', () => {
    expect(shouldShowLabHeadCard({ labHead: { _id: 'p1', name: 'Dr Test' } })).toBe(true)
    expect(
      shouldShowLabHeadCard({ labHead: { _id: 'p1', name: 'Dr Test' }, showLabHeadOnHome: null })
    ).toBe(true)
  })

  it('is false when showLabHeadOnHome is explicitly false, even with a named labHead', () => {
    expect(
      shouldShowLabHeadCard({ labHead: { _id: 'p1', name: 'Dr Test' }, showLabHeadOnHome: false })
    ).toBe(false)
  })

  // This function owns the whole show-gate, including the name check --
  // every caller (and every e2e mirror) shares this one rule instead of
  // each repeating its own `labHead?.name?.trim()` check.
  it('is false when labHead.name is missing or blank', () => {
    expect(shouldShowLabHeadCard({ labHead: { _id: 'p1' }, showLabHeadOnHome: true })).toBe(false)
    expect(
      shouldShowLabHeadCard({ labHead: { _id: 'p1', name: '   ' }, showLabHeadOnHome: true })
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

  // An abbreviation or a single-capital initial followed by a
  // capital/digit/paren must not be treated as a sentence end.
  it('does not split on "Dr."', () => {
    expect(firstSentence('Dr. Holsinger leads the lab. Second.')).toBe(
      'Dr. Holsinger leads the lab.'
    )
  })
  it('does not split on "Fig."', () => {
    expect(firstSentence('Fig. 2 shows it. Next.')).toBe('Fig. 2 shows it.')
  })
  it('does not split on "et al."', () => {
    expect(firstSentence('Smith et al. (2020) showed that. Next.')).toBe(
      'Smith et al. (2020) showed that.'
    )
  })
  it('does not split on single-capital initials ("A.I.")', () => {
    expect(firstSentence('We use A.I. Methods. Next.')).toBe('We use A.I. Methods.')
  })
  it('keeps a closing straight or curly quote after the terminator', () => {
    expect(firstSentence('He said “this works.” Then left.')).toBe(
      'He said “this works.”'
    )
  })
  it('splits before an opening quote that starts the next sentence', () => {
    expect(firstSentence('First sentence. “Quoted second.”')).toBe('First sentence.')
  })
  it('matches non-ASCII uppercase (e.g. "Émile") as a sentence start', () => {
    expect(firstSentence('Alzheimer’s disease is common. Émile agrees.')).toBe(
      'Alzheimer’s disease is common.'
    )
  })
  it('does not split on a decimal number', () => {
    expect(firstSentence('The dose is 3.5 mg twice daily.')).toBe(
      'The dose is 3.5 mg twice daily.'
    )
  })
  it('returns the whole text when there is no terminal punctuation', () => {
    expect(firstSentence('No terminal punctuation here')).toBe('No terminal punctuation here')
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
  // Exclude by the profile's own dereferenced roleGroup.title too, not
  // just by matching against `roleGroups` -- a stale or missing
  // `roleGroups` entry must not let an alumnus through.
  it('excludes a profile by its own roleGroup.title even when that group is missing from roleGroups', () => {
    const unlisted = { _id: 'x', name: 'N x', image: { asset: { _ref: 'x' } }, roleGroup: { _id: 'g-unlisted', title: 'Lab Alumni' } }
    expect(peopleStrip([unlisted], groups, null)).toEqual([])
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

  const SITE = 'https://tinyurl.com/maestrotalks'
  it('drops a block with trailing punctuation on the URL', () => {
    const blocks = [block('https://tinyurl.com/maestrotalks.')]
    expect(maestroOverview(blocks, SITE)).toEqual([])
  })
  it('drops a block with a "www." prefix and a trailing slash', () => {
    const blocks = [block('http://www.tinyurl.com/maestrotalks/')]
    expect(maestroOverview(blocks, SITE)).toEqual([])
  })
  it('drops a block that differs only in case', () => {
    const blocks = [block('HTTPS://TinyURL.com/maestrotalks')]
    expect(maestroOverview(blocks, SITE)).toEqual([])
  })
  it('drops a block with both a trailing slash and trailing punctuation (the bare() doc-comment example)', () => {
    const blocks = [block('HTTPS://www.tinyurl.com/maestrotalks/.')]
    expect(maestroOverview(blocks, SITE)).toEqual([])
  })
  it('drops a block whose only content is short link text to the site ("Register here")', () => {
    const linkBlock = {
      _type: 'block',
      _key: 'lb1',
      style: 'normal',
      children: [{ _type: 'span', _key: 's', text: 'Register here', marks: ['link1'] }],
      markDefs: [{ _type: 'link', _key: 'link1', href: SITE }],
    }
    expect(maestroOverview([linkBlock], SITE)).toEqual([])
  })
  it('keeps a block whose only content is a long, fully-linked informational sentence to the site', () => {
    const text = 'Register to hear from our future scientists every Tuesday at 10am GMT'
    const linkBlock = {
      _type: 'block',
      _key: 'lb2',
      style: 'normal',
      children: [{ _type: 'span', _key: 's', text, marks: ['link1'] }],
      markDefs: [{ _type: 'link', _key: 'link1', href: SITE }],
    }
    expect(maestroOverview([linkBlock], SITE)).toEqual([linkBlock])
  })
  it('keeps a sentence that merely contains the URL alongside other text', () => {
    const blocks = [block(`Sign up at ${SITE} to join.`)]
    expect(maestroOverview(blocks, SITE)).toEqual(blocks)
  })
  it('drops a block with no text at all (the empty-<p> defect)', () => {
    const blocks = [block('Join us.'), block('')]
    expect(maestroOverview(blocks, SITE)).toEqual([block('Join us.')])
  })
  it('drops an empty block even when site is unset', () => {
    const blocks = [block('Join us.'), block('')]
    expect(maestroOverview(blocks, null)).toEqual([block('Join us.')])
  })
})
