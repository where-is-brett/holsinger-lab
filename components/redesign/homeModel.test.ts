import { describe, expect, it } from 'vitest'

import {
  currentMemberCount,
  plainTagline,
  resolveLabHeadHref,
  shouldShowLabHeadCard,
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
