// One-off maintenance script: creates the PI's `profile` document, which does
// not exist today. All 19 profiles in the dataset are lab members; none is
// Damian Holsinger, which is why `settings.labHead` is unset and the People
// and Home spotlights have nothing to point at.
//
// The bio text is stranded in the "About Dr Damian Holsinger" pseudo-project,
// one of the five `project` documents Phase 3 retires. This script copies that
// project's `description` blocks into the new profile's `fullBio` rather than
// retyping them, so the wording stays exactly as published.
//
// Dry run (default, no writes):
//   node scripts/create-pi-profile.ts
//
// Apply the writes:
//   node scripts/create-pi-profile.ts --commit
//
// Idempotent: if a profile with the PI's slug already exists it reports and
// exits without writing. It does NOT set `settings.labHead` -- that is a
// reference to the document this script creates, and pointing production's
// spotlight at a brand-new profile is an editorial go-live decision, made in
// Studio once the bio has been read over. The script prints the exact step.
//
// The dataset is publicly readable, so a dry run needs no token at all.
// SANITY_API_WRITE_TOKEN is only required when --commit is passed.

import { createClient } from '@sanity/client'

import { apiVersion, dataset, projectId } from '../lib/sanity.api.ts'
import { slugify } from '../schemas/lib/slug.ts'

const PI_NAME = 'Damian Holsinger'
const PI_ROLE = 'Lab Head'
const SOURCE_PROJECT_TITLE_MATCH = 'holsinger'

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

interface ProjectRow {
  _id: string
  title: string | null
  description: unknown[] | null
  overview: unknown[] | null
}

interface ProfileRow {
  _id: string
  name: string | null
  slug: string | null
}

/** Flattens portable-text blocks to plain text, for the dry-run preview only. */
function preview(blocks: unknown[] | null): string {
  if (!Array.isArray(blocks)) return ''
  const text = blocks
    .map((block) => {
      const children = (block as { children?: { text?: string }[] })?.children
      if (!Array.isArray(children)) return ''
      return children.map((child) => child?.text ?? '').join('')
    })
    .join(' ')
    .trim()
  return text
}

async function main() {
  const slug = slugify(PI_NAME)

  const existing = await client.fetch<ProfileRow[]>(
    '*[_type == "profile" && (slug.current == $slug || name match $name)]{_id, name, "slug": slug.current}',
    { slug, name: `*${PI_NAME}*` }
  )

  if (existing.length > 0) {
    console.log(
      'A profile for the PI already appears to exist -- nothing to do:'
    )
    for (const row of existing) {
      console.log(`  ${row._id}  ${row.name}  (slug: ${row.slug ?? 'unset'})`)
    }
    return
  }

  const projects = await client.fetch<ProjectRow[]>(
    '*[_type == "project" && lower(title) match $match]{_id, title, description, overview}',
    { match: `*${SOURCE_PROJECT_TITLE_MATCH}*` }
  )

  if (projects.length === 0) {
    console.log(
      `No \`project\` document whose title matches "${SOURCE_PROJECT_TITLE_MATCH}" was found.`
    )
    console.log(
      'Nothing to copy a bio from -- create the profile by hand in Studio instead.'
    )
    return
  }
  if (projects.length > 1) {
    console.log(
      `${projects.length} candidate source projects matched -- resolve by hand:`
    )
    for (const row of projects) {
      console.log(`  ${row._id}  ${row.title}`)
    }
    return
  }

  const source = projects[0]
  // `description` is the project's long-form body; `overview` is its SEO/subhead
  // blurb. Prefer the body, fall back to the blurb.
  const fullBio = (source.description ?? source.overview ?? []) as unknown[]

  console.log(`Source project: ${source._id}  "${source.title}"`)
  console.log(`Would create a \`profile\`:`)
  console.log(`  name:    ${PI_NAME}`)
  console.log(`  role:    ${PI_ROLE}`)
  console.log(`  slug:    ${slug}`)
  console.log(`  hasPage: true`)
  console.log(`  fullBio: ${fullBio.length} block(s) copied from the project`)
  const text = preview(fullBio)
  if (text) {
    console.log(
      `\n  --- bio preview -------------------------------------------`
    )
    console.log(`  ${text.slice(0, 600)}${text.length > 600 ? ' […]' : ''}`)
    console.log(`  -----------------------------------------------------------`)
  } else {
    console.log(`\n  WARNING: the source project has no readable body text.`)
    console.log(`  Check ${source._id} in Studio before committing.`)
  }

  if (!commit) {
    console.log(
      `\nDry run only -- no writes made. Re-run with --commit to apply.`
    )
    return
  }

  const created = await client.create({
    _type: 'profile',
    name: PI_NAME,
    role: PI_ROLE,
    slug: { _type: 'slug', current: slug },
    hasPage: true,
    fullBio,
  })

  console.log(`\nCreated ${created._id}.`)
  console.log(`Next, by hand in Studio (deliberately not automated):`)
  console.log(`  1. Read the copied bio over, and add a portrait image.`)
  console.log(
    `  2. Set the person's Role Group if they should appear in a People group.`
  )
  console.log(
    `  3. Set Settings -> Lab head to this profile to turn the spotlight on.`
  )
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
