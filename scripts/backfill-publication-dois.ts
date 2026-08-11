// One-off / re-runnable maintenance script: finds `publication` documents
// whose `doi` field is unset but whose `url` field encodes a
// machine-recoverable DOI (see lib/doi.ts), and patches `doi` onto them.
//
// Dry run (default, no writes):
//   node scripts/backfill-publication-dois.ts
//
// Apply the writes:
//   node scripts/backfill-publication-dois.ts --commit
//
// The dataset is publicly readable (see .github/workflows/ci.yml), so a dry
// run needs no token at all. SANITY_API_WRITE_TOKEN is only required when
// --commit is passed (see .env.local.example).
// Uses @sanity/client directly rather than this repo's next-sanity wrapper
// (lib/sanity.client.ts), since this script runs under plain Node, outside
// Next's runtime.

import { createClient } from '@sanity/client'

import { extractDoiFromUrl } from '../lib/doi.ts'
import { apiVersion, dataset, projectId } from '../lib/sanity.api.ts'

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
  url: string | null
}

async function main() {
  const rows = await client.fetch<PublicationRow[]>(
    '*[_type == "publication" && !defined(doi)]{_id, url}'
  )

  const recoverable = rows
    .map((row) => ({ id: row._id, doi: row.url ? extractDoiFromUrl(row.url) : null }))
    .filter((row): row is { id: string; doi: string } => row.doi !== null)

  console.log(`${rows.length} publication(s) missing doi.`)
  console.log(`${recoverable.length} recoverable from url, ${rows.length - recoverable.length} not.`)
  for (const row of recoverable) {
    console.log(`  ${row.id} -> ${row.doi}`)
  }

  if (!commit) {
    console.log('\nDry run only -- no writes made. Re-run with --commit to apply.')
    return
  }

  for (const row of recoverable) {
    await client.patch(row.id).set({ doi: row.doi }).commit()
    console.log(`  committed ${row.id}`)
  }
  console.log(`\nDone -- ${recoverable.length} publication(s) updated.`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
