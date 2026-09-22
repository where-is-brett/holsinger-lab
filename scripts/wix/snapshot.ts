// The Wix site's content, captured once in a browser (Wix renders client-side,
// so it cannot be scraped headlessly with confidence) and committed as a
// reviewable diff. scripts/import-wix.ts turns this into Sanity mutations.
//
// Paragraph strings use one inline markup: *text* is italic. Nothing else.

export const ROLE_GROUP_TITLES = [
  'Research Scientist',
  'PhD Candidate',
  'Honours Student',
  'Research Student',
  'International Interns',
  'Lab Alumni',
] as const
export type RoleGroupTitle = (typeof ROLE_GROUP_TITLES)[number]

export interface WixSnapshot {
  capturedAt: string
  siteCopy: {
    hero: { imageUrl: string | null; imageAlt: string; heading: string; subheading: string }
    about: {
      heading: string
      paragraphs: string[]
      themesIntro: string
      themes: { key: string; title: string; summary: string }[]
    }
    teamIntro: string
    alumniSubtitle: string
    contactIntro: string
  }
  contact: { address: string; email: string; phone: string }
  news: {
    key: string
    title: string
    paragraphs: string[]
    summary: string | null
    showOnHome: boolean
    showOnNewsPage: boolean
  }[]
  media: {
    key: string
    title: string
    outlet: string
    date: string | null // YYYY-MM-DD
    url: string | null
    videoUrl: string | null
    posterUrl: string | null
  }[]
  projects: {
    key: string
    sanityId: string | null // existing project _id, or null to create
    researchOrder: number
    title: string
    paragraphs: string[]
    imageUrl: string | null
    imageAlt: string
  }[]
  people: {
    key: string
    sanityId: string | null // existing profile _id, or null to create
    name: string
    role: string
    roleDetail: string | null
    group: RoleGroupTitle
    imageUrl: string | null
  }[] // in Wix page order: current grid, alumni cards, alumni rows, interns
  publications: {
    key: string
    sanityId: string | null
    title: string
    authors: string
    journal: string | null
    date: string | null // YYYY-MM-DD
    volume: number | null
    issue: number | null
    pages: string | null
    doi: string | null
  }[]
}

const WIX_ASSET = /^https:\/\/(static|video)\.wixstatic\.com\/(media|video)\/[^/]+(\/[^/]+\/mp4\/file\.mp4)?$/

export function validateSnapshot(input: unknown): string[] {
  const s = input as WixSnapshot
  const errors: string[] = []
  const asset = (path: string, url: string | null) => {
    if (url !== null && !WIX_ASSET.test(url)) errors.push(`${path}: not a wixstatic original`)
  }
  const unique = (name: string, keys: string[]) => {
    const seen = new Set<string>()
    for (const k of keys) {
      if (seen.has(k)) errors.push(`${name}: duplicate key "${k}"`)
      seen.add(k)
    }
  }

  asset('siteCopy.hero.imageUrl', s.siteCopy.hero.imageUrl)
  unique('themes', s.siteCopy.about.themes.map((t) => t.key))
  unique('news', s.news.map((n) => n.key))
  unique('media', s.media.map((m) => m.key))
  unique('projects', s.projects.map((p) => p.key))
  unique('people', s.people.map((p) => p.key))
  unique('publications', s.publications.map((p) => p.key))
  unique(
    'sanityId',
    [...s.projects, ...s.people, ...s.publications].flatMap((x) => (x.sanityId ? [x.sanityId] : []))
  )
  unique('people names', s.people.map((p) => p.name))

  for (const m of s.media) {
    asset(`media.${m.key}.videoUrl`, m.videoUrl)
    asset(`media.${m.key}.posterUrl`, m.posterUrl)
  }
  for (const p of s.projects) asset(`projects.${p.key}.imageUrl`, p.imageUrl)
  for (const p of s.people) {
    asset(`people.${p.key}.imageUrl`, p.imageUrl)
    if (!(ROLE_GROUP_TITLES as readonly string[]).includes(p.group))
      errors.push(`people.${p.key}: unknown group "${p.group}"`)
  }
  for (const p of s.publications) {
    if (p.sanityId === null) {
      if (!p.date) errors.push(`publications.${p.key}: new publication needs date`)
      if (!p.journal) errors.push(`publications.${p.key}: new publication needs journal`)
    }
  }
  return errors
}
