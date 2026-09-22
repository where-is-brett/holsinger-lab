// This branch (redesign/wix-site) replaces the page layer with a Wix-styled
// site (app/(site)/), which has no per-document pages -- every document of a
// given type feeds one fixed, list-style route (e.g. every `profile` renders
// somewhere on /team, not at its own /people/<slug>). There is no `page`
// document type any more either. So every previewable type here resolves to
// a fixed path, independent of slug -- `slug` is accepted for API
// compatibility with callers (the Studio preview pane, the /api/draft route)
// but never consulted.
export function resolveHref(
  documentType?: string | null,
  slug?: string | null
): string | undefined {
  switch (documentType) {
    case 'home':
    case 'settings':
      return '/'
    case 'project':
      return '/research'
    case 'profile':
      return '/team'
    case 'publication':
      return '/publications'
    case 'newsItem':
      return '/news'
    case 'mediaAppearance':
      return '/media'
    case 'siteCopy':
      return '/'
    default:
      console.warn('Invalid document type:', documentType)
      return undefined
  }
}

export function resolveInternalLinkHref(value?: {
  slug?: string | null
}): string | undefined {
  return value?.slug ? `/${value.slug}` : undefined
}
