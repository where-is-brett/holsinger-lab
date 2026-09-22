// Builds data/wix/fixture.ndjson: a small dataset, generated from the
// committed Wix snapshot, that lets lib/wix/fetch.ts run the site's real
// GROQ queries (via groq-js) before the wix-preview Sanity dataset exists.
// See .superpowers/sdd/2026-09-22-wix-lookalike/task-C0-brief.md.
//
// Run with `npm run fixture:wix` after changing data/wix/snapshot.json.

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

import { toBlocks } from './blocks.ts'
import { type CurrentDoc, planImport } from './plan.ts'
import { rankAt } from './rank.ts'
import {
  ROLE_GROUP_TITLES,
  type RoleGroupTitle,
  type WixSnapshot,
} from './snapshot.ts'

/** Drops null/undefined fields, mirroring plan.ts's private `present()`. */
function present(fields: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(fields).filter(([, v]) => v !== null && v !== undefined)
  )
}
const ref = (id: string) => ({ _type: 'reference', _ref: id })

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

// The snapshot carries no publication year for the 15 publications already
// matched to a Sanity document (their `date` is null there -- Sanity owns
// that field). Keyed by the snapshot's publication `key`; see the brief.
const PUBLICATION_YEARS: Record<string, number> = {
  'chromobox-protein-homolog-7': 2025,
  'cell-culture-chamber': 2024,
  'fmt-review': 2023,
  'fiber-electrical-field-alignment': 2023,
  'inpp5d-ship1': 2023,
  'carnosic-acid': 2023,
  'oxidative-stress-antioxidants': 2023,
  'fmt-mouse-model': 2022,
  'non-pharmacological-options': 2022,
  'variant-trem2': 2022,
  'ground-state-depletion-microscopy': 2021,
  'cerebellar-cryptic-avm': 2021,
  'piezoelectric-knn-thin-films': 2020,
  'leptin-receptor-5xfad': 2020,
  'genome-wide-integrative-analysis': 2020,
}

/** A fake, deterministic asset id in the shape Sanity would hand out. */
function fakeAssetId(url: string): string {
  const hash = createHash('sha1').update(url).digest('hex').slice(0, 24)
  if (/\.mp4(\?|$)/i.test(url)) return `file-${hash}-mp4`
  const match = url.match(/\.(png|jpe?g)/i)
  const ext = (match?.[1] ?? 'jpg').toLowerCase()
  return `image-${hash}-800x600-${ext}`
}

function collectAssetUrls(s: WixSnapshot): string[] {
  const urls = new Set<string>()
  const add = (u: string | null | undefined) => {
    if (u) urls.add(u)
  }
  add(s.siteCopy.hero.imageUrl)
  for (const m of s.media) {
    add(m.videoUrl)
    add(m.posterUrl)
  }
  for (const p of s.projects) add(p.imageUrl)
  for (const p of s.people) add(p.imageUrl)
  return [...urls]
}

