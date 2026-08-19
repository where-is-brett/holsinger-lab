'use client'

import { Button } from 'components/redesign/Button'
import { CopyCitation } from 'components/redesign/CopyCitation'
import { FacetBand, type FacetChipSpec } from 'components/redesign/FacetBand'
import { applyFacets, countBy, toggleFacet } from 'components/redesign/facets'
import { SAMPLE_PEOPLE, SAMPLE_PUBLICATIONS } from 'components/redesign/fixtures'
import { FormField } from 'components/redesign/FormField'
import { MobileHeader } from 'components/redesign/MobileHeader'
import { PageTitle } from 'components/redesign/PageTitle'
import { PersonCard } from 'components/redesign/PersonCard'
// Explicit extensions on these two -- 'PublicationRow.tsx' (the component)
// and 'publicationRow.ts' (its types/helpers) differ only in the case of
// their first letter, and on this case-insensitive filesystem TypeScript's
// bundler resolution collapses the two into one module identity when both
// are imported (by the extension-less specifiers) from the same file,
// silently resolving 'PublicationRow' to whichever of the two got included
// in the program first. Spelling the extension out sidesteps the
// extension-probing step that causes the collision.
import type { Publication } from 'components/redesign/publicationRow.ts'
import { PublicationRow } from 'components/redesign/PublicationRow.tsx'
import { ResourceBlock } from 'components/redesign/ResourceBlock'
import { SectionRail } from 'components/redesign/SectionRail'
import { SiteFooter } from 'components/redesign/SiteFooter'
import { NAV_ITEMS, SiteNav } from 'components/redesign/SiteNav'
import { Tag } from 'components/redesign/Tag'
import { LABEL, META } from 'components/redesign/tokens'
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

function Heading({ children }: { children: ReactNode }) {
  return <h2 className="text-title mb-4 text-[22px] leading-none">{children}</h2>
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

  // -- SiteNav / MobileHeader: onNavigate / onToggle wiring ----------------
  const [lastNavigated, setLastNavigated] = useState('none')
  const [mobileOpen, setMobileOpen] = useState(true)

  // -- FormField: onChange wiring -------------------------------------------
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-16 px-6 py-10">
      <div>
        <p className={LABEL}>Preview -- not indexed</p>
        <h1 className="text-title text-[28px] leading-none">Redesign component gallery</h1>
        <p className="mt-3 max-w-prose text-[14px] text-text-muted">
          Every primitive from Tasks 4-8, rendered against real lab content so Playwright and axe
          can assert what this repo&apos;s node-only Vitest setup cannot reach.
        </p>
      </div>

      <section data-testid="gallery-tag">
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

      <section data-testid="gallery-button">
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

      <section data-testid="gallery-copy-citation">
        <Heading>Copy citation</Heading>
        <div className="flex flex-wrap items-center gap-6">
          <CopyCitation cite={SAMPLE_PUBLICATIONS[0].cite} />
          <CopyCitation cite={SAMPLE_PUBLICATIONS[1].cite} compact />
        </div>
      </section>

      <section data-testid="gallery-page-title">
        <Heading>Page title</Heading>
        <PageTitle title="Publications" meta="19 records" accentMeta />
      </section>

      <section data-testid="gallery-section-rail">
        <Heading>Section rail</Heading>
        <SectionRail num="01" label="Overview">
          <p className="max-w-prose text-[14px] text-text-muted">
            The direction&apos;s structural signature: every screen composes this as a
            [rail | content] grid.
          </p>
        </SectionRail>
      </section>

      <section data-testid="gallery-publication-row">
        <Heading>Publication row</Heading>

        <SubHeading>Comfortable density</SubHeading>
        <div className="mb-8">
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
        <div className="mb-8">
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

        <p className={META}>
          last opened: <span data-testid="opened-publication">{openedPub?.title ?? 'none'}</span>
        </p>
      </section>

      <section data-testid="gallery-facet-band">
        <Heading>Facet band</Heading>
        <FacetBand
          sticky={false}
          num="02"
          label="Filter"
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

      <section data-testid="gallery-person-card">
        <Heading>Person card</Heading>
        <div className="grid max-w-md grid-cols-2 gap-8">
          {SAMPLE_PEOPLE.map((p) => (
            <PersonCard key={p.name} name={p.name} role={p.role} img={p.img} initials={p.initials} />
          ))}
        </div>
      </section>

      <section data-testid="gallery-site-nav">
        <Heading>Site nav</Heading>
        {/* SiteNav's <nav> carries no aria-label of its own (Tasks 4-8's
            files are off-limits to modify beyond the data-identifier
            additions), and this gallery also renders MobileHeader's <nav>
            in the section below -- two simultaneously-visible, unlabelled
            navigation landmarks on one page trip axe's landmark-unique
            check. The production Navbar (components/global/Navbar/
            Desktop|MobileNavBar.tsx) avoids the same collision with a
            `hidden md:flex` / `md:hidden` breakpoint split -- axe treats a
            `display: none` subtree as absent, so only one <nav> is ever
            "seen" at a given viewport. Reproduced here rather than inventing
            a different fix, and for the same reason: it's the real-world
            shape (SiteNav for desktop widths, MobileHeader for narrow
            ones), not a test-only workaround. */}
        <div className="hidden border border-rule md:block">
          <SiteNav current="pubs" items={NAV_ITEMS} onNavigate={setLastNavigated} />
        </div>
        <p className={`${META} mt-2`}>
          last navigated: <span data-testid="nav-last-navigated">{lastNavigated}</span>
        </p>
      </section>

      <section data-testid="gallery-mobile-header">
        <Heading>Mobile header</Heading>

        <SubHeading>Closed</SubHeading>
        <div className="mb-6 max-w-sm border border-rule">
          <MobileHeader open={false} current="pubs" items={NAV_ITEMS} />
        </div>

        <SubHeading>Open (interactive -- onToggle flips this instance&apos;s state)</SubHeading>
        {/* md:hidden -- see the comment on the Site nav section above. */}
        <div className="max-w-sm border border-rule md:hidden">
          <MobileHeader
            open={mobileOpen}
            onToggle={() => setMobileOpen((o) => !o)}
            current="pubs"
            items={NAV_ITEMS}
            onNavigate={setLastNavigated}
          />
        </div>
      </section>

      <section data-testid="gallery-site-footer">
        <Heading>Site footer</Heading>
        <SubHeading>Default</SubHeading>
        <div className="mb-6 border border-rule">
          <SiteFooter />
        </div>
        <SubHeading>Compact</SubHeading>
        <div className="max-w-sm border border-rule">
          <SiteFooter compact />
        </div>
      </section>

      <section data-testid="gallery-form-field">
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

      <section data-testid="gallery-resource-block">
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
    </main>
  )
}
