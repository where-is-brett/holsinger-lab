import type { Publication } from './publicationRow'
import { deriveLink, shortenLabel, splitAuthors } from './publicationRow'

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
    year,
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
