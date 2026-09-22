import { describe, expect, it } from 'vitest'

import {
  excludeLabHead,
  groupByRoleGroup,
  initialsOf,
  isAlumniGroup,
  memberCount,
  shouldShowLabHeadSpotlight,
  splitAlumni,
} from './peopleModel'

const PHD = { _id: 'rg-phd', title: 'PhD Student' }
const LAB_HEAD = { _id: 'rg-lab-head', title: 'Lab Head' }
const ALUMNI = { _id: 'rg-alumni', title: 'Alumni' }

describe('groupByRoleGroup', () => {
  it('suppresses the "Other" heading when it is the only section', () => {
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

  it('suppresses the "Other" heading when roleGroups is empty but profiles are not', () => {
    const profiles = [{ _id: '1', roleGroup: null }]
    const result = groupByRoleGroup(profiles, [])
    expect(result).toEqual([{ id: 'other', title: null, profiles: [{ _id: '1', roleGroup: null }] }])
  })

  it('keeps the "Other" title when it appears alongside a named section', () => {
    const profiles = [
      { _id: '1', roleGroup: PHD },
      { _id: '2', roleGroup: null },
    ]
    const result = groupByRoleGroup(profiles, [PHD])
    expect(result.find((s) => s.id === 'other')?.title).toBe('Other')
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
