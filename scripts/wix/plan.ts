import { createHash } from 'node:crypto'

import { publicationSlug } from '../../schemas/lib/publicationSlug.ts'
import { toBlocks } from './blocks.ts'
import { rankAt } from './rank.ts'
import { ROLE_GROUP_TITLES, type RoleGroupTitle, type WixSnapshot } from './snapshot.ts'

export const LEDGER_ID = 'wix-import.ledger'
export type Ledger = Record<string, string>
export interface CurrentDoc { _id: string; _type: string; [field: string]: unknown }

// Dry runs don't upload, so `assetIds` maps a url to a placeholder id of this
// shape instead of a real Sanity asset id (see scripts/import-wix.ts). The
// planner needs to recognise that shape so a dry run doesn't diff a
// placeholder against the real, previously-uploaded asset and report a
// phantom change every single run.
export const PENDING_ASSET_PREFIX = 'pending:'
const isPendingRef = (v: unknown): v is string => typeof v === 'string' && v.startsWith(PENDING_ASSET_PREFIX)

export interface PlanInput {
  snapshot: WixSnapshot
  existing: Record<string, CurrentDoc>
  settingsId: string
  roleGroupIds: Record<RoleGroupTitle, string>
  assetIds: Record<string, string>
  /**
   * Every publication slug already present in the dataset (`slug.current`
   * for docs that have one). `planImport` is pure and can't query, so the
   * CLI gathers this with one read-only GROQ query, the same way
   * `roleGroupIds` is gathered. Used only to keep a newly-generated slug
   * (schemas/lib/publicationSlug.ts) from colliding with an existing one.
   */
  existingSlugs: ReadonlySet<string>
  ledger: Ledger
  /**
   * Unpublished drafts of the singleton docs (siteCopy, settings), keyed by
   * draft `_id` (e.g. "drafts.settings"). May be empty -- most datasets have
   * no such draft. Only siteCopy and settings are kept in step; other
   * document types' drafts are left alone (see plan §Fix round 3).
   */
  drafts: Record<string, CurrentDoc>
  /**
   * false on a dry run (assetIds holds `pending:…` placeholders, not real
   * Sanity asset ids); true on --commit, once every url has been uploaded
   * and assetIds holds real ids. See "Fix: dry runs must not report
   * placeholder-only differences" below.
   */
  assetsResolved: boolean
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

function isAssetObject(v: unknown): v is { _type: 'image' | 'file'; asset?: { _ref?: unknown } } {
  return !!v && typeof v === 'object' && ((v as { _type?: unknown })._type === 'image' || (v as { _type?: unknown })._type === 'file')
}

/**
 * Finds every dot-path (relative to the field's own root -- '' means the
 * field value itself is the image/file object) at which `v` holds an
 * image/file object whose asset ref is a dry-run placeholder. Doesn't look
 * inside arrays: none of the imported image/file fields are array items.
 */
function findPendingAssetPaths(v: unknown, path = ''): string[] {
  if (isAssetObject(v) && isPendingRef(v.asset?._ref)) return [path]
  if (v && typeof v === 'object' && !Array.isArray(v))
    return Object.entries(v as Record<string, unknown>).flatMap(([k, sub]) => findPendingAssetPaths(sub, path ? `${path}.${k}` : k))
  return []
}

/**
 * For comparison only -- never for writing. Replaces every placeholder asset
 * ref in `desired` with the real ref at the same path in `current`, so a dry
 * run can tell whether anything OTHER than the (never-comparable-in-a-dry-run)
 * asset itself changed. `ok: false` means a placeholder has no matching real
 * asset to compare against (current has no image there yet, e.g. a field
 * that has never been imported) -- the caller treats the whole field as not
 * comparable this run.
 */
function maskPendingAssets(desired: unknown, current: unknown): { ok: true; value: unknown } | { ok: false } {
  if (isAssetObject(desired) && isPendingRef(desired.asset?._ref)) {
    const curRef = (current as { asset?: { _ref?: unknown } } | undefined)?.asset?._ref
    if (typeof curRef !== 'string' || isPendingRef(curRef)) return { ok: false }
    return { ok: true, value: { ...desired, asset: { ...desired.asset, _ref: curRef } } }
  }
  if (desired && typeof desired === 'object' && !Array.isArray(desired)) {
    const cur = current && typeof current === 'object' ? (current as Record<string, unknown>) : {}
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(desired as Record<string, unknown>)) {
      const r = maskPendingAssets(v, cur[k])
      if (!r.ok) return { ok: false }
      out[k] = r.value
    }
    return { ok: true, value: out }
  }
  return { ok: true, value: desired }
}

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
    const assetId = assetIds[url]
    if (!assetId) throw new Error(`asset not uploaded: ${url}`)
    // A commit run has already uploaded every asset; if it ever sees a
    // placeholder here that's a bug upstream, not a case to write through.
    if (input.assetsResolved && isPendingRef(assetId)) throw new Error(`refusing to write a placeholder asset ref on a commit run: ${url}`)
    return present({ _type: 'image', asset: ref(assetId), alt: alt || undefined })
  }
  const file = (url: string | null) => {
    if (!url) return undefined
    const assetId = assetIds[url]
    if (!assetId) throw new Error(`asset not uploaded: ${url}`)
    if (input.assetsResolved && isPendingRef(assetId)) throw new Error(`refusing to write a placeholder asset ref on a commit run: ${url}`)
    return { _type: 'file', asset: ref(assetId) }
  }

  /**
   * The field rule shared by every patch target (published docs and, for
   * singletons, their draft counterpart): Wix wins on an untouched field,
   * Studio wins (and is reported as skipped) once a field has been imported
   * and then edited or cleared since.
   */
  function fieldRuleSet(id: string, current: CurrentDoc, desired: Record<string, unknown>): Record<string, unknown> {
    const set: Record<string, unknown> = {}
    for (const [f, rawV] of Object.entries(desired)) {
      const cur = current[f]
      const lk = `${id}#${f}`

      // Dry run: this field's desired value has an unresolved (placeholder)
      // asset ref somewhere in it. The asset itself can never be compared
      // until --commit uploads it -- but `hero` is the one imported field
      // that bundles an image together with other data (heading,
      // subheading), so treating the whole field as "not comparable" would
      // silently swallow a genuine heading change: the dry run would print
      // nothing, and --commit would then write a field the operator never
      // saw. Instead, substitute the CURRENT real asset ref for the
      // placeholder (comparison only, via maskPendingAssets) and run that
      // masked value through the exact same equal/untouched logic as every
      // other field below -- it reports or sets everything comparable, and
      // can never actually apply the substituted ref, because a dry run
      // never reaches the transaction. Genuine limitation: this can't
      // detect a changed SOURCE url on an already-imported field, because
      // the placeholder is only ever compared against the last-imported
      // hash of the *whole field* (which doesn't encode the url), not
      // against the url itself. Separate residual, on --commit: every commit
      // re-downloads and re-uploads every asset and relies on Sanity's
      // content-hash dedupe handing back the SAME asset id for unchanged
      // bytes -- if that ever returned a new id instead, this field would be
      // re-patched (not blanked, just needlessly rewritten) on every commit.
      let v = rawV
      let assetLabel: string | null = null
      if (!input.assetsResolved) {
        const pendingPaths = findPendingAssetPaths(rawV)
        if (pendingPaths.length) {
          const label = pendingPaths[0] ? `${id}.${f}.${pendingPaths[0]}` : `${id}.${f}`
          const masked = maskPendingAssets(rawV, cur)
          if (!masked.ok) {
            // No real asset at this path yet (field never imported) -- there is
            // nothing to substitute, so nothing here is comparable this run.
            reports.push(`${label}: asset not comparable in a dry run (upload happens on --commit)`)
            continue
          }
          v = masked.value
          assetLabel = label
        }
      }

      if (equal(cur, v)) {
        ledger[lk] = stableHash(v)
        if (assetLabel)
          reports.push(`${assetLabel}: asset not comparable in a dry run (upload happens on --commit); nothing else in this field changed either`)
        continue
      }
      const hasLedgerEntry = lk in input.ledger
      // A field cleared (or never touched) after our last import is "untouched" and Wix
      // wins on first import. But once we have a ledger entry, null/undefined counts as
      // an edit (someone cleared it in Studio), not neutral ground.
      const untouched = !hasLedgerEntry
        ? true
        : cur === null || cur === undefined
          ? false
          : input.ledger[lk] === stableHash(cur)
      if (assetLabel) {
        const verdict = untouched
          ? 'the rest of this field differs and will be applied on --commit'
          : 'this field differs from what was last imported, so it will be skipped as edited-since-import'
        reports.push(`${assetLabel}: asset not comparable in a dry run (upload happens on --commit); ${verdict}`)
      }
      if (untouched) { set[f] = v; ledger[lk] = stableHash(v) }
      else skipped.push({ id, field: f, reason: 'edited-since-import' })
    }
    return set
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
    const set = fieldRuleSet(id, current, desired)
    if (Object.keys(set).length) ops.push({ kind: 'patch', id, set })
  }

  /**
   * Same as upsert, but for a singleton (siteCopy / settings) also keeps its
   * unpublished draft, if one exists, in step -- so publishing that draft
   * later can't silently drop an imported field. Never creates a draft: a
   * missing draft means no op and no skip (Fix round 3).
   */
  function upsertSingleton(id: string, type: string, desiredRaw: Record<string, unknown>) {
    upsert(id, type, desiredRaw)
    const draftId = `drafts.${id}`
    const draft = input.drafts[draftId]
    if (!draft) return
    const desired = present(desiredRaw)
    const set = fieldRuleSet(draftId, draft, desired)
    if (Object.keys(set).length) ops.push({ kind: 'patch', id: draftId, set })
  }

  // siteCopy singleton
  const sc = s.siteCopy
  upsertSingleton('siteCopy', 'siteCopy', {
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
  upsertSingleton(input.settingsId, 'settings', { contact: { ...s.contact } })

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

  // A publication already has a usable slug once `slug.current` is a
  // non-empty string. Used below to make sure slug generation only ever
  // fires ONCE per document -- see the fix-round-1 note at `claimedSlugs`.
  const hasSlug = (doc: CurrentDoc | undefined): boolean => {
    const cur = doc?.slug as { current?: unknown } | undefined
    return typeof cur?.current === 'string' && cur.current.length > 0
  }

  // Publications: create new ones; for matched ones only fill a missing DOI.
  // Every other publication difference is reported, never written.
  //
  // A created publication also gets a slug (schemas/lib/publicationSlug.ts),
  // in the same title+year format the backfill script uses -- without one
  // the schema's slug field is unset and the paper gets no
  // /publications/<slug> page. Matched publications are untouched: their
  // slug is either already set or is a job for the backfill script, not
  // this importer.
  //
  // Fix round 1: slug generation must run at most ONCE per document, never
  // again after that. It is gated on `!hasSlug(existing[id])`, not merely on
  // `!existing[id]` (a genuine create) -- because a handful of documents
  // this importer previously created are already sitting in the dataset
  // with no slug at all (the bug this PR fixes), and those need exactly one
  // more run to pick a slug up through the normal `fieldRuleSet` "untouched"
  // path below (no ledger entry yet for `#slug` + no current value => Wix
  // wins, once). The bug the reviewer caught: generating the slug on every
  // run, unconditionally, meant that once the doc existed, a later Wix
  // title/date edit produced a NEW slug that `fieldRuleSet` then treated
  // like any other "untouched" field and silently overwrote the live,
  // possibly-already-cited slug. Gating on `hasSlug` closes that: the
  // moment a document has any slug at all -- from a create, or from this
  // catch-up patch -- it is never regenerated or offered to `upsert` again,
  // so a later title/date change can never reach it.
  //
  // A collision (with an existing slug, or with another publication created
  // in this same run) is never auto-suffixed: two papers landing on the same
  // title+year slug is a content problem -- a duplicate record, an erratum,
  // a preprint plus its published version -- that a human needs to look at,
  // exactly per the backfill script's precedent.
  const claimedSlugs = new Map<string, string>()
  for (const p of s.publications) {
    if (p.sanityId === null) {
      const id = `wix-publication-${p.key}`
      let slugField: Record<string, unknown> = {}
      if (!hasSlug(existing[id])) {
        const slug = publicationSlug(p.title, p.date)
        if (slug) {
          if (input.existingSlugs.has(slug))
            throw new Error(`publication ${p.key}: generated slug "${slug}" already exists in the dataset`)
          const clash = claimedSlugs.get(slug)
          if (clash)
            throw new Error(`publication ${p.key}: generated slug "${slug}" collides with publication ${clash} in this same import`)
          claimedSlugs.set(slug, p.key)
          slugField = { slug: { _type: 'slug', current: slug } }
        }
      }
      upsert(id, 'publication', {
        title: p.title, author: p.authors, journal: p.journal, date: p.date,
        volume: p.volume, issue: p.issue, pages: p.pages, doi: p.doi, type: p.type,
        ...slugField,
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
      ['type', p.type, cur.type],
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
