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
