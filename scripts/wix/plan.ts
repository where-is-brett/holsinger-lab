import { createHash } from 'node:crypto'

import { toBlocks } from './blocks.ts'
import { rankAt } from './rank.ts'
import { ROLE_GROUP_TITLES, type RoleGroupTitle, type WixSnapshot } from './snapshot.ts'

export const LEDGER_ID = 'wix-import.ledger'
export type Ledger = Record<string, string>
export interface CurrentDoc { _id: string; _type: string; [field: string]: unknown }
export interface PlanInput {
  snapshot: WixSnapshot
  existing: Record<string, CurrentDoc>
  settingsId: string
  roleGroupIds: Record<RoleGroupTitle, string>
  assetIds: Record<string, string>
  ledger: Ledger
}
export type Op =
  | { kind: 'create'; doc: CurrentDoc }
  | { kind: 'patch'; id: string; set: Record<string, unknown> }
export interface Skip { id: string; field: string; reason: 'edited-since-import' | 'deleted-since-import' }
export interface Plan { ops: Op[]; skipped: Skip[]; reports: string[]; ledger: Ledger }

/** Key-order-independent JSON, so {a,b} and {b,a} hash the same. */
function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`
  if (v && typeof v === 'object')
    return `{${Object.keys(v as object).sort().map((k) => `${JSON.stringify(k)}:${canonical((v as Record<string, unknown>)[k])}`).join(',')}}`
  return JSON.stringify(v ?? null)
}
export const stableHash = (v: unknown) => createHash('sha256').update(canonical(v)).digest('hex')
const equal = (a: unknown, b: unknown) => canonical(a) === canonical(b)

/** Drops null/undefined so an op can never blank a field. */
function present(fields: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== null && v !== undefined))
}
const ref = (id: string) => ({ _type: 'reference', _ref: id })

export function planImport(input: PlanInput): Plan {
  const { snapshot: s, existing, roleGroupIds, assetIds } = input
  const ops: Op[] = []
  const skipped: Skip[] = []
  const reports: string[] = []
  const ledger: Ledger = { ...input.ledger }

  // A role group missing from the lookup would otherwise silently produce a
  // dangling `{ _ref: undefined }` reference.
  for (const title of ROLE_GROUP_TITLES) {
    if (!roleGroupIds[title]) throw new Error(`role group not found: ${title}`)
  }

  const image = (url: string | null, alt?: string) => {
    if (!url) return undefined
    if (!assetIds[url]) throw new Error(`asset not uploaded: ${url}`)
    return present({ _type: 'image', asset: ref(assetIds[url]), alt: alt || undefined })
  }
  const file = (url: string | null) => {
    if (!url) return undefined
    if (!assetIds[url]) throw new Error(`asset not uploaded: ${url}`)
    return { _type: 'file', asset: ref(assetIds[url]) }
  }

  /** Applies the field rule to one document. */
  function upsert(id: string, type: string, desiredRaw: Record<string, unknown>) {
    const desired = present(desiredRaw)
    const current = existing[id]
    if (!current) {
      // A doc we previously created (or patched) and that is now gone was
      // deleted in Studio, not merely "not yet imported" — never recreate it.
      const previouslyImported = Object.keys(input.ledger).some((k) => k.startsWith(`${id}#`))
      if (previouslyImported) {
        skipped.push({ id, field: '*', reason: 'deleted-since-import' })
        return
      }
      ops.push({ kind: 'create', doc: { _id: id, _type: type, ...desired } })
      for (const [f, v] of Object.entries(desired)) ledger[`${id}#${f}`] = stableHash(v)
      return
    }
    const set: Record<string, unknown> = {}
    for (const [f, v] of Object.entries(desired)) {
      const cur = current[f]
      const lk = `${id}#${f}`
      if (equal(cur, v)) { ledger[lk] = stableHash(v); continue }
      const hasLedgerEntry = lk in input.ledger
      // A field cleared (or never touched) after our last import is "untouched" and Wix
      // wins on first import. But once we have a ledger entry, null/undefined counts as
      // an edit (someone cleared it in Studio), not neutral ground.
      const untouched = !hasLedgerEntry
        ? true
        : cur === null || cur === undefined
          ? false
          : input.ledger[lk] === stableHash(cur)
      if (untouched) { set[f] = v; ledger[lk] = stableHash(v) }
      else skipped.push({ id, field: f, reason: 'edited-since-import' })
    }
    if (Object.keys(set).length) ops.push({ kind: 'patch', id, set })
  }

  // siteCopy singleton
  const sc = s.siteCopy
  upsert('siteCopy', 'siteCopy', {
    hero: present({ image: image(sc.hero.imageUrl, sc.hero.imageAlt), heading: sc.hero.heading, subheading: sc.hero.subheading }),
    about: {
      heading: sc.about.heading,
      body: toBlocks(sc.about.paragraphs, 'siteCopy.about'),
      themesIntro: sc.about.themesIntro,
      themes: sc.about.themes.map((t) => ({ _type: 'theme', _key: t.key, title: t.title, summary: t.summary })),
    },
    teamIntro: sc.teamIntro,
    alumniSubtitle: sc.alumniSubtitle,
    contactIntro: sc.contactIntro,
  })

  // settings.contact
  upsert(input.settingsId, 'settings', { contact: { ...s.contact } })

  s.news.forEach((n, i) =>
    upsert(`wix-news-${n.key}`, 'newsItem', {
      orderRank: rankAt(i), title: n.title, body: toBlocks(n.paragraphs, `news.${n.key}`),
      summary: n.summary, showOnHome: n.showOnHome, showOnNewsPage: n.showOnNewsPage,
    })
  )

  s.media.forEach((m, i) => {
    if (!m.url && !m.videoUrl)
      reports.push(`media ${m.key}: no link or video — imported as a text row; add the video in Studio`)
    upsert(`wix-media-${m.key}`, 'mediaAppearance', {
      orderRank: rankAt(i), title: m.title, outlet: m.outlet, date: m.date, url: m.url,
      video: file(m.videoUrl), poster: image(m.posterUrl),
    })
  })

  for (const p of s.projects) {
    if (p.sanityId && !existing[p.sanityId]) {
      reports.push(`project ${p.sanityId}: matched id not found — skipped`)
      continue
    }
    upsert(p.sanityId ?? `wix-project-${p.key}`, 'project', {
      title: p.title, researchOrder: p.researchOrder,
      description: toBlocks(p.paragraphs, `project.${p.key}`),
      coverImage: image(p.imageUrl, p.imageAlt),
      ...(p.sanityId ? {} : { slug: { _type: 'slug', current: p.key } }),
    })
  }

  s.people.forEach((p, i) => {
    if (p.sanityId && !existing[p.sanityId]) {
      reports.push(`profile ${p.sanityId}: matched id not found — skipped`)
      return
    }
    upsert(p.sanityId ?? `wix-profile-${p.key}`, 'profile', {
      name: p.name, role: p.role, roleDetail: p.roleDetail,
      roleGroup: ref(roleGroupIds[p.group]), orderRank: rankAt(i),
      image: image(p.imageUrl, p.name),
      ...(p.sanityId ? {} : { hasPage: false }),
    })
  })

  // Publications: create new ones; for matched ones only fill a missing DOI.
  // Every other publication difference is reported, never written.
  for (const p of s.publications) {
    if (p.sanityId === null) {
      upsert(`wix-publication-${p.key}`, 'publication', {
        title: p.title, author: p.authors, journal: p.journal, date: p.date,
        volume: p.volume, issue: p.issue, pages: p.pages, doi: p.doi,
      })
      continue
    }
    const cur = existing[p.sanityId]
    if (!cur) { reports.push(`publication ${p.sanityId}: matched id not found — skipped`); continue }
    if (p.doi && !cur.doi) upsert(p.sanityId, 'publication', { doi: p.doi })

    const diffs: [string, unknown, unknown][] = [
      ['title', p.title, cur.title],
      ['author', p.authors, cur.author],
      ['journal', p.journal, cur.journal],
      ['volume', p.volume, cur.volume],
      ['issue', p.issue, cur.issue],
      ['pages', p.pages, cur.pages],
    ]
    for (const [field, wixVal, sanityVal] of diffs) {
      if (wixVal === null || wixVal === undefined) continue
      const a = typeof sanityVal === 'string' ? sanityVal.trim() : sanityVal
      const b = typeof wixVal === 'string' ? wixVal.trim() : wixVal
      if (a === b) continue
      reports.push(`publication ${p.sanityId}: ${field} differs (Sanity "${sanityVal}" vs Wix "${wixVal}") — not written`)
    }
    if (p.doi && cur.doi && cur.doi !== p.doi)
      reports.push(`publication ${p.sanityId}: doi differs (Sanity "${cur.doi}" vs Wix "${p.doi}") — not written`)
  }

  return { ops, skipped, reports, ledger }
}
