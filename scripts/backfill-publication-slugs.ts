// One-off / re-runnable maintenance script: finds `publication` documents with
// no slug and patches on the generated title+year slug (schemas/lib/
// publicationSlug.ts), which is what /publications/<slug> needs.
//
// Dry run (default, no writes):
//   node scripts/backfill-publication-slugs.ts
//
// Apply the writes:
//   node scripts/backfill-publication-slugs.ts --commit
//
// Collisions are reported and skipped, never auto-suffixed: two publications
// sharing a title and a year is a data question (duplicate record? erratum?
// preprint plus version?) and inventing "-2" would bury it.
//
// The dataset is publicly readable, so a dry run needs no token at all.
// SANITY_API_WRITE_TOKEN is only required when --commit is passed.
// Uses @sanity/client directly rather than this repo's next-sanity wrapper,
// since this script runs under plain Node, outside Next's runtime.

import { createClient } from '@sanity/client'

import { apiVersion, dataset, projectId } from '../lib/sanity.api.ts'
import { publicationSlug } from '../schemas/lib/publicationSlug.ts'

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
  slug: string | null
}

async function main() {
  const rows = await client.fetch<PublicationRow[]>(
    '*[_type == "publication"]{_id, title, date, "slug": slug.current}'
  )

  const missing = rows.filter((row) => !row.slug)
  const taken = new Set(
    rows.map((row) => row.slug).filter((s): s is string => Boolean(s))
  )

  console.log(
    `${rows.length} publication(s) total, ${missing.length} without a slug.`
  )

  const planned: { id: string; title: string; slug: string }[] = []
  const skipped: { id: string; title: string; reason: string }[] = []
  const seen = new Map<string, string>()

  for (const row of missing) {
    const title = row.title ?? ''
    const slug = publicationSlug(row.title, row.date)

    if (!slug) {
      skipped.push({
        id: row._id,
        title,
        reason: 'no title and no date to build a slug from',
      })
      continue
    }
    if (taken.has(slug)) {
      skipped.push({
        id: row._id,
        title,
        reason: `slug "${slug}" already used by another publication`,
      })
      continue
    }
    const clash = seen.get(slug)
    if (clash) {
      skipped.push({
        id: row._id,
        title,
        reason: `slug "${slug}" collides with ${clash}`,
      })
      continue
    }
    seen.set(slug, row._id)
    planned.push({ id: row._id, title, slug })
  }

  for (const row of planned) {
    console.log(`  ${row.id} -> ${row.slug}`)
  }

  if (skipped.length > 0) {
    console.log(`\n${skipped.length} skipped, needing a human decision:`)
    for (const row of skipped) {
      console.log(`  ${row.id} (${row.title.slice(0, 60)}): ${row.reason}`)
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
      .set({ slug: { _type: 'slug', current: row.slug } })
      .commit()
    console.log(`  committed ${row.id}`)
  }
  console.log(
    `\nDone -- ${planned.length} publication(s) updated, ${skipped.length} skipped.`
  )
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
