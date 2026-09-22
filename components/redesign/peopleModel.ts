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
 * (already ordered by the caller's query), with an unheaded catch-all last
 * for unset or dangling (deleted-group) references. Sections with zero
 * members are omitted.
 *
 * Final-review ruling (spec §5.3): the trailing catch-all is *never*
 * titled "Other" -- `title` is unconditionally `null`, whether or not it
 * sits alongside named sections. A literal "Other" heading reads as if the
 * lab had a real role group by that name, which it doesn't; the catch-all
 * is simply "everyone with no roleGroup set", and gets no heading and no
 * count of its own. Callers that derive a group count from titled sections
 * (People.tsx's `g`) get this for free: an untitled section never
 * contributes to that count.
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
  const other: RoleGroupSection<T> = { id: 'other', title: null, profiles: [] }

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

// Leading honorifics to skip when computing initials (final-review fix
// wave), matched case-insensitively against the whole first word (so both
// "Dr" and "Dr." match "dr"/"dr."). Only stripped when a name has more
// words after it -- "Dr" alone (no surname on file) has nothing else to
// fall back to, so it stays and supplies the one initial.
const HONORIFICS = new Set(['dr', 'dr.', 'prof', 'prof.', 'professor'])

/**
 * First letter of the first word plus first letter of the last word,
 * uppercased. A single word gives one letter; empty/null/whitespace-only
 * input gives ''. Whitespace is trimmed and collapsed first, so a
 * hyphenated word ("Mary-Jane") counts as one word. `Array.from` splits on
 * code points rather than UTF-16 code units, so a non-BMP first character
 * (e.g. an emoji) stays whole rather than being sliced in half.
 *
 * Final-review fix wave, three refinements:
 * - `.normalize('NFC')` first, so a decomposed name (a base letter plus a
 *   separate combining-mark code point, e.g. "e" + U+0301) composes back
 *   into one code point before `Array.from` takes "the first one" -- on
 *   decomposed input, taking the first code point of an unnormalized string
 *   would grab the bare base letter and silently drop its accent.
 * - A leading honorific ("Dr", "Dr.", "Prof", "Prof.", "Professor",
 *   case-insensitive) is skipped when the name has more words after it, so
 *   "Dr Johnny Chan" gives "JC", not "DC".
 * - A word that doesn't start with a letter (a parenthesised qualifier like
 *   "(DDS)") is ignored when picking the first/last word, via `\p{L}`
 *   (Unicode "Letter" category, not an ASCII-only check) on the word's
 *   first code point.
 */
export function initialsOf(name: string | null | undefined): string {
  if (!name) {
    return ''
  }
  let words = name.normalize('NFC').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) {
    return ''
  }
  if (words.length > 1 && HONORIFICS.has(words[0].toLowerCase())) {
    words = words.slice(1)
  }
  words = words.filter((word) => /\p{L}/u.test(Array.from(word)[0] ?? ''))
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
