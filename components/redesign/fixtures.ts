import { urlForImage } from 'lib/sanity.image'
import type {
  HomePagePayload,
  HomeResourcePayload,
  MaestroProjectPayload,
  ProfilePayload,
  ResourcePayload,
  RoleGroupPayload,
  SettingsPayload,
  SupportPagePayload,
} from 'types'
import { fallbackSettings } from 'types'

import type { Publication } from './publicationModel'
import { deriveLink, shortenLabel, splitAuthors } from './publicationModel'
import { researchKicker, type ResearchProjectView } from './researchModel'

// Real lab content, not placeholder strings -- the gallery this feeds is the
// only place any of the twelve Phase 1 components actually render, so the
// fixtures need to exercise the awkward real-world cases: a long title, an
// author list with the PI mid-list, one publication with a DOI and one with
// only a URL, and a person with no portrait.

function make(
  year: string,
  title: string,
  authors: string,
  journal: string,
  ref: string,
  doi: string | null,
  url: string | null,
  type: string,
  topics: string[],
): Publication {
  const a = splitAuthors(authors)
  const link = deriveLink(doi, url)
  // Checked against the real dataset (19 publications, 9 without a DOI):
  // zero are missing both a DOI and a URL, so this throw should never fire
  // against real content. It stays as a loud fixture-authoring guard, not a
  // runtime concern.
  if (!link) throw new Error(`fixture ${title} has neither DOI nor URL`)
  return {
    id: doi ?? link.href,
    href: null,
    year,
    dateLabel: '',
    title,
    authorsPre: a.pre,
    authorsPI: a.pi,
    authorsPost: a.post,
    journal,
    ref,
    linkKind: link.kind,
    linkLabel: link.label,
    linkLabelShort: shortenLabel(link.label, 24),
    linkHref: link.href,
    type,
    topics,
    cite: `${authors} (${year}). ${title} ${journal} ${ref}. ${link.href}`,
    abstract: [],
    resources: [],
  }
}

export const SAMPLE_PUBLICATIONS: Publication[] = [
  make(
    '2025',
    'Chromobox protein homolog 7 suppresses the stem-like phenotype of glioblastoma cells by regulating the myosin heavy chain 9-NF-κB signaling pathway.',
    'Ni K., Liu Y., DI P., Wang L., Huang H., Holsinger R.M.D., Kiang K.M. and Jiao J.',
    'Cell Death Discovery',
    '11(1) · 74',
    '10.1038/s41420-025-02362-7',
    null,
    'Article',
    ['Neuro-oncology & biomarkers'],
  ),
  make(
    '2023',
    'Neuroprotective Effects of Carnosic Acid: Insight into its Mechanisms of Action',
    'Mirza, F., Zahid, S., Holsinger, R.M.D.',
    'Molecules',
    '28(5) · 2306',
    null,
    'https://www.mdpi.com/1420-3049/28/5/2306',
    'Review',
    ['Metabolism, oxidative stress & neuroprotection'],
  ),
]

// Real routes carry an `href` (Task 3, spec §4.1): a clone of the first
// fixture is enough to prove the title renders as a next/link, without
// touching SAMPLE_PUBLICATIONS and its length-2 assumptions elsewhere in
// this gallery (facet-band result counts).
export const LINKED_PUB: Publication = {
  ...SAMPLE_PUBLICATIONS[0],
  id: 'linked-pub-fixture',
  href: '/publications/example',
}

// The no-link case (§4.1: "No identifier markup when linkHref === ''"):
// neither a DOI nor a URL on file, and an empty `type` so the tag line
// (requirement 4) also has to tolerate a missing first segment. Built by
// hand, not through `make()`, since `make()` deliberately throws when
// there's no DOI/URL -- that guard exists for the real dataset, where the
// case never happens; this fixture exists precisely because the component
// must still handle it.
export const NO_LINK_PUB: Publication = {
  id: 'no-link-pub-fixture',
  href: null,
  year: '2022',
  dateLabel: '',
  title: 'A record on file with neither a DOI nor a URL',
  authorsPre: '',
  authorsPI: '',
  authorsPost: 'Holsinger, R.M.D.',
  journal: 'Journal of Unlinked Records',
  ref: '1(1) · 1',
  linkKind: '',
  linkLabel: '',
  linkLabelShort: '',
  linkHref: '',
  type: '',
  topics: [],
  cite: 'Holsinger, R.M.D. (2022). A record on file with neither a DOI nor a URL. Journal of Unlinked Records 1(1) · 1.',
  abstract: [],
  resources: [],
}

