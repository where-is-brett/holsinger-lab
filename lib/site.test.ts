import { describe, expect, it } from 'vitest'

import { isNoindexPath } from './site'

describe('isNoindexPath', () => {
  it('is true for the exact noindexed path', () => {
    expect(isNoindexPath('/tutorial')).toBe(true)
  })

  it('strips a trailing slash before matching', () => {
    expect(isNoindexPath('/tutorial/')).toBe(true)
  })

  it('strips a query string before matching', () => {
    expect(isNoindexPath('/tutorial?ref=abc')).toBe(true)
  })

  it('strips a hash fragment before matching', () => {
    expect(isNoindexPath('/tutorial#section')).toBe(true)
  })

  it('is false for the root path', () => {
    expect(isNoindexPath('/')).toBe(false)
  })

  it('is false for an unrelated path', () => {
    expect(isNoindexPath('/people')).toBe(false)
  })

  it('is case-sensitive', () => {
    expect(isNoindexPath('/Tutorial')).toBe(false)
  })

  it('does not match a path that merely starts with a noindexed path', () => {
    expect(isNoindexPath('/tutorial/extra')).toBe(false)
  })
})
