// scripts/roleGroupMapping.test.ts
import { describe, expect, it } from 'vitest'

import { roleGroupTitleForRole } from './roleGroupMapping'

describe('roleGroupTitleForRole', () => {
  // Captured from the live dataset's 19 `role` strings, 2026-08-12
  // (curl -s -G https://j3f9z8os.api.sanity.io/v2023-06-21/data/query/production
  //  --data-urlencode 'query=*[_type=="profile"]{name,role}').
  it('maps every one of the 19 live role strings to the expected group title', () => {
    const cases: [role: string, expected: string][] = [
      ['Research Scientist', 'Research Scientist'],
      ['PhD Student', 'PhD Candidate'],
      ['Honours Student (BioMedEng)', 'Lab Alumni'],
      ['Honours Student (Biomedical Engineering)', 'Honours Student'],
      ['Honours student (Biomed Eng)', 'Lab Alumni'],
      ['Honours student (Diagnostic Radiography)', 'Honours Student'],
      ['Research Student - BSc/MD', 'Research Student'],
      ['Research Student - MD (UNSW)', 'Research Student'],
      ['Research Student - MDiagRad', 'Research Student'],
      ['BAppSci (Diagnostic Radiography)', 'Research Student'],
      ['BAppSci (Speech Pathology)', 'Research Student'],
      ['BSc (Medical Sciences)', 'Research Student'],
      ['Ungergraduate student - Diagnostic Radiography', 'Research Student'],
      ['Study Abroad Student', 'International Interns'],
    ]
    for (const [role, expected] of cases) {
      expect(roleGroupTitleForRole(role)).toBe(expected)
    }
  })

  it('returns null for a role string with no known mapping', () => {
    expect(roleGroupTitleForRole('Visiting Fellow')).toBeNull()
  })

  it('is case- and whitespace-sensitive (no normalisation) -- exact match only', () => {
    expect(roleGroupTitleForRole('phd student')).toBeNull()
    expect(roleGroupTitleForRole(' PhD Student')).toBeNull()
  })
})
