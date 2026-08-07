import * as demo from 'lib/demo.data'
import { urlForImage } from 'lib/sanity.image'
import { siteUrl } from 'lib/site'
import Head from 'next/head'
import { useRouter } from 'next/router'
import type { Image } from 'sanity'

/**
 * All the shared stuff that goes into <head> on `(personal)` routes, can be be imported by `head.tsx` files in the /app dir or wrapped in a <Head> component in the /pages dir.
 */
export function SiteMeta({
  baseTitle,
  description,
  image,
  title,
  noindex = false,
}: {
  baseTitle?: string
  description?: string
  image?: Image
  title?: string
  noindex?: boolean
}) {
  const router = useRouter()
  const metaTitle = [
    ...(title ? [title] : []),
    ...(baseTitle ? [baseTitle] : []),
  ].join(' | ')
  const resolvedTitle = metaTitle || demo.title

  const imageUrl =
    image && urlForImage(image)?.width(1200).height(627).fit('crop').url()

  const canonicalUrl = `${siteUrl}${router.asPath.split('?')[0]}`

  return (
    <Head>
      <title>{resolvedTitle}</title>
      <meta name="viewport" content="width=device-width,initial-scale=1.0" />
      <link
        rel="apple-touch-icon"
        sizes="180x180"
        href="/favicon/apple-touch-icon.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="32x32"
        href="/favicon/favicon-32x32.png"
      />
      <link
        rel="icon"
        type="image/png"
        sizes="16x16"
        href="/favicon/favicon-16x16.png"
      />
      <link rel="manifest" href="/favicon/site.webmanifest" />
      <link rel="shortcut icon" href="/favicon/favicon.ico" />
      <meta name="msapplication-TileColor" content="#000000" />
      <meta name="msapplication-config" content="/favicon/browserconfig.xml" />
      <meta name="theme-color" content="#F8F8F8" />
      <link rel="canonical" href={canonicalUrl} />
      {noindex && <meta name="robots" content="noindex" />}
      {description && (
        <meta key="description" name="description" content={description} />
      )}

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={demo.title} />
      <meta property="og:title" content={resolvedTitle} />
      <meta property="og:url" content={canonicalUrl} />
      {description && (
        <meta property="og:description" content={description} />
      )}
      {imageUrl && <meta property="og:image" content={imageUrl} />}

      {/* Twitter */}
      <meta
        name="twitter:card"
        content={imageUrl ? 'summary_large_image' : 'summary'}
      />
      <meta name="twitter:title" content={resolvedTitle} />
      {description && (
        <meta name="twitter:description" content={description} />
      )}
      {imageUrl && <meta name="twitter:image" content={imageUrl} />}
    </Head>
  )
}
