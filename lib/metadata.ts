import { urlForImage } from 'lib/sanity.image'
import { isNoindexPath, siteUrl } from 'lib/site'
import type { Metadata } from 'next'
import type { Image } from 'sanity'

export function buildMetadata({
  path,
  siteName,
  baseTitle,
  title,
  description,
  image,
  noindex = false,
}: {
  path: string
  /**
   * Resolved via `resolveBranding` (lib/branding.ts). Required rather than
   * defaulted so the type checker names any call site that forgets it — a
   * silent default would reintroduce the hardcoded name this phase removes.
   */
  siteName: string
  baseTitle?: string
  title?: string
  description?: string
  image?: Image
  noindex?: boolean
}): Metadata {
  const metaTitle = [
    ...(title ? [title] : []),
    ...(baseTitle ? [baseTitle] : []),
  ].join(' | ')
  const resolvedTitle = metaTitle || siteName

  const imageUrl =
    image && urlForImage(image)?.width(1200).height(627).fit('crop').url()

  const canonicalUrl = `${siteUrl}${path}`
  const shouldNoindex = noindex || isNoindexPath(path)

  return {
    title: resolvedTitle,
    description,
    alternates: { canonical: canonicalUrl },
    robots: shouldNoindex ? { index: false } : undefined,
    openGraph: {
      type: 'website',
      siteName,
      title: resolvedTitle,
      url: canonicalUrl,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
    twitter: {
      card: imageUrl ? 'summary_large_image' : 'summary',
      title: resolvedTitle,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  }
}