// Fix round 1: `/publications/[slug]`'s ResourceBlock/citation-full-width
// fixes needed a gallery fixture exercising the no-canonical-link + linked-
// resource case together -- neither SAMPLE_PUBLICATIONS entry nor
// NO_LINK_PUB carries an abstract or a resource. No DOI and no URL (so
// Cite & access has no canonical-link column and the citation box should
// take the full width), a two-paragraph abstract (so the Abstract rail
// renders more than one <p>), and one linked resource (so the Resource
// rail -- otherwise unrendered on real data, since the live dataset has
// zero `resource` documents today -- gets proven at all).
export const PUBLICATION_PAGE_FIXTURE: Publication = {
  id: 'publication-page-fixture',
  href: '/publications/publication-page-fixture',
  year: '2021',
  dateLabel: '1 March 2021',
  title: 'A record on file with no canonical link, an abstract, and one linked resource',
  authorsPre: 'Choi, J., Wu, H. and ',
  authorsPI: 'Holsinger, R.M.D.',
  authorsPost: '',
  journal: 'Journal of Unlinked Records',
  ref: '2(1) · 15',
  linkKind: '',
  linkLabel: '',
  linkLabelShort: '',
  linkHref: '',
  type: 'Article',
  topics: ['Metabolism, oxidative stress & neuroprotection'],
  cite: 'Choi, J., Wu, H. and Holsinger, R.M.D. (2021). A record on file with no canonical link, an abstract, and one linked resource. Journal of Unlinked Records 2(1) · 15.',
  abstract: [
    'The first paragraph sets up the problem: this fixture exists to prove the Abstract rail renders more than one paragraph, and that Cite & access falls back to a full-width citation column when there is no DOI or URL on file.',
    'The second paragraph proves the same block renders a second <p> rather than concatenating both into one -- the two-paragraph split is the thing under test, not the prose itself.',
  ],
  resources: [{ id: 'resource-fixture-1', title: 'Cell culture chamber CAD files', kind: 'hardware' }],
}

export const SAMPLE_PEOPLE: {
  name: string
  role: string
  detail?: string
  img?: string
  initials?: string
  href?: string
}[] = [
  {
    name: 'Haochen Wu',
    role: 'PhD Student',
    img: 'https://cdn.sanity.io/images/j3f9z8os/production/8804e1e4206e971126b4ea1593388981dda21fb7-827x1157.jpg',
  },
  // Jiyoo Choi has no portrait in the dataset -- this is the fallback case.
  //
  // "Ungergraduate" is the misspelling present verbatim in the source data.
  // Roles are free text from the CMS and are never silently corrected here
  // or anywhere else in the redesign components -- see the matching comment
  // in PersonCard.tsx. Do not "fix" this typo.
  { name: 'Jiyoo Choi', role: 'Ungergraduate student - Diagnostic Radiography', initials: 'JC' },
  // Proves the `detail` second mono line (spec §5, ruling 3 -- roleDetail
  // shown when present).
  {
    name: 'Fritz A. Graham',
    role: 'Honours Student',
    detail: 'Diagnostic Radiography',
    initials: 'FG',
  },
  // Proves the `href` variant: the whole card becomes a next/link with a
  // single accessible name (PersonCard's aria-label/empty-alt decision).
  // Has a portrait (not just initials) so the alt=""/aria-label collision
  // this decision resolves is actually exercised.
  {
    name: 'Élodie Ñúñez',
    role: 'Postdoctoral Fellow',
    img: 'https://cdn.sanity.io/images/j3f9z8os/production/8804e1e4206e971126b4ea1593388981dda21fb7-827x1157.jpg',
    href: '/people/elodie-nunez',
  },
]

