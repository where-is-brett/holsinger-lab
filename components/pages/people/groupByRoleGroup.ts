// Must match schemas/documents/profile.ts's roleGroup option list exactly
// (Phase 3B) -- provisional, per design doc §3a, until the lab confirms it.
const ROLE_GROUPS = [
  { value: 'lab-head', title: 'Lab Head' },
  { value: 'research-scientist', title: 'Research Scientist' },
  { value: 'phd-student', title: 'PhD Student' },
  { value: 'honours-student', title: 'Honours Student' },
  { value: 'research-student', title: 'Research Student' },
  { value: 'undergraduate', title: 'Undergraduate' },
  { value: 'alumni', title: 'Alumni' },
] as const

export interface RoleGroupSection<T> {
  value: string
  title: string
  profiles: T[]
}

/**
 * Groups `profiles` by `roleGroup`, in the fixed order above, with an "Other"
 * catch-all last for unset/unrecognised values. Sections with zero members
 * are omitted. As of 2026-08-11 every live profile has roleGroup unset, so
 * this currently renders a single "Other" section holding all 19 -- the
 * named buckets appear automatically once the lab confirms the taxonomy and
 * Studio values get backfilled. No task in this plan populates roleGroup on
 * any real profile.
 */
export function groupByRoleGroup<T extends { roleGroup?: string | null }>(
  profiles: T[]
): RoleGroupSection<T>[] {
  const sections: RoleGroupSection<T>[] = ROLE_GROUPS.map((group) => ({
    ...group,
    profiles: [],
  }))
  const other: RoleGroupSection<T> = { value: 'other', title: 'Other', profiles: [] }

  for (const profile of profiles) {
    const match = sections.find((section) => section.value === profile.roleGroup)
    if (match) {
      match.profiles.push(profile)
    } else {
      other.profiles.push(profile)
    }
  }

  return [...sections, other].filter((section) => section.profiles.length > 0)
}
