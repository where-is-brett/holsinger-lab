import { describe, expect, it } from 'vitest'

import { groupByRoleGroup } from './groupByRoleGroup'

const PHD = { _id: 'rg-phd', title: 'PhD Student' }
const LAB_HEAD = { _id: 'rg-lab-head', title: 'Lab Head' }
const ALUMNI = { _id: 'rg-alumni', title: 'Alumni' }

describe('groupByRoleGroup', () => {
  it('buckets every profile under "Other" when roleGroup is unset on all of them', () => {
    const profiles = [
      { _id: '1', roleGroup: null },
      { _id: '2', roleGroup: null },
    ]
    const result = groupByRoleGroup(profiles, [PHD, LAB_HEAD])
    expect(result).toEqual([
      {
        id: 'other',
        title: 'Other',
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

  it('returns a single "Other" section when roleGroups is empty but profiles are not', () => {
    const profiles = [{ _id: '1', roleGroup: null }]
    const result = groupByRoleGroup(profiles, [])
    expect(result).toEqual([{ id: 'other', title: 'Other', profiles: [{ _id: '1', roleGroup: null }] }])
  })
})