// The same real fixture image as SAMPLE_PEOPLE, reshaped as the plain
// reference `Image` shape every People-related query produces (see
// lib/sanity.image.test.ts's own reference-shaped case). Reused rather than
// invented so the People gallery exercises the exact same asset id.
// Typed loosely (not against `ProfilePayload['image']`/`Image`): those are
// two independently-generated structural types (the profile query's own
// item shape vs the `sanity` package's general `Image`), and this one
// literal needs to satisfy both call sites below (a fixture profile's
// `image`, consumed by `urlForImage(profile.image as Image)` in
// People.tsx). The `_ref`/`_type` shape itself is what
// lib/sanity.image.test.ts proves urlForImage actually accepts.
const PEOPLE_IMAGE = {
  _type: 'image',
  asset: {
    _ref: 'image-8804e1e4206e971126b4ea1593388981dda21fb7-827x1157-jpg',
    _type: 'reference',
  },
} as const

function portableParagraph(key: string, text: string) {
  return {
    _type: 'block' as const,
    _key: key,
    style: 'normal' as const,
    markDefs: [],
    children: [{ _type: 'span' as const, _key: `${key}-s`, text, marks: [] }],
  }
}

// Task 2 brief gallery fixture, instance (a): "Lab head set, no portrait, no
// email, a two-paragraph portable-text fullBio, hasPage: true." Proves the
// initials fallback and the Full profile -> link render even without a
// portrait or an email on file.
export const PEOPLE_LAB_HEAD_FIXTURE: NonNullable<SettingsPayload['labHead']> = {
  _id: 'fixture-lab-head',
  image: null,
  name: 'Dr Ilse Van Der Berg',
  role: 'Principal Investigator',
  roleDetail: null,
  email: null,
  phone: null,
  bio: null,
  slug: 'ilse-van-der-berg',
  hasPage: true,
  fullBio: [
    portableParagraph(
      'bio-p1',
      'Dr Van Der Berg leads the laboratory’s work on molecular mechanisms of neurodegeneration, with a focus on how ' +
        'chronic metabolic stress alters glial support of neuronal circuits over the course of ageing.'
    ),
    portableParagraph(
      'bio-p2',
      'Before joining the University of Sydney she trained across three continents, and continues to collaborate widely ' +
        'on cross-institutional projects spanning basic and translational neuroscience.'
    ),
    // Fix round 1: a long unbreakable token -- an inline email address, the
    // same shape as live data's own Damian Holsinger fullBio -- so this
    // gallery fixture's own overflow check (redesign-components.spec.ts's
    // "no page overflow at 320px") actually exercises the spotlight's
    // min-content floor, the same way it's exercised against real data
    // (PersonPage.tsx's task-3 report).
    portableParagraph('bio-p3', 'Contact the laboratory at ilse.vanderberg.laboratory@sydney.edu.au'),
  ],
}

function profile(overrides: Partial<ProfilePayload> & { _id: string; name: string }): ProfilePayload {
  return {
    image: null,
    orderRank: overrides._id,
    role: null,
    roleDetail: null,
    roleGroup: null,
    email: null,
    phone: null,
    bio: null,
    slug: null,
    hasPage: false,
    fullBio: null,
    ...overrides,
  } as ProfilePayload
}

const RESEARCH_SCIENTIST_GROUP = { _id: 'fixture-role-research-scientist', title: 'Research Scientist' }
const INTERNS_GROUP = { _id: 'fixture-role-interns', title: 'International Interns' }
const ALUMNI_GROUP = { _id: 'fixture-role-alumni', title: 'Lab Alumni' }

const RESEARCH_SCIENTISTS: ProfilePayload[] = [
  profile({
    _id: 'fixture-rs-1',
    name: 'Dr Priya Natarajan',
    role: 'Research Scientist',
    image: PEOPLE_IMAGE,
    roleGroup: RESEARCH_SCIENTIST_GROUP,
    hasPage: true,
    slug: 'priya-natarajan',
  }),
  profile({
    _id: 'fixture-rs-2',
    name: 'Dr Marcus Ferreira',
    role: 'Research Scientist',
    image: PEOPLE_IMAGE,
    roleGroup: RESEARCH_SCIENTIST_GROUP,
  }),
]

