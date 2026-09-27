import { describe, expect, it } from 'vitest'

import {
  excludeLabHead,
  flattenMembers,
  formatPeopleMeta,
  groupByRoleGroup,
  initialsOf,
  isAlumniGroup,
  memberCount,
  profileSaysMore,
  roleLine,
  shouldShowLabHeadSpotlight,
  splitAlumni,
  surnameOf,
} from './peopleModel'

const PHD = { _id: 'rg-phd', title: 'PhD Student' }
const LAB_HEAD = { _id: 'rg-lab-head', title: 'Lab Head' }
const ALUMNI = { _id: 'rg-alumni', title: 'Alumni' }

describe('groupByRoleGroup', () => {
  it('gives the trailing ungrouped catch-all no title (spec §5.3) when it is the only section', () => {
    const profiles = [
      { _id: '1', roleGroup: null },
      { _id: '2', roleGroup: null },
    ]
    const result = groupByRoleGroup(profiles, [PHD, LAB_HEAD])
    expect(result).toEqual([
      {
        id: 'other',
        title: null,
        profiles: [
          { _id: '1', roleGroup: null },
          { _id: '2', roleGroup: null },
        ],
      },
    ])
  })

  it('buckets by matching roleGroup._id, in the order roleGroups was given, preserving input order within a bucket', () => {
    const profiles = [
      { _id: '1', roleGroup: PHD },
      { _id: '2', roleGroup: LAB_HEAD },
      { _id: '3', roleGroup: PHD },
    ]
    const result = groupByRoleGroup(profiles, [LAB_HEAD, PHD])
    expect(result.map((s) => s.id)).toEqual(['rg-lab-head', 'rg-phd'])
    expect(result.find((s) => s.id === 'rg-phd')?.profiles.map((p) => p._id)).toEqual(['1', '3'])
  })

  it('omits empty sections entirely', () => {
    const profiles = [{ _id: '1', roleGroup: ALUMNI }]
    const result = groupByRoleGroup(profiles, [PHD, LAB_HEAD, ALUMNI])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('rg-alumni')
  })

  it('puts unset and dangling-reference (null) roleGroup values in "Other", after named sections', () => {
    const profiles = [
      { _id: '1', roleGroup: PHD },
      { _id: '2', roleGroup: null },
      { _id: '3', roleGroup: null },
    ]
    const result = groupByRoleGroup(profiles, [PHD])
    expect(result.map((s) => s.id)).toEqual(['rg-phd', 'other'])
    expect(result.find((s) => s.id === 'other')?.profiles.map((p) => p._id)).toEqual(['2', '3'])
  })

  it('returns an empty array for empty profiles and empty roleGroups', () => {
    expect(groupByRoleGroup([], [])).toEqual([])
  })

  it('gives the trailing ungrouped catch-all no title when roleGroups is empty but profiles are not', () => {
    const profiles = [{ _id: '1', roleGroup: null }]
    const result = groupByRoleGroup(profiles, [])
    expect(result).toEqual([{ id: 'other', title: null, profiles: [{ _id: '1', roleGroup: null }] }])
  })

  it('gives the trailing ungrouped catch-all no title even alongside a named section (spec §5.3 -- never "Other")', () => {
    const profiles = [
      { _id: '1', roleGroup: PHD },
      { _id: '2', roleGroup: null },
    ]
    const result = groupByRoleGroup(profiles, [PHD])
    expect(result.find((s) => s.id === 'other')?.title).toBeNull()
  })
})

describe('excludeLabHead', () => {
  const profiles = [{ _id: 'a' }, { _id: 'b' }, { _id: 'c' }]

  it('removes the profile matching labHeadId', () => {
    expect(excludeLabHead(profiles, 'b')).toEqual([{ _id: 'a' }, { _id: 'c' }])
  })

  it('leaves the grid untouched when labHeadId is unset', () => {
    expect(excludeLabHead(profiles, undefined)).toEqual(profiles)
    expect(excludeLabHead(profiles, null)).toEqual(profiles)
  })

  it('leaves the grid untouched when labHeadId does not match any profile (dangling reference)', () => {
    expect(excludeLabHead(profiles, 'not-in-the-list')).toEqual(profiles)
  })

  it('returns an empty array for an empty profile list', () => {
    expect(excludeLabHead([], 'a')).toEqual([])
  })
})

describe('shouldShowLabHeadSpotlight', () => {
  it('is false when labHead is unset', () => {
    expect(
      shouldShowLabHeadSpotlight({ labHead: null, showLabHeadOnPeople: true })
    ).toBe(false)
  })

  it('is true when labHead is set and showLabHeadOnPeople is unset', () => {
    expect(shouldShowLabHeadSpotlight({ labHead: { _id: 'p1' } })).toBe(true)
    expect(
      shouldShowLabHeadSpotlight({
        labHead: { _id: 'p1' },
        showLabHeadOnPeople: null,
      })
    ).toBe(true)
  })

  it('is false when showLabHeadOnPeople is explicitly false, even with labHead set', () => {
    expect(
      shouldShowLabHeadSpotlight({
        labHead: { _id: 'p1' },
        showLabHeadOnPeople: false,
      })
    ).toBe(false)
  })
})

