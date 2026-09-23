'use client'

import { Button } from 'components/redesign/Button'
import { CopyCitation } from 'components/redesign/CopyCitation'
import { FacetBand, type FacetChipSpec } from 'components/redesign/FacetBand'
import { applyFacets, countBy, toggleFacet } from 'components/redesign/facets'
import {
  CMS_VERBATIM_PUB_FEBS_J,
  CMS_VERBATIM_PUB_PLOS_ONE,
  HOME_MAESTRO_FIXTURE,
  HOME_PAGE_FIXTURE,
  HOME_PUBLICATION_COUNT_FIXTURE,
  HOME_PUBLICATIONS_FIXTURE,
  HOME_RESOURCE_FIXTURE,
  HOME_SETTINGS_FIXTURE,
  HOME_SETTINGS_LABHEAD_HIDDEN_FIXTURE,
  HOME_SETTINGS_PORTRAIT_FIXTURE,
  HOME_SUPPORT_PAGE_FIXTURE,
  LINKED_PUB,
  NO_LINK_PUB,
  PEOPLE_PROFILES_FIXTURE,
  PEOPLE_ROLE_GROUPS_FIXTURE,
  PEOPLE_SETTINGS_WITH_LAB_HEAD,
  PEOPLE_SETTINGS_WITHOUT_LAB_HEAD,
  PUBLICATION_PAGE_FIXTURE,
  RESEARCH_PROJECTS_FIXTURE,
  RESOURCES_FIXTURE,
  SAMPLE_PEOPLE,
  SAMPLE_PUBLICATIONS,
  TYPOGRAPHY_BUDGET_HOME_FIXTURE,
  TYPOGRAPHY_BUDGET_PUBLICATION_FIXTURE,
  TYPOGRAPHY_BUDGET_RESEARCH_PROJECT_FIXTURE,
} from 'components/redesign/fixtures'
import { FormField } from 'components/redesign/FormField'
import { MobileBand, MobileHeader, MobileNavRows } from 'components/redesign/MobileHeader'
import { FOOTER_FALLBACK, SITE_NAV } from 'components/redesign/navModel'
import { PageTitle } from 'components/redesign/PageTitle'
import { PersonCard } from 'components/redesign/PersonCard'
import type { Publication } from 'components/redesign/publicationModel'
import { PublicationRow } from 'components/redesign/PublicationRow'
import { ResourceBlock } from 'components/redesign/ResourceBlock'
import { Home } from 'components/redesign/screens/Home'
import { People } from 'components/redesign/screens/People'
import { PublicationPage } from 'components/redesign/screens/PublicationPage'
import { Research } from 'components/redesign/screens/Research'
import { Resources } from 'components/redesign/screens/Resources'
import { Section } from 'components/redesign/Section'
import { SiteFooter } from 'components/redesign/SiteFooter'
import { SiteNav } from 'components/redesign/SiteNav'
import { Tag } from 'components/redesign/Tag'
import { META, MICRO_LABEL } from 'components/redesign/tokens'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'

// This route is the only place any of the Phase 1 primitives actually
// render: the repo's Vitest config is node-only (see vitest config's
// `**/*.test.ts` include, no jsdom), so rendering/interaction behaviour is
// deliberately proven here in Playwright against a real production build
// instead. `page.tsx` stays a server component (so it can export the
// `robots: noindex` metadata -- a Client Component cannot export `metadata`,
// same split as app/studio/[[...tool]]/page.tsx + StudioClient.tsx) and
// hands off to this client component, which is what actually needs
// `'use client'`: every gallery section below wires a function prop
// (onOpen, onClick, onChange, onToggle, onNavigate) into a real host
// element, and a function prop cannot cross the RSC boundary.

