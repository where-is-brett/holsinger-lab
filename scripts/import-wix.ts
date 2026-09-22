// Imports the committed Wix snapshot (data/wix/snapshot.json) into Sanity.
// Spec: docs/superpowers/specs/2026-09-22-wix-lookalike-design.md section 8.
//
// `npm run import:wix` loads .env.local automatically (via node's
// --env-file-if-exists flag); it does not override a variable already set in
// the shell environment.
//
// Dry run (default; no writes, no uploads -- image/video fields show as pending):
//   npm run import:wix -- --dataset wix-preview
// Apply:
//   npm run import:wix -- --dataset wix-preview --commit
// A write token can be supplied in the shell instead of (or on top of) .env.local:
//   SANITY_API_WRITE_TOKEN=... npm run import:wix -- --dataset wix-preview --commit
// Production additionally requires a dataset export taken first, and an explicit flag:
//   SANITY_API_WRITE_TOKEN=... npm run import:wix -- --dataset production --commit --backup ./backups/production-<date>.tar.gz --confirm-production
//
// Never deletes. Never blanks a field. Fields edited in Studio since the last
// import are reported and left alone (see scripts/wix/plan.ts). Patches (and
// the ledger write) are revision-guarded: if a document changed in Studio
// while this run was fetching/uploading, the whole commit fails rather than
// silently overwriting that edit -- re-run to re-plan against the new state.

import { readFileSync, statSync } from 'node:fs'

import { createClient } from '@sanity/client'

import { apiVersion, projectId } from '../lib/sanity.api.ts'
import { type CurrentDoc, type Ledger, LEDGER_ID, planImport } from './wix/plan.ts'
import { ROLE_GROUP_TITLES, type RoleGroupTitle, validateSnapshot, type WixSnapshot } from './wix/snapshot.ts'

const args = process.argv.slice(2)

// Strict argument parsing: only these four flags are recognised, no "=" form,
// and a flag's value may not itself look like another flag (a missing value
// silently swallowing the next flag is worse than a loud rejection).
const VALUE_FLAGS = new Set(['--dataset', '--backup'])
const BOOLEAN_FLAGS = new Set(['--commit', '--confirm-production'])
for (let i = 0; i < args.length; i++) {
  const a = args[i]
  if (a.includes('=')) throw new Error(`Unsupported "--flag=value" form: "${a}". Use "--flag value" (space-separated) instead.`)
  if (!VALUE_FLAGS.has(a) && !BOOLEAN_FLAGS.has(a)) throw new Error(`Unknown argument: "${a}". Allowed: --dataset <name>, --commit, --backup <path>, --confirm-production.`)
  if (VALUE_FLAGS.has(a)) {
    const v = args[i + 1]
    if (v === undefined || v.startsWith('--')) throw new Error(`"${a}" needs a value (got ${v === undefined ? 'nothing' : `"${v}"`}).`)
    i++ // consume the value so it isn't parsed as its own argument
  }
}

const flag = (n: string) => args.includes(n)
const opt = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined }

const dataset = opt('--dataset') ?? process.env.NEXT_PUBLIC_SANITY_DATASET
const commit = flag('--commit')
if (!dataset) throw new Error('Pass --dataset <name> or set NEXT_PUBLIC_SANITY_DATASET.')
if (commit && dataset === 'production') {
  if (!flag('--confirm-production')) throw new Error('Production commit needs --confirm-production (Brett-approved runs only).')
  const backup = opt('--backup')
  if (!backup) throw new Error('Production commit needs --backup <path to an existing dataset export>.')
  let backupOk = false
  try {
    const st = statSync(backup)
    backupOk = st.isFile() && st.size > 0
  } catch {
    backupOk = false
  }
  if (!backupOk) throw new Error(`Production commit needs --backup <path> to point at an existing, non-empty file (got "${backup}").`)
}
const token = commit ? process.env.SANITY_API_WRITE_TOKEN : process.env.SANITY_API_READ_TOKEN
if (!token) throw new Error(commit ? 'Set SANITY_API_WRITE_TOKEN to commit.' : 'Set SANITY_API_READ_TOKEN (the ledger is not publicly readable).')

const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false, perspective: 'raw' })

