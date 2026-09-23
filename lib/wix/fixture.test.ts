import { readFileSync } from 'node:fs'

import { describe, expect, it, vi } from 'vitest'

import { buildFixtureDocs } from '../../scripts/wix/build-fixture.ts'
import type { WixSnapshot } from '../../scripts/wix/snapshot.ts'

// lib/wix/fetch.ts statically imports `sanityFetch` from lib/sanity.live,
// which calls next-sanity's `defineLive()` at module scope. `defineLive` is
// resolved via package.json export conditions (react-server / next-js /
// default) that only exist inside Next's own bundler -- under plain Vitest
// there is no way to satisfy them, so importing lib/sanity.live throws
// immediately regardless of WIX_FIXTURE. Mock it here; `vi.mock` calls are
// hoisted above the imports below, so this also covers the dynamic
// `await import('./fetch')` further down. One-line deviation from the
// brief's verbatim test, accepted in C0 fix round 1.
vi.mock('lib/sanity.live', () => ({
  sanityFetch: async () => {
    throw new Error(
      'sanityFetch (the real Sanity client) was invoked in a test. ' +
        'Only fixture mode (WIX_FIXTURE=1, via lib/wix/fetch.ts) is expected to run under Vitest.'
    )
  },
  SanityLive: () => null,
}))

const snapshot = JSON.parse(readFileSync(new URL('../../data/wix/snapshot.json', import.meta.url), 'utf8')) as WixSnapshot
const docs = buildFixtureDocs(snapshot)
const ofType = (t: string) => docs.filter((d) => (d as { _type: string })._type === t)

describe('fixture dataset', () => {
  it('is what is committed (run `npm run fixture:wix` after changing the snapshot)', () => {
    const committed = readFileSync(new URL('../../data/wix/fixture.ndjson', import.meta.url), 'utf8')
    expect(committed).toBe(docs.map((d) => JSON.stringify(d)).join('\n') + '\n')
  })
  it('has the Wix content', () => {
    expect(ofType('roleGroup')).toHaveLength(6)
    expect(ofType('newsItem')).toHaveLength(4)
    expect(ofType('mediaAppearance')).toHaveLength(3)
    expect(ofType('project')).toHaveLength(4)
    // 39 imported from Wix, plus the PI (Damian Holsinger) added for I1 so
    // settings.labHead has something real to point at.
    expect(ofType('profile')).toHaveLength(40)
    expect(ofType('publication')).toHaveLength(17)
    expect(ofType('siteCopy')).toHaveLength(1)
    // One per fake image asset id (hero, project covers, people portraits) --
    // without these, `image.asset->metadata.lqip` (the hero's
    // "heroImageLqip" projection) always resolves to null in fixture mode.
    expect(ofType('sanity.imageAsset').length).toBeGreaterThan(0)
    for (const doc of ofType('sanity.imageAsset')) {
      expect((doc as { metadata: { lqip: string } }).metadata.lqip).toMatch(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/)
    }
  })
  it('evaluates real queries through wixFetch', async () => {
    vi.stubEnv('WIX_FIXTURE', '1')
    try {
      const { wixFetch } = await import('./fetch')
      const { teamQuery, publicationsQuery, mediaQuery } = await import('./queries')
      const team = await wixFetch<{ labHeadId: string | null; profiles: { name: string; group: string | null }[] }>(teamQuery)
      expect(team?.profiles[0]).toMatchObject({ name: 'Haochen Wu', group: 'PhD Candidate' })
      expect(team?.labHeadId).toBe('fixture-pi')
      const pubs = await wixFetch<{ title: string }[]>(publicationsQuery)
      expect(pubs?.[0].title).toMatch(/^Non-invasive Bdnf mRNA/)
      // Channel 7 has no self-hosted video (its Wix mp4 is 403-blocked; Ruling
      // R14) but is identified as a YouTube segment, so it embeds; the other
      // two link out.
      const media = await wixFetch<{ title: string; videoUrl: string | null; url: string | null }[]>(mediaQuery)
      expect(media?.[0]).toMatchObject({
        title: 'Creatine for the brain',
        videoUrl: null,
        url: 'https://www.youtube.com/watch?v=xKqAJ2sNEBk',
      })
      expect(media?.[1].url).toMatch(/^https:\/\/www\.abc\.net\.au\//)
    } finally {
      vi.unstubAllEnvs()
    }
  })
})
