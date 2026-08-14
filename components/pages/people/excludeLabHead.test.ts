import { describe, expect, it } from 'vitest'

import { excludeLabHead } from './excludeLabHead'

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
