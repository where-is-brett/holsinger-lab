// Runs the site's real GROQ queries either against Sanity (normal path) or,
// with WIX_FIXTURE=1, against the committed fixture dataset -- so Part C's
// pages and components can be built and e2e-tested before the wix-preview
// Sanity dataset exists. See .superpowers/sdd/2026-09-22-wix-lookalike/
// task-C0-brief.md. Never set WIX_FIXTURE on Vercel.

import { sanityFetch } from 'lib/sanity.live'

// Read once, cached at module level -- every call in fixture mode reuses it.
let fixtureDocs: Record<string, unknown>[] | null = null

async function loadFixtureDocs(): Promise<Record<string, unknown>[]> {
  if (fixtureDocs) return fixtureDocs
  const { readFileSync } = await import('node:fs')
  // Resolved relative to process.cwd() (Next runs from the project root),
  // not import.meta.url, because bundling moves this module elsewhere.
  const path = `${process.cwd()}/data/wix/fixture.ndjson`
  const raw = readFileSync(path, 'utf8')
  fixtureDocs = raw
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>)
  return fixtureDocs
}

export async function wixFetch<T>(
  query: string,
  opts?: { params?: Record<string, unknown>; stega?: boolean }
): Promise<T | null> {
  if (process.env.WIX_FIXTURE === '1') {
    const { parse, evaluate } = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ 'groq-js')
    const dataset = await loadFixtureDocs()
    const tree = parse(query)
    const result = await evaluate(tree, { dataset, params: opts?.params })
    return (await result.get()) as T
  }
  return (
    await sanityFetch({ query, params: opts?.params, stega: opts?.stega })
  ).data as T
}