// 10 members, no photos, every role carrying a country -- proves the "text
// prints verbatim" rule holds for a long, data-driven role string, and 4 with
// a roleDetail (spec §5 ruling 3 -- shown when present, omitted otherwise).
const INTERN_COUNTRIES = [
  'Germany',
  'Canada',
  'Singapore',
  'Brazil',
  'South Korea',
  'Kenya',
  'Netherlands',
  'India',
  'Chile',
  'Vietnam',
]
// Final-review fix wave (PersonCard wrapping): at the grid's base 2-column
// layout (`grid-cols-2`, below `md`) the odd indices below sit in the
// rightmost column -- index 1 and index 5 are placed there deliberately,
// not on a left-column index where a long token would never reach the
// viewport edge at 320px. Index 1 carries a long unhyphenated surname (the
// name line's `break-words`); index 5 carries a long parenthesised
// roleDetail (the detail line's `break-words`). Neither disturbs the
// pre-existing index-0/2 roleDetail pair (both left column).
const INTERN_NAME_OVERRIDES: Record<number, string> = {
  1: 'Priya Balasubramaniam',
}
const INTERN_DETAIL_OVERRIDES: Record<number, string> = {
  5: '(Neuroscience/Pharmacology)',
}
const INTERNS: ProfilePayload[] = INTERN_COUNTRIES.map((country, index) =>
  profile({
    _id: `fixture-intern-${index + 1}`,
    name: INTERN_NAME_OVERRIDES[index] ?? `Intern ${index + 1} Surname${index + 1}`,
    role: `Visiting Intern — ${country}`,
    roleDetail:
      INTERN_DETAIL_OVERRIDES[index] ??
      (index < 3 ? `${['Neuroscience', 'Biochemistry', 'Genetics'][index]} placement` : null),
    roleGroup: INTERNS_GROUP,
  })
)

// 22 members, no photos -- rendered as the inline comma-separated Alumni
// run (spec §5 ruling 3), not a card grid.
const ALUMNI: ProfilePayload[] = Array.from({ length: 22 }, (_, index) =>
  profile({
    _id: `fixture-alumni-${index + 1}`,
    name: `Alumni ${index + 1} Lastname${index + 1}`,
    role: 'Lab Alumni',
    roleGroup: ALUMNI_GROUP,
    // Every third alumnus links to their own page, proving AlumniBlock's
    // per-name hasPage branch without making every name a link.
    hasPage: index % 3 === 0,
    slug: index % 3 === 0 ? `alumni-${index + 1}` : null,
  })
)

const UNGROUPED: ProfilePayload[] = [
  profile({ _id: 'fixture-ungrouped-1', name: 'Sam Okafor', role: 'Lab Manager' }),
  profile({ _id: 'fixture-ungrouped-2', name: 'Robin Delacroix', role: 'Volunteer' }),
  // Fix round 1 (IMPORTANT 2): the lab head's shape as an ordinary profile
  // document, mirroring the real production PI -- `roleGroup: null` (no
  // roleGroup card of her own), same `_id`/name/role/hasPage/slug as
  // PEOPLE_LAB_HEAD_FIXTURE. Without this entry, instance (a) never actually
  // exercised excludeLabHead (there was nobody in the fixture "grid" to
  // exclude in the first place), and instance (b) never proved she
  // reappears as an ordinary card once the spotlight is off.
  profile({
    _id: PEOPLE_LAB_HEAD_FIXTURE._id,
    name: PEOPLE_LAB_HEAD_FIXTURE.name ?? '',
    role: PEOPLE_LAB_HEAD_FIXTURE.role,
    hasPage: PEOPLE_LAB_HEAD_FIXTURE.hasPage,
    slug: PEOPLE_LAB_HEAD_FIXTURE.slug,
  }),
]

export const PEOPLE_ROLE_GROUPS_FIXTURE: RoleGroupPayload[] = [
  RESEARCH_SCIENTIST_GROUP,
  INTERNS_GROUP,
  ALUMNI_GROUP,
]

export const PEOPLE_PROFILES_FIXTURE: ProfilePayload[] = [
  ...RESEARCH_SCIENTISTS,
  ...INTERNS,
  ...ALUMNI,
  ...UNGROUPED,
]

export const PEOPLE_SETTINGS_WITH_LAB_HEAD: SettingsPayload = {
  ...fallbackSettings,
  labHead: PEOPLE_LAB_HEAD_FIXTURE,
  showLabHeadOnPeople: true,
}

