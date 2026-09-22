// scripts/roleGroupMapping.ts
// Maps a `profile.role` free-text string to the `roleGroup` document title
// it should be backfilled to. Exact-match only, deliberately -- the 19 live
// `role` strings are already inconsistent (Phase 3's foundations doc found
// four spellings of "Honours Student" alone), and normalising here would
// just move that inconsistency into this table instead of fixing it.
// New profiles get `roleGroup` set by hand in Studio via the reference
// picker; this table is a one-off backfill aid, not a live sync.
//
// Group titles follow the lab's own Wix Team page (2026-09-22), which lists
// the "(BioMedEng)"/"(Biomed Eng)" honours students as Lab Alumni and the
// BAppSci/BSc undergraduates as Research Students. Jiyoo Choi and Fritz
// Graham are not on that page; their groups are unconfirmed.
const ROLE_TO_GROUP_TITLE: Record<string, string> = {
  'Research Scientist': 'Research Scientist',
  'PhD Student': 'PhD Candidate',
  'Honours Student (BioMedEng)': 'Lab Alumni',
  'Honours Student (Biomedical Engineering)': 'Honours Student',
  'Honours student (Biomed Eng)': 'Lab Alumni',
  'Honours student (Diagnostic Radiography)': 'Honours Student',
  'Research Student - BSc/MD': 'Research Student',
  'Research Student - MD (UNSW)': 'Research Student',
  'Research Student - MDiagRad': 'Research Student',
  'BAppSci (Diagnostic Radiography)': 'Research Student',
  'BAppSci (Speech Pathology)': 'Research Student',
  'BSc (Medical Sciences)': 'Research Student',
  'Ungergraduate student - Diagnostic Radiography': 'Research Student',
  'Study Abroad Student': 'International Interns',
}

/**
 * Returns the `roleGroup` document title `role` should map to, or `null` if
 * there's no known mapping (the profile's `roleGroup` is then left unset,
 * which renders under "Other" -- not an error).
 */
export function roleGroupTitleForRole(role: string): string | null {
  return ROLE_TO_GROUP_TITLE[role] ?? null
}
