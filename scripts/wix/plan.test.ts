import { describe, expect, it } from 'vitest'

import { toBlocks } from './blocks.ts'
import { type CurrentDoc, planImport, type PlanInput, stableHash } from './plan.ts'
import { rankAt } from './rank.ts'
import type { RoleGroupTitle, WixSnapshot } from './snapshot.ts'

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
      { key: 'old', sanityId: 'pub-old', title: 'Old', authors: 'A', journal: 'J', date: '2020-01-01', volume: 1, issue: 2, pages: '3', doi: '10.1/x', type: null },
      { key: 'new', sanityId: null, title: 'New', authors: 'B', journal: 'bioRxiv', date: '2026-04-19', volume: null, issue: null, pages: '04.19.719519', doi: '10.64898/2026.04.19.719519', type: 'Article' },
    ],
  }
}

function input(over: Partial<PlanInput> = {}): PlanInput {
  const existing: Record<string, CurrentDoc> = {
    'p-jc': { _id: 'p-jc', _type: 'profile', name: 'Dr Johnny Chan (DDS)', role: 'Research Scientist', orderRank: '0|100014:' },
    'pub-old': { _id: 'pub-old', _type: 'publication', title: 'Old (Sanity wording)', doi: null },
    settings: { _id: 'settings', _type: 'settings' },
  }
  return { snapshot: snapshot(), existing, settingsId: 'settings', roleGroupIds: { ...GROUPS }, assetIds: {}, ledger: {}, drafts: {}, assetsResolved: true, ...over }
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
      _type: 'publication', title: 'New', author: 'B', journal: 'bioRxiv', date: '2026-04-19', pages: '04.19.719519', type: 'Article',
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

describe('planImport: guards (fix round 1)', () => {
  it('reports and skips a matched profile sanityId that is missing from existing', () => {
    const snap = snapshot()
    snap.people.push({
      key: 'ghost', sanityId: 'p-ghost', name: 'Ghost Person', role: 'Alum',
      roleDetail: null, group: 'Lab Alumni', imageUrl: null,
    })
    const plan = planImport(input({ snapshot: snap }))
    expect(createFor(plan, 'p-ghost')).toBeUndefined()
    expect(patchFor(plan, 'p-ghost')).toBeUndefined()
    expect(plan.reports).toContain('profile p-ghost: matched id not found — skipped')
  })

  it('reports and skips a matched project sanityId that is missing from existing', () => {
    const snap = snapshot()
    snap.projects.push({
      key: 'ghost-project', sanityId: 'proj-ghost', researchOrder: 1,
      title: 'Ghost Project', paragraphs: [], imageUrl: null, imageAlt: '',
    })
    const plan = planImport(input({ snapshot: snap }))
    expect(createFor(plan, 'proj-ghost')).toBeUndefined()
    expect(patchFor(plan, 'proj-ghost')).toBeUndefined()
    expect(plan.reports).toContain('project proj-ghost: matched id not found — skipped')
  })

  it('never recreates a wix-* document that was deleted in Studio since the last import', () => {
    const first = planImport(input())
    expect(createFor(first, 'wix-profile-mh')).toBeDefined()
    // 'wix-profile-mh' is now missing from `existing` (deleted in Studio), but the ledger
    // still remembers we created it.
    const second = planImport(input({ ledger: first.ledger }))
    expect(createFor(second, 'wix-profile-mh')).toBeUndefined()
    expect(second.skipped).toContainEqual({ id: 'wix-profile-mh', field: '*', reason: 'deleted-since-import' })
  })

  it('throws instead of silently dropping an image whose asset was never uploaded', () => {
    const snap = snapshot()
    snap.people[0].imageUrl = 'https://static.wixstatic.com/media/pic1'
    expect(() => planImport(input({ snapshot: snap, assetIds: {} }))).toThrow('asset not uploaded')
  })

  it('throws instead of silently dropping the hero image on a run where the asset mapping is missing', () => {
    const snap = snapshot()
    snap.siteCopy.hero.imageUrl = 'https://static.wixstatic.com/media/hero1'
    const withAsset = input({
      snapshot: snap,
      assetIds: { 'https://static.wixstatic.com/media/hero1': 'image-hero-1' },
    })
    // First run succeeds and would set siteCopy.hero.image.
    const first = planImport(withAsset)
    expect(createFor(first, 'siteCopy')?.doc.hero).toMatchObject({ image: { asset: { _ref: 'image-hero-1' } } })
    // A later run where the asset mapping is missing (upload failed / not re-supplied) must
    // throw rather than silently produce a patch that drops the image field.
    expect(() => planImport({ ...withAsset, assetIds: {} })).toThrow('asset not uploaded')
  })

  it('throws when a role group title has no id in roleGroupIds', () => {
    const incomplete = { ...GROUPS } as Partial<Record<RoleGroupTitle, string>>
    delete incomplete['Lab Alumni']
    expect(() =>
      planImport(input({ roleGroupIds: incomplete as Record<RoleGroupTitle, string> }))
    ).toThrow('role group not found')
  })

  it('treats a field cleared in Studio after import as an edit, not untouched ground (Ruling 6a)', () => {
    const first = planImport(input())
    const after: Record<string, CurrentDoc> = { ...input().existing }
    for (const op of first.ops) {
      if (op.kind === 'create') after[op.doc._id] = op.doc
      else after[op.id] = { ...after[op.id], ...op.set }
    }
    after['p-jc'] = { ...after['p-jc'], name: null } // cleared in Studio
    const second = planImport(input({ existing: after, ledger: first.ledger }))
    expect(patchFor(second, 'p-jc')?.set?.name).toBeUndefined()
    expect(second.skipped).toContainEqual({ id: 'p-jc', field: 'name', reason: 'edited-since-import' })
    expect(second.ledger['p-jc#name']).toBe(first.ledger['p-jc#name'])
  })

  it('keeps skipping an edited field across a third run even when the Wix value itself changes', () => {
    const first = planImport(input())
    const afterEdit: Record<string, CurrentDoc> = { ...input().existing }
    for (const op of first.ops) {
      if (op.kind === 'create') afterEdit[op.doc._id] = op.doc
      else afterEdit[op.id] = { ...afterEdit[op.id], ...op.set }
    }
    afterEdit['p-jc'] = { ...afterEdit['p-jc'], name: 'Dr Johnny Chan DDS' } // edited in Studio
    const second = planImport(input({ existing: afterEdit, ledger: first.ledger }))
    expect(second.skipped).toContainEqual({ id: 'p-jc', field: 'name', reason: 'edited-since-import' })

    // Third run: Wix's own value for the field changes too, but the Studio edit still wins.
    const snap3 = snapshot()
    snap3.people[0].name = 'Dr Johnny Chan II'
    const third = planImport(input({ snapshot: snap3, existing: afterEdit, ledger: second.ledger }))
    expect(patchFor(third, 'p-jc')?.set?.name).toBeUndefined()
    expect(third.skipped).toContainEqual({ id: 'p-jc', field: 'name', reason: 'edited-since-import' })
    expect(third.ledger['p-jc#name']).toBe(first.ledger['p-jc#name'])
  })

  it('reports every differing publication field, not only the title (Ruling 6b)', () => {
    const withDiffs = input({
      existing: {
        ...input().existing,
        'pub-old': {
          _id: 'pub-old', _type: 'publication', title: 'Old',
          journal: 'Old Journal Name', volume: 99, doi: '10.1/x',
        },
      },
    })
    const plan = planImport(withDiffs)
    expect(plan.reports).toContain('publication pub-old: journal differs (Sanity "Old Journal Name" vs Wix "J") — not written')
    expect(plan.reports).toContain('publication pub-old: volume differs (Sanity "99" vs Wix "1") — not written')
    // Title matches here, so it must not be reported.
    expect(plan.reports.some((r) => r.startsWith('publication pub-old: title differs'))).toBe(false)
  })

  it('reports (never writes) a matched publication whose type differs -- report-only like every other matched-publication field (Important 2)', () => {
    const snap = snapshot()
    snap.publications[0] = { ...snap.publications[0], type: 'Article' }
    const withType = input({
      snapshot: snap,
      existing: {
        ...input().existing,
        'pub-old': { _id: 'pub-old', _type: 'publication', title: 'Old', type: 'Review' },
      },
    })
    const plan = planImport(withType)
    expect(plan.reports).toContain('publication pub-old: type differs (Sanity "Review" vs Wix "Article") — not written')
    expect(patchFor(plan, 'pub-old')?.set?.type).toBeUndefined()
  })
})

describe('planImport: singleton drafts kept in step (Fix round 3)', () => {
  it('patches drafts.settings with contact when the draft exists', () => {
    const plan = planImport(input({
      drafts: { 'drafts.settings': { _id: 'drafts.settings', _type: 'settings' } },
    }))
    expect(patchFor(plan, 'drafts.settings')?.set).toEqual({ contact: { address: 'Addr', email: 'a@b.org', phone: '1' } })
  })

  it('produces no draft op when no draft exists', () => {
    const plan = planImport(input())
    expect(plan.ops.some((o) => (o.kind === 'create' ? o.doc._id : o.id).startsWith('drafts.'))).toBe(false)
  })

  it('skips a draft field edited after the last import and keeps the ledger', () => {
    const first = planImport(input({
      drafts: { 'drafts.settings': { _id: 'drafts.settings', _type: 'settings' } },
    }))
    const draftAfter: CurrentDoc = {
      _id: 'drafts.settings', _type: 'settings',
      contact: { address: 'Edited in Studio', email: 'a@b.org', phone: '1' },
    }
    const second = planImport(input({
      drafts: { 'drafts.settings': draftAfter },
      ledger: first.ledger,
    }))
    expect(patchFor(second, 'drafts.settings')).toBeUndefined()
    expect(second.skipped).toContainEqual({ id: 'drafts.settings', field: 'contact', reason: 'edited-since-import' })
    expect(second.ledger['drafts.settings#contact']).toBe(first.ledger['drafts.settings#contact'])
  })

  it('never creates a draft, even when the published singleton is itself being created', () => {
    const existingNoSiteCopy: Record<string, CurrentDoc> = {
      'p-jc': { _id: 'p-jc', _type: 'profile', name: 'Dr Johnny Chan (DDS)', role: 'Research Scientist', orderRank: '0|100014:' },
      'pub-old': { _id: 'pub-old', _type: 'publication', title: 'Old (Sanity wording)', doi: null },
      settings: { _id: 'settings', _type: 'settings' },
    }
    const plan = planImport(input({
      existing: existingNoSiteCopy,
      drafts: { 'drafts.siteCopy': { _id: 'drafts.siteCopy', _type: 'siteCopy' } },
    }))
    expect(createFor(plan, 'siteCopy')).toBeDefined()
    expect(createFor(plan, 'drafts.siteCopy')).toBeUndefined()
    expect(patchFor(plan, 'drafts.siteCopy')?.set).toMatchObject({ teamIntro: 'Team' })
  })
})

describe('planImport: media with no link or video', () => {
  // Synthetic -- the real "creatine-for-the-brain" (Channel 7) item now has a
  // YouTube url in the committed snapshot, so this report no longer fires for
  // it. The report itself stays in plan.ts for a future item that genuinely
  // has neither a link nor a video.
  it('creates a media item with no video, poster, or url field and reports the gap', () => {
    const snap = snapshot()
    snap.media = [
      { key: 'no-link-no-video', title: 'Some segment', outlet: 'Some Outlet', date: null, url: null, videoUrl: null, posterUrl: null },
    ]
    const plan = planImport(input({ snapshot: snap }))
    const doc = createFor(plan, 'wix-media-no-link-no-video')?.doc
    expect(doc).toBeDefined()
    expect(doc).not.toHaveProperty('video')
    expect(doc).not.toHaveProperty('poster')
    expect(doc).not.toHaveProperty('url')
    expect(plan.reports).toContain(
      'media no-link-no-video: no link or video — imported as a text row; add the video in Studio'
    )
  })
})

describe('planImport: dry-run asset idempotency', () => {
  const url = 'https://static.wixstatic.com/media/pic1'

  function projectSnapshot() {
    const snap = snapshot()
    snap.projects = [
      { key: 'proj', sanityId: 'proj-1', researchOrder: 1, title: 'T', paragraphs: [], imageUrl: url, imageAlt: 'Alt' },
    ]
    return snap
  }
  function projectExisting(coverImage: unknown): Record<string, CurrentDoc> {
    return {
      ...input().existing,
      'proj-1': { _id: 'proj-1', _type: 'project', title: 'T', researchOrder: 1, description: [], coverImage },
    }
  }
  const realImage = { _type: 'image', asset: { _type: 'reference', _ref: 'image-real-1' }, alt: 'Alt' }

  it('a placeholder-ref image produces no op and one report in dry-run mode (nothing else changed either)', () => {
    const plan = planImport(input({
      snapshot: projectSnapshot(),
      existing: projectExisting(realImage),
      assetIds: { [url]: 'pending:pic1' },
      assetsResolved: false,
    }))
    expect(patchFor(plan, 'proj-1')).toBeUndefined()
    const notes = plan.reports.filter((r) => r.includes('proj-1.coverImage'))
    expect(notes).toEqual([
      'proj-1.coverImage: asset not comparable in a dry run (upload happens on --commit); nothing else in this field changed either',
    ])
  })

  it('emits a patch for the non-asset part of a field with a placeholder ref (Important 1), using the CURRENT real ref, not the placeholder', () => {
    const plan = planImport(input({
      snapshot: projectSnapshot(),
      existing: projectExisting({ ...realImage, alt: 'Old alt' }),
      assetIds: { [url]: 'pending:pic1' },
      assetsResolved: false,
    }))
    // The dry run can never apply this op (it exits before the transaction),
    // but it must be visible to a human reading the dry run before --commit.
    expect(patchFor(plan, 'proj-1')?.set?.coverImage).toEqual(realImage)
    expect((patchFor(plan, 'proj-1')?.set?.coverImage as { asset: { _ref: string } }).asset._ref).toBe('image-real-1')
    expect(plan.reports).toContain(
      'proj-1.coverImage: asset not comparable in a dry run (upload happens on --commit); the rest of this field differs and will be applied on --commit'
    )
  })

  it('the nested siteCopy.hero.image case: only the heading changes -- still emits a PATCH with the CURRENT asset ref, not a pending one (Important 1)', () => {
    const snap = snapshot()
    snap.siteCopy.hero.imageUrl = url
    snap.siteCopy.hero.heading = 'New heading'
    const heroImage = { _type: 'image', asset: { _type: 'reference', _ref: 'image-real-1' } }
    const existing = {
      ...input().existing,
      siteCopy: {
        _id: 'siteCopy', _type: 'siteCopy',
        hero: { image: heroImage, heading: 'Old heading', subheading: 'S' },
        about: { heading: 'About', body: toBlocks(['One *two*'], 'siteCopy.about'), themesIntro: 'T', themes: [] },
        teamIntro: 'Team', alumniSubtitle: '2020 - present', contactIntro: 'Support',
      },
    }
    const plan = planImport(input({
      snapshot: snap, existing,
      assetIds: { [url]: 'pending:pic1' },
      assetsResolved: false,
    }))
    const hero = patchFor(plan, 'siteCopy')?.set?.hero as { image: { asset: { _ref: string } }; heading: string } | undefined
    expect(hero?.heading).toBe('New heading')
    expect(hero?.image.asset._ref).toBe('image-real-1')
    expect(plan.reports).toContain(
      'siteCopy.hero.image: asset not comparable in a dry run (upload happens on --commit); the rest of this field differs and will be applied on --commit'
    )
  })

  it('a field with a placeholder ref that was edited in Studio since the last import is skipped, not applied, and the note says so (Minor 3)', () => {
    const first = planImport(input({
      snapshot: projectSnapshot(),
      existing: projectExisting(realImage),
      assetIds: { [url]: 'image-real-1' },
      assetsResolved: true,
    }))
    const editedExisting = projectExisting({ ...realImage, alt: 'Edited in Studio' })
    const plan = planImport(input({
      snapshot: projectSnapshot(),
      existing: editedExisting,
      assetIds: { [url]: 'pending:pic1' },
      assetsResolved: false,
      ledger: first.ledger,
    }))
    expect(patchFor(plan, 'proj-1')).toBeUndefined()
    expect(plan.skipped).toContainEqual({ id: 'proj-1', field: 'coverImage', reason: 'edited-since-import' })
    expect(plan.reports).toContain(
      'proj-1.coverImage: asset not comparable in a dry run (upload happens on --commit); this field differs from what was last imported, so it will be skipped as edited-since-import'
    )
  })

  it('a field that has never held an image is not comparable at all -- no op, no crash (masked.ok === false)', () => {
    const plan = planImport(input({
      snapshot: projectSnapshot(),
      // No coverImage property at all on the existing doc.
      existing: { ...input().existing, 'proj-1': { _id: 'proj-1', _type: 'project', title: 'T', researchOrder: 1, description: [] } },
      assetIds: { [url]: 'pending:pic1' },
      assetsResolved: false,
    }))
    expect(patchFor(plan, 'proj-1')?.set?.coverImage).toBeUndefined()
    expect(plan.reports).toEqual(
      expect.arrayContaining(['proj-1.coverImage: asset not comparable in a dry run (upload happens on --commit)'])
    )
    // Not the "nothing else changed"/"will be applied"/"will be skipped" variants --
    // there is nothing to compare against at all.
    expect(plan.reports.filter((r) => r.includes('proj-1.coverImage'))).toHaveLength(1)
  })

  it('a real ref that differs from the current value still produces a patch', () => {
    const plan = planImport(input({
      snapshot: projectSnapshot(),
      existing: projectExisting({ ...realImage, asset: { _type: 'reference', _ref: 'image-old' } }),
      assetIds: { [url]: 'image-real-1' },
      assetsResolved: true,
    }))
    expect(patchFor(plan, 'proj-1')?.set?.coverImage).toEqual(realImage)
  })

  it('a commit-mode plan SKIPS an image field edited in Studio since the last import, exactly like any other field', () => {
    const editedRef = { ...realImage, asset: { _type: 'reference', _ref: 'image-edited-in-studio' } }
    const ledger = { 'proj-1#coverImage': stableHash({ ...realImage, asset: { _type: 'reference', _ref: 'image-old' } }) }
    const plan = planImport(input({
      snapshot: projectSnapshot(),
      existing: projectExisting(editedRef),
      assetIds: { [url]: 'image-real-1' },
      assetsResolved: true,
      ledger,
    }))
    expect(patchFor(plan, 'proj-1')?.set?.coverImage).toBeUndefined()
    expect(plan.skipped).toContainEqual({ id: 'proj-1', field: 'coverImage', reason: 'edited-since-import' })
  })

  it('a commit run throws if it ever sees a placeholder ref (defence in depth)', () => {
    const snap = projectSnapshot()
    expect(() => planImport(input({
      snapshot: snap,
      existing: projectExisting(realImage),
      assetIds: { [url]: 'pending:pic1' },
      assetsResolved: true,
    }))).toThrow('refusing to write a placeholder asset ref')
  })
})