// Task 2 fix round 2 (re-review Minor 3): `-mx-6` alone (the technique
// Task 1's own typography-budget fixtures use) only cancels `<main>`'s own
// `px-6` padding -- it does nothing about `<main>`'s `max-w-5xl` (1024px)
// cap, so at a genuine 1280/1440px viewport a `-mx-6`-only frame still
// measured a fixed 1024px wide (confirmed empirically: `gallery-home-a`'s
// own bounding box stayed 1024px at both 1280 and 1440), leaving the
// publication ledger's `xl:` grid (which activates on *viewport* width,
// not the element's own box width) 5-40px too narrow for its title
// column and colliding with the journal cell beside it -- the exact
// defect the re-review's Minor 3 flagged.
//
// Task 2 fix round 3 (re-review round 2, new Important 1): the fix round 2
// attempt (`relative left-1/2 right-1/2 w-screen -mx-[50vw]`) resolved
// against `100vw`, which includes a classic scrollbar's own width in any
// browser that reserves layout space for one -- Playwright's own headless
// Chromium hides its scrollbar by default, so the check that round added
// passed there while genuinely overflowing by ~8px per side under a real
// scrollbar (macOS "always show scrollbars", Windows, or any browser
// launched with `ignoreDefaultArgs: ['--hide-scrollbars']` removed --
// confirmed by the re-review's own measurement, and reproduced below by
// this file's `e2e/preview-scrollbar.spec.ts`).
//
// `BLEED_GRID` replaces the whole vw-based trick with a pure CSS Grid
// pattern instead: `<main>` itself becomes this 3-column grid (no
// `max-w-5xl`, no `mx-auto`, no `px-6` of its own), with `1fr` edge tracks
// and a `min(64rem,100%)` centre track -- every "normal" child gets
// `col-start-2 px-6` (this section's own padding, since `<main>` no longer
// has any), landing it in that centre track, which behaves exactly like
// the old `max-w-5xl mx-auto px-6` did: capped at 1024px and centred once
// the viewport exceeds it, full width below that. A full-bleed child gets
// `col-span-full` instead, spanning all three tracks -- i.e. the grid's
// own content box, which is sized by ordinary block layout against
// `<main>`'s real available width and so, unlike `100vw`, never includes
// scrollbar space. `gallery-home`'s own content needs *both* roles at
// once (its `Heading` stays centre-column width; its Home instances go
// full-bleed) -- since only a grid's own *direct* children can be placed
// on its tracks, that section is itself given `col-span-full` and nests
// a second `BLEED_GRID` inside itself for exactly this reason (see its own
// comment below), rather than moving the full-bleed div out from under
// `data-testid="gallery-home"` (which `e2e/home.spec.ts` scopes several
// queries to as a common ancestor).
const BLEED_GRID = 'grid grid-cols-[1fr_min(64rem,100%)_1fr]'

function Heading({ children, className = '' }: { children: ReactNode; className?: string }) {
  // Task 1 fix round 1: `break-words` kept alongside `hyphens-auto` (see
  // components/redesign/PageTitle.tsx's note).
  // Task 2 fix round 3: optional `className` exists only for `gallery-home`'s
  // own nested `BLEED_GRID` (its own `col-start-2 px-6`) -- every other
  // call site already gets that placement from its own `<section>` wrapper
  // and passes nothing, so this defaults to `''`.
  return (
    <h2 className={`text-title mb-4 text-[22px] leading-none break-words hyphens-auto ${className}`}>{children}</h2>
  )
}

function SubHeading({ children }: { children: ReactNode }) {
  return <h3 className={`${META} mb-2`}>{children}</h3>
}