// Instance (b): "Lab head unset, and the same people." -- proves the
// spotlight is genuinely omitted, and the PI does not silently vanish from
// the grid (excludeLabHead only runs when shouldShowLabHeadSpotlight is
// true).
export const PEOPLE_SETTINGS_WITHOUT_LAB_HEAD: SettingsPayload = {
  ...fallbackSettings,
  labHead: null,
}

// Task 1 (Resources): production carries zero `resource` documents today
// (spec §2), so this is the only place the populated state renders at all.
// Four resources -- one with a linked publication (exercising the SOURCE
// meta line and its DOI link, and a portable-text `howToObtain` holding a
// real link, per the task brief), one without (proving the SOURCE/DOI meta
// rows are genuinely omitted rather than rendered blank), and (fix round 1)
// two more that exist purely to exercise a long, unbreakable identifier at
// 320px -- a real DOI (`10.1016/j.neurobiolaging.2023.04.012`, 38 chars) and
// a URL-only publication -- neither of which the first two fixtures'
// short DOI (`10.1038/s41420-024-00000-1`) reached.
function portableLinkParagraph(
  key: string,
  pre: string,
  linkText: string,
  href: string,
  post = ''
) {
  const linkKey = `${key}-link`
  return {
    _type: 'block' as const,
    _key: key,
    style: 'normal' as const,
    markDefs: [{ _type: 'link' as const, _key: linkKey, href }],
    children: [
      { _type: 'span' as const, _key: `${key}-s1`, text: pre, marks: [] },
      { _type: 'span' as const, _key: `${key}-s2`, text: linkText, marks: [linkKey] },
      ...(post ? [{ _type: 'span' as const, _key: `${key}-s3`, text: post, marks: [] }] : []),
    ],
  }
}

export const RESOURCES_FIXTURE: ResourcePayload[] = [
  {
    _id: 'fixture-resource-1',
    title: 'Electrical-stimulation cell-culture chamber',
    kind: 'hardware',
    summary:
      'A custom chamber for delivering controlled electrical stimulation to cultured neurons over extended time courses.',
    howToObtain: [
      portableParagraph(
        'resource-1-p1',
        'Request access by emailing the lab, or build your own from the published design.'
      ),
      portableLinkParagraph(
        'resource-1-p2',
        'Design files and firmware are on ',
        'GitHub',
        'https://github.com/example/cell-culture-chamber',
        '.'
      ),
    ],
    publication: {
      _id: 'fixture-resource-1-pub',
      title: 'A chamber for chronic electrical stimulation of cultured neurons',
      date: '2024-03-01',
      doi: '10.1038/s41420-024-00000-1',
      url: null,
      journal: 'Journal of Neuroscience Methods',
      volume: 401,
      issue: 2,
      pages: '110-118',
      slug: 'chronic-stimulation-chamber',
    },
  },
  {
    _id: 'fixture-resource-2',
    title: 'Neuronal culture medium protocol',
    kind: 'protocol',
    summary:
      'Step-by-step preparation of the serum-free medium used for primary cortical neuron cultures in the lab.',
    howToObtain: [
      portableParagraph('resource-2-p1', 'Contact the lab manager for the current SOP document.'),
    ],
    publication: null,
  },
  // Fix round 1: a realistic long DOI (38 characters, no internal spaces) is
  // wider on its own than the ~246px/32-mono-character content column at
  // 320px -- this is the overflow ResourceBlock.tsx's `IDENTIFIER` constant
  // now guards with `break-all`.
  {
    _id: 'fixture-resource-3',
    title: 'Cortical thickness segmentation atlas',
    kind: 'dataset',
    summary:
      'A manually-curated cortical thickness atlas derived from the aging cohort described in the linked paper.',
    howToObtain: [
      portableParagraph('resource-3-p1', 'Available on request while the public archive is finalised.'),
    ],
    publication: {
      _id: 'fixture-resource-3-pub',
      title: 'Longitudinal cortical thickness change across healthy ageing',
      date: '2023-06-01',
      doi: '10.1016/j.neurobiolaging.2023.04.012',
      url: null,
      journal: 'Neurobiology of Aging',
      volume: 128,
      issue: null,
      pages: '55-64',
      slug: 'cortical-thickness-ageing',
    },
  },
  // A URL-only publication (no DOI) -- `deriveLink` falls back to the
  // scheme-stripped URL as the identifier, and that stripped form can still
  // be a single long unbreakable token.
  {
    _id: 'fixture-resource-4',
    title: 'Behavioural scoring software',
    kind: 'software',
    summary: 'Open-source scoring software for the novel-object-recognition assay used in the lab.',
    howToObtain: [
      portableParagraph('resource-4-p1', 'Source and installation instructions are on the project site.'),
    ],
    publication: {
      _id: 'fixture-resource-4-pub',
      title: 'An open-source pipeline for novel-object-recognition scoring',
      date: '2022-11-15',
      doi: null,
      url: 'https://www.biorxiv.org/content/10.1101/2022.11.15.516432v1.full',
      journal: 'bioRxiv',
      volume: null,
      issue: null,
      pages: null,
      slug: 'novel-object-recognition-pipeline',
    },
  },
]

