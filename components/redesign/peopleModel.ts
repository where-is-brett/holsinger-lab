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

  const nonEmpty = [...sections, other].filter(
    (section) => section.profiles.length > 0
  )

  // When the catch-all is the only section, a heading reading literally
  // "Other" looks like a label for the whole page rather than a real
  // category -- suppress it. Named sections are unaffected, and the moment
  // the lab creates its first Role Group, a second section returns and
  // headings come back.
  if (nonEmpty.length === 1 && nonEmpty[0].id === 'other') {
    return [{ ...nonEmpty[0], title: null }]
  }

  return nonEmpty
}

/**
 * Removes the spotlighted lab head from the grid so they don't appear
 * twice. `labHeadId` unset, or not matching any profile in the list
 * (a dangling reference), leaves `profiles` untouched.
 */
export function excludeLabHead<T extends { _id: string }>(
  profiles: T[],
  labHeadId?: string | null
): T[] {
  if (!labHeadId) {
    return profiles
  }
  return profiles.filter((profile) => profile._id !== labHeadId)
}

/**
 * `showLabHeadOnPeople` unset (null/undefined) means on -- mirrors
 * `shouldShowLabHeadCard`'s backward-compat reasoning: the live `settings`
 * singleton predates this field, so every already-published document has no
 * key for it, and `!== false` is what keeps the spotlight showing rather
 * than silently hiding it after deploy.
 */
export function shouldShowLabHeadSpotlight(settings: {
  labHead?: { _id: string } | null
  showLabHeadOnPeople?: boolean | null
}): boolean {
  return Boolean(settings.labHead) && settings.showLabHeadOnPeople !== false
}

/**
 * First letter of the first word plus first letter of the last word,
 * uppercased. A single word gives one letter; empty/null/whitespace-only
 * input gives ''. Whitespace is trimmed and collapsed first, so a
 * hyphenated word ("Mary-Jane") counts as one word. `Array.from` splits on
 * code points rather than UTF-16 code units, so a non-BMP first character
 * (e.g. an emoji) stays whole rather than being sliced in half.
 */
export function initialsOf(name: string | null | undefined): string {
  if (!name) {
    return ''
  }
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return ''
  }
  const first = Array.from(words[0])[0] ?? ''
  const last = Array.from(words[words.length - 1])[0] ?? ''
  return (words.length === 1 ? first : first + last).toUpperCase()
}

/**
 * `true` when the trimmed, lowercased title contains "alumni". Used to
 * identify the Lab Alumni role group by title (spec §5, ruling 3), rather
 * than by a dedicated flag on the roleGroup document.
 */
export function isAlumniGroup(title: string | null | undefined): boolean {
  return Boolean(title && title.trim().toLowerCase().includes('alumni'))
}

/**
 * Pulls every alumni section's profiles out of `sections`, concatenated in
 * section order, into a flat `alumni` list -- the alumni group renders as
 * one inline comma-separated run, not a card grid (spec §5, ruling 3).
 * `members` is the remaining sections, in their original order.
 */
export function splitAlumni<T>(
  sections: RoleGroupSection<T>[]
): { members: RoleGroupSection<T>[]; alumni: T[] } {
  const members: RoleGroupSection<T>[] = []
  const alumni: T[] = []
  for (const section of sections) {
    if (isAlumniGroup(section.title)) {
      alumni.push(...section.profiles)
    } else {
      members.push(section)
    }
  }
  return { members, alumni }
}

/** Total profiles across `sections` -- used for the "N CURRENT MEMBERS" meta. */
export function memberCount<T>(sections: RoleGroupSection<T>[]): number {
  return sections.reduce((total, section) => total + section.profiles.length, 0)
}
