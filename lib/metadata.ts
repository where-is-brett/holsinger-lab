import { urlForImage } from 'lib/sanity.image'
import { isNoindexPath, siteName, siteUrl } from 'lib/site'
import type { Metadata } from 'next'
import type { Image } from 'sanity'

export function buildMetadata({
  path,
  baseTitle,
  title,
  description,
  image,
  noindex = false,
}: {
  path: string
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
    robots: shouldNoindex ? { index: false, follow: true } : undefined,
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