describe('initialsOf', () => {
  it.each([
    ['Jiyoo Choi', 'JC'],
    ['  Damian   Holsinger ', 'DH'],
    ['Plato', 'P'],
    ['Mary-Jane Lee', 'ML'],
    ['Élodie Ñúñez', 'ÉÑ'],
    ['', ''],
    ['Fritz A. Graham', 'FG'],
    // Final-review fix wave additions below.
    ['Dr Johnny Chan (DDS)', 'JC'],
    ['Prof. Jane Doe', 'JD'],
    // Decomposed Unicode: each accented letter is a base letter plus a
    // separate combining-mark code point (U+0301 COMBINING ACUTE ACCENT,
    // U+0303 COMBINING TILDE), not the single precomposed code point the
    // other 'Élodie Ñúñez' case above uses. `.normalize('NFC')` must compose
    // these back together before initials are taken, or the accents are
    // silently dropped.
    ['Élodie Ñúñez', 'ÉÑ'],
    ['Dr', 'D'],
  ])('initialsOf(%j) === %j', (input, expected) => {
    expect(initialsOf(input)).toBe(expected)
  })

  it('returns an empty string for null', () => {
    expect(initialsOf(null)).toBe('')
  })

  it('returns an empty string for undefined', () => {
    expect(initialsOf(undefined)).toBe('')
  })

  it('returns an empty string for whitespace-only input', () => {
    expect(initialsOf('   ')).toBe('')
  })
})

describe('isAlumniGroup', () => {
  it.each(['Lab Alumni', 'alumni', ' Recent Lab Alumni '])(
    '%j is an alumni group',
    (title) => {
      expect(isAlumniGroup(title)).toBe(true)
    }
  )

  it.each(['Research Scientist', null])('%j is not an alumni group', (title) => {
    expect(isAlumniGroup(title)).toBe(false)
  })
})

describe('splitAlumni', () => {
  const PHD_SECTION = {
    id: 'rg-phd',
    title: 'PhD Student',
    profiles: [{ _id: '1' }, { _id: '2' }],
  }
  const POSTDOC_SECTION = {
    id: 'rg-postdoc',
    title: 'Postdoc',
    profiles: [{ _id: '3' }],
  }
  const ALUMNI_SECTION = {
    id: 'rg-alumni',
    title: 'Lab Alumni',
    profiles: [{ _id: '4' }, { _id: '5' }],
  }

  it('pulls an alumni group in the middle out into `alumni`, preserving order', () => {
    const result = splitAlumni([PHD_SECTION, ALUMNI_SECTION, POSTDOC_SECTION])
    expect(result.members).toEqual([PHD_SECTION, POSTDOC_SECTION])
    expect(result.alumni).toEqual([{ _id: '4' }, { _id: '5' }])
  })

  it('returns all sections as members and an empty alumni array when there is no alumni group', () => {
    const result = splitAlumni([PHD_SECTION, POSTDOC_SECTION])
    expect(result.members).toEqual([PHD_SECTION, POSTDOC_SECTION])
    expect(result.alumni).toEqual([])
  })

  it('concatenates two alumni groups, in section order', () => {
    const secondAlumni = { id: 'rg-alumni-2', title: 'alumni', profiles: [{ _id: '6' }] }
    const result = splitAlumni([ALUMNI_SECTION, PHD_SECTION, secondAlumni])
    expect(result.members).toEqual([PHD_SECTION])
    expect(result.alumni).toEqual([{ _id: '4' }, { _id: '5' }, { _id: '6' }])
  })

  it('returns empty arrays for an empty input', () => {
    expect(splitAlumni([])).toEqual({ members: [], alumni: [] })
  })
})

describe('memberCount', () => {
  it('sums profiles across all member sections', () => {
    const sections = [
      { id: 'a', title: 'A', profiles: [{ _id: '1' }, { _id: '2' }] },
      { id: 'b', title: 'B', profiles: [{ _id: '3' }] },
    ]
    expect(memberCount(sections)).toBe(3)
  })

  it('is 0 for an empty array', () => {
    expect(memberCount([])).toBe(0)
  })
})

describe('formatPeopleMeta', () => {
  it('pluralises members and groups, with no "Lab head +" when the spotlight is hidden', () => {
    expect(formatPeopleMeta({ showSpotlight: false, n: 3, g: 2 })).toBe('3 current members · 2 groups')
  })

  it('singularises member and group when each count is exactly 1', () => {
    expect(formatPeopleMeta({ showSpotlight: false, n: 1, g: 1 })).toBe('1 current member · 1 group')
  })

  it('prefixes "Lab head + " when the spotlight is showing', () => {
    expect(formatPeopleMeta({ showSpotlight: true, n: 19, g: 6 })).toBe('Lab head + 19 current members · 6 groups')
  })

  it('handles zero members and zero groups', () => {
    expect(formatPeopleMeta({ showSpotlight: false, n: 0, g: 0 })).toBe('0 current members · 0 groups')
  })
})

