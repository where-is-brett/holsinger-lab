// Imports the committed Wix snapshot (data/wix/snapshot.json) into Sanity.
// Spec: docs/superpowers/specs/2026-09-22-wix-lookalike-design.md section 8.
//
// Dry run (default; no writes, no uploads -- image/video fields show as pending):
//   npm run import:wix -- --dataset wix-preview
// Apply:
//   npm run import:wix -- --dataset wix-preview --commit
// Production additionally requires a dataset export taken first, and an explicit flag:
//   npm run import:wix -- --dataset production --commit --backup ./backups/production-<date>.tar.gz --confirm-production
//
// Never deletes. Never blanks a field. Fields edited in Studio since the last
// import are reported and left alone (see scripts/wix/plan.ts).

import { existsSync, readFileSync } from 'node:fs'

import { createClient } from '@sanity/client'

import { apiVersion, projectId } from '../lib/sanity.api.ts'
import { type CurrentDoc, type Ledger, LEDGER_ID, planImport } from './wix/plan.ts'
import { ROLE_GROUP_TITLES, type RoleGroupTitle, validateSnapshot, type WixSnapshot } from './wix/snapshot.ts'

const args = process.argv.slice(2)
const flag = (n: string) => args.includes(n)
const opt = (n: string) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined }

const dataset = opt('--dataset') ?? process.env.NEXT_PUBLIC_SANITY_DATASET
const commit = flag('--commit')
if (!dataset) throw new Error('Pass --dataset <name> or set NEXT_PUBLIC_SANITY_DATASET.')
if (commit && dataset === 'production') {
  if (!flag('--confirm-production')) throw new Error('Production commit needs --confirm-production (Brett-approved runs only).')
  const backup = opt('--backup')
  if (!backup || !existsSync(backup)) throw new Error('Production commit needs --backup <path to an existing dataset export>.')
}
const token = commit ? process.env.SANITY_API_WRITE_TOKEN : process.env.SANITY_API_READ_TOKEN
if (!token) throw new Error(commit ? 'Set SANITY_API_WRITE_TOKEN to commit.' : 'Set SANITY_API_READ_TOKEN (the ledger is not publicly readable).')

const client = createClient({ projectId, dataset, apiVersion, token, useCdn: false, perspective: 'raw' })

async function main() {
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
  const drafts = await client.fetch<string[]>(`*[_id in $ids]._id`, { ids: ids.map((i) => `drafts.${i}`) })
  const ledgerDoc = await client.fetch<{ entries?: Ledger } | null>(`*[_id == $id][0]`, { id: LEDGER_ID })

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

  const plan = planImport({ snapshot, existing, settingsId, roleGroupIds, assetIds, ledger: ledgerDoc?.entries ?? {} })

  console.log(`\nDataset: ${dataset}   Mode: ${commit ? 'COMMIT' : 'dry run'}\n`)
  for (const op of plan.ops) {
    if (op.kind === 'create') console.log(`CREATE ${op.doc._type} ${op.doc._id}  ${String(op.doc.title ?? op.doc.name ?? '')}`)
    else console.log(`PATCH  ${op.id}  ${Object.entries(op.set).map(([k, v]) => `${k}=${JSON.stringify(v).slice(0, 80)}`).join('  ')}`)
  }
  for (const s of plan.skipped) console.log(`SKIP   ${s.id}.${s.field}  (${s.reason})`)
  for (const r of plan.reports) console.log(`NOTE   ${r}`)
  for (const d of drafts) console.log(`WARN   unpublished draft exists for ${d} — the published document is patched; the draft is left as is`)
  const sanityOnly = await client.fetch<{ _type: string; title: string }[]>(
    `*[_type in ["publication","profile"] && !(_id in $ids) && !(_id in path("drafts.**"))]{_type, "title": coalesce(title, name)}`, { ids })
  for (const r of sanityOnly) console.log(`KEEP   ${r._type} "${r.title}" is not on Wix — left untouched (spec §9)`)
  console.log(`\n${plan.ops.length} ops, ${plan.skipped.length} skipped, ${urls.length} assets`)

  if (!commit) { console.log('\nDry run only. Re-run with --commit to apply.'); process.exit(0) }

  const tx = client.transaction()
  for (const op of plan.ops) {
    if (op.kind === 'create') tx.createIfNotExists(op.doc)
    else tx.patch(op.id, (p) => p.set(op.set))
  }
  tx.createOrReplace({ _id: LEDGER_ID, _type: 'wixImportLedger', entries: plan.ledger, updatedAt: new Date().toISOString() })
  const result = await tx.commit()
  console.log(`Committed transaction ${result.transactionId}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
