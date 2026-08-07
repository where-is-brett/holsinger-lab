const SLUG_FORMAT = /^[a-z0-9]+(-[a-z0-9]+)*$/

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
}

export function validateSlugFormat(
  slug: { current?: string } | undefined
): true | string {
  if (!slug?.current) return true
  if (!SLUG_FORMAT.test(slug.current)) {
    return 'Slug must contain only lowercase letters, numbers, and hyphens (e.g. "my-page-title"). No spaces or capital letters.'
  }
  return true
}
