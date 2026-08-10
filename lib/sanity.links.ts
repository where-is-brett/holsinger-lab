export function resolveHref(
  documentType?: string | null,
  slug?: string | null
): string | undefined {
  switch (documentType) {
    case 'home':
      return '/'
    case 'settings':
      return '/'
    case 'page':
      return slug ? `/${slug}` : undefined
    case 'project':
      return slug ? `/projects/${slug}` : undefined
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
