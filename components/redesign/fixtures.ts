import type { Publication } from './publicationModel'
import { deriveLink, shortenLabel, splitAuthors } from './publicationModel'

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

export const SAMPLE_PEOPLE: { name: string; role: string; img?: string; initials?: string }[] = [
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
]
