import { resolveHref } from 'lib/sanity.links'

/** Home-card link resolution: the lab head's own page when enabled, /people otherwise. */
export function resolveLabHeadHref(person: {
  hasPage?: boolean | null
  slug?: string | null
}): string {
  if (person.hasPage) {
    const href = resolveHref('profile', person.slug)
    if (href) {
      return href
    }
  }
  return '/people'
}
