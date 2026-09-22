// One-off maintenance script: the two Phase 3 data fixes the backfills cannot
// make on their own.
//
// 1. Tags the two publications backfill-publication-topics.ts reports for
//    hand-tagging: the GSDIM paper (its title spells out "Ground state
//    depletion microscopy", so the "gsdim" keyword never matches) and the
//    genome-wide paper (it matches two rules, both giving the same topic).
//    Skipped if the paper already carries topics.
// 2. Creates the six `roleGroup` documents backfill-profile-role-groups.ts
//    needs, titled as in scripts/roleGroupMapping.ts and ordered as on the
//    lab's Wix Team page. `orderRank` is generated exactly as
//    @sanity/orderable-document-list's `initialRank` appends a new document:
//    `genNext().genNext()` from the previous rank, starting at LexoRank.min().
//    `createIfNotExists` with deterministic ids, so a re-run changes nothing.
//
// Run it before backfill-profile-role-groups.ts. Never deletes anything.
//
// Dry run (default, no writes):
//   node --env-file=.env.local scripts/apply-phase3-fixups.ts
//
// Apply the writes:
//   node --env-file=.env.local scripts/apply-phase3-fixups.ts --commit
//
// The dataset is publicly readable, so a dry run needs no token at all.
// SANITY_API_WRITE_TOKEN is only required when --commit is passed.

import { createClient } from '@sanity/client'
import { LexoRank } from 'lexorank'

import { apiVersion, dataset, projectId } from '../lib/sanity.api.ts'

const TOPIC_PATCHES = [
  {
    id: '60132cd6-f48e-4c28-84e2-f03f2ad5242b',
    label: "GSDIM microglia-synapse '21",
    topic: 'Glia & neuroinflammation',
  },
  {
    id: 'c67dc80d-2571-4f7c-a554-503385cf0350',
    label: "Genome-wide blood-brain '20",
    topic: 'Neuro-oncology & biomarkers',
  },
]

const ROLE_GROUP_TITLES = [
  'Research Scientist',
  'PhD Candidate',
  'Honours Student',
  'Research Student',
  'International Interns',
  'Lab Alumni',
]

const commit = process.argv.includes('--commit')

let writeToken: string | undefined
if (commit) {
  writeToken = process.env.SANITY_API_WRITE_TOKEN
  if (!writeToken) {
    throw new Error(
      'Set SANITY_API_WRITE_TOKEN to a token with write access (see .env.local.example).'
    )
  }
}

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  token: commit ? writeToken : undefined,
  useCdn: false,
  perspective: 'published',
})

interface PublicationRow {
  _id: string
  title: string | null
  topics: string[] | null
}

async function main() {
  const publications = await client.fetch<PublicationRow[]>(
    '*[_type == "publication" && _id in $ids]{_id, title, topics}',
    { ids: TOPIC_PATCHES.map((p) => p.id) }
  )
  const byId = new Map(publications.map((row) => [row._id, row]))

  const topicWrites: typeof TOPIC_PATCHES = []
  console.log('Topic patches:')
  for (const patch of TOPIC_PATCHES) {
    const row = byId.get(patch.id)
    if (!row) {
      throw new Error(`Publication ${patch.id} (${patch.label}) not found.`)
    }
    if (row.topics && row.topics.length > 0) {
      console.log(
        `  skip ${patch.id}  already tagged: ${row.topics.join(', ')}`
      )
      continue
    }
    topicWrites.push(patch)
    console.log(`  ${patch.id} -> ${patch.topic}`)
    console.log(`    ${(row.title ?? '').slice(0, 70)}`)
  }

  let rank = LexoRank.min()
  const roleGroups = ROLE_GROUP_TITLES.map((title) => {
    rank = rank.genNext().genNext()
    return {
      _id: `roleGroup-${title.toLowerCase().replace(/ /g, '-')}`,
      _type: 'roleGroup',
      title,
      orderRank: rank.toString(),
    }
  })

  const existing = await client.fetch<{ _id: string; title: string }[]>(
    '*[_type == "roleGroup"]{_id, title}'
  )
  const existingIds = new Set(existing.map((g) => g._id))
  const existingTitles = new Set(existing.map((g) => g.title))

  console.log(`\nroleGroup documents (${existing.length} exist today):`)
  for (const group of roleGroups) {
    const state = existingIds.has(group._id)
      ? 'exists, left alone'
      : existingTitles.has(group.title)
      ? 'title already used by another document, not created'
      : 'create'
    console.log(
      `  ${group.orderRank}  ${group.title.padEnd(22)} ${group._id}  (${state})`
    )
  }
  const toCreate = roleGroups.filter(
    (g) => !existingIds.has(g._id) && !existingTitles.has(g.title)
  )

  if (!commit) {
    console.log(
      '\nDry run only -- no writes made. Re-run with --commit to apply.'
    )
    return
  }

  const tx = client.transaction()
  for (const patch of topicWrites) {
    tx.patch(patch.id, (p) => p.set({ topics: [patch.topic] }))
  }
  for (const group of toCreate) {
    tx.createIfNotExists(group)
  }
  await tx.commit()
  console.log(
    `\nDone -- ${topicWrites.length} publication(s) tagged, ${toCreate.length} roleGroup(s) created.`
  )
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
