// Pure helpers for the `/research` screen (Task 2 brief). Kept separate from
// the screen itself, same split as publicationModel.ts / peopleModel.ts, so
// every branch is unit-testable without rendering.

/**
 * "Since {year}", the category, both joined by " · ", or whichever half is
 * present. `""` when neither is set. `start` is `duration.start`, an ISO
 * datetime string (schemas/objects/duration) -- only the leading 4-digit
 * year is used. Both halves are trimmed; whitespace-only counts as missing,
 * matching `enquiryEmail`'s rule below.
 */
export function researchKicker(p: { start?: string | null; category?: string | null }): string {
  const start = p.start?.trim()
  const year = start ? start.slice(0, 4) : ''
  const since = year ? `Since ${year}` : ''
  const category = p.category?.trim() ?? ''
  return [since, category].filter(Boolean).join(' · ')
}

/**
 * The enquiry email: `settings.contact.email`, else `settings.labHead.email`,
 * else `null`. Both are trimmed; a whitespace-only value counts as missing,
 * not as "set to blank" -- there is no such thing as a blank email address.
 */
export function enquiryEmail(settings: {
  contact?: { email?: string | null } | null
  labHead?: { email?: string | null } | null
}): string | null {
  const contactEmail = settings.contact?.email?.trim()
  if (contactEmail) return contactEmail
  const labHeadEmail = settings.labHead?.email?.trim()
  if (labHeadEmail) return labHeadEmail
  return null
}