export function buildFixtureDocs(
  snapshot: WixSnapshot
): Record<string, unknown>[] {
  const roleGroupIds = {} as Record<RoleGroupTitle, string>
  const roleGroupDocs: Record<string, unknown>[] = ROLE_GROUP_TITLES.map(
    (title, i) => {
      const id = `fixture-rg-${slug(title)}`
      roleGroupIds[title] = id
      return { _id: id, _type: 'roleGroup', title, orderRank: rankAt(i) }
    }
  )

  // A profile for the PI, Damian Holsinger, with `settings.labHead` pointing
  // at it. Neither exists on Wix -- the PI has no roleGroup and no portrait
  // in the real dataset either (see scripts/create-pi-profile.ts) -- but the
  // fixture must include them so groupTeam's PI-exclusion logic (both the
  // labHeadId path and its "role === Lab Head" defensive fallback) has
  // something real to exercise; without this the fixture silently hid the
  // bug I1 in the whole-branch review found (an empty portrait box for the
  // PI in the current-members grid when labHead is unset).
  const PI_ID = 'fixture-pi'
  const piProfile: Record<string, unknown> = {
    _id: PI_ID,
    _type: 'profile',
    name: 'Damian Holsinger',
    role: 'Lab Head',
  }

  const settings: CurrentDoc & { labHead?: unknown } = {
    _id: 'settings',
    _type: 'settings',
    labHead: ref(PI_ID),
  }
  const home: CurrentDoc = {
    _id: 'home',
    _type: 'home',
    title: 'Laboratory of Molecular Neuroscience and Dementia',
  }
  const existing: Record<string, CurrentDoc> = { settings, home }

  const assetUrls = collectAssetUrls(snapshot)
  const assetIds: Record<string, string> = {}
  for (const url of assetUrls) assetIds[url] = fakeAssetId(url)

  const image = (url: string | null, alt?: string) => {
    if (!url) return undefined
    if (!assetIds[url]) throw new Error(`asset not uploaded: ${url}`)
    return present({
      _type: 'image',
      asset: ref(assetIds[url]),
      alt: alt || undefined,
    })
  }

  // In production, a matched profile's `imageUrl` is null because Sanity
  // already owns that field -- the import never touches it, so the existing
  // (real) portrait survives untouched. In fixture mode there is no real
  // Sanity document behind a matched profile, so without this it would have
  // no portrait at all and would never render as an alumni photo card. Give
  // every sanityId-matched person a deterministic placeholder portrait, in
  // the same image shape the planner uses for a real one.
  const placeholderPortrait = (sanityId: string, alt?: string) =>
    present({
      _type: 'image',
      asset: ref(`image-${createHash('sha1').update(sanityId).digest('hex').slice(0, 24)}-400x500-jpg`),
      alt: alt || undefined,
    })

  const plan = planImport({
    snapshot,
    existing,
    settingsId: 'settings',
    roleGroupIds,
    assetIds,
    ledger: {},
    // The fixture has no unpublished drafts of settings/siteCopy.
    drafts: {},
  })

  const docsById = new Map<string, Record<string, unknown>>()
  docsById.set(settings._id, { ...settings })
  docsById.set(home._id, { ...home })
  docsById.set(PI_ID, piProfile)
  for (const doc of roleGroupDocs) docsById.set(doc._id as string, doc)

  for (const op of plan.ops) {
    if (op.kind === 'create') {
      docsById.set(op.doc._id, { ...op.doc })
    } else {
      const current = docsById.get(op.id) ?? {}
      docsById.set(op.id, { ...current, ...op.set })
    }
  }

  // Fake file-asset documents, so `video.asset->url` resolves in fixture mode.
  for (const url of assetUrls) {
    const id = assetIds[url]
    if (id.startsWith('file-'))
      docsById.set(id, { _id: id, _type: 'sanity.fileAsset', url })
  }

  // planImport's project/profile/publication loops report-and-skip a
  // sanityId-matched entry when that id is missing from `existing` -- which
  // it always is here, since `existing` only carries settings/home. Create
  // those documents directly, mirroring the field rules planImport applies
  // when a match *is* found.
  for (const p of snapshot.projects) {
    if (!p.sanityId) continue
    const doc = present({
      _id: p.sanityId,
      _type: 'project',
      title: p.title,
      researchOrder: p.researchOrder,
      description: toBlocks(p.paragraphs, `project.${p.key}`),
      coverImage: image(p.imageUrl, p.imageAlt),
    })
    docsById.set(p.sanityId, doc)
  }

  snapshot.people.forEach((p, i) => {
    if (!p.sanityId) return
    const doc = present({
      _id: p.sanityId,
      _type: 'profile',
      name: p.name,
      role: p.role,
      roleDetail: p.roleDetail,
      roleGroup: ref(roleGroupIds[p.group]),
      orderRank: rankAt(i),
      image: image(p.imageUrl, p.name) ?? placeholderPortrait(p.sanityId, p.name),
    })
    docsById.set(p.sanityId, doc)
  })

  for (const p of snapshot.publications) {
    if (!p.sanityId) continue
    const year = PUBLICATION_YEARS[p.key]
    if (!year)
      throw new Error(
        `buildFixtureDocs: no year mapped for publication "${p.key}"`
      )
    const doc: Record<string, unknown> = {
      _id: p.sanityId,
      _type: 'publication',
      title: p.title,
      author: p.authors,
      date: `${year}-01-01`,
    }
    if (p.journal !== null) doc.journal = p.journal
    if (p.volume !== null) doc.volume = p.volume
    if (p.issue !== null) doc.issue = p.issue
    if (p.pages !== null) doc.pages = p.pages
    if (p.doi !== null) doc.doi = p.doi
    docsById.set(p.sanityId, doc)
  }

  return [...docsById.values()].sort((a, b) => {
    const idA = (a as { _id: string })._id
    const idB = (b as { _id: string })._id
    return idA < idB ? -1 : idA > idB ? 1 : 0
  })
}

const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  const snapshot = JSON.parse(
    readFileSync(
      new URL('../../data/wix/snapshot.json', import.meta.url),
      'utf8'
    )
  ) as WixSnapshot
  const docs = buildFixtureDocs(snapshot)
  const out = `${docs.map((d) => JSON.stringify(d)).join('\n')}\n`
  writeFileSync(new URL('../../data/wix/fixture.ndjson', import.meta.url), out)
  console.log(`Wrote ${docs.length} documents to data/wix/fixture.ndjson`)
}
