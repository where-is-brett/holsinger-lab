import {
  HOME_MAESTRO_FIXTURE,
  HOME_PAGE_FIXTURE,
  HOME_PROFILES_FIXTURE,
  HOME_PUBLICATION_COUNT_FIXTURE,
  HOME_PUBLICATIONS_FIXTURE,
  HOME_RESEARCH_PROJECTS_FIXTURE,
  HOME_RESOURCE_FIXTURE,
  HOME_ROLE_GROUPS_FIXTURE,
  HOME_SETTINGS_PORTRAIT_FIXTURE,
  HOME_SITE_COPY_FIXTURE,
  HOME_SUPPORT_PAGE_FIXTURE,
} from 'components/redesign/fixtures'
import { HERO_FIXTURES, type HeroFixtureState } from 'components/redesign/heroFixtures'
import { resolveHomeHero } from 'components/redesign/heroModel'
import { Home } from 'components/redesign/screens/Home'
import Layout from 'components/shared/Layout'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

// Never indexed, never linked: the whole Home page -- real Layout, real
// Home -- with each picture-banner state from heroFixtures.ts, so
// e2e/home-hero.spec.ts can check each one at real viewport sizes
// (above the fold at 1280x800 and 375x812, under the real header). The
// component gallery (/preview/components) can't: it renders Home inside
// bordered boxes, with no header for the full-bleed band to sit under.
// Same noindex metadata as that route; neither is in the sitemap
// (app/sitemap.ts lists CMS-driven paths only).
export const metadata: Metadata = {
  title: 'Home picture banner (preview) — Holsinger Lab',
  robots: { index: false, follow: false },
}

export const dynamicParams = false

export function generateStaticParams() {
  return Object.keys(HERO_FIXTURES).map((state) => ({ state }))
}

export default async function HomeHeroPreviewPage({ params }: { params: Promise<{ state: string }> }) {
  const { state } = await params
  if (!(state in HERO_FIXTURES)) notFound()
  const hero = resolveHomeHero(HERO_FIXTURES[state as HeroFixtureState])

  return (
    <Layout settings={HOME_SETTINGS_PORTRAIT_FIXTURE} childrenStyles="px-0">
      <Home
        home={HOME_PAGE_FIXTURE}
        settings={HOME_SETTINGS_PORTRAIT_FIXTURE}
        siteName="Holsinger Lab"
        siteCopy={HOME_SITE_COPY_FIXTURE}
        publications={HOME_PUBLICATIONS_FIXTURE}
        publicationCount={HOME_PUBLICATION_COUNT_FIXTURE}
        resource={HOME_RESOURCE_FIXTURE}
        maestro={HOME_MAESTRO_FIXTURE}
        researchProjects={HOME_RESEARCH_PROJECTS_FIXTURE}
        profiles={HOME_PROFILES_FIXTURE}
        roleGroups={HOME_ROLE_GROUPS_FIXTURE}
        supportPage={HOME_SUPPORT_PAGE_FIXTURE}
        hero={hero}
      />
    </Layout>
  )
}