// Task 2 (Research): production has zero `defined(researchOrder)` projects
// today (spec §2) -- the coming Wix import sets it on 4 (FMT, Glial, and
// two new ones), with cover aspect ratios "about 0.90, 1.05, 1.40, 1.41 and
// 2.05" (task brief). Five projects here: four with covers at four of
// those ratios (0.90, 1.05, 1.40, 2.05) plus one with no cover at all, so
// the populated screen's "with cover" / "without cover" branches (and the
// no-placeholder-box rule) are both exercised. Also, spread across those
// five: one overview with a long unbreakable token (the 320px overflow
// guard), one with no tags (SectionRail's "Project" label fallback,
// researchKicker's tag-less branch) and one with no `start` date
// (researchKicker's category-only branch) -- matching the task brief's
// fixture requirements one-for-one, reusing the existing `portableParagraph`
// helper above rather than a new one.
//
// `project.overview`'s schema allows no annotations (no `link` mark), so
// TypeGen types its blocks' `markDefs` as `null | undefined` only, never an
// array -- unlike `portableParagraph` above (shared with `resource`'s
// `howToObtain`, which does allow a `link` annotation and so types
// `markDefs` as an array). Omitting the field entirely (not `[]`) keeps
// this satisfying `ResearchProjectPayload['overview']` without a cast.
function overviewParagraph(key: string, text: string) {
  return {
    _type: 'block' as const,
    _key: key,
    style: 'normal' as const,
    children: [{ _type: 'span' as const, _key: `${key}-s`, text, marks: [] }],
  }
}

// Fix round 1 ruling 1: the gallery builds `ResearchProjectView`s directly
// (Research.tsx no longer knows how to turn a raw `coverImage` into a URL
// itself -- that's `researchModel.ts`'s `toResearchView`/`coverView`, which
// only ever sees real Sanity payload shapes). Covers reuse the same real
// Sanity photo already referenced elsewhere in this file
// (`image-8804e1e4206e971126b4ea1593388981dda21fb7-827x1157-jpg`, native
// 827×1157), requested at four different `width`/`height` pairs with
// `fit('crop')` -- exactly the "real, cropped-to-ratio `cdn.sanity.io`
// URL" the ruling asks for, so these are genuine images with real,
// verifiable aspect ratios, not synthesized placeholders.
const RESEARCH_PHOTO_ASSET = {
  _type: 'image' as const,
  asset: { _ref: 'image-8804e1e4206e971126b4ea1593388981dda21fb7-827x1157-jpg', _type: 'reference' as const },
}

function researchCoverView(width: number, height: number, alt: string): ResearchProjectView['cover'] {
  const src = urlForImage(RESEARCH_PHOTO_ASSET)?.width(width).height(height).fit('crop').url()
  if (!src) throw new Error('fixture research cover: urlForImage returned no URL')
  return { src, width, height, alt }
}

function researchProjectView(overrides: {
  id: string
  title: string
  overview: ReturnType<typeof overviewParagraph>[]
  start: string | null
  tags: string[]
  category: string | null
  cover: ResearchProjectView['cover']
}): ResearchProjectView {
  const tags = overrides.tags
  return {
    id: overrides.id,
    title: overrides.title,
    label: tags[0] || 'Project',
    kicker: researchKicker({ start: overrides.start, category: overrides.category }),
    tagLine: tags.join(' · '),
    overview: overrides.overview,
    cover: overrides.cover,
  }
}

