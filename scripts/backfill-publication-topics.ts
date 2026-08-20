// One-off / re-runnable maintenance script: assigns `topics` to the 19 live
// `publication` documents from the agreed IA's 19/19 mapping
// (scripts/publicationTopics.ts).
//
// Dry run (default, no writes):
//   node scripts/backfill-publication-topics.ts
//
// Apply the writes:
//   node scripts/backfill-publication-topics.ts --commit
//
// Only unambiguous matches are written. A paper that matches no rule, or more
// than one, is printed for a human to tag by hand in Studio -- and so is any
// rule that matched nothing, which is the signal that a title has changed or
// that a keyword was wrong. Publications that already carry topics are left
// alone; this never overwrites an editor's tagging.
//
// The dataset is publicly readable, so a dry run needs no token at all.
// SANITY_API_WRITE_TOKEN is only required when --commit is passed.

import { createClient } from '@sanity/client'

import { apiVersion, dataset, projectId } from '../lib/sanity.api.ts'
import { matchingRules, TOPIC_RULES } from './publicationTopics.ts'

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
  date: string | null
  topics: string[] | null
}

async function main() {
  const rows = await client.fetch<PublicationRow[]>(
    '*[_type == "publication"] | order(date desc){_id, title, date, topics}'
  )

  const planned: { id: string; label: string; title: string; topic: string }[] =
    []
  const alreadyTagged: PublicationRow[] = []
  const unmatched: PublicationRow[] = []
  const ambiguous: { row: PublicationRow; labels: string[] }[] = []
  const usedLabels = new Set<string>()

  for (const row of rows) {
    if (row.topics && row.topics.length > 0) {
      alreadyTagged.push(row)
      continue
    }
    const hits = matchingRules(row.title ?? '', row.date)
    if (hits.length === 1) {
      usedLabels.add(hits[0].label)
      planned.push({
        id: row._id,
        label: hits[0].label,
        title: row.title ?? '',
        topic: hits[0].topic,
      })
    } else if (hits.length === 0) {
      unmatched.push(row)
    } else {
      ambiguous.push({ row, labels: hits.map((h) => h.label) })
    }
  }

  console.log(`${rows.length} publication(s) total.`)
  console.log(
    `${planned.length} to tag, ${alreadyTagged.length} already tagged.\n`
  )

  for (const row of planned) {
    console.log(`  ${row.label.padEnd(34)} -> ${row.topic}`)
    console.log(`    ${row.id}  ${row.title.slice(0, 70)}`)
  }

  if (alreadyTagged.length > 0) {
    console.log(`\nAlready tagged, left untouched:`)
    for (const row of alreadyTagged) {
      console.log(`  ${row._id}  ${(row.topics ?? []).join(', ')}`)
    }
  }

  if (unmatched.length > 0) {
    console.log(
      `\n${unmatched.length} publication(s) matched no rule -- tag by hand in Studio:`
    )
    for (const row of unmatched) {
      console.log(
        `  ${row._id}  ${row.date?.slice(0, 4) ?? '????'}  ${(
          row.title ?? ''
        ).slice(0, 70)}`
      )
    }
  }

  if (ambiguous.length > 0) {
    console.log(
      `\n${ambiguous.length} publication(s) matched several rules -- resolve by hand:`
    )
    for (const entry of ambiguous) {
      console.log(`  ${entry.row._id}  ${(entry.row.title ?? '').slice(0, 60)}`)
      console.log(`    matched: ${entry.labels.join(' | ')}`)
    }
  }

  // A rule matching nothing means the mapping and the dataset have diverged.
  const unusedRules = TOPIC_RULES.filter((rule) => !usedLabels.has(rule.label))
  const unusedButTagged = unusedRules.length > 0 && alreadyTagged.length > 0
  if (unusedRules.length > 0) {
    console.log(`\n${unusedRules.length} rule(s) matched no publication:`)
    for (const rule of unusedRules) {
      console.log(
        `  ${rule.label.padEnd(34)} (${rule.year}, keyword "${rule.keyword}")`
      )
    }
    if (unusedButTagged) {
      console.log(
        `  (some of these may simply already be tagged -- see the list above)`
      )
    }
  }

  if (!commit) {
    console.log(
      `\nDry run only -- no writes made. Re-run with --commit to apply.`
    )
    return
  }

  for (const row of planned) {
    await client
      .patch(row.id)
      .set({ topics: [row.topic] })
      .commit()
    console.log(`  committed ${row.id}`)
  }
  console.log(`\nDone -- ${planned.length} publication(s) tagged.`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
