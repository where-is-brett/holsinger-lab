import { describe, expect, it } from 'vitest'

import { groupByRoleGroup } from './groupByRoleGroup'

describe('groupByRoleGroup', () => {
  it('buckets every profile under "Other" when roleGroup is unset on all of them', () => {
    // The live dataset's actual current state, 2026-08-11: 0/19 profiles have
    // roleGroup set. This is the case every reader-facing feature in this
    // phase must render correctly against.
    const profiles = [
      { _id: '1', roleGroup: null },
      { _id: '2', roleGroup: null },
    ]
    const result = groupByRoleGroup(profiles)
    expect(result).toEqual([
      { value: 'other', title: 'Other', profiles: [{ _id: '1', roleGroup: null }, { _id: '2', roleGroup: null }] },
    ])
  })

  it('buckets recognised values into their named section, in the fixed order, and preserves input order within a bucket', () => {
    const profiles = [
      { _id: '1', roleGroup: 'phd-student' },
      { _id: '2', roleGroup: 'lab-head' },
      { _id: '3', roleGroup: 'phd-student' },
    ]
    const result = groupByRoleGroup(profiles)
    expect(result.map((s) => s.value)).toEqual(['lab-head', 'phd-student'])
    expect(result.find((s) => s.value === 'phd-student')?.profiles.map((p) => p._id)).toEqual([
      '1',
      '3',
    ])
  })

  it('omits empty sections entirely', () => {
    const profiles = [{ _id: '1', roleGroup: 'alumni' }]
    const result = groupByRoleGroup(profiles)
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe('alumni')
  })

  it('puts a mix of recognised and unrecognised values in their respective buckets, Other last', () => {
    const profiles = [
      { _id: '1', roleGroup: 'undergraduate' },
      { _id: '2', roleGroup: 'not-a-real-value' },
      { _id: '3', roleGroup: null },
    ]
    const result = groupByRoleGroup(profiles)
    expect(result.map((s) => s.value)).toEqual(['undergraduate', 'other'])
    expect(result.find((s) => s.value === 'other')?.profiles.map((p) => p._id)).toEqual([
      '2',
      '3',
    ])
  })

  it('returns an empty array for an empty input', () => {
    expect(groupByRoleGroup([])).toEqual([])
  })
})