describe('surnameOf', () => {
  it.each([
    ['Damian Holsinger', 'Holsinger'],
    ['  Damian   Holsinger ', 'Holsinger'],
    ['Dr Johnny Chan (DDS)', 'Chan'],
    ['Dr. Rossana R Porto', 'Porto'],
    ['Zeyi (Brett) Yang', 'Yang'],
    ['Sreevadana (Sree) Venkitachalam', 'Venkitachalam'],
    ['Deepikaa V. G. Sandanababu', 'Sandanababu'],
    ['Martin Luther King Jr.', 'King'],
    ['Smith, Jr.', 'Smith'],
    ['Élodie Ñúñez', 'Ñúñez'],
    ['Dr Chan', 'Chan'],
    ['Plato', 'Plato'],
    // A post-nominal suffix (not just a generational one) is dropped too.
    ['Jane Smith MD', 'Smith'],
    ['Jane Smith BSc', 'Smith'],
    // A parenthesised aside containing a space doesn't leak its closing
    // word through as a fake surname.
    ['Jane Smith (née Brown)', 'Smith'],
    // A post-nominal written with dots must still be recognised as a
    // suffix (dots are stripped before the suffix lookup), not leak
    // through as the surname.
    ['Jane Smith M.D.', 'Smith'],
    ['Jane Smith B.Sc.', 'Smith'],
    ['Jane Smith Ph.D.', 'Smith'],
  ])('%j -> %j', (name, surname) => {
    expect(surnameOf(name)).toBe(surname)
  })

  it.each([[null], [undefined], [''], ['   '], ['Dr'], ['Prof.'], ['(DDS)']])('%j has no surname', (name) => {
    expect(surnameOf(name)).toBeNull()
  })

  it.each(['Jane Smith MD', 'Jane Smith M.D.', 'Jane Smith BSc', 'Jane Smith B.Sc.'])(
    'initialsOf and surnameOf agree on the real name words in %j',
    (name) => {
      expect(initialsOf(name)).toBe('JS')
      expect(surnameOf(name)).toBe('Smith')
    }
  )
})

const block = (key: string, text: string) => ({
  _type: 'block',
  _key: key,
  style: 'normal',
  markDefs: [],
  children: [{ _type: 'span', _key: `${key}-s`, text, marks: [] }],
})

describe('flattenMembers', () => {
  it('runs every section into one list, in order, each card carrying its section title', () => {
    const cards = flattenMembers([
      { id: 'a', title: 'PhD Candidate', profiles: ['p1', 'p2'] },
      { id: 'b', title: 'Honours Student', profiles: ['p3'] },
      { id: 'other', title: null, profiles: ['p4'] },
    ])
    expect(cards).toEqual([
      { profile: 'p1', group: 'PhD Candidate' },
      { profile: 'p2', group: 'PhD Candidate' },
      { profile: 'p3', group: 'Honours Student' },
      { profile: 'p4', group: null },
    ])
  })

  it('is empty for no sections', () => {
    expect(flattenMembers([])).toEqual([])
  })
})

describe('roleLine', () => {
  it.each([
    ['Research Scientist', 'Research Scientist', null],
    ['research scientist ', 'Research Scientist', null],
    ['Visiting Intern — Germany', 'International Interns', 'Visiting Intern — Germany'],
    ['Lab Manager', null, 'Lab Manager'],
    [null, 'PhD Candidate', null],
    ['   ', null, null],
  ])('role %j in group %j -> %j', (role, group, expected) => {
    expect(roleLine(role, group)).toBe(expected)
  })
})

describe('profileSaysMore', () => {
  const full = [block('f1', 'Short bio.'), block('f2', 'And a second paragraph.')]

  it('is true whenever there are publications', () => {
    expect(profileSaysMore({ publicationCount: 2, bio: null, fullBio: null })).toBe(true)
  })

  it('is true when both texts are set and differ', () => {
    expect(profileSaysMore({ publicationCount: 0, bio: 'Short bio.', fullBio: full })).toBe(true)
  })

  it('is false when bio is unset, because the spotlight then shows fullBio itself', () => {
    expect(profileSaysMore({ publicationCount: 0, bio: null, fullBio: full })).toBe(false)
    expect(profileSaysMore({ publicationCount: 0, bio: '   ', fullBio: full })).toBe(false)
  })

  it('is false when the two texts differ only in whitespace', () => {
    expect(
      profileSaysMore({ publicationCount: 0, bio: 'Short   bio.\n', fullBio: [block('f1', ' Short bio. ')] })
    ).toBe(false)
  })

  it('is false when fullBio is unset or empty', () => {
    expect(profileSaysMore({ publicationCount: 0, bio: 'Short bio.', fullBio: null })).toBe(false)
    expect(profileSaysMore({ publicationCount: 0, bio: 'Short bio.', fullBio: [] })).toBe(false)
  })
})