async function main() {
  // Printed before any upload or network write, so a bad run is visible immediately.
  console.log(`\nDataset: ${dataset}   Mode: ${commit ? 'COMMIT' : 'dry run'}\n`)

  const snapshot = JSON.parse(readFileSync(new URL('../data/wix/snapshot.json', import.meta.url), 'utf8')) as WixSnapshot
  const problems = validateSnapshot(snapshot)
  if (problems.length) throw new Error(`Snapshot invalid:\n${problems.join('\n')}`)

  // Role groups are owned by the migrations session; never created here.
  const groups = await client.fetch<{ _id: string; title: string }[]>(`*[_type == "roleGroup" && !(_id in path("drafts.**"))]{_id, title}`)
  const roleGroupIds = {} as Record<RoleGroupTitle, string>
  for (const t of ROLE_GROUP_TITLES) {
    const g = groups.find((x) => x.title === t)
    if (!g) throw new Error(`Role group "${t}" does not exist in ${dataset}. The migrations must run first.`)
    roleGroupIds[t] = g._id
  }

  const settingsId = await client.fetch<string | null>(`*[_type == "settings" && !(_id in path("drafts.**"))][0]._id`)
  if (!settingsId) throw new Error('No settings document.')

  const ids = [
    'siteCopy', settingsId,
    ...snapshot.news.map((n) => `wix-news-${n.key}`),
    ...snapshot.media.map((m) => `wix-media-${m.key}`),
    ...snapshot.projects.map((p) => p.sanityId ?? `wix-project-${p.key}`),
    ...snapshot.people.map((p) => p.sanityId ?? `wix-profile-${p.key}`),
    ...snapshot.publications.map((p) => p.sanityId ?? `wix-publication-${p.key}`),
  ]
  const docs = await client.fetch<CurrentDoc[]>(`*[_id in $ids]`, { ids })
  const existing = Object.fromEntries(docs.map((d) => [d._id, d]))
  const draftIds = await client.fetch<string[]>(`*[_id in $ids]._id`, { ids: ids.map((i) => `drafts.${i}`) })
  const ledgerDoc = await client.fetch<{ _rev?: string; entries?: Ledger } | null>(`*[_id == $id][0]`, { id: LEDGER_ID })

  // Only the singleton docs' drafts are kept in step (Fix round 3) -- a draft
  // publish there would otherwise silently drop the imported fields. Other
  // document types' drafts are left alone, unchanged.
  const singletonDraftIds = ['drafts.siteCopy', `drafts.${settingsId}`]
  const singletonDraftDocs = await client.fetch<CurrentDoc[]>(`*[_id in $ids]`, { ids: singletonDraftIds })
  const drafts = Object.fromEntries(singletonDraftDocs.map((d) => [d._id, d]))

  // Assets: uploaded only on --commit. Sanity dedupes by content hash, so re-runs add nothing.
  const urls = [
    snapshot.siteCopy.hero.imageUrl,
    ...snapshot.media.flatMap((m) => [m.videoUrl, m.posterUrl]),
    ...snapshot.projects.map((p) => p.imageUrl),
    ...snapshot.people.map((p) => p.imageUrl),
  ].filter((u): u is string => Boolean(u))
  const assetIds: Record<string, string> = {}
  for (const url of urls) {
    if (!commit) { assetIds[url] = `pending:${url.split('/').pop()}`; continue }
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`)
    const kind = url.endsWith('.mp4') ? 'file' : 'image'
    const asset = await client.assets.upload(kind, Buffer.from(await res.arrayBuffer()), { filename: url.split('/').pop() })
    assetIds[url] = asset._id
  }

  const plan = planImport({ snapshot, existing, settingsId, roleGroupIds, assetIds, ledger: ledgerDoc?.entries ?? {}, drafts })

  for (const op of plan.ops) {
    if (op.kind === 'create') console.log(`CREATE ${op.doc._type} ${op.doc._id}  ${String(op.doc.title ?? op.doc.name ?? '')}`)
    else console.log(`PATCH  ${op.id}  ${Object.entries(op.set).map(([k, v]) => `${k}=${JSON.stringify(v).slice(0, 80)}`).join('  ')}`)
  }
  for (const s of plan.skipped) console.log(`SKIP   ${s.id}.${s.field}  (${s.reason})`)
  for (const r of plan.reports) console.log(`NOTE   ${r}`)
  for (const d of draftIds) {
    if (singletonDraftIds.includes(d)) console.log(`WARN   unpublished draft exists for ${d} — patched alongside the published document so publishing it later can't drop imported fields`)
    else console.log(`WARN   unpublished draft exists for ${d} — the published document is patched; the draft is left as is`)
  }

  // spec §9: every Sanity-only doc of a type the snapshot could own, not just
  // publications/profiles -- projects and standalone pages count too.
  const sanityOnly = await client.fetch<{ _type: string; title: string }[]>(
    `*[_type in ["publication","profile","project","page"] && !(_id in $ids) && !(_id in path("drafts.**"))]{_type, "title": coalesce(title, name)} | order(_type asc, title asc)`,
    { ids }
  )
  const sanityOnlyByType = new Map<string, string[]>()
  for (const r of sanityOnly) {
    const list = sanityOnlyByType.get(r._type) ?? []
    list.push(r.title)
    sanityOnlyByType.set(r._type, list)
  }
  for (const [type, titles] of sanityOnlyByType) {
    console.log(`KEEP   ${type} — ${titles.length} not on Wix, left untouched (spec §9):`)
    for (const title of titles) console.log(`         "${title}"`)
  }
  console.log(`\n${plan.ops.length} ops, ${plan.skipped.length} skipped, ${urls.length} assets`)

  if (!commit) { console.log('\nDry run only. Re-run with --commit to apply.'); process.exit(0) }

  // Draft patches (drafts.siteCopy / drafts.<settingsId>) need their own
  // revision, which isn't in `existing` -- merge it in for the guard below.
  const revLookup: Record<string, CurrentDoc> = { ...existing, ...drafts }

  const tx = client.transaction()
  for (const op of plan.ops) {
    if (op.kind === 'create') tx.createIfNotExists(op.doc)
    else tx.patch(op.id, (p) => p.ifRevisionId(revLookup[op.id]._rev as string).set(op.set))
  }
  if (ledgerDoc) {
    tx.patch(LEDGER_ID, (p) => p.ifRevisionId(ledgerDoc._rev as string).set({ entries: plan.ledger, updatedAt: new Date().toISOString() }))
  } else {
    // A concurrent first run creating the same ledger doc should fail loudly,
    // not silently clobber -- createOrReplace would clobber, create won't.
    tx.create({ _id: LEDGER_ID, _type: 'wixImportLedger', entries: plan.ledger, updatedAt: new Date().toISOString() })
  }

  try {
    const result = await tx.commit()
    console.log(`Committed transaction ${result.transactionId}`)
  } catch (e) {
    const err = e as { statusCode?: number; message?: string }
    const isRevisionMismatch = err.statusCode === 409 || /revision/i.test(err.message ?? '')
    if (isRevisionMismatch) {
      console.error('Content changed during the run — nothing was written. Re-run to re-plan.')
      process.exit(1)
    }
    throw e
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
