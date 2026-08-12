export interface RoleGroupSection<T> {
  id: string
  title: string | null
  profiles: T[]
}

interface RoleGroup {
  _id: string
  title: string | null
}

/**
 * Groups `profiles` by `roleGroup`, in the order `roleGroups` is given
 * (already ordered by the caller's query), with an "Other" catch-all last
 * for unset or dangling (deleted-group) references. Sections with zero
 * members are omitted.
 */
export function groupByRoleGroup<T extends { roleGroup?: RoleGroup | null }>(
  profiles: T[],
  roleGroups: RoleGroup[]
): RoleGroupSection<T>[] {
  const sections: RoleGroupSection<T>[] = roleGroups.map((group) => ({
    id: group._id,
    title: group.title,
    profiles: [],
  }))
  const other: RoleGroupSection<T> = { id: 'other', title: 'Other', profiles: [] }

  for (const profile of profiles) {
    const match = sections.find((section) => section.id === profile.roleGroup?._id)
    if (match) {
      match.profiles.push(profile)
    } else {
      other.profiles.push(profile)
    }
  }

  return [...sections, other].filter((section) => section.profiles.length > 0)
}