export const RESEARCH_PROJECTS_FIXTURE: ResearchProjectView[] = [
  researchProjectView({
    id: 'fixture-research-1',
    title: 'Involvement of gut microbiota in Alzheimer’s disease',
    overview: [
      overviewParagraph(
        'research-1-p1',
        'The gut microbiome has been implicated in numerous neurodegenerative diseases. We were the ' +
          'first to demonstrate that modulation of the gut microbiome of Alzheimer’s disease mice results ' +
          'in improved cognition and pathology.'
      ),
    ],
    start: '2023-04-01T00:00:00.000Z',
    tags: ['Gut', 'Brain', 'Microbiome'],
    category: 'Non-pharmacological interventions',
    // 720×800 = 0.90.
    cover: researchCoverView(720, 800, 'Involvement of gut microbiota in Alzheimer’s disease'),
  }),
  // Long unbreakable token in the overview (task brief) -- same class of
  // 320px overflow this repo guards elsewhere (ResourceBlock.tsx's DOI,
  // PortableBody's BIO_PARAGRAPH email) -- here a single long compound
  // identifier with no spaces or hyphens for the browser to wrap on.
  researchProjectView({
    id: 'fixture-research-2',
    title: 'Glial activity as a marker of disease',
    overview: [
      overviewParagraph(
        'research-2-p1',
        'Astrocytes and microglia play an important role in maintaining a homeostatic brain environment. ' +
          'The assay reference for this cohort is ' +
          'GSE000000-glial-activation-cohort-2018-2024-longitudinal-imaging-dataset-full-identifier, ' +
          'held alongside the published dataset.'
      ),
    ],
    start: '2018-01-01T00:00:00.000Z',
    tags: ['Astrocytes', 'Microglia'],
    category: null,
    // 630×600 = 1.05.
    cover: researchCoverView(630, 600, 'Glial activity as a marker of disease'),
  }),
  // No tags -- SectionRail's label falls back to "Project", and
  // researchKicker's tag-line half is empty (kicker is category-only, since
  // there's no `start` here either -- see fixture 4 for the start-only
  // partner case).
  researchProjectView({
    id: 'fixture-research-3',
    title: 'MAESTRO: multi-site cohort infrastructure',
    overview: [
      overviewParagraph(
        'research-3-p1',
        'A shared infrastructure project coordinating cohort recruitment and data harmonisation across ' +
          'collaborating sites.'
      ),
    ],
    start: null,
    tags: [],
    category: 'Cohort infrastructure',
    // 700×500 = 1.40.
    cover: researchCoverView(700, 500, 'MAESTRO: multi-site cohort infrastructure'),
  }),
  // No `start` date -- researchKicker's "Since {year}" half is empty, so
  // the kicker is tags-only (paired with fixture 3's category-only case
  // above).
  researchProjectView({
    id: 'fixture-research-4',
    title: 'Metabolic stress signalling in ageing glia',
    overview: [
      overviewParagraph(
        'research-4-p1',
        'Investigating how chronic metabolic stress alters glial support of neuronal circuits over the ' +
          'course of healthy ageing.'
      ),
    ],
    start: null,
    tags: ['Metabolism', 'Ageing'],
    category: 'Metabolism, oxidative stress & neuroprotection',
    // 820×400 = 2.05.
    cover: researchCoverView(820, 400, 'Metabolic stress signalling in ageing glia'),
  }),
  // No cover -- the narrative must take the full content width, with no
  // placeholder box (task brief point 2).
  researchProjectView({
    id: 'fixture-research-5',
    title: 'Novel biomarkers of early cognitive decline',
    overview: [
      overviewParagraph(
        'research-5-p1',
        'Identifying candidate blood-based biomarkers that track cognitive decline before clinical ' +
          'symptoms are apparent.'
      ),
    ],
    start: '2024-09-01T00:00:00.000Z',
    tags: ['Biomarkers'],
    category: 'Neuro-oncology & biomarkers',
    cover: null,
  }),
]

// Task 3 (Home): production today has no resource, an unset labHead, and no
// `support-our-research` page (spec §2) -- the states this fixture proves
// are exactly the ones live data can't show (constraints.md), reusing the
// same People fixtures (`PEOPLE_LAB_HEAD_FIXTURE`, `PEOPLE_PROFILES_FIXTURE`,
// `PEOPLE_ROLE_GROUPS_FIXTURE`) and the first `RESOURCES_FIXTURE` entry
// rather than inventing parallel ones, so this gallery instance and the
// People gallery above stay consistent with each other.

