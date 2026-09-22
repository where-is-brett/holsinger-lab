import { describe, expect, it } from 'vitest'

import { isRedirectedPath, permanentRedirects } from './redirects.mjs'

describe('permanentRedirects', () => {
  it('sends the retired lab-head project page to the lab head profile', () => {
    expect(permanentRedirects).toContainEqual({
      source: '/projects/about-dr-damian-holsinger',
      destination: '/people/damian-holsinger',
    })
  })
})

describe('isRedirectedPath', () => {
  it('is true for a redirect source', () => {
    expect(isRedirectedPath('/projects/about-dr-damian-holsinger')).toBe(true)
  })

  it('is false for a redirect destination', () => {
    expect(isRedirectedPath('/people/damian-holsinger')).toBe(false)
  })

  it('is false for an unrelated project', () => {
    expect(isRedirectedPath('/projects/maestro')).toBe(false)
  })
})
