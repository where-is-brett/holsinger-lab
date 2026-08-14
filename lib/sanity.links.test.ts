import { describe, expect, it, vi } from 'vitest'

import { resolveHref, resolveInternalLinkHref } from './sanity.links'

describe('resolveHref', () => {
  it('resolves a home document to the root path, ignoring any slug', () => {
    expect(resolveHref('home')).toBe('/')
    expect(resolveHref('home', 'ignored')).toBe('/')
  })

  it('resolves a page document to /<slug>', () => {
    expect(resolveHref('page', 'about')).toBe('/about')
  })

  it('returns undefined for a page document with no slug', () => {
    expect(resolveHref('page')).toBeUndefined()
    expect(resolveHref('page', '')).toBeUndefined()
  })

  it('treats a null slug the same as a missing slug', () => {
    expect(resolveHref('page', null)).toBeUndefined()
    expect(resolveHref('project', null)).toBeUndefined()
  })

  it('resolves a project document to /projects/<slug>', () => {
    expect(resolveHref('project', 'my-project')).toBe('/projects/my-project')
  })

  it('returns undefined for a project document with no slug', () => {
    expect(resolveHref('project')).toBeUndefined()
  })

  it('resolves a profile document to /people/<slug>', () => {
    expect(resolveHref('profile', 'damian-holsinger')).toBe(
      '/people/damian-holsinger'
    )
  })

  it('returns undefined for a profile document with no slug', () => {
    expect(resolveHref('profile')).toBeUndefined()
    expect(resolveHref('profile', null)).toBeUndefined()
  })

  it('resolves a settings document to the root path, ignoring any slug', () => {
    expect(resolveHref('settings')).toBe('/')
    expect(resolveHref('settings', 'ignored')).toBe('/')
  })

  it('returns undefined and warns for an unrecognized document type', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(resolveHref('publication', 'x')).toBeUndefined()
    expect(warn).toHaveBeenCalledWith('Invalid document type:', 'publication')

    warn.mockRestore()
  })

  it('returns undefined and warns when documentType is undefined', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(resolveHref()).toBeUndefined()
    expect(warn).toHaveBeenCalledWith('Invalid document type:', undefined)

    warn.mockRestore()
  })

  it('does not warn for any recognized document type', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    resolveHref('home')
    resolveHref('page', 'about')
    resolveHref('project', 'my-project')
    resolveHref('profile', 'damian-holsinger')
    resolveHref('settings')
    expect(warn).not.toHaveBeenCalled()

    warn.mockRestore()
  })
})

describe('resolveInternalLinkHref', () => {
  it('resolves to /<slug> when the reference has a slug', () => {
    expect(resolveInternalLinkHref({ slug: 'about' })).toBe('/about')
  })

  it('returns undefined when the reference has no slug', () => {
    expect(resolveInternalLinkHref({})).toBeUndefined()
    expect(resolveInternalLinkHref({ slug: null })).toBeUndefined()
  })

  it('returns undefined when no value is given', () => {
    expect(resolveInternalLinkHref()).toBeUndefined()
  })
})
