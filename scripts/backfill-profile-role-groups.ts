// scripts/backfill-profile-role-groups.ts
// One-off / re-runnable maintenance script: finds `profile` documents whose
// `roleGroup` reference is unset but whose `role` free-text string has a
// known mapping (scripts/roleGroupMapping.ts), and patches `roleGroup` onto
// them as a reference to the matching `roleGroup` document.
//
// Requires the roleGroup documents themselves to already exist in Studio --
// this script does not create them (see the design doc's §3.5: Studio's
// orderable-list ranking can't be safely pre-computed from a standalone
// script). Run this only after a human has created the group documents.
//
// Dry run (default, no writes):
//   node scripts/backfill-profile-role-groups.ts
//
// Apply the writes:
//   node scripts/backfill-profile-role-groups.ts --commit
//
// The dataset is publicly readable, so a dry run needs no token at all.
// SANITY_API_WRITE_TOKEN is only required when --commit is passed.

import { createClient } from '@sanity/client'

import { apiVersion, dataset, projectId } from '../lib/sanity.api.ts'
import { roleGroupTitleForRole } from './roleGroupMapping.ts'

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

interface ProfileRow {
  _id: string
  role: string
}

interface RoleGroupRow {
  _id: string
  title: string
}

async function main() {
  const [profiles, roleGroups] = await Promise.all([
    client.fetch<ProfileRow[]>(
      '*[_type == "profile" && !defined(roleGroup)]{_id, role}'
    ),
    client.fetch<RoleGroupRow[]>('*[_type == "roleGroup"]{_id, title}'),
  ])

  const groupIdByTitle = new Map(roleGroups.map((g) => [g.title, g._id]))

  const matched: { profileId: string; groupId: string; groupTitle: string }[] = []
  const unmapped: string[] = []
  const missingGroup: string[] = []

  for (const profile of profiles) {
    const groupTitle = roleGroupTitleForRole(profile.role)
    if (groupTitle === null) {
      unmapped.push(profile._id)
      continue
    }
    const groupId = groupIdByTitle.get(groupTitle)
    if (groupId === undefined) {
      missingGroup.push(`${profile._id} -> "${groupTitle}"`)
      continue
    }
    matched.push({ profileId: profile._id, groupId, groupTitle })
  }

  console.log(`${profiles.length} profile(s) missing roleGroup.`)
  console.log(
    `${matched.length} mapped to an existing roleGroup, ${unmapped.length} have no known mapping.`
  )
  for (const row of matched) {
    console.log(`  ${row.profileId} -> ${row.groupTitle} (${row.groupId})`)
  }
  if (unmapped.length > 0) {
    console.log('\nUnmapped (roleGroup left unset, falls under "Other"):')
    for (const id of unmapped) console.log(`  ${id}`)
  }

  if (missingGroup.length > 0) {
    throw new Error(
      "The following profiles map to a roleGroup title that doesn't exist yet in Studio -- create it first:\n" +
        missingGroup.join('\n')
    )
  }

  if (!commit) {
    console.log('\nDry run only -- no writes made. Re-run with --commit to apply.')
    return
  }

  for (const row of matched) {
    await client
      .patch(row.profileId)
      .set({ roleGroup: { _type: 'reference', _ref: row.groupId } })
      .commit()
    console.log(`  committed ${row.profileId}`)
  }
  console.log(`\nDone -- ${matched.length} profile(s) updated.`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
