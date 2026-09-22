// Derives "the current expected value" for e2e assertions that would
// otherwise hardcode a fact of the committed fixture dataset (order,
// first-item content). Runs the site's own GROQ queries -- the same ones
// the app uses (lib/wix/queries.ts) -- against whatever data the server
// under test is actually serving, so these assertions hold whether that's
// the fixture (WIX_FIXTURE=1) or a real Sanity dataset.
//
// With WIX_FIXTURE=1, evaluates the query with groq-js over the committed
// fixture, mirroring lib/wix/fetch.ts's fixture path. Otherwise queries
// Sanity directly with @sanity/client, using the same project/dataset/api
// version env vars as the app (lib/sanity.api.ts), perspective: 'published'
// (published content only, matching lib/sanity.live.ts's server client) and
// useCdn: false (freshest data).
//
// playwright.config.ts already loads .env.local into process.env before any
// spec file (including this one) is imported. The loadEnvFile call below is
// a defensive fallback only, in case this module is ever exercised outside
// that config.

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { publicationsQuery, teamQuery } from 'lib/wix/queries'
import type { PublicationEntry, TeamData } from 'lib/wix/types'

const envLocalPath = path.resolve(__dirname, '../../.env.local')
if (existsSync(envLocalPath)) {
  process.loadEnvFile?.(envLocalPath)
}

let fixtureDataset: Record<string, unknown>[] | null = null

async function loadFixtureDataset(): Promise<Record<string, unknown>[]> {
  if (fixtureDataset) return fixtureDataset
  const fixturePath = path.resolve(__dirname, '../../data/wix/fixture.ndjson')
  const raw = readFileSync(fixturePath, 'utf8')
  fixtureDataset = raw
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>)
  return fixtureDataset
}

async function evalQuery<T>(query: string): Promise<T> {
  if (process.env.WIX_FIXTURE === '1') {
    const { parse, evaluate } = await import('groq-js')
    const dataset = await loadFixtureDataset()
    const tree = parse(query)
    const result = await evaluate(tree, { dataset })
    return (await result.get()) as T
  }

  const { createClient } = await import('@sanity/client')
  const { apiVersion } = await import('lib/sanity.api')
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET
  if (!projectId || !dataset) {
    throw new Error(
      'e2e/support/expected.ts: NEXT_PUBLIC_SANITY_PROJECT_ID / NEXT_PUBLIC_SANITY_DATASET are required (set WIX_FIXTURE=1 to use the committed fixture instead)'
    )
  }
  const client = createClient({ projectId, dataset, apiVersion, useCdn: false, perspective: 'published' })
  return client.fetch<T>(query)
}

export function expectedPublications(): Promise<PublicationEntry[]> {
  return evalQuery<PublicationEntry[]>(publicationsQuery)
}

export function expectedTeam(): Promise<TeamData> {
  return evalQuery<TeamData>(teamQuery)
}