// "labHead set (no portrait)" (task brief): the same lab head as the People
// gallery, minus her image -- proves Home's own 64px PortraitFrame-style
// initials fallback (PiPortrait64 in Home.tsx), distinct from People's own
// 220px spotlight fallback.
export const HOME_LAB_HEAD_FIXTURE: NonNullable<SettingsPayload['labHead']> = {
  ...PEOPLE_LAB_HEAD_FIXTURE,
  image: null,
  email: 'lab@example.org',
}

export const HOME_SETTINGS_FIXTURE: SettingsPayload = {
  ...fallbackSettings,
  labHead: HOME_LAB_HEAD_FIXTURE,
  showLabHeadOnHome: true,
}

export const HOME_PAGE_FIXTURE: HomePagePayload = {
  _id: 'fixture-home',
  title: 'Laboratory of Molecular Neuroscience and Dementia',
  overview: [
    portableParagraph(
      'home-overview-p1',
      'Advancing the understanding and treatment of neurological disorders through molecular research, in the gallery fixture.'
    ),
  ],
  showcaseProjects: [],
}

// Real routes carry `href` (Home's Recent work rows link to the paper
// page) -- SAMPLE_PUBLICATIONS is reused rather than invented, per the
// task brief ("The recent-work rows use SAMPLE_PUBLICATIONS, or a fixture
// through toPublication"), with an `href` added to each row. The gallery's
// total count (42) is deliberately larger than the two rows actually shown
// -- Home's "All {n} publications →" count is the live publication total,
// independent of how many of the latest five are rendered, and a gallery
// fixture where the two never happened to match would leave that
// distinction unproven.
export const HOME_PUBLICATIONS_FIXTURE: Publication[] = SAMPLE_PUBLICATIONS.map((pub, index) => ({
  ...pub,
  href: `/publications/fixture-${index + 1}`,
}))
export const HOME_PUBLICATION_COUNT_FIXTURE = 42

export const HOME_RESOURCE_FIXTURE: HomeResourcePayload = RESOURCES_FIXTURE[0]

// The `maestro` project's title, printed verbatim including its own typo
// ("endevor") -- constraints.md: CMS text (including the maestro project's
// title and its typo) is never "corrected" in code, and that rule applies
// equally to this fixture.
export const HOME_MAESTRO_FIXTURE: MaestroProjectPayload = {
  _id: 'fixture-maestro',
  title: 'Join our new endevor - MAESTRO - dreaMers And doErs: the Scientists of TomorROw',
  // `overviewParagraph` (no `markDefs` key), not `portableParagraph` --
  // same reasoning as `RESEARCH_PROJECTS_FIXTURE`'s own comment above:
  // `project.overview`'s schema allows no link annotation, so TypeGen
  // types its blocks' `markDefs` as `null | undefined` only, never an
  // array, and `maestro` is a `project` document too.
  overview: [
    overviewParagraph(
      'maestro-overview-p1',
      'A platform for postgraduate student presentations, open to collaborators across the faculty.'
    ),
  ],
  site: 'https://tinyurl.com/maestrotalks',
}

export const HOME_SUPPORT_PAGE_FIXTURE: SupportPagePayload = {
  title: 'Support our research',
  slug: 'support-our-research',
}

// Fix round 1, IMPORTANT 1: a second settings fixture, `labHead` set but
// `showLabHeadOnHome: false` -- the exact shape of the bug this fix
// addresses (Home hid the PI panel *and* still subtracted the PI from the
// member count, an internal inconsistency within the same render). With
// the PI panel genuinely hidden, `currentMemberCount` must now count the
// PI as an ordinary member (`homeModel.ts`'s `currentMemberCount` is only
// ever told to exclude the id Home decided *not* to show a panel for) --
// `e2e/home.spec.ts`'s own gallery assertions prove the two `gallery-home*`
// instances' counts differ by exactly one, the PI herself.
export const HOME_SETTINGS_LABHEAD_HIDDEN_FIXTURE: SettingsPayload = {
  ...fallbackSettings,
  labHead: HOME_LAB_HEAD_FIXTURE,
  showLabHeadOnHome: false,
}
