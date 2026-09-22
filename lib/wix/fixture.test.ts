import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { buildFixtureDocs } from '../../scripts/wix/build-fixture.ts'
import type { WixSnapshot } from '../../scripts/wix/snapshot.ts'

const snapshot = JSON.parse(
  readFileSync(new URL('../../data/wix/snapshot.json', import.meta.url), 'utf8')
) as WixSnapshot
const docs = buildFixtureDocs(snapshot)
const ofType = (t: string) =>
  docs.filter((d) => (d as { _type: string })._type === t)

describe('fixture dataset', () => {
  it('is what is committed (run `npm run fixture:wix` after changing the snapshot)', () => {
    const committed = readFileSync(
      new URL('../../data/wix/fixture.ndjson', import.meta.url),
      'utf8'
    )
    expect(committed).toBe(docs.map((d) => JSON.stringify(d)).join('\n') + '\n')
  })
  it('has the Wix content', () => {
    expect(ofType('roleGroup')).toHaveLength(6)
    expect(ofType('newsItem')).toHaveLength(4)
    expect(ofType('mediaAppearance')).toHaveLength(3)
    expect(ofType('project')).toHaveLength(4)
    expect(ofType('profile')).toHaveLength(39)
    expect(ofType('publication')).toHaveLength(17)
    expect(ofType('siteCopy')).toHaveLength(1)
  })
  it('evaluates real queries through wixFetch', async () => {
    process.env.WIX_FIXTURE = '1'
    const { wixFetch } = await import('./fetch')
    const { teamQuery, publicationsQuery, mediaQuery } = await import(
      './queries'
    )
    const team = await wixFetch<{
      profiles: { name: string; group: string | null }[]
    }>(teamQuery)
    expect(team?.profiles[0]).toMatchObject({
      name: 'Haochen Wu',
      group: 'PhD Candidate',
    })
    const pubs = await wixFetch<{ title: string }[]>(publicationsQuery)
    expect(pubs?.[0].title).toMatch(/^Non-invasive Bdnf mRNA/)
    // Channel 7 is a text row (its Wix mp4 is 403-blocked; Ruling R14); the other two link out.
    const media = await wixFetch<
      { title: string; videoUrl: string | null; url: string | null }[]
    >(mediaQuery)
    expect(media?.[0]).toMatchObject({
      title: 'Creatine for the brain',
      videoUrl: null,
      url: null,
    })
    expect(media?.[1].url).toMatch(/^https:\/\/www\.abc\.net\.au\//)
  })
})
