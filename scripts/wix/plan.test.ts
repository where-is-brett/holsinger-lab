import { describe, expect, it } from 'vitest'

import { toBlocks } from './blocks.ts'
import { type CurrentDoc, planImport, type PlanInput, stableHash } from './plan.ts'
import { rankAt } from './rank.ts'
import type { WixSnapshot } from './snapshot.ts'

const GROUPS = {
  'Research Scientist': 'rg-rs',
  'PhD Candidate': 'rg-phd',
  'Honours Student': 'rg-hons',
  'Research Student': 'rg-res',
  'International Interns': 'rg-intl',
  'Lab Alumni': 'rg-alum',
} as const

function snapshot(): WixSnapshot {
  return {
    capturedAt: '2026-09-22',
    siteCopy: {
      hero: { imageUrl: null, imageAlt: '', heading: 'H', subheading: 'S' },
      about: { heading: 'About', paragraphs: ['One *two*'], themesIntro: 'T', themes: [] },
      teamIntro: 'Team',
      alumniSubtitle: '2020 - present',
      contactIntro: 'Support',
    },
    contact: { address: 'Addr', email: 'a@b.org', phone: '1' },
    news: [{ key: 'n1', title: 'News 1', paragraphs: ['Body'], summary: null, showOnHome: true, showOnNewsPage: true }],
    media: [],
    projects: [],
    people: [
      { key: 'jc', sanityId: 'p-jc', name: 'Dr Johnny Chan', role: 'Research Scientist', roleDetail: null, group: 'Research Scientist', imageUrl: null },
      { key: 'mh', sanityId: null, name: 'Mia Helveston', role: 'USA', roleDetail: null, group: 'International Interns', imageUrl: null },
    ],
    publications: [
      { key: 'old', sanityId: 'pub-old', title: 'Old', authors: 'A', journal: 'J', date: '2020-01-01', volume: 1, issue: 2, pages: '3', doi: '10.1/x' },
      { key: 'new', sanityId: null, title: 'New', authors: 'B', journal: 'bioRxiv', date: '2026-04-19', volume: null, issue: null, pages: '04.19.719519', doi: '10.64898/2026.04.19.719519' },
    ],
  }
}

function input(over: Partial<PlanInput> = {}): PlanInput {
  const existing: Record<string, CurrentDoc> = {
    'p-jc': { _id: 'p-jc', _type: 'profile', name: 'Dr Johnny Chan (DDS)', role: 'Research Scientist', orderRank: '0|100014:' },
    'pub-old': { _id: 'pub-old', _type: 'publication', title: 'Old (Sanity wording)', doi: null },
    settings: { _id: 'settings', _type: 'settings' },
  }
  return { snapshot: snapshot(), existing, settingsId: 'settings', roleGroupIds: { ...GROUPS }, assetIds: {}, ledger: {}, ...over }
}

const patchFor = (plan: ReturnType<typeof planImport>, id: string) =>
  plan.ops.find((o) => o.kind === 'patch' && o.id === id) as { set: Record<string, unknown> } | undefined
const createFor = (plan: ReturnType<typeof planImport>, id: string) =>
  plan.ops.find((o) => o.kind === 'create' && o.doc._id === id) as { doc: CurrentDoc } | undefined

describe('planImport: first run', () => {
  const plan = planImport(input())

  it('Wix wins on a matched profile', () => {
    expect(patchFor(plan, 'p-jc')?.set).toMatchObject({
      name: 'Dr Johnny Chan',
      roleGroup: { _type: 'reference', _ref: 'rg-rs' },
      orderRank: rankAt(0),
    })
  })
  it('creates unmatched people with deterministic ids', () => {
    expect(createFor(plan, 'wix-profile-mh')?.doc).toMatchObject({
      _type: 'profile', name: 'Mia Helveston', role: 'USA',
      roleGroup: { _type: 'reference', _ref: 'rg-intl' }, orderRank: rankAt(1), hasPage: false,
    })
  })
  it('creates the siteCopy singleton at _id "siteCopy"', () => {
    expect(createFor(plan, 'siteCopy')?.doc).toMatchObject({ _type: 'siteCopy', teamIntro: 'Team' })
  })
  it('patches settings.contact', () => {
    expect(patchFor(plan, 'settings')?.set).toEqual({ contact: { address: 'Addr', email: 'a@b.org', phone: '1' } })
  })
  it('fills a missing DOI but never overwrites other publication fields', () => {
    expect(patchFor(plan, 'pub-old')?.set).toEqual({ doi: '10.1/x' })
    expect(plan.reports).toContain('publication pub-old: title differs (Sanity "Old (Sanity wording)" vs Wix "Old") — not written')
  })
  it('creates new publications', () => {
    expect(createFor(plan, 'wix-publication-new')?.doc).toMatchObject({
      _type: 'publication', title: 'New', author: 'B', journal: 'bioRxiv', date: '2026-04-19', pages: '04.19.719519',
    })
  })
  it('never deletes and never blanks a field', () => {
    for (const op of plan.ops) {
      expect(['create', 'patch']).toContain(op.kind)
      const fields = op.kind === 'patch' ? op.set : op.doc
      for (const v of Object.values(fields)) expect(v === null || v === undefined).toBe(false)
    }
  })
  it('records a ledger entry for every field it set', () => {
    expect(plan.ledger['p-jc#name']).toBe(stableHash('Dr Johnny Chan'))
  })
})

describe('planImport: re-runs', () => {
  it('is a no-op when nothing changed since the last run', () => {
    const first = planImport(input())
    const after: Record<string, CurrentDoc> = { ...input().existing }
    for (const op of first.ops) {
      if (op.kind === 'create') after[op.doc._id] = op.doc
      else after[op.id] = { ...after[op.id], ...op.set }
    }
    const second = planImport(input({ existing: after, ledger: first.ledger }))
    expect(second.ops).toEqual([])
    expect(second.skipped).toEqual([])
  })
  it('skips a field Damian edited after the last import (Review Focus 3)', () => {
    const first = planImport(input())
    const after: Record<string, CurrentDoc> = { ...input().existing }
    for (const op of first.ops) {
      if (op.kind === 'create') after[op.doc._id] = op.doc
      else after[op.id] = { ...after[op.id], ...op.set }
    }
    after['p-jc'] = { ...after['p-jc'], name: 'Dr Johnny Chan DDS' } // edited in Studio
    const second = planImport(input({ existing: after, ledger: first.ledger }))
    expect(patchFor(second, 'p-jc')?.set?.name).toBeUndefined()
    expect(second.skipped).toContainEqual({ id: 'p-jc', field: 'name', reason: 'edited-since-import' })
    expect(second.ledger['p-jc#name']).toBe(first.ledger['p-jc#name'])
  })
})

describe('toBlocks', () => {
  it('turns *x* into an em span with deterministic keys', () => {
    const a = toBlocks(['One *two* three'], 'seed')
    expect(a).toEqual(toBlocks(['One *two* three'], 'seed'))
    expect(a[0].children.map((c) => [c.text, c.marks])).toEqual([
      ['One ', []], ['two', ['em']], [' three', []],
    ])
  })
})

describe('rankAt', () => {
  it('sorts lexicographically in index order', () => {
    const ranks = Array.from({ length: 60 }, (_, i) => rankAt(i))
    expect([...ranks].sort()).toEqual(ranks)
    expect(ranks[0]).toMatch(/^0\|[0-9a-z]{6}:$/)
    // Below every existing production rank ("0|100008:" is the lowest today).
    expect(ranks[59] < '0|100000:').toBe(true)
  })
})