export default function Gallery() {
  // -- Publication row: onOpen wiring -------------------------------------
  const [openedPub, setOpenedPub] = useState<Publication | null>(null)

  // -- Facet band: live counts computed through countBy/toggleFacet/applyFacets
  const [year, setYear] = useState<string | null>(null)
  const [type, setType] = useState<string | null>(null)
  const [topic, setTopic] = useState<string | null>(null)
  const [density, setDensity] = useState<'Comfortable' | 'Compact'>('Comfortable')

  const yearCounts = useMemo(() => countBy(SAMPLE_PUBLICATIONS, (p) => p.year), [])
  const typeCounts = useMemo(() => countBy(SAMPLE_PUBLICATIONS, (p) => p.type), [])
  const topicCounts = useMemo(() => countBy(SAMPLE_PUBLICATIONS, (p) => p.topics), [])

  const filtered = useMemo(
    () => applyFacets(SAMPLE_PUBLICATIONS, { year, type, topic }),
    [year, type, topic],
  )

  const yearChips: FacetChipSpec[] = Object.entries(yearCounts).map(([label, count]) => ({
    label,
    count,
    on: year === label,
    onClick: () => setYear((cur) => toggleFacet(cur, label)),
  }))
  const typeChips: FacetChipSpec[] = Object.entries(typeCounts).map(([label, count]) => ({
    label,
    count,
    on: type === label,
    onClick: () => setType((cur) => toggleFacet(cur, label)),
  }))
  const topicChips: FacetChipSpec[] = Object.entries(topicCounts).map(([label, count]) => ({
    label,
    count,
    on: topic === label,
    onClick: () => setTopic((cur) => toggleFacet(cur, label)),
  }))

  // -- Tag / Button: onClick wiring, evidenced with a visible counter ------
  const [tagClicks, setTagClicks] = useState(0)
  const [buttonClicks, setButtonClicks] = useState(0)

  // -- FormField: onChange wiring -------------------------------------------
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')

  return (
    <main className={`${BLEED_GRID} gap-y-16 py-10`}>
      <div className="col-start-2 px-6">
        <p className={MICRO_LABEL}>Preview -- not indexed</p>
        <h1 className="text-title text-[28px] leading-none break-words hyphens-auto">Redesign component gallery</h1>
        <p className="mt-3 max-w-prose text-[14px] text-text-muted">
          Every primitive from Tasks 4-8, rendered against real lab content so Playwright and axe
          can assert what this repo&apos;s node-only Vitest setup cannot reach.
        </p>
      </div>

      <section data-testid="gallery-tag" className="col-start-2 px-6">
        <Heading>Tag</Heading>
        <div className="flex flex-wrap items-center gap-3">
          <Tag>Informational</Tag>
          <Tag href="https://example.org/topics/neuro-oncology">Link tag</Tag>
          <span data-testid="tag-interactive-probe">
            <Tag onClick={() => setTagClicks((c) => c + 1)}>Interactive tag</Tag>
          </span>
          <span className={META}>
            clicks: <span data-testid="tag-click-count">{tagClicks}</span>
          </span>
        </div>
      </section>

      <section data-testid="gallery-button" className="col-start-2 px-6">
        <Heading>Button</Heading>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setButtonClicks((c) => c + 1)}>Rest</Button>
          <Button active>Active</Button>
          <Button disabled>Disabled</Button>
          <Button href="https://example.org">Link button</Button>
          <span className={META}>
            clicks: <span data-testid="button-click-count">{buttonClicks}</span>
          </span>
        </div>
      </section>

      <section data-testid="gallery-copy-citation" className="col-start-2 px-6">
        <Heading>Copy citation</Heading>
        <div className="flex flex-wrap items-center gap-6">
          <CopyCitation cite={SAMPLE_PUBLICATIONS[0].cite} />
          <CopyCitation cite={SAMPLE_PUBLICATIONS[1].cite} compact />
        </div>
      </section>

      <section data-testid="gallery-page-title" className="col-start-2 px-6">
        <Heading>Page title</Heading>
        <PageTitle title="Publications" meta="19 publications, 2020–2025" accentMeta />
      </section>

      <section data-testid="gallery-section" className="col-start-2 px-6">
        <Heading>Section</Heading>
        <Section label="Overview">
          <p className="max-w-prose text-[14px] text-text-muted">
            The direction&apos;s structural signature: every screen composes a sentence-case label
            beside (or, below `lg`, above) its content.
          </p>
        </Section>
      </section>

      <section data-testid="gallery-publication-row" className="col-start-2 px-6">
        <Heading>Publication row</Heading>

        <SubHeading>Comfortable density</SubHeading>
        <div className="mb-8" data-testid="publication-row-comfortable">
          {SAMPLE_PUBLICATIONS.map((p) => (
            <PublicationRow key={p.title} pub={p} density="comfortable" onOpen={setOpenedPub} />
          ))}
        </div>

        <SubHeading>Compact density</SubHeading>
        <div className="mb-8">
          {SAMPLE_PUBLICATIONS.map((p) => (
            <PublicationRow key={p.title} pub={p} density="compact" onOpen={setOpenedPub} />
          ))}
        </div>

        <SubHeading>Home variant</SubHeading>
        <div className="mb-8" data-testid="publication-row-home">
          {SAMPLE_PUBLICATIONS.map((p) => (
            <PublicationRow key={p.title} pub={p} variant="home" onOpen={setOpenedPub} />
          ))}
        </div>

        <SubHeading>Narrow variant (700px container -- the grid must not squeeze below 720px)</SubHeading>
        <div className="mb-8 w-[700px] max-w-full border border-dashed border-rule">
          {SAMPLE_PUBLICATIONS.map((p) => (
            <PublicationRow key={p.title} pub={p} narrow onOpen={setOpenedPub} />
          ))}
        </div>

        <SubHeading>Linked title (href renders a next/link)</SubHeading>
        <div className="mb-8" data-testid="publication-row-linked">
          <PublicationRow pub={LINKED_PUB} href="/publications/example" onOpen={setOpenedPub} />
        </div>

        <SubHeading>No link on file (empty linkHref -- no identifier markup)</SubHeading>
        <div className="mb-8" data-testid="publication-row-no-link">
          <PublicationRow pub={NO_LINK_PUB} onOpen={setOpenedPub} />
        </div>

        <p className={META}>
          last opened: <span data-testid="opened-publication">{openedPub?.title ?? 'none'}</span>
        </p>
      </section>

      {/* Task 3 fix round 2 (re-review N1): proves `[data-cms-verbatim]`
          actually exempts real-dataset shapes that happen to read as
          shouted caps -- a journal called "PLOS ONE", a journal abbreviated
          to "FEBS J", a DOI recorded with capital letters, and a
          `roleDetail` like "MD (UNSW)". `e2e/label-budget.spec.ts`'s own
          "CMS-verbatim text never trips the source-caps check" test scopes
          to this section's testid and asserts it counts 0. */}
      <section data-testid="gallery-cms-verbatim-probe" className="col-start-2 px-6">
        <Heading>CMS-verbatim probe (Task 3 fix round 2)</Heading>
        <SubHeading>Journal names and a capitalised DOI</SubHeading>
        <div className="mb-8">
          <PublicationRow pub={CMS_VERBATIM_PUB_PLOS_ONE} />
          <PublicationRow pub={CMS_VERBATIM_PUB_FEBS_J} />
        </div>
        <SubHeading>A roleDetail that reads as an acronym pair</SubHeading>
        <div className="grid max-w-xs grid-cols-1">
          <PersonCard name="CMS Verbatim Probe" role="Research Student" detail="MD (UNSW)" initials="CV" />
        </div>
      </section>

      {/* Task 3 fix round 2 (re-review N2): a regression guard, not
          production copy -- proves the budget spec still catches a shouted
          UI word ("CITE", "VIEW") typed directly into the source with no
          CSS `text-transform` involved, now that the old "<=5 letters is an
          acronym" exemption is gone. `e2e/label-budget.spec.ts`'s "A
          shouted UI word with no CSS transform still counts" test scopes
          to this section's testid. Deliberately outside every other
          section this file's own `GALLERY_SECTIONS`/route budget checks
          scan, so it can never itself push a real page over the ≤6
          budget. */}
      <section data-testid="gallery-shouted-word-probe" className="col-start-2 px-6">
        <Heading>Shouted-word probe (Task 3 fix round 2 -- regression guard)</Heading>
        <p className="text-[11px] text-text-muted">CITE</p>
        <p className="text-[11px] text-text-muted">VIEW</p>
      </section>

      <section data-testid="gallery-facet-band" className="col-start-2 px-6">
        <Heading>Facet band</Heading>
        <FacetBand
          groups={[
            { label: 'Year', chips: yearChips },
            { label: 'Type', chips: typeChips },
            { label: 'Topic', chips: topicChips },
          ]}
          density={{
            options: ['Comfortable', 'Compact'],
            value: density,
            onChange: (d) => setDensity(d as 'Comfortable' | 'Compact'),
          }}
          note={`${filtered.length} of ${SAMPLE_PUBLICATIONS.length} publications`}
        />
        <div className="mt-4">
          <span className={META}>
            Showing <span data-testid="facet-result-count">{filtered.length}</span> result
            {filtered.length === 1 ? '' : 's'}
          </span>
          {/* Density control from FacetBand's onChange drives this row's live
              PublicationRow density -- proof the wiring round-trips, not just
              that the two static density sections above render. */}
          <div className="mt-4">
            {filtered.map((p) => (
              <PublicationRow
                key={p.title}
                pub={p}
                density={density === 'Compact' ? 'compact' : 'comfortable'}
                onOpen={setOpenedPub}
              />
            ))}
          </div>
        </div>
      </section>

      <section data-testid="gallery-person-card" className="col-start-2 px-6">
        <Heading>Person card</Heading>
        <div className="grid max-w-md grid-cols-2 gap-8">
          {SAMPLE_PEOPLE.map((p) => (
            <PersonCard
              key={p.name}
              name={p.name}
              role={p.role}
              detail={p.detail}
              img={p.img}
              initials={p.initials}
              href={p.href}
            />
          ))}
        </div>
      </section>

      <section data-testid="gallery-people" className="col-start-2 px-6">
        <Heading>People screen</Heading>

        <SubHeading>(a) Lab head set, no portrait, two-paragraph bio, hasPage</SubHeading>
        <div className="mb-8 border border-rule" data-testid="gallery-people-a">
          <People
            settings={PEOPLE_SETTINGS_WITH_LAB_HEAD}
            profiles={PEOPLE_PROFILES_FIXTURE}
            roleGroups={PEOPLE_ROLE_GROUPS_FIXTURE}
            headingLevel="h2"
          />
        </div>

        <SubHeading>(b) Lab head unset -- same people, no spotlight</SubHeading>
        <div className="border border-rule" data-testid="gallery-people-b">
          <People
            settings={PEOPLE_SETTINGS_WITHOUT_LAB_HEAD}
            profiles={PEOPLE_PROFILES_FIXTURE}
            roleGroups={PEOPLE_ROLE_GROUPS_FIXTURE}
            headingLevel="h2"
          />
        </div>
      </section>

      <section data-testid="gallery-site-nav" className="col-start-2 px-6">
        <Heading>Site nav</Heading>
        {/* SiteNav's <nav> carries no aria-label of its own (Tasks 4-8's
            files are off-limits to modify beyond the data-identifier
            additions), and this gallery also renders MobileHeader's <nav>
            in the section below -- two simultaneously-visible, unlabelled
            navigation landmarks on one page trip axe's landmark-unique
            check. The production SiteChrome mirrors the same `hidden
            md:block` / `md:hidden` breakpoint split as the retired
            Desktop/MobileNavBar pair -- axe treats a `display: none`
            subtree as absent, so only one <nav> is ever "seen" at a given
            viewport.
            Each instance below also gets its own distinct `label`, since
            several navs are visible on this page at once. */}
        <div className="hidden border border-rule md:block">
          <SiteNav
            current="pubs"
            items={SITE_NAV}
            wordmark={{ long: 'Holsinger Lab — The University of Sydney', short: 'Holsinger Lab' }}
            label="Gallery: site nav"
          />
        </div>
      </section>

      {/* Width fixture for e2e/nav-wrap.spec.ts: the longest realistic
          siteName with all six IA items. Its test measures intrinsic widths
          against the viewport, so this container's own padding does not
          matter. */}
      <section data-testid="gallery-site-nav-long" className="col-start-2 px-6">
        <Heading>Site nav — long site name</Heading>
        <div className="hidden border border-rule md:block">
          <SiteNav
            items={SITE_NAV.filter((i) => i.id !== 'contact')}
            wordmark={{ long: 'Laboratory of Molecular Neuroscience and Dementia', short: 'Holsinger Lab' }}
            label="Gallery: site nav, long name"
          />
        </div>
      </section>

      <section data-testid="gallery-mobile-header" className="col-start-2 px-6">
        <Heading>Mobile header</Heading>

        <SubHeading>Closed (live component -- Menu opens the real dialog)</SubHeading>
        <div className="mb-6 max-w-sm border border-rule">
          <MobileHeader current="pubs" items={SITE_NAV} wordmark="Holsinger Lab" />
        </div>

        <SubHeading>Open sheet (static rendering of the dialog&apos;s contents)</SubHeading>
        {/* md:hidden: at md+ the gallery's SiteNav instances are visible, and
            this nav would be one more landmark on the page. */}
        <div className="max-w-sm border border-rule md:hidden">
          <MobileBand wordmark="Holsinger Lab" open />
          <MobileNavRows items={SITE_NAV} current="pubs" label="Gallery: mobile sheet" />
        </div>
      </section>

      <section data-testid="gallery-site-footer" className="col-start-2 px-6">
        <Heading>Site footer</Heading>
        <div className="border border-rule">
          <SiteFooter lines={FOOTER_FALLBACK} />
        </div>
      </section>

      <section data-testid="gallery-form-field" className="col-start-2 px-6">
        <Heading>Form field</Heading>
        <div className="flex max-w-md flex-col gap-6">
          <FormField
            label="Name"
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <FormField
            label="Message"
            textarea
            hint="Tell us about your project"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <FormField label="Disabled" disabled value="Locked" />
        </div>
      </section>

      <section data-testid="gallery-publication-page" className="col-start-2 px-6">
        <Heading>Publication page</Heading>
        {/* Task 5 fix round 1: the only place `PublicationPage` actually
            renders outside a real `/publications/[slug]` route, proving
            (a) `ResourceBlock`'s Resource rail with a fixture that has one
            -- the live dataset has zero `resource` documents today, so
            without this the block would ship unrendered on real content --
            and (b) `Cite & access` falls back to a full-width citation
            column when there is no canonical link (`PUBLICATION_PAGE_FIXTURE`
            has neither a DOI nor a URL). `PublicationPage` renders its own
            `<h1>`; axe's default ruleset only requires at least one `<h1>`
            per page (`page-has-heading-one`) and only flags a heading level
            jumping forward by more than one, never a later heading
            returning to `h1` -- so a second `<h1>` here does not trip axe,
            and no extra scoping/exclusion is needed (verified empirically:
            see the fix-round-1 report). */}
        <div className="border border-rule">
          <PublicationPage pub={PUBLICATION_PAGE_FIXTURE} />
        </div>
      </section>

      <section data-testid="gallery-resource-block" className="col-start-2 px-6">
        <Heading>Resource block</Heading>
        <ResourceBlock
          title="Antibody validation dataset"
          meta={[
            {
              label: 'DOI',
              value: '10.5281/zenodo.1234567',
              href: 'https://doi.org/10.5281/zenodo.1234567',
            },
            { label: 'Format', value: 'CSV, 4.2 MB' },
          ]}
          figureLabel="Figure preview unavailable"
        />
      </section>

      <section data-testid="gallery-research" className="col-start-2 px-6">
        <Heading>Research screen</Heading>
        {/* Task 2: production has zero `defined(researchOrder)` projects
            today (spec §2), so this fixture is the only place the
            populated Research screen -- six projects, four covers at
            varying aspect ratios plus two with none, a long unbreakable
            overview token, one with no tags, one with no start date, and
            one description-only project (fix round 3's overview/
            description fallback, researchModel.ts's `resolveBody`) --
            actually renders. */}
        <div className="border border-rule">
          <Research
            projects={RESEARCH_PROJECTS_FIXTURE}
            email="lab@example.org"
            showContactForm
            headingLevel="h2"
          />
        </div>
      </section>

      {/* Fix round 2, IMPORTANT: the two Enquiries branches production data
          can never show today (no `resource`... no, `project` with
          `researchOrder`, no `settings.contact`/`labHead` email, and
          `settings.showContactForm` is `true` live -- spec §2) get their
          own permanent fixtures here, per constraints.md's "states the live
          data can't show go on gallery fixtures". Both also pass
          `projects={[]}`, which doubles as the empty-state fixture (the
          "Research projects will be listed here soon." line) -- a third,
          separate empty-state-only fixture would be redundant with these
          two. Each instance's `<Research>` renders its own
          `data-testid="research-enquiries"` (and, when populated,
          `"research-project-title"`) -- not unique across instances on this
          one page, so e2e scopes every query through the wrapping
          `data-testid` below rather than relying on page-wide testid
          uniqueness. */}
      <section data-testid="gallery-research-no-link" className="col-start-2 px-6">
        <Heading>Research screen -- no email, showContactForm false (no link)</Heading>
        <div className="border border-rule">
          <Research projects={[]} email={null} showContactForm={false} headingLevel="h2" />
        </div>
      </section>

      <section data-testid="gallery-research-contact-link" className="col-start-2 px-6">
        <Heading>Research screen -- no email, showContactForm true (&quot;get in touch&quot;)</Heading>
        <div className="border border-rule">
          <Research projects={[]} email={null} showContactForm headingLevel="h2" />
        </div>
      </section>

      <section data-testid="gallery-resources" className="col-start-2 px-6">
        <Heading>Resources screen</Heading>
        {/* Task 1: production carries zero `resource` documents today (spec
            §2), so this fixture is the only place the populated Resources
            screen -- four resources, one with a linked publication's SOURCE/
            DOI meta, one with a portable-text `howToObtain` link -- actually
            renders. */}
        <div className="border border-rule">
          <Resources resources={RESOURCES_FIXTURE} />
        </div>
      </section>

      {/* Task 2 fix round 3: this section carries `col-span-full` (a full-
          width item of `<main>`'s own `BLEED_GRID`) AND is itself a second,
          nested `BLEED_GRID` -- the only way to give `Heading` the normal
          centre-column width while the Home instances below it go genuinely
          full-bleed, without moving them out from under this element's own
          `data-testid="gallery-home"` (see `BLEED_GRID`'s own comment for
          why that matters). `Heading`'s `col-start-2 px-6` here places it in
          *this* grid's centre track, not `<main>`'s. */}
      <section data-testid="gallery-home" className={`col-span-full ${BLEED_GRID}`}>
        <Heading className="col-start-2 px-6">Home screen</Heading>
        {/* Task 3: production today has no resource, an unset labHead, and
            no `support-our-research` page (spec §2) -- this is the only
            place Home's populated PI panel, Resources block, and Support
            link actually render. The `maestro` project *does* exist live,
            but the fixture's own copy proves the block independent of
            live-data drift.

            Task 2 fix round 2: all three instances now render inside one
            shared full-bleed wrapper instead of each being its own
            narrower demo frame -- at 1280/1440px this is what stops
            "Recent work"'s publication ledger from colliding with itself,
            matching the treatment Task 1's own
            `gallery-typography-budget-inner` already uses at 320/375px.
            Fix round 3: that wrapper is now `col-span-full` on *this*
            section's own nested grid (see the section's own comment
            above), not the vw-based `FULL_BLEED` (removed -- it overflowed
            under a real scrollbar; see `BLEED_GRID`'s own comment). */}
        <div className="col-span-full">
          <SubHeading>(a) labHead set, showLabHeadOnHome true -- PI panel shows, PI excluded from the count</SubHeading>
          <div className="mb-8 border border-rule" data-testid="gallery-home-a">
            <Home
              home={HOME_PAGE_FIXTURE}
              settings={HOME_SETTINGS_FIXTURE}
              siteName="Holsinger Lab"
              publications={HOME_PUBLICATIONS_FIXTURE}
              publicationCount={HOME_PUBLICATION_COUNT_FIXTURE}
              resource={HOME_RESOURCE_FIXTURE}
              maestro={HOME_MAESTRO_FIXTURE}
              profiles={PEOPLE_PROFILES_FIXTURE}
              roleGroups={PEOPLE_ROLE_GROUPS_FIXTURE}
              supportPage={HOME_SUPPORT_PAGE_FIXTURE}
              headingLevel="h2"
            />
          </div>

          {/* Fix round 1, IMPORTANT 1: the exact shape of the bug this fixes
              -- labHead set, but showLabHeadOnHome false, so the PI panel is
              hidden. The PI must now count as an ordinary member (this
              instance's count is instance (a)'s count plus exactly one, the
              PI herself) instead of being silently subtracted while
              appearing nowhere on the page. */}
          <SubHeading>(b) labHead set, showLabHeadOnHome false -- no PI panel, PI included in the count</SubHeading>
          <div className="mb-8 border border-rule" data-testid="gallery-home-b">
            <Home
              home={HOME_PAGE_FIXTURE}
              settings={HOME_SETTINGS_LABHEAD_HIDDEN_FIXTURE}
              siteName="Holsinger Lab"
              publications={HOME_PUBLICATIONS_FIXTURE}
              publicationCount={HOME_PUBLICATION_COUNT_FIXTURE}
              resource={HOME_RESOURCE_FIXTURE}
              maestro={HOME_MAESTRO_FIXTURE}
              profiles={PEOPLE_PROFILES_FIXTURE}
              roleGroups={PEOPLE_ROLE_GROUPS_FIXTURE}
              supportPage={HOME_SUPPORT_PAGE_FIXTURE}
              headingLevel="h2"
            />
          </div>

          {/* Fix round 4 (axe regression): instance (a) deliberately keeps
              `labHead.image: null` (proves PiPortrait64's initials fallback),
              so this third instance is what actually renders a real portrait
              through Home's own 64px `<Image>` branch -- the case
              `image-redundant-alt` needs to see exercised (Home.tsx's
              `PiPortrait64` own comment: `alt=""`, decorative, since the PI's
              name is visible text right beside it inside the same `Link`).
              Covered by this file's own whole-page axe checks (light and
              dark, below) same as every other gallery section. */}
          <SubHeading>(c) labHead set with a portrait -- PiPortrait64&apos;s image branch, decorative alt</SubHeading>
          <div className="border border-rule" data-testid="gallery-home-c">
            <Home
              home={HOME_PAGE_FIXTURE}
              settings={HOME_SETTINGS_PORTRAIT_FIXTURE}
              siteName="Holsinger Lab"
              publications={HOME_PUBLICATIONS_FIXTURE}
              publicationCount={HOME_PUBLICATION_COUNT_FIXTURE}
              resource={HOME_RESOURCE_FIXTURE}
              maestro={HOME_MAESTRO_FIXTURE}
              profiles={PEOPLE_PROFILES_FIXTURE}
              roleGroups={PEOPLE_ROLE_GROUPS_FIXTURE}
              supportPage={HOME_SUPPORT_PAGE_FIXTURE}
              headingLevel="h2"
            />
          </div>
        </div>
      </section>

      {/* Task 1 ("Fonts and type scale") fix round 2: the review found the
          gallery's other sections undercount the real page column, because
          `<main>`'s own `px-6` (48px) stacks on top of each component's
          own gutter -- a heading here measures ~196px wide at 320px
          instead of a real route's ~246px, so a word that's actually
          within budget on every live route can still split inside this
          narrower demo frame (reviewer's finding: the Home gallery `<h1>`
          split "Neuroscien|ce" here while the live Home route did not).
          `-mx-6` cancels `<main>`'s padding so everything inside renders
          at the page's real gutter width, matching production exactly --
          this is what "at full page width" means below, not a wider demo
          box. Each fixture carries its level's budget word, capitalised
          (Blink never hyphenates it) -- see each fixture's own comment in
          fixtures.ts. Fix round 3 (re-review New Breakage 2): every other
          word in each title is short enough to fit at 320px on its own,
          without relying on hyphenation CI's Linux Chromium doesn't have.
          e2e/typography.spec.ts's raw-split probe (fix round 2) targets
          each fixture's own heading by an explicit `data-testid`, not the
          first `h1`/`h2` inside its container -- `typography-budget-heading`
          wraps a full `Research` render, whose own `PageTitle` ("Research")
          is a *different* heading that sits before the project title this
          fixture actually exists to test (re-review New Breakage 1). */}
      <section data-testid="gallery-typography-budget" className="col-start-2 px-6">
        <Heading>Typography budget (full page width)</Heading>
        <div className="-mx-6" data-testid="gallery-typography-budget-inner">
          <div className="border border-rule" data-testid="typography-budget-display">
            <Home
              home={TYPOGRAPHY_BUDGET_HOME_FIXTURE}
              settings={HOME_SETTINGS_FIXTURE}
              siteName="Holsinger Lab"
              publications={HOME_PUBLICATIONS_FIXTURE}
              publicationCount={HOME_PUBLICATION_COUNT_FIXTURE}
              resource={HOME_RESOURCE_FIXTURE}
              maestro={HOME_MAESTRO_FIXTURE}
              profiles={PEOPLE_PROFILES_FIXTURE}
              roleGroups={PEOPLE_ROLE_GROUPS_FIXTURE}
              supportPage={HOME_SUPPORT_PAGE_FIXTURE}
              headingLevel="h2"
            />
          </div>
          <div className="mt-8 border border-rule" data-testid="typography-budget-title">
            <PageTitle
              title="Pathophysiology of the brain"
              meta="Typography budget fixture"
              headingLevel="h2"
            />
          </div>
          <div className="mt-8 border border-rule" data-testid="typography-budget-paper-title">
            <PublicationPage pub={TYPOGRAPHY_BUDGET_PUBLICATION_FIXTURE} />
          </div>
          <div className="mt-8 border border-rule" data-testid="typography-budget-heading">
            <Research
              projects={[TYPOGRAPHY_BUDGET_RESEARCH_PROJECT_FIXTURE]}
              email={null}
              showContactForm={false}
              headingLevel="h2"
            />
          </div>
        </div>
      </section>
    </main>
  )
}
