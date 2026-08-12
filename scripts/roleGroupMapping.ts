// scripts/roleGroupMapping.ts
// Maps a `profile.role` free-text string to the `roleGroup` document title
// it should be backfilled to. Exact-match only, deliberately -- the 19 live
// `role` strings are already inconsistent (Phase 3's foundations doc found
// four spellings of "Honours Student" alone), and normalising here would
// just move that inconsistency into this table instead of fixing it.
// New profiles get `roleGroup` set by hand in Studio via the reference
// picker; this table is a one-off backfill aid, not a live sync.
const ROLE_TO_GROUP_TITLE: Record<string, string> = {
  'Research Scientist': 'Research Scientist',
  'PhD Student': 'PhD Student',
  'Honours Student (BioMedEng)': 'Honours Student',
  'Honours Student (Biomedical Engineering)': 'Honours Student',
  'Honours student (Biomed Eng)': 'Honours Student',
  'Honours student (Diagnostic Radiography)': 'Honours Student',
  'Research Student - BSc/MD': 'Research Student',
  'Research Student - MD (UNSW)': 'Research Student',
  'Research Student - MDiagRad': 'Research Student',
  'BAppSci (Diagnostic Radiography)': 'Undergraduate',
  'BAppSci (Speech Pathology)': 'Undergraduate',
  'BSc (Medical Sciences)': 'Undergraduate',
  'Ungergraduate student - Diagnostic Radiography': 'Undergraduate',
  'Study Abroad Student': 'Study Abroad Student',
}

/**
 * Returns the `roleGroup` document title `role` should map to, or `null` if
 * there's no known mapping (the profile's `roleGroup` is then left unset,
 * which renders under "Other" -- not an error).
 */
export function roleGroupTitleForRole(role: string): string | null {
  return ROLE_TO_GROUP_TITLE[role] ?? null
}
