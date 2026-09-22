import { describe, expect, it } from 'vitest'

import {
  currentNavId,
  FOOTER_FALLBACK,
  footerLines,
  liveNavItems,
  SITE_NAV,
} from './navModel'

describe('SITE_NAV', () => {
  it('carries the IA six in IA order, with Contact standing in where Lab sits', () => {
    expect(SITE_NAV.map((i) => i.id)).toEqual([
      'home', 'pubs', 'research', 'resources', 'people', 'lab', 'contact',
    ])
  })

  it('shows only routes that exist today', () => {
    expect(liveNavItems().map((i) => [i.label, i.href])).toEqual([
      ['Home', '/'],
      ['Publications', '/publications'],
      ['People', '/people'],
      ['Contact', '/contact'],
    ])
  })
})

describe('liveNavItems with visibility flags', () => {
  it('calling with no argument is unchanged', () => {
    expect(liveNavItems().map((i) => i.id)).toEqual(['home', 'pubs', 'people', 'contact'])
  })

  it('showPublications: false hides exactly pubs', () => {
    expect(liveNavItems({ showPublications: false }).map((i) => i.id)).toEqual([
      'home', 'people', 'contact',
    ])
  })

  it('showPeople: false hides exactly people', () => {
    expect(liveNavItems({ showPeople: false }).map((i) => i.id)).toEqual([
      'home', 'pubs', 'contact',
    ])
  })

  it('showContactForm: false hides exactly contact', () => {
    expect(liveNavItems({ showContactForm: false }).map((i) => i.id)).toEqual([
      'home', 'pubs', 'people',
    ])
  })

  it.each([
    ['null', { showPublications: null, showPeople: null, showContactForm: null }],
    ['undefined', { showPublications: undefined, showPeople: undefined, showContactForm: undefined }],
    ['empty object', {}],
  ])('%s hides nothing', (_label, flags) => {
    expect(liveNavItems(flags).map((i) => i.id)).toEqual(['home', 'pubs', 'people', 'contact'])
  })

  it('all three false leaves only Home', () => {
    expect(
      liveNavItems({
        showPublications: false,
        showPeople: false,
        showContactForm: false,
      }).map((i) => i.id)
    ).toEqual(['home'])
  })
})

describe('currentNavId', () => {
  const items = liveNavItems()
  it.each([
    ['/', 'home'],
    ['/publications', 'pubs'],
    ['/publications/', 'pubs'],
    ['/publications/some-paper-2024', 'pubs'],
    ['/people/jane-doe', 'people'],
    ['/contact', 'contact'],
  ])('%s -> %s', (path, id) => {
    expect(currentNavId(path, items)).toBe(id)
  })

  it.each([['/tutorial'], ['/publicationsx'], [''], [null], [undefined]])(
    'marks nothing for %s',
    (path) => {
      expect(currentNavId(path, items)).toBeUndefined()
    }
  )
})

describe('footerLines', () => {
  const block = (...texts: string[]) => ({
    _type: 'block',
    children: texts.map((text) => ({ _type: 'span', text })),
  })

  it('reads one line per block, joining spans', () => {
    expect(
      footerLines([block('Designed by ', 'Brett Yang'), block('Copyright 2026 © Holsinger Lab')])
    ).toEqual(['Designed by Brett Yang', 'Copyright 2026 © Holsinger Lab'])
  })

  it('drops empty blocks and non-block objects', () => {
    expect(
      footerLines([block('  '), { _type: 'image' }, block(' Kept ')])
    ).toEqual(['Kept'])
  })

  it.each([[null], [undefined], [[]], ['junk'], [[block('')]], [[{ nope: 1 }]]])(
    'falls back to the IA text for %j',
    (value) => {
      expect(footerLines(value)).toEqual([...FOOTER_FALLBACK])
    }
  )

  it('fallback is the IA footer verbatim', () => {
    expect(FOOTER_FALLBACK).toEqual(['Designed by Brett Yang', 'Copyright 2026 © Holsinger Lab'])
  })
})
