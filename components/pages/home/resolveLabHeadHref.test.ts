import { describe, expect, it } from 'vitest'

import { resolveLabHeadHref } from './resolveLabHeadHref'

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
