import { describe, expect, it, vi } from 'vitest'

import { resolveHref, resolveInternalLinkHref } from './sanity.links'

describe('resolveHref', () => {
  // This branch (redesign/wix-site) has no per-document pages -- every
  // previewable type resolves to one of the site's fixed list-style routes,
  // regardless of slug (see lib/sanity.links.ts, finding I3).
  it('resolves a home document to the root path, ignoring any slug', () => {
    expect(resolveHref('home')).toBe('/')
    expect(resolveHref('home', 'ignored')).toBe('/')
  })

  it('resolves a settings document to the root path, ignoring any slug', () => {
    expect(resolveHref('settings')).toBe('/')
    expect(resolveHref('settings', 'ignored')).toBe('/')
  })

  it('resolves a siteCopy document to the root path', () => {
    expect(resolveHref('siteCopy')).toBe('/')
  })

  it('resolves a project document to /research, ignoring any slug', () => {
    expect(resolveHref('project')).toBe('/research')
    expect(resolveHref('project', 'my-project')).toBe('/research')
  })

  it('resolves a profile document to /team, ignoring any slug', () => {
    expect(resolveHref('profile')).toBe('/team')
    expect(resolveHref('profile', 'damian-holsinger')).toBe('/team')
  })

  it('resolves a publication document to /publications', () => {
    expect(resolveHref('publication')).toBe('/publications')
  })

  it('resolves a newsItem document to /news', () => {
    expect(resolveHref('newsItem')).toBe('/news')
  })

  it('resolves a mediaAppearance document to /media', () => {
    expect(resolveHref('mediaAppearance')).toBe('/media')
  })

  it('returns undefined and warns for an unrecognized document type', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    expect(resolveHref('page', 'about')).toBeUndefined()
    expect(warn).toHaveBeenCalledWith('Invalid document type:', 'page')

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
    resolveHref('settings')
    resolveHref('siteCopy')
    resolveHref('project')
    resolveHref('profile')
    resolveHref('publication')
    resolveHref('newsItem')
    resolveHref('mediaAppearance')
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
